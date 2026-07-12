from datetime import datetime
from pydantic import BaseModel
from app.core.enums import TransferStatus

class TransferBase(BaseModel):
    asset_id: int
    current_allocation_id: int | None = None
    target_employee_id: int | None = None
    target_department_id: int | None = None
    reason: str | None = None

class TransferCreate(TransferBase):
    pass

class TransferResponse(TransferBase):
    id: int
    requested_by: int
    status: TransferStatus
    approved_by: int | None = None
    requested_at: datetime
    resolved_at: datetime | None = None

    class Config:
        from_attributes = True
