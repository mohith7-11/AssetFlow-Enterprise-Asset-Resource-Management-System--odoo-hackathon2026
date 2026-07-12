from __future__ import annotations

from sqlalchemy import ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class AuditAssignment(Base):
    __tablename__ = "audit_assignments"

    __table_args__ = (
        UniqueConstraint(
            "audit_cycle_id",
            "auditor_id",
            name="uq_audit_assignment",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)

    audit_cycle_id: Mapped[int] = mapped_column(
        ForeignKey("audit_cycles.id", ondelete="CASCADE"),
        nullable=False,
    )

    auditor_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )

    audit_cycle: Mapped["AuditCycle"] = relationship(
        back_populates="assignments"
    )

    auditor: Mapped["User"] = relationship()