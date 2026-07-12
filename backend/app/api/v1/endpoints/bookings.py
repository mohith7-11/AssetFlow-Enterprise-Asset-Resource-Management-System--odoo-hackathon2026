from typing import List
from datetime import datetime, date, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.db.session import get_db
from app.models.booking import Booking
from app.models.asset import Asset
from app.models.user import User
from app.core.enums import BookingStatus, AssetStatus
from app.core.services.asset_state import AssetStateService
from app.core.services.asset_history import AssetHistoryService
from app.core.services.activity import ActivityService
from app.core.rbac import get_current_user
from app.schemas.booking import BookingCreate, BookingResponse, BookingReschedule

router = APIRouter()

def check_and_update_expired_bookings(db: Session):
    now = datetime.now(timezone.utc)
    # Find assets that are RESERVED
    reserved_assets = db.query(Asset).filter(Asset.status == AssetStatus.RESERVED).all()
    for asset in reserved_assets:
        # Check if there are any bookings currently active (start_time <= now <= end_time)
        current_active = db.query(Booking).filter(
            Booking.asset_id == asset.id,
            Booking.status == BookingStatus.ACTIVE,
            Booking.start_time <= now,
            Booking.end_time >= now
        ).first()
        
        # If no booking is currently active, transition the asset back to AVAILABLE
        if not current_active:
            AssetStateService.transition(db, asset.id, AssetStatus.AVAILABLE, actor="system")

@router.get("", response_model=List[BookingResponse])
def list_bookings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    check_and_update_expired_bookings(db)
    return db.query(Booking).all()

@router.post("", response_model=BookingResponse, status_code=status.HTTP_201_CREATED)
def create_booking(
    payload: BookingCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    check_and_update_expired_bookings(db)

    # 1. Validate start_time < end_time
    if payload.start_time >= payload.end_time:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Start time must be before end time."
        )

    # 2. Verify asset exists
    asset = db.query(Asset).filter(Asset.id == payload.asset_id).first()
    if not asset:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Asset not found")

    # 3. Verify asset is bookable
    if not asset.is_bookable:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This asset is not marked as bookable."
        )

    # 4. Reject incompatible asset statuses
    if asset.status in (AssetStatus.LOST, AssetStatus.RETIRED, AssetStatus.DISPOSED, AssetStatus.UNDER_MAINTENANCE):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Asset cannot be booked because its current status is {asset.status}."
        )

    # 5. App-level overlap check: new_start < existing_end AND new_end > existing_start
    overlapping = db.query(Booking).filter(
        Booking.asset_id == payload.asset_id,
        Booking.status == BookingStatus.ACTIVE,
        payload.start_time < Booking.end_time,
        payload.end_time > Booking.start_time
    ).first()
    
    if overlapping:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This asset is already booked for the selected time range."
        )

    new_booking = Booking(
        asset_id=payload.asset_id,
        booked_by=current_user.id,
        start_time=payload.start_time,
        end_time=payload.end_time,
        status=BookingStatus.ACTIVE
    )
    db.add(new_booking)
    
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Booking overlap detected at database level (exclusion constraint conflict)."
        )

    # Transition asset status to RESERVED via AssetStateService (handles state + history automatically)
    AssetStateService.transition(db, payload.asset_id, AssetStatus.RESERVED, actor=current_user.email)

    # Record Activity Log
    ActivityService.record(
        db=db,
        event=f"Booking created for Asset {payload.asset_id}",
        is_user_facing=True,
        recipient_id=current_user.id,
        message=f"Booking created successfully for asset '{asset.name}'."
    )

    db.refresh(new_booking)
    return new_booking

@router.patch("/{id}/reschedule", response_model=BookingResponse)
def reschedule_booking(
    id: int,
    payload: BookingReschedule,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    check_and_update_expired_bookings(db)

    # 1. Validate times
    if payload.start_time >= payload.end_time:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Start time must be before end time."
        )

    # 2. Retrieve booking
    booking = db.query(Booking).filter(Booking.id == id).first()
    if not booking:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found")

    if booking.status != BookingStatus.ACTIVE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot reschedule an inactive or cancelled booking."
        )

    # 3. App-level overlap check (excluding this booking itself)
    overlapping = db.query(Booking).filter(
        Booking.asset_id == booking.asset_id,
        Booking.id != id,
        Booking.status == BookingStatus.ACTIVE,
        payload.start_time < Booking.end_time,
        payload.end_time > Booking.start_time
    ).first()
    
    if overlapping:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Reschedule failed: Time range overlaps with an existing booking."
        )

    booking.start_time = payload.start_time
    booking.end_time = payload.end_time
    
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Reschedule failed: Database exclusion constraint conflict."
        )

    # Event does not change Asset.status, call log directly
    AssetHistoryService.log(
        db=db,
        asset_id=booking.asset_id,
        event="BOOKING_RESCHEDULED",
        meta={"booking_id": booking.id, "new_start": payload.start_time.isoformat(), "new_end": payload.end_time.isoformat()},
        actor=current_user.email
    )

    # Record Activity Log
    ActivityService.record(
        db=db,
        event=f"Booking rescheduled for Asset {booking.asset_id}",
        is_user_facing=True,
        recipient_id=booking.booked_by,
        message=f"Your booking for asset '{booking.asset.name}' has been rescheduled."
    )

    db.refresh(booking)
    return booking

@router.post("/{id}/cancel", response_model=BookingResponse)
def cancel_booking(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    booking = db.query(Booking).filter(Booking.id == id).first()
    if not booking:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found")

    if booking.status == BookingStatus.CANCELLED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Booking is already cancelled."
        )

    booking.status = BookingStatus.CANCELLED
    db.commit()

    # Revert asset status back to AVAILABLE
    AssetStateService.transition(db, booking.asset_id, AssetStatus.AVAILABLE, actor=current_user.email)

    # Record Activity Log
    ActivityService.record(
        db=db,
        event=f"Booking cancelled for Asset {booking.asset_id}",
        is_user_facing=True,
        recipient_id=booking.booked_by,
        message=f"Your booking for asset '{booking.asset.name}' has been cancelled."
    )

    db.refresh(booking)
    return booking
