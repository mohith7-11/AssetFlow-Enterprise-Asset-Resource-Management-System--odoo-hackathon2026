from typing import List
from datetime import datetime, date, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.db.session import get_db
from app.models.allocation import Allocation
from app.models.asset import Asset
from app.core.enums import AllocationStatus, AssetStatus
from app.core.services.asset_state import AssetStateService
from app.core.services.asset_history import AssetHistoryService
from app.core.services.activity import ActivityService
from app.core.rbac import get_current_user, require_asset_manager
from app.models.user import User
from app.schemas.allocation import AllocationCreate, AllocationResponse, ReturnApprove

router = APIRouter()

@router.get("", response_model=List[AllocationResponse])
def list_allocations(
    status: AllocationStatus | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Allocation)
    if status:
        query = query.filter(Allocation.status == status)
    allocations = query.all()
    
    # Calculate is_overdue dynamically
    today = date.today()
    for allocation in allocations:
        allocation.is_overdue = (
            allocation.status == AllocationStatus.ACTIVE 
            and allocation.expected_return_date is not None 
            and allocation.expected_return_date < today
        )
    return allocations

@router.post("", response_model=AllocationResponse, status_code=status.HTTP_201_CREATED)
def create_allocation(
    payload: AllocationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # App-level double-allocation check
    existing = db.query(Allocation).filter(
        Allocation.asset_id == payload.asset_id,
        Allocation.status == AllocationStatus.ACTIVE
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"held_by": existing.employee_id, "department": existing.department_id}
        )

    # Verify asset exists
    asset = db.query(Asset).filter(Asset.id == payload.asset_id).first()
    if not asset:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Asset not found")

    new_allocation = Allocation(
        asset_id=payload.asset_id,
        employee_id=payload.employee_id,
        department_id=payload.department_id,
        allocated_by=current_user.id,
        expected_return_date=payload.expected_return_date,
        status=AllocationStatus.ACTIVE
    )
    
    db.add(new_allocation)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Asset is already active allocated (DB constraint conflict)"
        )
    
    # Transition asset status using AssetStateService (handles state + logs history automatically)
    AssetStateService.transition(db, payload.asset_id, AssetStatus.ALLOCATED, actor=current_user.email)
    
    # Record Activity Log
    recipient_id = payload.employee_id if payload.employee_id else current_user.id
    ActivityService.record(
        db=db,
        event=f"Asset {payload.asset_id} allocated",
        is_user_facing=True,
        recipient_id=recipient_id,
        message=f"Asset '{asset.name}' has been allocated to you."
    )
    
    db.refresh(new_allocation)
    new_allocation.is_overdue = (
        new_allocation.status == AllocationStatus.ACTIVE 
        and new_allocation.expected_return_date is not None 
        and new_allocation.expected_return_date < date.today()
    )
    return new_allocation

@router.post("/{id}/return-request", response_model=AllocationResponse)
def request_return(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    allocation = db.query(Allocation).filter(Allocation.id == id).first()
    if not allocation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Allocation not found")
    
    # Authorized department members or employee holder check
    if allocation.employee_id:
        if allocation.employee_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only the current holder can request a return."
            )
    elif allocation.department_id:
        if current_user.department_id != allocation.department_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only members of the allocated department can request a return."
            )
    else:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to request a return for this allocation."
        )
        
    if allocation.status != AllocationStatus.ACTIVE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Can only request return for active allocations."
        )

    allocation.status = AllocationStatus.RETURN_REQUESTED
    allocation.return_requested_at = datetime.now(timezone.utc)
    db.commit()

    # Asset.status does not change during return-request, so we call AssetHistoryService.log directly
    AssetHistoryService.log(
        db=db,
        asset_id=allocation.asset_id,
        event="RETURN_REQUESTED",
        meta={"allocation_id": allocation.id},
        actor=current_user.email
    )

    # Record Activity Log
    ActivityService.record(
        db=db,
        event=f"Return requested for allocation {allocation.id}",
        is_user_facing=True,
        recipient_id=current_user.id,
        message=f"Return request submitted for allocation {allocation.id}."
    )

    db.refresh(allocation)
    allocation.is_overdue = (
        allocation.status == AllocationStatus.ACTIVE 
        and allocation.expected_return_date is not None 
        and allocation.expected_return_date < date.today()
    )
    return allocation

@router.post("/{id}/return-approve", response_model=AllocationResponse)
def approve_return(
    id: int,
    payload: ReturnApprove,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_asset_manager)
):
    allocation = db.query(Allocation).filter(Allocation.id == id).first()
    if not allocation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Allocation not found")
        
    if allocation.status not in (AllocationStatus.ACTIVE, AllocationStatus.RETURN_REQUESTED):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Allocation is already returned or inactive."
        )

    allocation.status = AllocationStatus.RETURNED
    allocation.returned_at = datetime.now(timezone.utc)
    allocation.return_condition = payload.return_condition
    allocation.return_notes = payload.return_notes
    allocation.approved_by = current_user.id
    db.commit()

    # Return Approve changes Asset.status back to AVAILABLE.
    # Transition status via AssetStateService (handles state + logs history automatically).
    # Do NOT call AssetHistoryService.log manually here.
    AssetStateService.transition(db, allocation.asset_id, AssetStatus.AVAILABLE, actor=current_user.email)

    # Record Activity Log
    recipient_id = allocation.employee_id if allocation.employee_id else current_user.id
    ActivityService.record(
        db=db,
        event=f"Return approved for allocation {allocation.id}",
        is_user_facing=True,
        recipient_id=recipient_id,
        message=f"Asset allocation return has been approved and marked as {payload.return_condition}."
    )

    db.refresh(allocation)
    allocation.is_overdue = False
    return allocation
