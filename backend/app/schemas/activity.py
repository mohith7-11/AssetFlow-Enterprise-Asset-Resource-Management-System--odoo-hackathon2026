from datetime import datetime

from pydantic import BaseModel

from app.core.enums import ActivityAction


class ActivityResponse(BaseModel):
    id: int
    user_id: int | None
    action_type: ActivityAction
    message: str
    created_at: datetime
    is_read: bool

    class Config:
        from_attributes = True