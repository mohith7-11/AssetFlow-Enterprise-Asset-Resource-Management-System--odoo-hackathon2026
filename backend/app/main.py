from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException

from app.api.v1.api import api_router
from app.db.init_db import init_db
from app.db.session import check_database_connection


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(
    title="AssetFlow API",
    version="1.0.0",
    lifespan=lifespan,
)

app.include_router(api_router, prefix="/api/v1")


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
