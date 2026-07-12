from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.asset import Asset


def generate_next_asset_tag(db: Session) -> str:
    count = db.execute(select(func.count()).select_from(Asset)).scalar_one()

    return f"AF-{count + 1:04d}"
