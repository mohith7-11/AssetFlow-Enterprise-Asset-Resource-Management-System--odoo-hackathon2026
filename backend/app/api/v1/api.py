from fastapi import APIRouter
from app.api.v1.endpoints import allocations, transfers, bookings, maintenance

api_router = APIRouter()
api_router.include_router(allocations.router, prefix="/allocations", tags=["allocations"])
api_router.include_router(transfers.router, prefix="/transfers", tags=["transfers"])
api_router.include_router(bookings.router, prefix="/bookings", tags=["bookings"])
api_router.include_router(maintenance.router, prefix="/maintenance", tags=["maintenance"])
