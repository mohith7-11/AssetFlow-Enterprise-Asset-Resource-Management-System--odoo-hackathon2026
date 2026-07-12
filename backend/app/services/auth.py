# Module 1: Auth & Organization Service Stub (Member 1)
from app.core.services.activity import ActivityService  # noqa: F401


class AuthService:
    @staticmethod
    async def create_user(name: str, email: str, password_plain: str, role: str, department_id: int | None = None):
        raise NotImplementedError("User signup/registration is not implemented yet.")

    @staticmethod
    async def authenticate_user(email: str, password_plain: str):
        raise NotImplementedError("User login/authentication is not implemented yet.")

    @staticmethod
    async def get_departments(active_only: bool = True):
        raise NotImplementedError("Department directory retrieval is not implemented yet.")

    @staticmethod
    async def get_asset_categories(active_only: bool = True):
        raise NotImplementedError("Asset category directory retrieval is not implemented yet.")
