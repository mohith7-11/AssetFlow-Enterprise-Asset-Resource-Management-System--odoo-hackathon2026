from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, selectinload

from app.core.enums import AssetStatus
from app.db.session import get_db
from app.models.asset import Asset
from app.schemas.asset import AssetCreate, AssetRead, AssetUpdate
from app.services import asset_history
from app.services.asset_tag import generate_next_asset_tag

router = APIRouter(prefix="/api/v1/assets", tags=["assets"])

_ASSET_LOAD_OPTIONS = (
    selectinload(Asset.category),
    selectinload(Asset.department),
    selectinload(Asset.creator),
)

_MAX_TAG_ATTEMPTS = 3


@router.get("", response_model=list[AssetRead])
def list_assets(
    db: Session = Depends(get_db),
    search: str | None = None,
    category_id: int | None = None,
    status: AssetStatus | None = None,
    department_id: int | None = None,
    location: str | None = None,
    is_bookable: bool | None = None,
) -> list[Asset]:
    query = select(Asset).options(*_ASSET_LOAD_OPTIONS)

    if search:
        pattern = f"%{search}%"
        query = query.where(
            or_(
                Asset.asset_tag.ilike(pattern),
                Asset.name.ilike(pattern),
                Asset.serial_number.ilike(pattern),
            )
        )
    if category_id is not None:
        query = query.where(Asset.category_id == category_id)
    if status is not None:
        query = query.where(Asset.status == status)
    if department_id is not None:
        query = query.where(Asset.department_id == department_id)
    if location is not None:
        query = query.where(Asset.location == location)
    if is_bookable is not None:
        query = query.where(Asset.is_bookable == is_bookable)

    return list(db.execute(query).scalars().all())


@router.post("", response_model=AssetRead, status_code=201)
def create_asset(payload: AssetCreate, db: Session = Depends(get_db)) -> Asset:
    for attempt in range(_MAX_TAG_ATTEMPTS):
        asset = Asset(
            asset_tag=generate_next_asset_tag(db),
            status=AssetStatus.AVAILABLE,
            created_by=None,
            **payload.model_dump(),
        )
        db.add(asset)
        try:
            db.flush()
        except IntegrityError as exc:
            db.rollback()
            if "asset_tag" in str(exc.orig) and attempt < _MAX_TAG_ATTEMPTS - 1:
                continue
            raise HTTPException(status_code=409, detail="Could not create asset due to a conflicting field") from exc
        else:
            break

    asset_history.record(
        db,
        asset_id=asset.id,
        event_type="CREATED",
        new_value=AssetStatus.AVAILABLE.value,
    )
    db.commit()
    db.refresh(asset, attribute_names=["category", "department", "creator"])

    return asset


@router.get("/{asset_id}", response_model=AssetRead)
def get_asset(asset_id: int, db: Session = Depends(get_db)) -> Asset:
    asset = db.execute(
        select(Asset).options(*_ASSET_LOAD_OPTIONS).where(Asset.id == asset_id)
    ).scalar_one_or_none()

    if asset is None:
        raise HTTPException(status_code=404, detail="Asset not found")

    return asset


@router.patch("/{asset_id}", response_model=AssetRead)
def update_asset(asset_id: int, payload: AssetUpdate, db: Session = Depends(get_db)) -> Asset:
    asset = db.execute(
        select(Asset).options(*_ASSET_LOAD_OPTIONS).where(Asset.id == asset_id)
    ).scalar_one_or_none()

    if asset is None:
        raise HTTPException(status_code=404, detail="Asset not found")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(asset, field, value)

    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=409, detail="Could not update asset due to a conflicting field") from exc

    db.refresh(asset, attribute_names=["category", "department", "creator"])

    return asset
