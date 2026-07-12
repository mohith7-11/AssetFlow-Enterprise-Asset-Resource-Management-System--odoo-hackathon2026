from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class AssetHistory(Base):
    __tablename__ = "asset_history"

    id: Mapped[int] = mapped_column(primary_key=True)
    asset_id: Mapped[int] = mapped_column(ForeignKey("assets.id", ondelete="CASCADE"), nullable=False, index=True)
    event_type: Mapped[str] = mapped_column(String(50), nullable=False)
    field_changed: Mapped[str | None] = mapped_column(String(100), nullable=True)
    old_value: Mapped[str | None] = mapped_column(String(255), nullable=True)
    new_value: Mapped[str | None] = mapped_column(String(255), nullable=True)
    changed_by: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    changed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    asset: Mapped["Asset"] = relationship(back_populates="history")
