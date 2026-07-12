# Member 3 — Allocation, Booking & Maintenance MVP Implementation Roadmap

This roadmap breaks down the deliverables of **Member 3 (Allocation + Booking + Maintenance)** into four small, independent execution phases suited for a 6-hour hackathon. It strictly complies with the existing monorepo architecture, database conventions, and shared core services.

---

## Phase 1: Database Schema, Models & Constraints (~1.5 hours)

### 1. Objective
Establish the database models and underlying transactional safety nets (PostgreSQL unique indices and range exclusion constraints) required for operations.

### 2. Files to Create or Modify
* **[NEW]** [allocation.py](file:///Users/srinivasch/Desktop/AssetFlow-Enterprise-Asset-Resource-Management-System--odoo-hackathon2026/backend/app/models/allocation.py)
* **[NEW]** [transfer_request.py](file:///Users/srinivasch/Desktop/AssetFlow-Enterprise-Asset-Resource-Management-System--odoo-hackathon2026/backend/app/models/transfer_request.py)
* **[NEW]** [booking.py](file:///Users/srinivasch/Desktop/AssetFlow-Enterprise-Asset-Resource-Management-System--odoo-hackathon2026/backend/app/models/booking.py)
* **[NEW]** [maintenance_request.py](file:///Users/srinivasch/Desktop/AssetFlow-Enterprise-Asset-Resource-Management-System--odoo-hackathon2026/backend/app/models/maintenance_request.py)
* **[MODIFY]** [models/\_\_init\_\_.py](file:///Users/srinivasch/Desktop/AssetFlow-Enterprise-Asset-Resource-Management-System--odoo-hackathon2026/backend/app/models/__init__.py) (Register new models in `__all__`)
* **[MODIFY]** [db/init_db.py](file:///Users/srinivasch/Desktop/AssetFlow-Enterprise-Asset-Resource-Management-System--odoo-hackathon2026/backend/app/db/init_db.py) (Add raw SQL table constraints)

### 3. Backend Work
* Define SQLAlchemy models matching the v2 specification exactly (using `core/enums.py` status types).
* Import and register the four new models in `app/models/__init__.py`.

### 4. Frontend Work
* None.

### 5. Database Changes
* Execute table creation on startup.
* Add unique index mapping: `CREATE UNIQUE INDEX one_active_allocation ON allocations (asset_id) WHERE status = 'ACTIVE';` (blocks double-allocation on PostgreSQL engine level).
* Add exclusion constraint:
  ```sql
  ALTER TABLE bookings ADD CONSTRAINT no_overlap
    EXCLUDE USING gist (
      asset_id WITH =,
      tstzrange(start_time, end_time, '[)') WITH &&
    ) WHERE (status <> 'CANCELLED');
  ```
  (blocks overlapping resource bookings).

### 6. Dependencies on Modules 1, 2 and 4
* Inherits standard SQLAlchemy `Base` from `db/base.py` and `engine` from `db/session.py`.
* Uses `core/enums.py` statuses (`AllocationStatus`, `BookingStatus`, `MaintenanceStatus`, `Priority`).

### 7. API Endpoints Implemented in this Phase
* None (Database & Model setup phase).

### 8. Testing Checklist
- [ ] Run `docker compose up --build -d` to compile backend and start containers.
- [ ] Check container logs to verify tables created without syntax errors.
- [ ] Log into PostgreSQL container and verify `allocations` unique index via `\d allocations`.
- [ ] Verify `bookings` exclusion constraint via `\d bookings`.

### 9. Expected Deliverables
* Registered SQLAlchemy models and updated tables active in PostgreSQL with strict index constraints.

### 10. Suggested Git Commit Message
`feat(operations): implement database models and constraints for allocations, bookings, and maintenance`

---

## Phase 2: Allocation, Transfers & Returns Backend (~1.5 hours)

### 1. Objective
Implement the REST endpoint workflows for allocating assets to employees/departments, raising transfers, requesting returns, and approving asset return checks.

### 2. Files to Create or Modify
* **[NEW]** `backend/app/api/v1/endpoints/allocations.py`
* **[NEW]** `backend/app/api/v1/endpoints/transfers.py`
* **[MODIFY]** [backend/app/main.py](file:///Users/srinivasch/Desktop/AssetFlow-Enterprise-Asset-Resource-Management-System--odoo-hackathon2026/backend/app/main.py) (Include routers)

### 3. Backend Work
* **Allocation**: Implement allocation creation (conflict checking on active status, transitioning `Asset.status` to `ALLOCATED` via `AssetStateService`, logging history via `AssetHistoryService`, recording activity).
* **Return Request**: Initiate return request setting `return_requested_at` and status to `RETURN_REQUESTED`.
* **Return Approval**: Verify caller matches `require_asset_manager`. Record return check notes, timestamp, transition `Asset.status` to `AVAILABLE`, and log logs.
* **Transfers**: Submit request and implement target approval endpoints. Include the row-level department check to confirm that Department Heads can only approve transfers targeting their own department (`current_user.department_id == transfer.target_department_id`).

### 4. Frontend Work
* None.

### 5. Database Changes
* Insert/update operations on `allocations` and `transfer_requests` tables.

### 6. Dependencies on Modules 1, 2 and 4
* Uses `core/rbac.py` dependencies (`require_asset_manager`, `require_dept_head`).
* Calls `core/services/` (`AssetStateService`, `AssetHistoryService`, `ActivityService`).

### 7. API Endpoints Implemented in this Phase
* `GET /api/v1/allocations` (returns active allocations, derives overdue status on read)
* `POST /api/v1/allocations`
* `POST /api/v1/allocations/{id}/return-request`
* `POST /api/v1/allocations/{id}/return-approve`
* `POST /api/v1/transfers`
* `POST /api/v1/transfers/{id}/approve`
* `POST /api/v1/transfers/{id}/reject`

### 8. Testing Checklist
- [ ] Attempt concurrent double-allocation of same asset; confirm PostgreSQL unique index returns a DB-level transaction error, and API returns HTTP 409 conflict.
- [ ] Log in as a Department Head and attempt to approve a transfer request targeting a different department; confirm HTTP 403 error.
- [ ] Initiate a return request, then approve it as an Asset Manager; confirm `Asset.status` is reset to `AVAILABLE` and history is logged.

### 9. Expected Deliverables
* Fully functional allocation, transfer, and return workflow backend endpoints verified in Swagger UI.

### 10. Suggested Git Commit Message
`feat(operations): implement allocation, return request, and transfer backend endpoints`

---

## Phase 3: Bookings & Maintenance Backend (~1.5 hours)

### 1. Objective
Build booking scheduling workflows (with overlap prevention and is_bookable verification) and maintenance ticket lifecycle endpoints.

### 2. Files to Create or Modify
* **[NEW]** `backend/app/api/v1/endpoints/bookings.py`
* **[NEW]** `backend/app/api/v1/endpoints/maintenance.py`
* **[MODIFY]** [backend/app/main.py](file:///Users/srinivasch/Desktop/AssetFlow-Enterprise-Asset-Resource-Management-System--odoo-hackathon2026/backend/app/main.py) (Include routers)

### 3. Backend Work
* **Booking**: Validate `Asset.is_bookable == True`, check start/end ranges, perform Python overlap checking, change state to `RESERVED` (create) or `AVAILABLE` (cancel/ended), and record system logs.
* **Maintenance**: Manage transition chain (`PENDING` -> `APPROVED/REJECTED` -> `TECHNICIAN_ASSIGNED` -> `IN_PROGRESS` -> `RESOLVED`). Update asset status to `UNDER_MAINTENANCE` on approval, and back to `AVAILABLE` on resolution using `AssetStateService`.

### 4. Frontend Work
* None.

### 5. Database Changes
* Insert/update operations on `bookings` and `maintenance_requests` tables.

### 6. Dependencies on Modules 1, 2 and 4
* Uses `core/rbac.py` authorizations.
* Calls `core/services/` (`AssetStateService`, `AssetHistoryService`, `ActivityService`).

### 7. API Endpoints Implemented in this Phase
* `GET /api/v1/bookings`
* `POST /api/v1/bookings`
* `PATCH /api/v1/bookings/{id}/reschedule`
* `POST /api/v1/bookings/{id}/cancel`
* `GET /api/v1/maintenance`
* `POST /api/v1/maintenance`
* `POST /api/v1/maintenance/{id}/approve`
* `POST /api/v1/maintenance/{id}/reject`
* `POST /api/v1/maintenance/{id}/assign`
* `POST /api/v1/maintenance/{id}/start`
* `POST /api/v1/maintenance/{id}/resolve`

### 8. Testing Checklist
- [ ] Request a booking on an asset where `is_bookable = False`; verify validation fails.
- [ ] Attempt overlapping bookings concurrently; verify PostgreSQL exclusion constraint triggers transaction error, and API outputs booking conflict.
- [ ] Attempt booking adjacent slots (e.g., 09:00-10:00 and 10:00-11:00); verify it succeeds.
- [ ] Resolve maintenance ticket; verify asset reverts to `AVAILABLE` status.

### 9. Expected Deliverables
* Booking scheduling and maintenance ticketing backend endpoints ready and verified in Swagger UI.

### 10. Suggested Git Commit Message
`feat(operations): implement booking reservation and maintenance ticketing backend endpoints`

---

## Phase 4: Operations Frontend Pages (~1.5 hours)

### 1. Objective
Assemble the frontend React/Vite interfaces corresponding to Excalidraw designs for Allocations, Bookings, and Maintenance management.

### 2. Files to Create or Modify
* **[NEW]** `frontend/src/pages/Allocations.jsx`
* **[NEW]** `frontend/src/pages/Bookings.jsx`
* **[NEW]** `frontend/src/pages/Maintenance.jsx`
* **[MODIFY]** `frontend/src/App.jsx` (Register routes and navigation links)

### 3. Backend Work
* None.

### 4. Frontend Work
* **Allocations & Transfers View**:
  * Implement conditional user view: holder sees a "Request Return" action; managers see a returns checklist, check notes fields, and an "Approve Return" action.
  * Implement row-level rendering defense: hide transfer approve/reject buttons for a Department Head if the transfer target department does not match theirs.
* **Bookings View**:
  * Filter asset selectors to only display `is_bookable = True` assets.
  * Integrate slot selector forms with validation alerts for overlapping conflicts.
* **Maintenance Board View**:
  * Build ticket column layout matching request states (Pending, In Progress, Resolved).
  * Render transition triggers (Approve request, assign tech, resolve ticket) depending on role permissions.

### 5. Database Changes
* None.

### 6. Dependencies on Modules 1, 2 and 4
* Depends on Module 1 login authentication context (storing logged-in user profile, role, and department scopes).
* Consumes backend endpoints implemented in Phases 2 and 3.

### 7. API Endpoints Implemented in this Phase
* None (API consumption phase).

### 8. Testing Checklist
- [ ] Log in as Employee: verify "Request Return" is visible, but the manager's pending-returns checklist is hidden.
- [ ] Log in as Asset Manager: verify the pending-returns checklist is visible, and return approvals can be submitted with condition notes.
- [ ] Log in as a Department Head: verify that transfer approve/reject buttons targeting other departments are hidden.
- [ ] Attempt double bookings from UI; check that overlap conflict errors are surfaced gracefully.

### 9. Expected Deliverables
* Operational frontend user interface pages fully linked and active in browser navigation.

### 10. Suggested Git Commit Message
`feat(operations): implement allocations, bookings, and maintenance frontend pages`
