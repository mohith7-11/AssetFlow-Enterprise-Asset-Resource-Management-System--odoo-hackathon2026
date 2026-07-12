from sqlalchemy.orm import Session

from app.models.asset_history import AssetHistory


def record(
    db: Session,
    *,
    asset_id: int,
    event_type: str,
    field_changed: str | None = None,
    old_value: str | None = None,
    new_value: str | None = None,
    changed_by: int | None = None,
) -> AssetHistory:
    entry = AssetHistory(
        asset_id=asset_id,
        event_type=event_type,
        field_changed=field_changed,
        old_value=old_value,
        new_value=new_value,
        changed_by=changed_by,
    )
    db.add(entry)
    db.flush()

    return entry
