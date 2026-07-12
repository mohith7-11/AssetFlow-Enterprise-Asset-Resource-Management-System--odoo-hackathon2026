from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.activity_log import ActivityLog
from app.schemas.activity import ActivityResponse


router = APIRouter(
    prefix="/activity",
    tags=["Activity"],
)

@router.get(
    "",
    response_model=list[ActivityResponse],
)
def get_activity(
    db: Session = Depends(get_db),
):

    activities = db.scalars(
        select(ActivityLog)
        .order_by(
            ActivityLog.created_at.desc()
        )
        .limit(50)
    ).all()

    return activities

@router.patch(
    "/{activity_id}/read",
    response_model=ActivityResponse,
)
def mark_activity_read(
    activity_id: int,
    db: Session = Depends(get_db),
):

    activity = db.get(
        ActivityLog,
        activity_id,
    )

    if not activity:
        raise HTTPException(
            status_code=404,
            detail="Activity not found",
        )

    activity.is_read = True

    db.commit()
    db.refresh(activity)

    return activity

