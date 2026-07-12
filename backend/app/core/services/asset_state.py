from sqlalchemy import update
from sqlalchemy.orm import Session

from app.core.enums import AssetStatus
from app.core.services.asset_history import AssetHistoryService
from app.models.asset import Asset


class AssetStateService:
    @staticmethod
    def transition(db: Session, asset_id: int, new_status: AssetStatus, actor: str) -> None:
        """
        Transition the status of an asset. This is the single, canonical gateway
        for updating Asset.status, enforced via SQLAlchemy update statements to guarantee
        full audit logging.
        """
        # Fetch current asset to determine previous status for history mapping
        asset = db.query(Asset).filter(Asset.id == asset_id).first()
        if not asset:
            raise ValueError(f"Asset with ID {asset_id} not found.")

        old_status = asset.status

        # Perform status update via SQLAlchemy update statement (no raw assignment allowed)
        stmt = (
            update(Asset)
            .where(Asset.id == asset_id)
            .values(status=new_status)
        )
        db.execute(stmt)
        db.commit()

        # Log transition details using AssetHistoryService
        AssetHistoryService.log(
            db=db,
            asset_id=asset_id,
            event="STATUS_TRANSITION",
            meta={
                "old_status": old_status,
                "new_status": new_status,
            },
            actor=actor,
        )
