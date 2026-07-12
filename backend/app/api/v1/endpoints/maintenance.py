from typing import List
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.maintenance_request import MaintenanceRequest
from app.models.asset import Asset
from app.models.user import User
from app.core.enums import MaintenanceStatus, AssetStatus, Priority
from app.core.services.asset_state import AssetStateService
from app.core.services.asset_history import AssetHistoryService
from app.core.services.activity import ActivityService
from app.core.rbac import get_current_user, require_asset_manager
from app.schemas.maintenance import (
    MaintenanceCreate, 
    MaintenanceResponse, 
    MaintenanceAssign, 
    MaintenanceResolve
)

router = APIRouter()

@router.get("", response_model=List[MaintenanceResponse])
def list_maintenance_requests(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return db.query(MaintenanceRequest).all()

@router.post("", response_model=MaintenanceResponse, status_code=status.HTTP_201_CREATED)
def create_maintenance_request(
    payload: MaintenanceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Verify asset exists
    asset = db.query(Asset).filter(Asset.id == payload.asset_id).first()
    if not asset:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Asset not found")

    new_request = MaintenanceRequest(
        asset_id=payload.asset_id,
        requested_by=current_user.id,
        description=payload.description,
        priority=payload.priority,
        status=MaintenanceStatus.PENDING
    )
    db.add(new_request)
    db.commit()
    db.refresh(new_request)

    # Event does not change Asset.status, log directly
    AssetHistoryService.log(
        db=db,
        asset_id=payload.asset_id,
        event="MAINTENANCE_REQUESTED",
        meta={"request_id": new_request.id},
        actor=current_user.email
    )

    # Record Activity Log
    ActivityService.record(
        db=db,
        event=f"Maintenance ticket raised for Asset {payload.asset_id}",
        is_user_facing=True,
        recipient_id=current_user.id,
        message=f"Maintenance ticket raised for asset '{asset.name}'."
    )

    return new_request

@router.post("/{id}/approve", response_model=MaintenanceResponse)
def approve_maintenance_request(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_asset_manager)
):
    request = db.query(MaintenanceRequest).filter(MaintenanceRequest.id == id).first()
    if not request:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Maintenance request not found")

    if request.status != MaintenanceStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only pending requests can be approved."
        )

    request.status = MaintenanceStatus.APPROVED
    db.commit()

    # On approval, transition asset to UNDER_MAINTENANCE.
    # Transition status via AssetStateService (handles state + logs history automatically).
    # Do NOT call AssetHistoryService.log manually here.
    AssetStateService.transition(db, request.asset_id, AssetStatus.UNDER_MAINTENANCE, actor=current_user.email)

    # Record Activity Log
    ActivityService.record(
        db=db,
        event=f"Maintenance approved for ticket {request.id}",
        is_user_facing=True,
        recipient_id=request.requested_by,
        message=f"Your maintenance request for asset '{request.asset.name}' has been approved."
    )

    db.refresh(request)
    return request

@router.post("/{id}/reject", response_model=MaintenanceResponse)
def reject_maintenance_request(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_asset_manager)
):
    request = db.query(MaintenanceRequest).filter(MaintenanceRequest.id == id).first()
    if not request:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Maintenance request not found")

    if request.status != MaintenanceStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only pending requests can be rejected."
        )

    request.status = MaintenanceStatus.REJECTED
    db.commit()

    # Asset.status does not change, log directly
    AssetHistoryService.log(
        db=db,
        asset_id=request.asset_id,
        event="MAINTENANCE_REJECTED",
        meta={"request_id": request.id},
        actor=current_user.email
    )

    # Record Activity Log
    ActivityService.record(
        db=db,
        event=f"Maintenance rejected for ticket {request.id}",
        is_user_facing=True,
        recipient_id=request.requested_by,
        message=f"Your maintenance request for asset '{request.asset.name}' has been rejected."
    )

    db.refresh(request)
    return request

@router.post("/{id}/assign", response_model=MaintenanceResponse)
def assign_maintenance_request(
    id: int,
    payload: MaintenanceAssign,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_asset_manager)
):
    request = db.query(MaintenanceRequest).filter(MaintenanceRequest.id == id).first()
    if not request:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Maintenance request not found")

    if request.status not in (MaintenanceStatus.APPROVED, MaintenanceStatus.TECHNICIAN_ASSIGNED):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Can only assign technician to approved or already assigned tickets."
        )

    # Verify technician exists
    tech = db.query(User).filter(User.id == payload.assigned_to).first()
    if not tech:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Technician not found")

    request.assigned_to = payload.assigned_to
    request.status = MaintenanceStatus.TECHNICIAN_ASSIGNED
    db.commit()

    # Asset.status does not change, log directly
    AssetHistoryService.log(
        db=db,
        asset_id=request.asset_id,
        event="MAINTENANCE_TECHNICIAN_ASSIGNED",
        meta={"request_id": request.id, "technician_id": payload.assigned_to},
        actor=current_user.email
    )

    # Record Activity Log
    ActivityService.record(
        db=db,
        event=f"Technician assigned to maintenance ticket {request.id}",
        is_user_facing=True,
        recipient_id=payload.assigned_to,
        message=f"You have been assigned to maintenance ticket {request.id}."
    )

    db.refresh(request)
    return request

@router.post("/{id}/start", response_model=MaintenanceResponse)
def start_maintenance_work(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    request = db.query(MaintenanceRequest).filter(MaintenanceRequest.id == id).first()
    if not request:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Maintenance request not found")

    if request.status != MaintenanceStatus.TECHNICIAN_ASSIGNED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot start work unless a technician is assigned."
        )

    # Verify assignee is the current user (technician)
    if request.assigned_to != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the assigned technician can start the work."
        )

    request.status = MaintenanceStatus.IN_PROGRESS
    db.commit()

    # Asset.status remains UNDER_MAINTENANCE, log directly
    AssetHistoryService.log(
        db=db,
        asset_id=request.asset_id,
        event="MAINTENANCE_WORK_STARTED",
        meta={"request_id": request.id},
        actor=current_user.email
    )

    # Record Activity Log
    ActivityService.record(
        db=db,
        event=f"Maintenance work started on ticket {request.id}",
        is_user_facing=True,
        recipient_id=request.requested_by,
        message=f"Work has started on your maintenance request for asset '{request.asset.name}'."
    )

    db.refresh(request)
    return request

@router.post("/{id}/resolve", response_model=MaintenanceResponse)
def resolve_maintenance_request(
    id: int,
    payload: MaintenanceResolve,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    request = db.query(MaintenanceRequest).filter(MaintenanceRequest.id == id).first()
    if not request:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Maintenance request not found")

    if request.status != MaintenanceStatus.IN_PROGRESS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot resolve ticket unless the work is in progress."
        )

    # Verify assignee is the current user
    if request.assigned_to != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the assigned technician can resolve the ticket."
        )

    request.status = MaintenanceStatus.RESOLVED
    request.resolved_at = datetime.now(timezone.utc)
    request.resolution_notes = payload.resolution_notes
    db.commit()

    # On resolution, transition asset to AVAILABLE.
    # Transition status via AssetStateService (handles state + logs history automatically).
    # Do NOT call AssetHistoryService.log manually here.
    AssetStateService.transition(db, request.asset_id, AssetStatus.AVAILABLE, actor=current_user.email)

    # Record Activity Log
    ActivityService.record(
        db=db,
        event=f"Maintenance resolved for ticket {request.id}",
        is_user_facing=True,
        recipient_id=request.requested_by,
        message=f"Maintenance ticket {request.id} for asset '{request.asset.name}' has been resolved: {payload.resolution_notes}."
    )

    db.refresh(request)
    return request
