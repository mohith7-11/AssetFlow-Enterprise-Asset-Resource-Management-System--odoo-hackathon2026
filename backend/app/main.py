from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.db.init_db import init_db
from app.db.session import check_database_connection
from app.db.seed import seed_admin

from app.api.v1.endpoints.auth import router as auth_router
from app.api.v1.endpoints.departments import router as departments_router
from app.api.v1.endpoints.categories import router as categories_router
from app.api.v1.endpoints.users import router as users_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    seed_admin()
    yield


app = FastAPI(
    title="AssetFlow API",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(auth_router, prefix="/api/v1/auth", tags=["auth"])
app.include_router(departments_router, prefix="/api/v1/departments", tags=["departments"])
app.include_router(categories_router, prefix="/api/v1/asset-categories", tags=["categories"])
app.include_router(users_router, prefix="/api/v1/users", tags=["users"])


@app.get("/")
def root():
    return {
        "message": "AssetFlow API is running"
    }


@app.get("/api/v1/health")
def health_check():
    try:
        check_database_connection()

        return {
            "status": "healthy",
            "backend": "connected",
            "database": "connected"
        }

    except Exception:
        raise HTTPException(
            status_code=503,
            detail="Database connection failed"
        )
