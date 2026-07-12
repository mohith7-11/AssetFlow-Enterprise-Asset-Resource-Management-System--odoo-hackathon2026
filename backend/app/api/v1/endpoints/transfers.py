from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.transfer_request import TransferRequest
from app.models.allocation import Allocation
from app.models.asset import Asset
from app.models.user import User
from app.core.enums import TransferStatus, AllocationStatus, AssetStatus
from app.core.services.asset_state import AssetStateService
from app.core.services.asset_history import AssetHistoryService
from app.core.services.activity import ActivityService
from app.core.rbac import get_current_user
from app.schemas.transfer import TransferCreate, TransferResponse

router = APIRouter()

@router.post("", response_model=TransferResponse, status_code=status.HTTP_201_CREATED)
def create_transfer_request(
    payload: TransferCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Target validation: exactly one of target_employee_id OR target_department_id must be provided
    has_employee = payload.target_employee_id is not None
    has_department = payload.target_department_id is not None
    
    if (has_employee and has_department) or (not has_employee and not has_department):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Transfer request must specify exactly one target: employee OR department."
        )

    # Verify active allocation exists for this asset
    active_allocation = db.query(Allocation).filter(
        Allocation.asset_id == payload.asset_id,
        Allocation.status == AllocationStatus.ACTIVE
    ).first()
    
    if not active_allocation:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Asset has no active allocation to transfer from."
        )

    # Reject transfers targeting the current holder
    if has_employee:
        if active_allocation.employee_id == payload.target_employee_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Target employee is already the current holder of this asset."
            )
        target_emp = db.query(User).filter(User.id == payload.target_employee_id).first()
        if not target_emp:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Target employee not found")
            
    if has_department:
        if active_allocation.department_id == payload.target_department_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Target department is already the current department allocated to this asset."
            )
        from app.models.department import Department
        target_dept = db.query(Department).filter(Department.id == payload.target_department_id).first()
        if not target_dept:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Target department not found")

    new_transfer = TransferRequest(
        asset_id=payload.asset_id,
        current_allocation_id=active_allocation.id,
        requested_by=current_user.id,
        target_employee_id=payload.target_employee_id,
        target_department_id=payload.target_department_id,
        reason=payload.reason,
        status=TransferStatus.REQUESTED
    )
    db.add(new_transfer)
    db.commit()
    db.refresh(new_transfer)

    # Business event does not change Asset.status, so log history directly
    AssetHistoryService.log(
        db=db,
        asset_id=payload.asset_id,
        event="TRANSFER_REQUESTED",
        meta={"transfer_id": new_transfer.id},
        actor=current_user.email
    )

    # Record Activity Log
    recipient_id = payload.target_employee_id if payload.target_employee_id else current_user.id
    ActivityService.record(
        db=db,
        event=f"Transfer request raised for Asset {payload.asset_id}",
        is_user_facing=True,
        recipient_id=recipient_id,
        message=f"Transfer request initiated for Asset {payload.asset_id} to you."
    )

    return new_transfer

@router.post("/{id}/approve", response_model=TransferResponse)
def approve_transfer_request(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Retrieve transfer request
    transfer = db.query(TransferRequest).filter(TransferRequest.id == id).first()
    if not transfer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transfer request not found")
        
    if transfer.status != TransferStatus.REQUESTED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Transfer request is already resolved."
        )

    # Transfer approval department checks:
    # Admin / Asset Manager can approve any transfer.
    # Department Heads may approve transfers targeting their own department or target employees in their department.
    from app.core.enums import UserRole
    if current_user.role == UserRole.DEPARTMENT_HEAD:
        is_authorized = False
        if transfer.target_department_id:
            if current_user.department_id == transfer.target_department_id:
                is_authorized = True
        elif transfer.target_employee_id:
            target_emp = db.query(User).filter(User.id == transfer.target_employee_id).first()
            if target_emp and target_emp.department_id == current_user.department_id:
                is_authorized = True
        
        if not is_authorized:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Can only approve transfers targeting your own department or employees within your department."
            )
    elif current_user.role not in (UserRole.ADMIN, UserRole.ASSET_MANAGER):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have the required permissions to approve this transfer request."
        )

    # Complete the transfer workflow:
    # 1. Close current allocation
    current_alloc = db.query(Allocation).filter(Allocation.id == transfer.current_allocation_id).first()
    if current_alloc:
        current_alloc.status = AllocationStatus.RETURNED
        current_alloc.returned_at = datetime.now(timezone.utc)

    # 2. Create new allocation
    new_alloc = Allocation(
        asset_id=transfer.asset_id,
        employee_id=transfer.target_employee_id,
        department_id=transfer.target_department_id,
        allocated_by=current_user.id,
        status=AllocationStatus.ACTIVE
    )
    db.add(new_alloc)

    # 3. Resolve transfer request
    transfer.status = TransferStatus.APPROVED
    transfer.approved_by = current_user.id
    transfer.resolved_at = datetime.now(timezone.utc)
    
    db.commit()

    # Note: Asset.status remains ALLOCATED throughout the transfer, so Asset.status does NOT transition.
    # Therefore, log history directly and do NOT call AssetStateService.transition.
    AssetHistoryService.log(
        db=db,
        asset_id=transfer.asset_id,
        event="TRANSFER_APPROVED",
        meta={"transfer_id": transfer.id, "new_allocation_id": new_alloc.id},
        actor=current_user.email
    )

    # Record Activity Log
    recipient_id = transfer.target_employee_id if transfer.target_employee_id else current_user.id
    ActivityService.record(
        db=db,
        event=f"Transfer request approved for Asset {transfer.asset_id}",
        is_user_facing=True,
        recipient_id=recipient_id,
        message=f"Transfer request {transfer.id} approved. Asset is now allocated to you."
    )

    db.refresh(transfer)
    return transfer

@router.post("/{id}/reject", response_model=TransferResponse)
def reject_transfer_request(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    transfer = db.query(TransferRequest).filter(TransferRequest.id == id).first()
    if not transfer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transfer request not found")
        
    if transfer.status != TransferStatus.REQUESTED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Transfer request is already resolved."
        )

    # Check permission (Admin, Asset Manager or target Department Head can reject)
    from app.core.enums import UserRole
    if current_user.role == UserRole.DEPARTMENT_HEAD:
        is_authorized = False
        if transfer.target_department_id:
            if current_user.department_id == transfer.target_department_id:
                is_authorized = True
        elif transfer.target_employee_id:
            target_emp = db.query(User).filter(User.id == transfer.target_employee_id).first()
            if target_emp and target_emp.department_id == current_user.department_id:
                is_authorized = True
        
        if not is_authorized:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Can only reject transfers targeting your own department or employees within your department."
            )
    elif current_user.role not in (UserRole.ADMIN, UserRole.ASSET_MANAGER):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have the required permissions to reject this transfer request."
        )

    # Update transfer status to REJECTED
    transfer.status = TransferStatus.REJECTED
    transfer.resolved_at = datetime.now(timezone.utc)
    db.commit()

    # Asset.status does not change, log history directly
    AssetHistoryService.log(
        db=db,
        asset_id=transfer.asset_id,
        event="TRANSFER_REJECTED",
        meta={"transfer_id": transfer.id},
        actor=current_user.email
    )

    # Record Activity Log
    ActivityService.record(
        db=db,
        event=f"Transfer request rejected for Asset {transfer.asset_id}",
        is_user_facing=True,
        recipient_id=transfer.requested_by,
        message=f"Transfer request {transfer.id} for Asset {transfer.asset_id} has been rejected."
    )

    db.refresh(transfer)
    return transfer
