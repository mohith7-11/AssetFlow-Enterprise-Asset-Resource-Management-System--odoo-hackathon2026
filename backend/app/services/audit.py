# Module 4: Audit & Dashboard Service Stub (Member 4)
from app.core.services.activity import ActivityService  # noqa: F401
from app.core.services.asset_history import AssetHistoryService  # noqa: F401
from app.core.services.asset_state import AssetStateService  # noqa: F401


class AuditService:
    @staticmethod
    async def create_audit_cycle(name: str, start_date: str, end_date: str, created_by_id: int):
        raise NotImplementedError("Audit cycle creation is not implemented yet.")

    @staticmethod
    async def assign_auditors(audit_cycle_id: int, auditor_ids: list[int]):
        raise NotImplementedError("Auditor assignment is not implemented yet.")

    @staticmethod
    async def submit_audit_item(audit_cycle_id: int, asset_id: int, status: str, verified_by_id: int, notes: str | None = None):
        raise NotImplementedError("Asset audit verification submission is not implemented yet.")

    @staticmethod
    async def get_dashboard_summary():
        raise NotImplementedError("System wide dashboard metrics and summary query are not implemented yet.")
