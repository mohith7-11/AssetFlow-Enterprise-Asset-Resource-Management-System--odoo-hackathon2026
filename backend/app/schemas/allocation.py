from datetime import date, datetime
from pydantic import BaseModel
from app.core.enums import AllocationStatus, AssetCondition

class AllocationBase(BaseModel):
    asset_id: int
    employee_id: int | None = None
    department_id: int | None = None
    expected_return_date: date | None = None

class AllocationCreate(AllocationBase):
    pass

class AllocationResponse(AllocationBase):
    id: int
    allocated_by: int
    allocated_at: datetime
    return_requested_at: datetime | None = None
    returned_at: datetime | None = None
    return_condition: AssetCondition | None = None
    return_notes: str | None = None
    approved_by: int | None = None
    status: AllocationStatus
    is_overdue: bool

    class Config:
        from_attributes = True

class ReturnApprove(BaseModel):
    return_condition: AssetCondition
    return_notes: str | None = None
