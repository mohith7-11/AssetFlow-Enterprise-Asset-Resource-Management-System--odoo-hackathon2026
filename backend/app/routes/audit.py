from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.audit_cycle import AuditCycle
from app.models.audit_assignment import AuditAssignment
from app.models.audit_item import AuditItem
from app.models.asset import Asset

from app.core.enums import (
    AuditStatus,
    AuditVerificationStatus,
    AssetStatus,
)

from app.schemas.audit import (
    AuditCreate,
    AuditResponse,
    AuditAssignmentCreate,
    AuditItemResponse,
    AuditItemUpdate,
    DiscrepancyResponse,
)

router = APIRouter(
    prefix="/audits",
    tags=["Audits"],
)

@router.get(
    "",
    response_model=list[AuditResponse],
)
def list_audits(
    db: Session = Depends(get_db),
):

    return db.scalars(
        select(AuditCycle)
        .order_by(AuditCycle.created_at.desc())
    ).all()
    
@router.post(
    "",
    response_model=AuditResponse,
)
def create_audit(
    payload: AuditCreate,
    db: Session = Depends(get_db),
):

    audit = AuditCycle(
        **payload.model_dump()
    )

    db.add(audit)
    db.commit()
    db.refresh(audit)

    return audit

@router.post(
    "/{audit_id}/assignments",
)
def assign_auditor(
    audit_id: int,
    payload: AuditAssignmentCreate,
    db: Session = Depends(get_db),
):

    audit = db.get(
        AuditCycle,
        audit_id,
    )

    if not audit:
        raise HTTPException(
            404,
            "Audit not found"
        )


    assignment = AuditAssignment(
        audit_cycle_id=audit_id,
        auditor_id=payload.auditor_id,
    )


    db.add(assignment)
    db.commit()

    return {
        "message": "Auditor assigned"
    }
    
@router.post(
    "/{audit_id}/start",
)
def start_audit(
    audit_id:int,
    db:Session=Depends(get_db),
):

    audit=db.get(
        AuditCycle,
        audit_id,
    )

    if not audit:
        raise HTTPException(
            404,
            "Audit not found"
        )


    if audit.status != AuditStatus.DRAFT:
        raise HTTPException(
            400,
            "Audit already started"
        )


    assets=db.scalars(
        select(Asset)
    ).all()


    for asset in assets:

        existing=db.scalar(
            select(AuditItem)
            .where(
                AuditItem.audit_cycle_id==audit_id,
                AuditItem.asset_id==asset.id,
            )
        )


        if not existing:

            db.add(
                AuditItem(
                    audit_cycle_id=audit_id,
                    asset_id=asset.id,
                    verification_status=
                    AuditVerificationStatus.PENDING,
                )
            )


    audit.status=AuditStatus.ACTIVE

    db.commit()


    return {
        "message":"Audit started"
    }
    
@router.get(
    "/{audit_id}/items",
    response_model=list[AuditItemResponse],
)
def audit_items(
    audit_id:int,
    db:Session=Depends(get_db),
):

    return db.scalars(
        select(AuditItem)
        .where(
            AuditItem.audit_cycle_id==audit_id
        )
    ).all()
    
@router.patch(
    "/{audit_id}/items/{item_id}",
    response_model=AuditItemResponse,
)
def update_audit_item(
    audit_id:int,
    item_id:int,
    payload:AuditItemUpdate,
    db:Session=Depends(get_db),
):

    item=db.get(
        AuditItem,
        item_id,
    )


    if not item:
        raise HTTPException(
            404,
            "Item not found"
        )


    item.verification_status = (
        payload.verification_status
    )

    item.notes = payload.notes

    item.verified_by = payload.verified_by

    item.verified_at = datetime.utcnow()


    db.commit()
    db.refresh(item)

    return item

@router.get(
    "/{audit_id}/discrepancies",
    response_model=list[DiscrepancyResponse],
)
def discrepancies(
    audit_id:int,
    db:Session=Depends(get_db),
):

    return db.scalars(
        select(AuditItem)
        .where(
            AuditItem.audit_cycle_id==audit_id,
            AuditItem.verification_status.in_(
                [
                    AuditVerificationStatus.MISSING,
                    AuditVerificationStatus.DAMAGED,
                ]
            )
        )
    ).all()
    
@router.post(
    "/{audit_id}/close",
)
def close_audit(
    audit_id:int,
    db:Session=Depends(get_db),
):

    audit=db.get(
        AuditCycle,
        audit_id,
    )


    if not audit:
        raise HTTPException(
            404,
            "Audit not found"
        )


    pending=db.scalar(
        select(AuditItem)
        .where(
            AuditItem.audit_cycle_id==audit_id,
            AuditItem.verification_status==
            AuditVerificationStatus.PENDING
        )
    )


    if pending:
        raise HTTPException(
            400,
            "Pending audit items exist"
        )


    missing_items=db.scalars(
        select(AuditItem)
        .where(
            AuditItem.audit_cycle_id==audit_id,
            AuditItem.verification_status==
            AuditVerificationStatus.MISSING
        )
    ).all()


    for item in missing_items:

        asset=db.get(
            Asset,
            item.asset_id
        )

        if asset:
            asset.status=AssetStatus.LOST


    audit.status=AuditStatus.CLOSED
    audit.closed_at=datetime.utcnow()


    db.commit()


    return {
        "message":"Audit closed"
    }
    
