from datetime import datetime
from pydantic import BaseModel
from app.core.enums import MaintenanceStatus, Priority

class MaintenanceBase(BaseModel):
    asset_id: int
    description: str
    priority: Priority = Priority.MEDIUM

class MaintenanceCreate(MaintenanceBase):
    pass

class MaintenanceAssign(BaseModel):
    assigned_to: int

class MaintenanceResolve(BaseModel):
    resolution_notes: str

class MaintenanceResponse(MaintenanceBase):
    id: int
    requested_by: int
    status: MaintenanceStatus
    assigned_to: int | None = None
    created_at: datetime
    resolved_at: datetime | None = None
    resolution_notes: str | None = None

    class Config:
        from_attributes = True
