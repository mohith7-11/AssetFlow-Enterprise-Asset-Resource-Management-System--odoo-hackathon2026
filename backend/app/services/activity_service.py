from sqlalchemy.orm import Session

from app.core.enums import ActivityAction
from app.models.activity_log import ActivityLog


def create_activity(
    db: Session,
    action_type: ActivityAction,
    message: str,
    user_id: int | None = None,
):

    activity = ActivityLog(
        user_id=user_id,
        action_type=action_type,
        message=message,
    )

    db.add(activity)

    return activity