from datetime import date, datetime

from pydantic import BaseModel

from app.core.enums import AuditStatus, AuditVerificationStatus


class AuditCreate(BaseModel):
    name: str
    department_id: int | None = None
    location: str | None = None
    start_date: date
    end_date: date
    created_by: int | None = None


class AuditResponse(BaseModel):
    id: int
    name: str
    department_id: int | None
    location: str | None
    start_date: date
    end_date: date
    status: AuditStatus
    created_by: int | None
    created_at: datetime

    class Config:
        from_attributes = True


class AuditAssignmentCreate(BaseModel):
    auditor_id: int


class AuditItemResponse(BaseModel):
    id: int
    asset_id: int
    verification_status: AuditVerificationStatus
    notes: str | None
    verified_by: int | None
    verified_at: datetime | None

    class Config:
        from_attributes = True


class AuditItemUpdate(BaseModel):
    verification_status: AuditVerificationStatus
    notes: str | None = None
    verified_by: int | None = None


class DiscrepancyResponse(BaseModel):
    id: int
    asset_id: int
    verification_status: AuditVerificationStatus
    notes: str | None

    class Config:
        from_attributes = True