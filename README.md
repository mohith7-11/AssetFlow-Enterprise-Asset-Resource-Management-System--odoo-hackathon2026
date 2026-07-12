# AssetFlow

AssetFlow is an Enterprise Asset & Resource Management System.

## Technology Stack

- FastAPI
- React
- PostgreSQL
- Docker Compose

## Prototype Database Foundation

This repository includes a shared PostgreSQL prototype foundation with one SQLAlchemy Base, one shared engine/session factory, and automatic table creation at backend startup. `Base.metadata.create_all()` creates missing tables but does not reliably alter existing tables.

For incompatible prototype schema changes, developers may reset disposable local data with:

```bash
docker compose down -v
docker compose up --build
```

Warning: `docker compose down -v` deletes all local PostgreSQL data.

## Prerequisites

Developers need:

- Git
- Docker Desktop, or Docker Engine with Docker Compose

A local PostgreSQL installation and a local Python virtual environment are not required for the containerized development workflow.

## Setup

Clone the repository:

```bash
git clone <repository-url>
cd assetflow
```

Create the environment file.

macOS/Linux:

```bash
cp .env.example .env
```

Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

Start all services:

```bash
docker compose up --build
```

## Service URLs

- Frontend: http://localhost:5173
- Backend: http://localhost:8000
- Health check: http://localhost:8000/api/v1/health
- Swagger/OpenAPI: http://localhost:8000/docs

## Stop

```bash
docker compose down
```

## Reset Local Database

Warning: this deletes local PostgreSQL data.

```bash
docker compose down -v
```

## Rebuild

```bash
docker compose up --build
```

## Logs

```bash
docker compose logs -f
```

Individual services:

```bash
docker compose logs backend
docker compose logs db
docker compose logs frontend
```

## Development Credentials

The values in `.env.example` are development-only credentials for local Docker use. Do not reuse them for production or real accounts.

## Branch Strategy

The intended future strategy is:

- `main` - stable/demo-ready code
- `develop` - integration branch
- `feature/*` - feature development

Feature branches should eventually merge into `develop`, and tested integration changes can later merge into `main`.

## Troubleshooting

- If port 5432 is already in use, stop the local PostgreSQL service or change only the host mapping to another port such as `5433:5432`. Do not change the internal database URL from `db:5432`.
- If port 8000 is already in use, stop the conflicting application or change the host mapping while keeping the container port at 8000.
- If port 5173 is already in use, stop the conflicting Vite process or change the host mapping while keeping the container port at 5173.
- If the backend cannot authenticate to PostgreSQL, verify that `POSTGRES_PASSWORD` in `.env` matches the password inside `DATABASE_URL`.
- If the PostgreSQL volume was initialized with an old password, changing `.env` alone will not rewrite the existing database password. For a disposable local database, run `docker compose down -v` and then `docker compose up --build`.
- If the backend tries to connect to localhost, correct the database URL so it uses `db:5432` inside Docker Compose.
- If the frontend container runs but the browser cannot connect, ensure the Vite command includes `--host 0.0.0.0`.
