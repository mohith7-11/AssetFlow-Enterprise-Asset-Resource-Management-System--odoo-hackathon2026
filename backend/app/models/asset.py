from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import Date, DateTime, ForeignKey, Numeric, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.enums import AssetCondition, AssetStatus
from app.db.base import Base


class Asset(Base):
    __tablename__ = "assets"

    id: Mapped[int] = mapped_column(primary_key=True)
    asset_tag: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    category_id: Mapped[int] = mapped_column(ForeignKey("asset_categories.id"), nullable=False)
    serial_number: Mapped[str | None] = mapped_column(String(255), unique=True, nullable=True)
    acquisition_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    acquisition_cost: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)
    condition: Mapped[AssetCondition] = mapped_column(default=AssetCondition.GOOD, nullable=False)
    location: Mapped[str | None] = mapped_column(String(255), nullable=True)
    status: Mapped[AssetStatus] = mapped_column(default=AssetStatus.AVAILABLE, nullable=False)
    is_bookable: Mapped[bool] = mapped_column(default=False, nullable=False)
    department_id: Mapped[int | None] = mapped_column(
        ForeignKey("departments.id", ondelete="SET NULL"),
        nullable=True,
    )
    created_by: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    category: Mapped["AssetCategory"] = relationship(back_populates="assets")
    department: Mapped["Department | None"] = relationship(back_populates="assets")
    creator: Mapped["User | None"] = relationship(back_populates="created_assets")
    history: Mapped[list["AssetHistory"]] = relationship(back_populates="asset", cascade="all, delete-orphan")