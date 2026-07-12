from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.enums import AuditVerificationStatus
from app.db.base import Base


class AuditItem(Base):
    __tablename__ = "audit_items"

    __table_args__ = (
        UniqueConstraint(
            "audit_cycle_id",
            "asset_id",
            name="uq_audit_item_asset",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)

    audit_cycle_id: Mapped[int] = mapped_column(
        ForeignKey("audit_cycles.id", ondelete="CASCADE"),
        nullable=False,
    )

    asset_id: Mapped[int] = mapped_column(
        ForeignKey("assets.id", ondelete="CASCADE"),
        nullable=False,
    )

    verification_status: Mapped[AuditVerificationStatus] = mapped_column(
        default=AuditVerificationStatus.PENDING,
        nullable=False,
    )

    verified_by: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    notes: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    verified_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    audit_cycle: Mapped["AuditCycle"] = relationship(
        back_populates="items"
    )

    asset: Mapped["Asset"] = relationship()

    verifier: Mapped["User | None"] = relationship()