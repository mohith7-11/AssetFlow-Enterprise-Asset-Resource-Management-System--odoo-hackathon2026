from sqlalchemy.orm import Session

from app.models.asset_history import AssetHistory


class AssetHistoryService:
    @staticmethod
    def log(db: Session, asset_id: int, event: str, meta: dict | None, actor: str) -> AssetHistory:
        """
        Record a lifecycle event for a specific asset in the asset_history table.
        """
        history_entry = AssetHistory(
            asset_id=asset_id,
            event=event,
            meta=meta,
            actor=actor,
        )
        db.add(history_entry)
        db.commit()
        db.refresh(history_entry)
        return history_entry
