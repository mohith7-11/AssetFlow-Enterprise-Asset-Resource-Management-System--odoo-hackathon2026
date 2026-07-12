from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING
from sqlalchemy import DateTime, ForeignKey, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.enums import TransferStatus
from app.db.base import Base

if TYPE_CHECKING:
    from app.models.allocation import Allocation
    from app.models.asset import Asset
    from app.models.department import Department
    from app.models.user import User


class TransferRequest(Base):
    __tablename__ = "transfer_requests"

    id: Mapped[int] = mapped_column(primary_key=True)
    asset_id: Mapped[int] = mapped_column(
        ForeignKey("assets.id", ondelete="CASCADE"),
        nullable=False,
    )
    current_allocation_id: Mapped[int | None] = mapped_column(
        ForeignKey("allocations.id", ondelete="SET NULL"),
        nullable=True,
    )
    requested_by: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
    )
    target_employee_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    target_department_id: Mapped[int | None] = mapped_column(
        ForeignKey("departments.id", ondelete="SET NULL"),
        nullable=True,
    )
    reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[TransferStatus] = mapped_column(
        default=TransferStatus.REQUESTED,
        nullable=False,
    )
    approved_by: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    requested_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    resolved_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    asset: Mapped["Asset"] = relationship()
    current_allocation: Mapped["Allocation | None"] = relationship()
    requester: Mapped["User"] = relationship(foreign_keys=[requested_by])
    target_employee: Mapped["User | None"] = relationship(foreign_keys=[target_employee_id])
    target_department: Mapped["Department | None"] = relationship()
    resolver: Mapped["User | None"] = relationship(foreign_keys=[approved_by])
