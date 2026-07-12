# Module 3: Booking & Maintenance Service Stub (Member 3)
from app.core.services.activity import ActivityService  # noqa: F401
from app.core.services.asset_history import AssetHistoryService  # noqa: F401
from app.core.services.asset_state import AssetStateService  # noqa: F401


class BookingService:
    @staticmethod
    async def create_booking(asset_id: int, booked_by_id: int, start_time: str, end_time: str):
        # NOTE: A PostgreSQL EXCLUDE USING gist constraint will prevent overlapping bookings on the database layer.
        raise NotImplementedError("Resource booking is not implemented yet.")

    @staticmethod
    async def create_maintenance_request(asset_id: int, requested_by_id: int, description: str, priority: str):
        raise NotImplementedError("Asset maintenance request handling is not implemented yet.")

    @staticmethod
    async def update_maintenance_status(request_id: int, status: str, resolver_id: int, notes: str | None = None):
        raise NotImplementedError("Maintenance progress updates are not implemented yet.")
