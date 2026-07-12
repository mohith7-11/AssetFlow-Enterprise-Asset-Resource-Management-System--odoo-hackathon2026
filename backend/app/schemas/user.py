from datetime import datetime
from pydantic import BaseModel
from app.core.enums import UserRole, RecordStatus

class UserCreate(BaseModel):
    name: str
    email: str
    password: str

class UserLogin(BaseModel):
    email: str
    password: str

class UserUpdate(BaseModel):
    department_id: int | None = None
    role: UserRole | None = None
    status: RecordStatus | None = None

class DepartmentSimple(BaseModel):
    id: int
    name: str
    
    class Config:
        from_attributes = True

class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    role: UserRole
    status: RecordStatus
    department_id: int | None
    created_at: datetime
    updated_at: datetime
    department: DepartmentSimple | None = None

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str
