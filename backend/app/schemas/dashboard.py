from datetime import datetime

from pydantic import BaseModel


class DashboardSummaryResponse(BaseModel):
    assets_available: int
    assets_allocated: int
    assets_under_maintenance: int
    active_bookings: int
    pending_transfers: int
    upcoming_returns: int
    overdue_returns: int


class RecentActivityResponse(BaseModel):
    id: int
    action_type: str
    message: str
    created_at: datetime
    is_read: bool

    class Config:
        from_attributes = True