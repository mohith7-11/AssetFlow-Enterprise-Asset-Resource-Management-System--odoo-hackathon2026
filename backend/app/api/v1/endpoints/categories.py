from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_user, get_current_admin
from app.models.asset_category import AssetCategory
from app.schemas.category import CategoryCreate, CategoryUpdate, CategoryResponse
from app.models.user import User

router = APIRouter()

@router.get("", response_model=list[CategoryResponse])
def list_categories(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return db.query(AssetCategory).all()

@router.post("", response_model=CategoryResponse)
def create_category(
    cat_in: CategoryCreate,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    existing = db.query(AssetCategory).filter(AssetCategory.name == cat_in.name).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Category with this name already exists."
        )
    
    db_cat = AssetCategory(
        name=cat_in.name,
        description=cat_in.description
    )
    db.add(db_cat)
    db.commit()
    db.refresh(db_cat)
    return db_cat

@router.patch("/{id}", response_model=CategoryResponse)
def update_category(
    id: int,
    cat_in: CategoryUpdate,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    db_cat = db.query(AssetCategory).filter(AssetCategory.id == id).first()
    if not db_cat:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Asset Category not found."
        )
    
    update_data = cat_in.model_dump(exclude_unset=True)
    if "name" in update_data and update_data["name"] != db_cat.name:
        existing = db.query(AssetCategory).filter(AssetCategory.name == update_data["name"]).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Category with this name already exists."
            )
            
    for field, value in update_data.items():
        setattr(db_cat, field, value)
        
    db.add(db_cat)
    db.commit()
    db.refresh(db_cat)
    return db_cat
