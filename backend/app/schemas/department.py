from datetime import datetime
from pydantic import BaseModel
from app.core.enums import RecordStatus

class DepartmentCreate(BaseModel):
    name: str

class DepartmentUpdate(BaseModel):
    name: str | None = None
    status: RecordStatus | None = None

class DepartmentResponse(BaseModel):
    id: int
    name: str
    status: RecordStatus
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
