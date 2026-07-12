from fastapi import FastAPI, HTTPException

from app.database import check_database_connection


app = FastAPI(
    title="AssetFlow API",
    version="1.0.0",
)


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
