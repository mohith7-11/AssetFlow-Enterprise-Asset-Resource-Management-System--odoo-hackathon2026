# Module 2: Assets, Allocation & Transfer Service Stub (Member 2)
from app.core.services.activity import ActivityService  # noqa: F401
from app.core.services.asset_history import AssetHistoryService  # noqa: F401
from app.core.services.asset_state import AssetStateService  # noqa: F401


class AssetService:
    @staticmethod
    async def create_asset(asset_tag: str, name: str, category_id: int, serial_number: str | None = None):
        raise NotImplementedError("Asset CRUD operations are not implemented yet.")

    @staticmethod
    async def allocate_asset(asset_id: int, employee_id: int, department_id: int, expected_return_date: str):
        # NOTE: A PostgreSQL partial unique index constraint will block double-allocation of active assets.
        raise NotImplementedError("Asset allocation and assignment are not implemented yet.")

    @staticmethod
    async def transfer_asset(asset_id: int, target_employee_id: int, target_department_id: int, reason: str):
        raise NotImplementedError("Asset transfer request handling is not implemented yet.")

    @staticmethod
    async def get_asset_history(asset_id: int):
        raise NotImplementedError("Asset lifecycle history tracking is not implemented yet.")
