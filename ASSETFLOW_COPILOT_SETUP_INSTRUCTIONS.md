# AssetFlow --- GitHub Copilot Implementation Instructions

## Objective

Set up the shared local development foundation for **AssetFlow**, an
Enterprise Asset & Resource Management System.

Create a containerized monorepo using:

-   **Backend:** FastAPI, Python 3.12
-   **Frontend:** React with Vite
-   **Database:** PostgreSQL
-   **Database access:** SQLAlchemy with psycopg
-   **Containerization:** Docker and Docker Compose

The setup must work across Windows, macOS, and Linux as long as Docker
and Git are installed.

## Important scope constraints

For this task:

-   Build only the development foundation.
-   Do not implement authentication, users, departments, assets,
    bookings, maintenance, audits, or other business features yet.
-   Do not add Alembic yet.
-   Do not create the full database schema yet.
-   Do not push anything to GitHub automatically.
-   Do not run `git push`.
-   Do not create or push `main` or `develop` branches remotely.
-   Local Git initialization and a local commit are allowed, but stop
    before any remote push.
-   Never commit `.env`.
-   Commit `.env.example`.
-   Prefer simple, readable configuration over production-level
    complexity.
-   Do not add Kubernetes, Nginx, Redis, Celery, microservices, or other
    infrastructure.

The final success condition is:

1.  PostgreSQL starts and becomes healthy.
2.  FastAPI starts only after PostgreSQL is healthy.
3.  FastAPI can execute `SELECT 1` against PostgreSQL.
4.  React/Vite starts and is accessible from the host browser.
5.  FastAPI Swagger documentation is accessible.
6.  All services can be started with one command:
    `docker compose up --build`

------------------------------------------------------------------------

# Step 2 --- Create the project structure

Assume the current working directory is the root of the `assetflow`
repository.

Create this structure:

``` text
assetflow/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── database.py
│   │   └── main.py
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .dockerignore
├── frontend/
│   ├── src/
│   ├── package.json
│   ├── package-lock.json
│   ├── Dockerfile
│   └── .dockerignore
├── docker-compose.yml
├── .env.example
├── .env
├── .gitignore
└── README.md
```

Generate the frontend as a standard React/Vite application if it does
not already exist.

Preferred command when Node.js is locally available:

``` bash
npm create vite@latest frontend -- --template react
```

Then install dependencies:

``` bash
cd frontend
npm install
cd ..
```

If the frontend already exists, do not overwrite working files
unnecessarily.

------------------------------------------------------------------------

# Step 3 --- Create the FastAPI backend

Create `backend/app/__init__.py`.

It may remain empty.

Create `backend/app/database.py` with the following behavior:

-   Read `DATABASE_URL` from the environment.
-   Fail clearly at application startup/import time if `DATABASE_URL` is
    missing.
-   Create a SQLAlchemy engine.
-   Enable `pool_pre_ping=True`.
-   Provide a function named `check_database_connection()`.
-   The function must open a connection and execute SQLAlchemy
    `text("SELECT 1")`.
-   The function returns `True` if the query succeeds.
-   Do not hardcode database credentials in Python.

Expected implementation:

``` python
import os

from sqlalchemy import create_engine, text


DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL environment variable is not set")


engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
)


def check_database_connection() -> bool:
    with engine.connect() as connection:
        connection.execute(text("SELECT 1"))

    return True
```

Create `backend/app/main.py`.

Requirements:

-   Create a FastAPI application.
-   Title: `AssetFlow API`
-   Version: `1.0.0`
-   `GET /` returns a simple API-running message.
-   `GET /api/v1/health` must call `check_database_connection()`.
-   If the database connection succeeds, return HTTP 200 with:
    -   `status: healthy`
    -   `backend: connected`
    -   `database: connected`
-   If database access fails, return HTTP 503.
-   Do not expose database passwords or internal exception details in
    the API response.

Expected implementation:

``` python
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
```

------------------------------------------------------------------------

# Step 4 --- Backend dependencies

Create `backend/requirements.txt` containing:

``` text
fastapi
uvicorn[standard]
sqlalchemy
psycopg[binary]
pydantic-settings
```

Do not add unrelated dependencies.

------------------------------------------------------------------------

# Step 5 --- Backend Dockerfile

Create `backend/Dockerfile`:

``` dockerfile
FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
```

This is a development Dockerfile.

The backend source directory will be bind-mounted by Docker Compose, so
`--reload` is intentional.

------------------------------------------------------------------------

# Step 6 --- Backend Docker ignore rules

Create `backend/.dockerignore`:

``` text
__pycache__
*.pyc
*.pyo
*.pyd

.venv
venv
env

.pytest_cache
.mypy_cache

.env

.git
.gitignore
```

------------------------------------------------------------------------

# Step 7 --- Frontend Docker setup

Use the React/Vite application generated earlier.

Create `frontend/Dockerfile`:

``` dockerfile
FROM node:22-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
```

Important:

-   Vite must bind to `0.0.0.0`.
-   Do not bind only to `localhost` inside the container.
-   Keep this as a development container.

Create `frontend/.dockerignore`:

``` text
node_modules
dist

.env
.env.local

.git
.gitignore
```

Do not unnecessarily modify the default Vite React UI in this
infrastructure task. It is sufficient for the default page to load
successfully.

------------------------------------------------------------------------

# Step 8 --- Environment variables

Create a root `.env` for local development:

``` env
POSTGRES_USER=assetflow
POSTGRES_PASSWORD=assetflow_dev_password
POSTGRES_DB=assetflow_db

DATABASE_URL=postgresql+psycopg://assetflow:assetflow_dev_password@db:5432/assetflow_db
```

Important:

-   `.env` must never be committed.
-   The hostname in `DATABASE_URL` must be `db`, not `localhost`,
    because the backend connects to PostgreSQL through the Docker
    Compose network.
-   The password in `POSTGRES_PASSWORD` and the password embedded in
    `DATABASE_URL` must match.

Create `.env.example`.

For the fastest team onboarding, use development-only example values
that work immediately:

``` env
POSTGRES_USER=assetflow
POSTGRES_PASSWORD=assetflow_dev_password
POSTGRES_DB=assetflow_db

DATABASE_URL=postgresql+psycopg://assetflow:assetflow_dev_password@db:5432/assetflow_db
```

Add a comment to the README explaining that these are local development
credentials only and must not be reused for production or real accounts.

------------------------------------------------------------------------

# Step 9 --- Docker Compose

Create root `docker-compose.yml`.

Use exactly three services:

-   `db`
-   `backend`
-   `frontend`

Use a named volume called `postgres_data`.

Recommended configuration:

``` yaml
services:
  db:
    image: postgres:17-alpine
    container_name: assetflow-db
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    healthcheck:
      test:
        [
          "CMD-SHELL",
          "pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB}"
        ]
      interval: 5s
      timeout: 5s
      retries: 5

  backend:
    build:
      context: ./backend
    container_name: assetflow-backend
    environment:
      DATABASE_URL: ${DATABASE_URL}
    volumes:
      - ./backend:/app
    ports:
      - "8000:8000"
    depends_on:
      db:
        condition: service_healthy

  frontend:
    build:
      context: ./frontend
    container_name: assetflow-frontend
    volumes:
      - ./frontend:/app
      - /app/node_modules
    ports:
      - "5173:5173"
    depends_on:
      - backend

volumes:
  postgres_data:
```

Behavioral requirements:

-   PostgreSQL data must persist across ordinary `docker compose down`
    operations.
-   Backend must wait for the PostgreSQL health check before starting.
-   Backend must use `db:5432` internally.
-   Host ports:
    -   PostgreSQL: `5432`
    -   FastAPI: `8000`
    -   React/Vite: `5173`
-   Do not add a deprecated top-level Compose `version` field.

------------------------------------------------------------------------

# Step 10 --- Root Git ignore rules

Create root `.gitignore`:

``` text
# Environment variables
.env
.env.*
!.env.example

# Python
__pycache__/
*.py[cod]
.venv/
venv/

# Node
node_modules/
frontend/node_modules/
frontend/dist/

# IDE
.vscode/
.idea/

# OS
.DS_Store
Thumbs.db

# Testing
.pytest_cache/
.coverage

# Logs
*.log
```

Verify that:

-   `.env` is ignored.
-   `.env.example` is not ignored.

When Git is available, the following command should print `.env`:

``` bash
git check-ignore .env
```

------------------------------------------------------------------------

# Step 11 --- Create the README

Create `README.md` with clear onboarding instructions.

It must include:

## Project title

`AssetFlow`

## Description

AssetFlow is an Enterprise Asset & Resource Management System.

## Technology stack

-   FastAPI
-   React
-   PostgreSQL
-   Docker Compose

## Prerequisites

Developers need:

-   Git
-   Docker Desktop, or Docker Engine with Docker Compose

Explain that local PostgreSQL and a local Python virtual environment are
not required for the containerized development workflow.

## Setup

Clone the repository:

``` bash
git clone <repository-url>
cd assetflow
```

Create the environment file.

macOS/Linux:

``` bash
cp .env.example .env
```

Windows PowerShell:

``` powershell
Copy-Item .env.example .env
```

Start all services:

``` bash
docker compose up --build
```

## Service URLs

Document:

-   Frontend: `http://localhost:5173`
-   Backend: `http://localhost:8000`
-   Health check: `http://localhost:8000/api/v1/health`
-   Swagger/OpenAPI: `http://localhost:8000/docs`

## Stop

``` bash
docker compose down
```

## Reset local database

Clearly warn that this deletes local PostgreSQL data:

``` bash
docker compose down -v
```

## Rebuild

``` bash
docker compose up --build
```

## Logs

``` bash
docker compose logs -f
```

Individual services:

``` bash
docker compose logs backend
docker compose logs db
docker compose logs frontend
```

## Development credentials

Explain that `.env.example` contains development-only credentials for
local Docker use and must not be reused in production.

## Branch strategy

Document the intended future strategy without creating or pushing remote
branches:

-   `main` --- stable/demo-ready code
-   `develop` --- integration branch
-   `feature/*` --- feature development

State that feature branches should eventually merge into `develop`, and
tested integration changes can later merge into `main`.

------------------------------------------------------------------------

# Step 12 --- Build and verify the Docker setup

After all files are created, validate the setup.

First, stop any existing project containers:

``` bash
docker compose down
```

Build and start:

``` bash
docker compose up --build
```

If running interactively, keep the terminal open or use another terminal
for verification.

Expected services:

``` text
assetflow-db
assetflow-backend
assetflow-frontend
```

Check:

``` bash
docker compose ps
```

Verify all of the following:

### Frontend

Open:

``` text
http://localhost:5173
```

Expected:

-   React/Vite page loads.
-   Browser does not show a connection error.

### Backend root

Open:

``` text
http://localhost:8000
```

Expected response:

``` json
{
  "message": "AssetFlow API is running"
}
```

### Health check

Open:

``` text
http://localhost:8000/api/v1/health
```

Expected response:

``` json
{
  "status": "healthy",
  "backend": "connected",
  "database": "connected"
}
```

This endpoint must perform a real `SELECT 1` against PostgreSQL.

### Swagger

Open:

``` text
http://localhost:8000/docs
```

Expected:

-   FastAPI Swagger UI loads.
-   `/` and `/api/v1/health` are visible.

### Container status

Run:

``` bash
docker compose ps
```

Expected:

-   PostgreSQL is healthy.
-   Backend is running.
-   Frontend is running.
-   No service is continuously restarting.

------------------------------------------------------------------------

# Step 13 --- Troubleshooting rules

If setup fails, diagnose before changing architecture.

## Port 5432 already in use

A locally installed PostgreSQL instance may already use port 5432.

Preferred options:

1.  Stop the local PostgreSQL service, or
2.  Change only the host mapping to another port, for example:
    `"5433:5432"`

Do not change the internal backend database URL from `db:5432`.

## Port 8000 already in use

Stop the conflicting application or change the host mapping while
keeping the container port at 8000.

## Port 5173 already in use

Stop the conflicting Vite process or change the host mapping while
keeping the container port at 5173.

## Backend cannot authenticate to PostgreSQL

Verify:

-   `POSTGRES_PASSWORD` in `.env`
-   password inside `DATABASE_URL`

They must match.

If the PostgreSQL volume was initialized with an old password, changing
`.env` alone does not rewrite the existing database user's password.

For a disposable local development database, reset it:

``` bash
docker compose down -v
docker compose up --build
```

Warning: `-v` deletes local database data.

## Backend tries to connect to localhost

Correct the URL.

Wrong:

``` text
postgresql+psycopg://...@localhost:5432/...
```

Correct inside Docker Compose:

``` text
postgresql+psycopg://...@db:5432/...
```

## Frontend container runs but browser cannot connect

Ensure the Vite command includes:

``` text
--host 0.0.0.0
```

## View logs

Use:

``` bash
docker compose logs -f
```

Or:

``` bash
docker compose logs backend
docker compose logs db
docker compose logs frontend
```

------------------------------------------------------------------------

# Step 14 --- Verify clean restart behavior

After the first successful run:

``` bash
docker compose down
docker compose up
```

Verify the application still works without rebuilding.

Then test a rebuild:

``` bash
docker compose down
docker compose up --build
```

Verify all three services again.

Do not run `docker compose down -v` during normal development because it
deletes PostgreSQL data.

------------------------------------------------------------------------

# Step 15 --- Git safety checks and local commit

Only perform this section after Docker works.

Do not push to GitHub.

Do not run `git push`.

If the repository is not initialized locally:

``` bash
git init
git branch -M main
```

Check ignored files:

``` bash
git check-ignore .env
```

Expected output:

``` text
.env
```

Review status:

``` bash
git status
```

Make sure `.env` is not staged or tracked.

If `.env` was accidentally tracked previously, remove it from Git
tracking without deleting the local file:

``` bash
git rm --cached .env
```

Then stage files:

``` bash
git add .
```

Review exactly what will be committed:

``` bash
git status
```

The commit should include infrastructure files such as:

``` text
.gitignore
.env.example
README.md
docker-compose.yml
backend/
frontend/
```

The commit must not include:

``` text
.env
node_modules/
__pycache__/
```

Create a local commit:

``` bash
git commit -m "chore: initialize AssetFlow Docker development environment"
```

STOP HERE.

Do not:

``` bash
git remote add origin ...
git push ...
```

The repository owner will manually review the Docker setup and perform
the GitHub push after confirming that everything works.

------------------------------------------------------------------------

# Final acceptance checklist

Before declaring the task complete, verify every item:

-   [ ] `backend/app/main.py` exists.
-   [ ] `backend/app/database.py` exists.
-   [ ] FastAPI starts successfully.
-   [ ] PostgreSQL starts successfully.
-   [ ] PostgreSQL health check becomes healthy.
-   [ ] Backend waits for healthy PostgreSQL.
-   [ ] Backend executes `SELECT 1` successfully.
-   [ ] `GET /api/v1/health` reports backend and database connected.
-   [ ] React/Vite starts successfully.
-   [ ] Frontend is accessible at `http://localhost:5173`.
-   [ ] Backend is accessible at `http://localhost:8000`.
-   [ ] Swagger is accessible at `http://localhost:8000/docs`.
-   [ ] `.env` exists locally.
-   [ ] `.env` is ignored by Git.
-   [ ] `.env.example` is committed/staged.
-   [ ] `node_modules` is not committed/staged.
-   [ ] `__pycache__` is not committed/staged.
-   [ ] `README.md` contains onboarding and troubleshooting
    instructions.
-   [ ] `docker compose down` preserves PostgreSQL data.
-   [ ] No `git push` command has been executed.
-   [ ] No remote GitHub push has been performed.

## Completion response

When finished, report:

1.  Which files were created or modified.
2.  Whether `docker compose up --build` succeeded.
3.  The status of each service.
4.  Whether the health endpoint successfully connected to PostgreSQL.
5.  Any errors encountered and how they were resolved.
6.  The output summary of `git status`.
7.  Whether the local commit was created.
8.  Explicit confirmation that no GitHub push was performed.
