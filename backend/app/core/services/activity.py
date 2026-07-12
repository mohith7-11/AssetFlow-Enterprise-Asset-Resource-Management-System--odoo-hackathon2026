from sqlalchemy.orm import Session

from app.models.activity_log import ActivityLog
from app.models.notification import Notification
from app.core.enums import ActivityAction


class ActivityService:
    @staticmethod
    def record(
        db: Session,
        event: str,
        is_user_facing: bool = False,
        recipient_id: int | None = None,
        message: str | None = None,
    ) -> ActivityLog:
        """
        Record a system-wide activity log entry and optionally generate a user-facing notification.
        Whether the activity is user-facing and its recipients/messages must be explicitly provided
        by the caller to avoid brittle inference logic.
        """
        event_lower = event.lower()
        if "allocated" in event_lower:
            action_type = ActivityAction.ASSET_ALLOCATED
        elif "transferred" in event_lower:
            action_type = ActivityAction.ASSET_TRANSFERRED
        elif "returned" in event_lower:
            action_type = ActivityAction.ASSET_RETURNED
        elif "created" in event_lower:
            action_type = ActivityAction.BOOKING_CREATED
        elif "cancelled" in event_lower or "cancel" in event_lower:
            action_type = ActivityAction.BOOKING_CANCELLED
        elif "requested" in event_lower:
            action_type = ActivityAction.MAINTENANCE_REQUESTED
        elif "completed" in event_lower or "resolve" in event_lower:
            action_type = ActivityAction.MAINTENANCE_COMPLETED
        else:
            action_type = ActivityAction.SYSTEM

        log_entry = ActivityLog(
            action_type=action_type,
            message=message or event,
            user_id=recipient_id
        )
        db.add(log_entry)
        db.commit()
        db.refresh(log_entry)

        if is_user_facing:
            if not recipient_id or not message:
                raise ValueError(
                    "Recipient ID and message must be provided for user-facing notifications."
                )

            notification = Notification(
                recipient_id=recipient_id,
                message=message,
                is_read=False,
            )
            db.add(notification)
            db.commit()

        return log_entry
