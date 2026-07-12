# Member 1 --- Auth + Organization Setup MVP

## Goal

Deliver the entry point and master-data setup required by the rest of
AssetFlow.

Owned screens: - Screen 1: Login / Signup - Screen 3: Organization Setup
with Departments, Categories, Employees tabs

Branch:

``` bash
git checkout main
git pull origin main
git checkout -b feature/auth-organization
```

# Common Rules

-   This is a hackathon MVP. Implement only the assigned scope.
-   Stack: FastAPI, React/Vite, PostgreSQL, Docker Compose.
-   Reuse the existing shared SQLAlchemy `Base`, engine, `SessionLocal`,
    and `get_db`.
-   Reuse existing shared models: `User`, `Department`, `AssetCategory`,
    `Asset`.
-   Do not add Alembic, Redis, Celery, Kubernetes, microservices,
    repository-pattern abstractions, or a new state-management library.
-   Do not create duplicate shared models or a second database
    connection layer.
-   Prefer existing dependencies. Add a package only when the feature
    cannot reasonably be implemented without it.
-   Preserve the existing health endpoint and Docker setup.
-   Register every new SQLAlchemy model in
    `backend/app/models/__init__.py`.
-   Build the simplest responsive UI matching the supplied Excalidraw
    screens; functionality is more important than pixel-perfect styling.
-   Do not push or merge to `main`. Push only the assigned feature
    branch and open a PR for review.
-   Before coding: `git checkout main`, `git pull origin main`, then
    create the assigned branch.
-   Before finishing: run Docker, verify the feature manually, verify
    `/api/v1/health`, and report exact failures instead of claiming
    success.

## Must deliver before the first integration checkpoint

### Backend

Implement only:

``` text
POST /api/v1/auth/signup
POST /api/v1/auth/login
GET  /api/v1/auth/me

GET  /api/v1/departments
POST /api/v1/departments
PATCH /api/v1/departments/{id}

GET  /api/v1/asset-categories
POST /api/v1/asset-categories
PATCH /api/v1/asset-categories/{id}

GET   /api/v1/users
PATCH /api/v1/users/{id}
```

### Authentication rules

-   Signup creates `EMPLOYEE` only.
-   Never accept role selection from public signup.
-   Store only a password hash.
-   Login returns a JWT access token.
-   `/auth/me` validates the token.
-   Do not implement refresh tokens for the MVP.
-   Do not implement OAuth/social login.
-   Forgot-password UI may be a non-functional placeholder if time is
    limited; do not build email infrastructure.

Use a minimal password-hashing/JWT solution. If compatible auth/security
dependencies already exist, reuse them. Do not install an auth
framework.

### Organization rules

Departments: - list; - create; - edit name/status.

Categories: - list; - create; - edit name/description/status.

Employees: - list name, email, department, role, status; - admin can
change department, role, status.

For the MVP, do not add parent-department hierarchy or category-specific
dynamic fields unless already present and trivial to expose.

### Bootstrap problem

The specification says signup cannot self-assign admin. The app still
needs one initial admin.

Use the simplest existing project-compatible bootstrap method: -
seed/configure one development admin from environment/startup logic,
or - document a one-time local database command.

Do not allow public admin signup.

## Frontend

Build: - `/login` - `/signup` - `/organization`

Organization screen tabs: - Departments - Categories - Employees

Required behavior: - login stores token using the project's simplest
existing approach; - protected pages redirect unauthenticated users to
login; - organization page is admin-only in UI and backend; - show basic
loading/error/success states.

Do not add Redux or another global state library. Use React
state/context only if needed.

## Do not build

-   dashboard;
-   asset CRUD;
-   allocation;
-   booking;
-   maintenance;
-   audit;
-   notifications;
-   real email-based forgot-password flow.

## Acceptance test

1.  Create/login with a valid account.
2.  Public signup always becomes `EMPLOYEE`.
3.  Non-admin cannot promote themselves.
4.  Admin can create a department and category.
5.  Admin can assign an employee's department and role.
6.  Refreshing a protected page still validates the session/token.
7.  Health endpoint remains healthy.

## Completion report

Report endpoints, UI routes, dependencies added, bootstrap-admin method,
tests performed, shared files changed, and known limitations.
