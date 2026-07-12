from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.activity_log import ActivityLog
from app.models.asset import Asset
from app.core.enums import AssetStatus

from app.schemas.dashboard import (
    DashboardSummaryResponse,
    RecentActivityResponse,
)


router = APIRouter(
    prefix="/dashboard",
    tags=["Dashboard"],
)


@router.get(
    "/summary",
    response_model=DashboardSummaryResponse,
)
def dashboard_summary(
    db: Session = Depends(get_db),
):

    available = db.scalar(
        select(func.count(Asset.id))
        .where(
            Asset.status == AssetStatus.AVAILABLE
        )
    )

    allocated = db.scalar(
        select(func.count(Asset.id))
        .where(
            Asset.status == AssetStatus.ALLOCATED
        )
    )

    maintenance = db.scalar(
        select(func.count(Asset.id))
        .where(
            Asset.status == AssetStatus.UNDER_MAINTENANCE
        )
    )

    return {
        "assets_available": available or 0,
        "assets_allocated": allocated or 0,
        "assets_under_maintenance": maintenance or 0,

        # Future modules
        "active_bookings": 0,
        "pending_transfers": 0,
        "upcoming_returns": 0,
        "overdue_returns": 0,
    }


@router.get(
    "/recent-activity",
    response_model=list[RecentActivityResponse],
)
def recent_activity(
    db: Session = Depends(get_db),
):

    activities = db.scalars(
        select(ActivityLog)
        .order_by(
            ActivityLog.created_at.desc()
        )
        .limit(10)
    ).all()

    return activities
