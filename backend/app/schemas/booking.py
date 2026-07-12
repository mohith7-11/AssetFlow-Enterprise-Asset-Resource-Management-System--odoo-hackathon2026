from datetime import datetime
from pydantic import BaseModel
from app.core.enums import BookingStatus

class BookingBase(BaseModel):
    asset_id: int
    start_time: datetime
    end_time: datetime

class BookingCreate(BookingBase):
    pass

class BookingReschedule(BaseModel):
    start_time: datetime
    end_time: datetime

class BookingResponse(BookingBase):
    id: int
    booked_by: int
    status: BookingStatus
    created_at: datetime

    class Config:
        from_attributes = True
