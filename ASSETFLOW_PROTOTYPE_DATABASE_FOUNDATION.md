# AssetFlow --- Prototype Database Foundation for GitHub Copilot

## Goal

Implement the minimum shared PostgreSQL database foundation required to
unblock all four teammates.

This is a hackathon prototype. Keep the architecture simple.

The project already has FastAPI, React/Vite, PostgreSQL, Docker Compose,
and a working backend-to-PostgreSQL health check.

This task adds: - one shared SQLAlchemy Base; - one shared database
engine and session; - automatic table creation at backend startup; -
shared enums; - four core models: Department, User, AssetCategory, and
Asset.

After this foundation is tested and merged into `main`, teammates should
build feature modules without recreating these core models.

## Prototype decisions

Use: - PostgreSQL - SQLAlchemy 2.x ORM - psycopg - pydantic-settings -
Docker Compose - `Base.metadata.create_all()` at application startup

Do not use: - Alembic or migrations - repository-pattern abstractions -
event buses or microservices - Redis, Celery, or Kubernetes -
unnecessary base-model abstractions

## Important rules

1.  Inspect the existing repository before changing files.
2.  Preserve the working Docker, React, and FastAPI setup.
3.  Preserve `/api/v1/health`; it must still execute a real PostgreSQL
    `SELECT 1`.
4.  Use exactly one SQLAlchemy `Base`, engine, and session factory.
5.  Do not implement feature APIs, authentication, asset CRUD,
    allocation, booking, maintenance, audits, dashboard, notifications,
    or reports in this task.
6.  Do not run `git push` or merge into `main`.
7.  Never commit `.env`.
8.  Prefer readable code over abstractions.

## Target structure

``` text
backend/app/
├── __init__.py
├── main.py
├── core/
│   ├── __init__.py
│   ├── config.py
│   └── enums.py
├── db/
│   ├── __init__.py
│   ├── base.py
│   ├── session.py
│   └── init_db.py
└── models/
    ├── __init__.py
    ├── department.py
    ├── user.py
    ├── asset_category.py
    └── asset.py

docs/
├── DATABASE_CONVENTIONS.md
└── TEAM_OWNERSHIP.md
```

## Step 1 --- Inspect existing code

Inspect `backend/app`, `backend/requirements.txt`, `docker-compose.yml`,
`.env.example`, the current database connection code, FastAPI startup,
and the health endpoint.

Reuse working code. Do not leave two active database engines. Refactor
the old database module only after moving its required functionality
safely.

## Step 2 --- Dependencies

Ensure `backend/requirements.txt` retains existing dependencies and
includes at least:

``` text
fastapi
uvicorn[standard]
sqlalchemy
psycopg[binary]
pydantic-settings
```

Do not add Alembic. Rebuild Docker after dependency changes.

## Step 3 --- Shared configuration

Create `backend/app/core/config.py`:

``` python
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    database_url: str

    model_config = SettingsConfigDict(
        env_file=".env",
        extra="ignore",
    )

settings = Settings()
```

Read `DATABASE_URL` from the environment. Do not hardcode credentials.

## Step 4 --- Shared SQLAlchemy Base

Create `backend/app/db/base.py`:

``` python
from sqlalchemy.orm import DeclarativeBase

class Base(DeclarativeBase):
    pass
```

This is the only declarative Base. Every future model imports `Base`
from this file.

## Step 5 --- Shared engine and session

Create `backend/app/db/session.py`:

``` python
from collections.abc import Generator
from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session, sessionmaker
from app.core.config import settings

engine = create_engine(
    settings.database_url,
    pool_pre_ping=True,
)

SessionLocal = sessionmaker(
    bind=engine,
    autoflush=False,
    expire_on_commit=False,
)

def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def check_database_connection() -> bool:
    with engine.connect() as connection:
        connection.execute(text("SELECT 1"))
    return True
```

Update the health endpoint to use this shared connection check.

## Step 6 --- Shared enums

Create `backend/app/core/enums.py` with only the enums currently
required:

``` python
from enum import Enum

class UserRole(str, Enum):
    ADMIN = "ADMIN"
    ASSET_MANAGER = "ASSET_MANAGER"
    DEPARTMENT_HEAD = "DEPARTMENT_HEAD"
    EMPLOYEE = "EMPLOYEE"

class RecordStatus(str, Enum):
    ACTIVE = "ACTIVE"
    INACTIVE = "INACTIVE"

class AssetStatus(str, Enum):
    AVAILABLE = "AVAILABLE"
    ALLOCATED = "ALLOCATED"
    RESERVED = "RESERVED"
    UNDER_MAINTENANCE = "UNDER_MAINTENANCE"
    LOST = "LOST"
    RETIRED = "RETIRED"
    DISPOSED = "DISPOSED"

class AssetCondition(str, Enum):
    EXCELLENT = "EXCELLENT"
    GOOD = "GOOD"
    FAIR = "FAIR"
    DAMAGED = "DAMAGED"
```

Future feature owners can add workflow enums when needed.

## Step 7 --- Department model

Create `backend/app/models/department.py`.

Table: `departments`

Fields: - `id`: integer primary key - `name`: required, unique string -
`status`: `RecordStatus`, default `ACTIVE` - `created_at`:
timezone-aware timestamp - `updated_at`: timezone-aware timestamp

Do not add `head_id` or department hierarchy in this prototype
foundation.

A department head is initially represented by a user with
`role = DEPARTMENT_HEAD` and the corresponding `department_id`.

Add a `users` relationship paired with `User.department`.

## Step 8 --- User model

Create `backend/app/models/user.py`.

Table: `users`

Fields: - `id`: integer primary key - `name`: required string - `email`:
required, unique, indexed - `password_hash`: required string; never
store plaintext passwords - `role`: `UserRole`, default `EMPLOYEE` -
`department_id`: nullable FK to `departments.id`, `ON DELETE SET NULL` -
`status`: `RecordStatus`, default `ACTIVE` - `created_at` - `updated_at`

Add `User.department` and pair it with `Department.users` using
`back_populates`.

Do not implement password hashing or authentication in this task.

## Step 9 --- AssetCategory model

Create `backend/app/models/asset_category.py`.

Table: `asset_categories`

Fields: - `id`: integer primary key - `name`: required and unique -
`description`: optional string - `is_active`: boolean, default `True` -
`created_at` - `updated_at`

Add an `assets` relationship paired with `Asset.category`.

Do not add dynamic custom fields or JSON configuration unless already
explicitly required by the project specification.

## Step 10 --- Shared Asset model

Create `backend/app/models/asset.py`.

This shared model is required because allocation, booking, maintenance,
and audit modules depend on it.

Table: `assets`

Fields: - `id`: integer primary key - `asset_tag`: required, unique,
indexed - `name`: required - `category_id`: required FK to
`asset_categories.id` - `serial_number`: optional; unique when present -
`acquisition_date`: optional date - `acquisition_cost`: optional
`Numeric(12, 2)`, not float - `condition`: `AssetCondition`, sensible
default such as `GOOD` - `location`: optional string - `status`:
`AssetStatus`, default `AVAILABLE` - `is_bookable`: boolean, default
`False` - `department_id`: nullable FK to `departments.id`,
`ON DELETE SET NULL` - `created_by`: nullable FK to `users.id`,
`ON DELETE SET NULL` - `created_at` - `updated_at`

Relationships: - `Asset.category` - `Asset.department` -
`Asset.creator` - `AssetCategory.assets` - `Department.assets`

Do not implement asset-tag generation or asset CRUD. Member 2 owns that
business logic.

Do not add allocation, booking, maintenance, or audit relationships yet.

## Step 11 --- Register models

Create or update `backend/app/models/__init__.py`:

``` python
from app.models.asset import Asset
from app.models.asset_category import AssetCategory
from app.models.department import Department
from app.models.user import User

__all__ = [
    "Asset",
    "AssetCategory",
    "Department",
    "User",
]
```

Future teammates must register new models here.

## Step 12 --- Automatic table creation

Create `backend/app/db/init_db.py`:

``` python
from app.db.base import Base
from app.db.session import engine
import app.models  # noqa: F401

def init_db() -> None:
    Base.metadata.create_all(bind=engine)
```

Do not drop tables automatically.

## Step 13 --- Initialize tables at FastAPI startup

Update the existing FastAPI app to use a lifespan handler while
preserving existing routes:

``` python
from contextlib import asynccontextmanager
from fastapi import FastAPI
from app.db.init_db import init_db

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield

app = FastAPI(
    title="AssetFlow API",
    version="1.0.0",
    lifespan=lifespan,
)
```

Preserve `GET /` and `GET /api/v1/health`. The health endpoint must
continue to call `check_database_connection()`.

## Step 14 --- Prototype schema-change policy

Document this clearly:

`Base.metadata.create_all()` creates missing tables but does not
reliably alter existing tables.

During this prototype, when an incompatible schema change occurs and
local data is disposable, developers may reset the database:

``` bash
docker compose down -v
docker compose up --build
```

Warn that `docker compose down -v` deletes all local PostgreSQL data.

Never make the application automatically drop the database.

## Step 15 --- Database conventions document

Create `docs/DATABASE_CONVENTIONS.md` with these concise rules:

-   All models use `from app.db.base import Base`.
-   Routes use the shared `get_db`.
-   Never create feature-specific engines or Base classes.
-   Shared enums live in `app/core/enums.py`.
-   Every model must be imported in `app/models/__init__.py`.
-   Tables use plural `snake_case`.
-   Columns use `snake_case`.
-   Primary key is `id`.
-   Foreign keys use names such as `user_id`, `asset_id`, and
    `department_id`.
-   Prefer `created_at` and `updated_at`.
-   Major workflow logic belongs in feature/service logic, not model
    constructors.
-   For prototype-only incompatible schema changes, reset disposable
    local data with `docker compose down -v`.

## Step 16 --- Team ownership document

Create `docs/TEAM_OWNERSHIP.md`.

### Shared models that must not be recreated

-   User
-   Department
-   AssetCategory
-   Asset

### Member 1 --- Auth and Organization

Owns: - signup and login - password hashing - JWT authentication -
current-user dependency - role-based access control - user management -
departments - asset categories - employee directory - role management

Uses existing `User`, `Department`, and `AssetCategory`.

### Member 2 --- Assets, Allocation and Transfer

Owns: - asset CRUD - asset-tag generation - search and filtering - asset
details - allocation - duplicate-allocation prevention - transfer
requests and approval - returns - asset history

Future models: - `Allocation` - `TransferRequest`

Uses existing `Asset`, `User`, `Department`, and `AssetCategory`. Do not
recreate `Asset`.

### Member 3 --- Booking and Maintenance

Owns: - resource booking - overlap validation - cancellation and
rescheduling - maintenance requests - approval - technician assignment -
progress and resolution

Future models: - `Booking` - `MaintenanceRequest`

Uses existing `Asset`, `User`, and `Department`.

A bookable resource is `Asset.is_bookable = True`. Do not create a
duplicate Resource model.

### Member 4 --- Audit and Dashboard

Owns: - audit cycles - auditor assignment - audit items - asset
verification - missing/damaged reporting - audit closure - dashboard
summary queries

Future models: - `AuditCycle` - `AuditAssignment` - `AuditItem`

Uses existing `Asset`, `User`, and `Department`.

## Step 17 --- Lightweight future model guidance

Add these as guidance only in `docs/TEAM_OWNERSHIP.md`. Do not implement
them now.

### Allocation

Suggested fields: `id`, `asset_id`, `employee_id`, `department_id`,
`allocated_by`, `allocated_at`, `expected_return_date`, `returned_at`,
`return_condition`, `return_notes`, `status`.

### TransferRequest

Suggested fields: `id`, `asset_id`, `current_allocation_id`,
`requested_by`, `target_employee_id`, `target_department_id`, `reason`,
`status`, `approved_by`, `requested_at`, `resolved_at`.

### Booking

Suggested fields: `id`, `asset_id`, `booked_by`, `start_time`,
`end_time`, `status`, `created_at`.

Overlap rule:

``` text
new_start < existing_end
AND
new_end > existing_start
```

Only assets with `is_bookable = True` may be booked.

### MaintenanceRequest

Suggested fields: `id`, `asset_id`, `requested_by`, `description`,
`priority`, `status`, `assigned_to`, `created_at`, `resolved_at`,
`resolution_notes`.

### AuditCycle

Suggested fields: `id`, `name`, `start_date`, `end_date`, `status`,
`created_by`, `created_at`, `closed_at`.

### AuditAssignment

Suggested fields: `id`, `audit_cycle_id`, `auditor_id`.

### AuditItem

Suggested fields: `id`, `audit_cycle_id`, `asset_id`,
`verification_status`, `verified_by`, `notes`, `verified_at`.

Feature owners may refine these when implementing actual requirements,
but must reuse the shared core models.

## Step 18 --- Fresh Docker database test

Because there is currently no valuable database data, test the
foundation from a fresh volume:

``` bash
docker compose down -v
docker compose up --build -d
docker compose ps
```

The backend startup should automatically create tables.

Verify:

``` bash
docker compose exec db psql -U assetflow -d assetflow_db -c "\dt"
```

Expected application tables: - `asset_categories` - `assets` -
`departments` - `users`

There should be no `alembic_version` table.

Inspect tables:

``` bash
docker compose exec db psql -U assetflow -d assetflow_db -c "\d users"
docker compose exec db psql -U assetflow -d assetflow_db -c "\d departments"
docker compose exec db psql -U assetflow -d assetflow_db -c "\d asset_categories"
docker compose exec db psql -U assetflow -d assetflow_db -c "\d assets"
```

Verify primary keys, foreign keys, unique constraints, indexes, and
nullable rules.

## Step 19 --- Verify existing application

Verify: - frontend: `http://localhost:5173` - backend:
`http://localhost:8000` - health:
`http://localhost:8000/api/v1/health` - Swagger:
`http://localhost:8000/docs`

Expected health response:

``` json
{
  "status": "healthy",
  "backend": "connected",
  "database": "connected"
}
```

## Step 20 --- Git workflow

Perform this task on `feature/database-foundation`.

If currently on a clean `main`:

``` bash
git checkout main
git pull origin main
git checkout -b feature/database-foundation
```

After implementation:

``` bash
git status
git add .
git status
```

Verify these are not staged: - `.env` - `node_modules/` -
`__pycache__/` - `.venv/` - `venv/`

Create a local commit:

``` bash
git commit -m "feat: add shared database foundation and core models"
```

Do not run `git push` or merge into `main` unless explicitly instructed
after review.

# Final acceptance checklist

-   [ ] One shared SQLAlchemy Base exists.
-   [ ] One shared database engine exists.
-   [ ] `SessionLocal` and `get_db()` exist.
-   [ ] Health check still executes `SELECT 1`.
-   [ ] `init_db()` uses `Base.metadata.create_all()`.
-   [ ] No Alembic dependency or configuration exists.
-   [ ] Department, User, AssetCategory, and Asset models exist.
-   [ ] Required relationships work.
-   [ ] No circular `Department.head_id` foreign key was introduced.
-   [ ] `Asset.is_bookable` exists.
-   [ ] Fresh Docker volume test succeeds.
-   [ ] All four tables are created automatically.
-   [ ] Frontend, backend, Swagger, and health endpoint still work.
-   [ ] `docs/DATABASE_CONVENTIONS.md` exists.
-   [ ] `docs/TEAM_OWNERSHIP.md` exists.
-   [ ] `.env` and secrets are not staged.
-   [ ] Work is on `feature/database-foundation`.
-   [ ] No push or merge to `main` occurred.

# Completion report

When finished, report:

1.  Current Git branch.
2.  Files created and modified.
3.  Dependencies changed.
4.  Database architecture implemented.
5.  Models and relationships created.
6.  PostgreSQL tables created.
7.  Whether the fresh-volume test succeeded.
8.  Whether the health endpoint still succeeds.
9.  Any errors and fixes.
10. `git status` summary.
11. Whether a local commit was created.
12. Explicit confirmation that no push or merge to `main` was performed.

If anything failed, report the exact failure instead of claiming
success.
