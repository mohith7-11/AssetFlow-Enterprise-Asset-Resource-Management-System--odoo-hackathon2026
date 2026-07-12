from sqlalchemy.orm import Session

from app.core.enums import AssetStatus
from app.models.asset import Asset
from app.services import asset_history

_ALLOWED_TRANSITIONS: dict[AssetStatus, set[AssetStatus]] = {
    AssetStatus.AVAILABLE: {
        AssetStatus.ALLOCATED,
        AssetStatus.RESERVED,
        AssetStatus.UNDER_MAINTENANCE,
        AssetStatus.LOST,
        AssetStatus.RETIRED,
    },
    AssetStatus.ALLOCATED: {
        AssetStatus.AVAILABLE,
        AssetStatus.LOST,
        AssetStatus.UNDER_MAINTENANCE,
    },
    AssetStatus.RESERVED: {
        AssetStatus.AVAILABLE,
        AssetStatus.ALLOCATED,
    },
    AssetStatus.UNDER_MAINTENANCE: {
        AssetStatus.AVAILABLE,
        AssetStatus.RETIRED,
        AssetStatus.DISPOSED,
    },
    AssetStatus.LOST: {
        AssetStatus.AVAILABLE,
        AssetStatus.DISPOSED,
    },
    AssetStatus.RETIRED: {
        AssetStatus.DISPOSED,
    },
    AssetStatus.DISPOSED: set(),
}


def transition(
    db: Session,
    asset: Asset,
    new_status: AssetStatus,
    *,
    changed_by: int | None = None,
) -> Asset:
    if new_status == asset.status:
        return asset

    allowed = _ALLOWED_TRANSITIONS.get(asset.status, set())
    if new_status not in allowed:
        raise ValueError(f"Cannot transition asset from {asset.status} to {new_status}")

    old_status = asset.status
    asset.status = new_status
    db.flush()

    asset_history.record(
        db,
        asset_id=asset.id,
        event_type="STATUS_CHANGED",
        field_changed="status",
        old_value=old_status.value,
        new_value=new_status.value,
        changed_by=changed_by,
    )

    return asset
