# AssetFlow — Enterprise Asset & Resource Management System

AssetFlow is a centralized, enterprise-grade ERP platform designed to simplify and digitize how organizations register, track, allocate, and maintain their physical assets and shared resources. By shifting away from manual processes (such as spreadsheets and paper logs), AssetFlow offers real-time operational snapshots, automated conflict handling, and structured approval workflows.

---

## 📖 Problem Statement & Objective

The main objective of AssetFlow is to build a robust, user-centric ERP solution managing the relationships between **Departments**, **Employees**, **Assets**, **Bookings**, **Maintenance Requests**, and **Audit Cycles** while enforcing secure, role-based workflows.

### Key Capabilities Required:
* **Directory Management**: Maintain active departments, asset categories, and a secure employee directory.
* **Lifecycle State Tracking**: Manage assets through their full operational state lifecycle:
  `Available` ↔ `Allocated` ↔ `Reserved` ↔ `Under Maintenance` ↔ `Lost` ↔ `Retired` ↔ `Disposed`
* **Double-Allocation Block**: Prevent allocating a single asset to multiple parties simultaneously.
* **Overlap-Free Bookings**: Centralize resource reservations (e.g. rooms, vehicles) with real-time time-slot overlap checks.
* **Structured Maintenance**: Route repair requests through approval stages before technicians can begin work.
* **Scheduled Audits**: Create and close audit cycles, assign auditors, and auto-flag discrepancies (marking confirmed-missing items as `Lost`).
* **KPI Dashboard**: Surface real-time metrics (available assets, active bookings, pending repairs) and notifications.

---

## 🛠 Technology Stack

AssetFlow is structured as a full-stack monorepo application:

* **Backend**: FastAPI (Python 3.12) using SQLAlchemy 2.0 (ORM) and PostgreSQL 17 (Database).
* **Frontend**: React (Vite, Single Page Application) styled using CSS variables (light theme default, with scoped dark-glass theme styling for operational screens).
* **Containerization**: Docker & Docker Compose for rapid, cross-platform local orchestration.

---

## 🧱 System Architecture & DB Constraints

The application enforces strict data boundaries and state validation rules at both the API and database levels:

### 1. Unified State Gateway
* All asset state mutations must be driven by `AssetStateService.transition(db, asset_id, new_status, actor)` to guarantee that a matching `STATUS_TRANSITION` audit trail record is written to the `asset_history` table in a single atomic transaction.

### 2. Double-Allocation Prevention (Database Level)
* Enforced by a PostgreSQL unique partial index on active allocations:
  ```sql
  CREATE UNIQUE INDEX one_active_allocation 
  ON allocations (asset_id) WHERE status = 'ACTIVE';
  ```
  If concurrent allocation requests occur, the database rejects the second write with an `IntegrityError` (which is caught by the API and returns `HTTP 409 Conflict`).

### 3. Booking Overlap Prevention (Database Level)
* Enforced by a PostgreSQL exclude index constraint utilizing `btree_gist` range checks:
  ```sql
  ALTER TABLE bookings ADD CONSTRAINT no_overlap
  EXCLUDE USING gist (
    asset_id WITH =,
    tstzrange(start_time, end_time, '[)') WITH &&
  ) WHERE (status <> 'CANCELLED');
  ```
  This guarantees that no two concurrent processes can register overlapping time-slots for the same asset.

---

## 👥 User Roles & Permissions (RBAC)

The system defines four distinct roles, with permissions strictly validated on the backend API layer:

1. **Admin**
   * Manages departments, asset categories, and user system promotions.
   * Can create and review organization-wide audits.
2. **Asset Manager**
   * Registers new assets.
   * Allocates assets, reviews transfer requests, and handles condition check-in notes upon returns.
   * Approves/rejects maintenance requests and assigns technicians.
3. **Department Head**
   * Approves/rejects asset allocation or transfer requests scoped to employees within their department.
   * Books shared resources on behalf of the department.
4. **Employee**
   * Views their own allocated assets.
   * Books shared bookable resources (vehicles, meeting rooms).
   * Raises maintenance requests for assets under their custody.
   * Initiates return requests or transfers.

---

## 📦 Project Modules

### Member 1: Authentication & Organization Setup
* **JWT Security**: Enforces hashing with bcrypt, session validation via `/auth/me`, and OAuth2 token authorization headers.
* **Signup Control**: Enforces that user signup creates a basic `EMPLOYEE` role only, preventing self-elevating privileges.
* **Directory Management**: Admin-only screen to create/edit departments and categories. Provides promoting selectors to assign roles to employees.

### Member 2: Asset Registry & Directory
* **Asset Creation**: Registers serial numbers, condition status, acquisition metrics, locations, and a `is_bookable` flag.
* **Auto-Tagging**: Ingestion generator that checks the DB count to produce consecutive asset tags (e.g. `AF-0001`, `AF-0002`).
* **Interactive Directory**: Displays lifecycle status and filters assets dynamically.

### Member 3: Operational Workflows (Allocations, Bookings, & Maintenance)
* **Allocations & Transfers**: Implements allocations to employees/departments. If an asset is already allocated, the UI blocks double-allocation and prompts the user to request a transfer instead. Handles return request approvals.
* **Resource Booking**: Features an interactive hourly calendar timeline view for reserving assets.
* **Maintenance Kanban**: Organizes maintenance tickets on a 5-column board tracking lifecycle states (`Pending` → `Approved`/`Rejected` → `Technician Assigned` → `In Progress` → `Resolved`).

### Member 4: Dashboard, Audits, & Logs
* **Operations Dashboard**: Integrates operational KPIs and real-time summaries.
* **Audit Cycles**: Features scheduled audit checks where auditors mark assets as `Verified`, `Missing`, or `Damaged`.
* **Activity Logs**: System-wide logs that track administrative and operational actions.

---

## 📡 REST API Directory (Swagger Endpoint Spec)

FastAPI registers all API routers. The following operations are exposed:

### Authentication
* `POST /api/v1/auth/signup` - Register a new account (defaults to `EMPLOYEE` role).
* `POST /api/v1/auth/login` - Authenticate credentials and return Bearer JWT token.
* `GET /api/v1/auth/me` - Get current user profile detail.

### Master Data & Directory Setup
* `GET /api/v1/departments` - List active departments.
* `POST /api/v1/departments` - Create a department (Admin only).
* `PATCH /api/v1/departments/{id}` - Modify name or status of a department.
* `GET /api/v1/asset-categories` - List categories.
* `POST /api/v1/asset-categories` - Create a category (Admin only).
* `PATCH /api/v1/asset-categories/{id}` - Edit category properties.
* `GET /api/v1/users` - Get employee directory (Admin only).
* `PATCH /api/v1/users/{id}` - Manage roles, status, and departments.

### Assets Operations
* `GET /api/v1/assets` - Search and filter assets.
* `POST /api/v1/assets` - Register an asset (creates consecutive `AF-XXXX` tag).
* `GET /api/v1/assets/{id}` - View asset details.
* `PATCH /api/v1/assets/{id}` - Modify asset properties.

### Member 3 Operational Workflows
* `GET /api/v1/allocations` - List allocations.
* `POST /api/v1/allocations` - Create an asset allocation.
* `POST /api/v1/allocations/{id}/return-request` - Request returns (employees).
* `POST /api/v1/allocations/{id}/return-approve` - Approve return and check-in condition (Managers).
* `GET /api/v1/transfers` - List transfer requests.
* `POST /api/v1/transfers` - Submit an asset transfer.
* `POST /api/v1/transfers/{id}/approve` - Approve transfer (Managers/Dept Heads).
* `POST /api/v1/transfers/{id}/reject` - Reject transfer.
* `GET /api/v1/bookings` - Fetch bookings list.
* `POST /api/v1/bookings` - Submit slot booking.
* `PATCH /api/v1/bookings/{id}/reschedule` - Reschedule time-slot.
* `POST /api/v1/bookings/{id}/cancel` - Cancel booking.
* `GET /api/v1/maintenance` - Fetch maintenance tickets.
* `POST /api/v1/maintenance` - Submit a maintenance request.
* `POST /api/v1/maintenance/{id}/approve` - Approve repair work.
* `POST /api/v1/maintenance/{id}/reject` - Reject repair request.
* `POST /api/v1/maintenance/{id}/assign` - Assign technician.
* `POST /api/v1/maintenance/{id}/start` - Begin repair work.
* `POST /api/v1/maintenance/{id}/resolve` - Resolve and set asset status back to Available.

### Member 4 Auditing & Dashboard
* `GET /api/v1/dashboard/summary` - Get real-time available/allocated metrics.
* `GET /api/v1/dashboard/recent-activity` - Get latest 10 action logs.
* `GET /api/v1/activity` - Fetch full activity log history.
* `GET /api/v1/audits` - List audit cycles.
* `POST /api/v1/audits` - Create a cycle.
* `POST /api/v1/audits/{id}/assignments` - Assign auditors.
* `POST /api/v1/audits/{id}/start` - Launch cycle.
* `GET /api/v1/audits/{id}/items` - List audited items.
* `PATCH /api/v1/audits/{id}/items/{item_id}` - Log asset inspection.
* `GET /api/v1/audits/{id}/discrepancies` - List missing/damaged assets.
* `POST /api/v1/audits/{id}/close` - Close audit and update missing statuses.

---

## 🚀 Getting Started (Setup & Execution)

The entire full-stack application and its PostgreSQL instance are containerized.

### 1. Run the Application
Start the cluster in detached mode:
```bash
docker compose up --build -d
```

### 2. Verify Services
Once running, check the local container cluster:
* **Frontend UI**: [http://localhost:5173](http://localhost:5173) (Sign up as employee, or promote accounts in Organization Setup)
* **Backend Docs (Swagger)**: [http://localhost:8000/docs](http://localhost:8000/docs)
* **API Health Check**: [http://localhost:8000/api/v1/health](http://localhost:8000/api/v1/health)

### 3. Retrieve Live Container Logs
```bash
docker compose logs -f
# Or target individual logs
docker compose logs backend
docker compose logs frontend
```

### 4. Database Reset (Clean Seed Data)
To wipe persistent database volumes and perform a fresh schema initialization:
```bash
docker compose down -v
docker compose up --build -d
```

---

## 🔍 Troubleshooting

* **Port 5432 / 5433 Contention**: If you have a local PostgreSQL engine running on your system, port mapping conflicts might occur. Check `docker-compose.yml` and adjust host port mappings. Do not change internal docker host URL configurations.
* **Database Reloader Lock**: If you update SQLAlchemy model schemas and see relation anomalies, run `docker compose down -v` to delete old data volumes and restart the database.
* **Vite Network Resolution**: Ensure Vite is binding to host `0.0.0.0` so that docker network bindings can bridge properly to localhost.
