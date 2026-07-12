from __future__ import annotations

from datetime import date, datetime
from typing import TYPE_CHECKING
from sqlalchemy import Date, DateTime, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.enums import AllocationStatus, AssetCondition
from app.db.base import Base

if TYPE_CHECKING:
    from app.models.asset import Asset
    from app.models.department import Department
    from app.models.user import User


class Allocation(Base):
    __tablename__ = "allocations"

    id: Mapped[int] = mapped_column(primary_key=True)
    asset_id: Mapped[int] = mapped_column(
        ForeignKey("assets.id", ondelete="CASCADE"),
        nullable=False,
    )
    employee_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    department_id: Mapped[int | None] = mapped_column(
        ForeignKey("departments.id", ondelete="SET NULL"),
        nullable=True,
    )
    allocated_by: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
    )
    allocated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    expected_return_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    return_requested_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    returned_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    return_condition: Mapped[AssetCondition | None] = mapped_column(nullable=True)
    return_notes: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    approved_by: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    status: Mapped[AllocationStatus] = mapped_column(
        default=AllocationStatus.ACTIVE,
        nullable=False,
    )

    asset: Mapped["Asset"] = relationship(back_populates="allocations")
    employee: Mapped["User | None"] = relationship(foreign_keys=[employee_id])
    department: Mapped["Department | None"] = relationship()
    allocator: Mapped["User"] = relationship(foreign_keys=[allocated_by])
    approver: Mapped["User | None"] = relationship(foreign_keys=[approved_by])
