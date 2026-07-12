from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.models.user import User
from app.core.enums import UserRole, RecordStatus
from app.core.security import get_password_hash

def seed_admin() -> None:
    db = SessionLocal()
    try:
        admin = db.query(User).filter(User.role == UserRole.ADMIN).first()
        if not admin:
            admin_user = User(
                name="System Admin",
                email="admin@assetflow.com",
                password_hash=get_password_hash("adminpassword"),
                role=UserRole.ADMIN,
                status=RecordStatus.ACTIVE
            )
            db.add(admin_user)
            db.commit()
            print("Successfully seeded admin@assetflow.com / adminpassword")
    except Exception as e:
        db.rollback()
        print(f"Error seeding admin: {e}")
    finally:
        db.close()
