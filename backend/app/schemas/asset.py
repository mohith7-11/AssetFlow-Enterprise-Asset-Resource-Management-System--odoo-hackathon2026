from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict

from app.core.enums import AssetCondition, AssetStatus


class AssetCreate(BaseModel):
    name: str
    category_id: int
    serial_number: str | None = None
    acquisition_date: date | None = None
    acquisition_cost: Decimal | None = None
    condition: AssetCondition = AssetCondition.GOOD
    location: str | None = None
    is_bookable: bool = False
    department_id: int | None = None


class AssetUpdate(BaseModel):
    name: str | None = None
    category_id: int | None = None
    serial_number: str | None = None
    acquisition_date: date | None = None
    acquisition_cost: Decimal | None = None
    condition: AssetCondition | None = None
    location: str | None = None
    is_bookable: bool | None = None
    department_id: int | None = None


class CategoryBrief(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str


class DepartmentBrief(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str


class CreatorBrief(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    email: str


class AssetRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    asset_tag: str
    name: str
    serial_number: str | None
    acquisition_date: date | None
    acquisition_cost: Decimal | None
    condition: AssetCondition
    location: str | None
    status: AssetStatus
    is_bookable: bool
    department_id: int | None
    created_by: int | None
    created_at: datetime
    updated_at: datetime
    category: CategoryBrief
    department: DepartmentBrief | None
    creator: CreatorBrief | None
