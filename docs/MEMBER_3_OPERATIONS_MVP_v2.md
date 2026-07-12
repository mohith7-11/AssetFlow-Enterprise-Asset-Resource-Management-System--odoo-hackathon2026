# Member 3 — Allocation + Booking + Maintenance MVP (v2)

Revision of `MEMBER_3_OPERATIONS_MVP.md`. Six fixes applied — each one is a
correctness or architecture gap in the original, not a style preference. Everything
not called out below is unchanged from v1.

## What changed and why

| # | v1 | v2 fix | Why it matters |
|---|---|---|---|
| 1 | Overlap/double-allocation checked only in Python | Add the matching DB constraint alongside the app check | App-only checks race: two simultaneous requests can both pass the check before either commits. The constraint is the real safety net; the Python check is just for a friendly error message. |
| 2 | Booking never touches `Asset.status` | Booking created → `RESERVED`; ended/cancelled → `AVAILABLE` | `RESERVED` is one of the seven lifecycle states in the spec. Skip this and it's permanently unreachable. |
| 3 | Return is a single self-service call | Split into request + approve | Spec: "Asset Manager approves asset returns and condition check-in notes." A single-step return skips the approval the spec explicitly asks for. |
| 4 | Transfer approval has no department check | Add a row-level scope check | A Department Head can approve transfers *within their department only*. A role check alone lets any Dept Head approve any department's transfer. |
| 5 | Enums defined locally in this module | Import from `core/enums.py` | Prevents drift between this module's status strings and what Modules 1/2/4 expect. |
| 6 | `Asset.status` set directly inline | Call `AssetStateService.transition()` instead | Keeps one single writer of asset status across all four modules — the thing that stops a bug from hiding in one module's copy of the logic. |

---

## Goal

Deliver the three operational workflows shown in Screens 5, 6, and 7.

Owned screens: Screen 5 (Asset Allocation & Transfer), Screen 6 (Resource Booking),
Screen 7 (Maintenance Management).

```bash
git checkout main
git pull origin main
git checkout -b feature/operations
```

**Pull `main` fresh before branching.** `core/services/` (AssetStateService,
AssetHistoryService, ActivityService), `core/enums.py`, and `core/rbac.py` must
already be merged — this module is built entirely on top of them, not beside them.

## Common Rules (unchanged from v1, plus one addition)

- This is a hackathon MVP. Implement only the assigned scope.
- Stack: FastAPI, React/Vite, PostgreSQL, Docker Compose.
- Reuse the existing shared SQLAlchemy `Base`, engine, `SessionLocal`, `get_db`.
- Reuse existing shared models: `User`, `Department`, `AssetCategory`, `Asset`.
- **Reuse `core/services/asset_state.py`, `asset_history.py`, `activity.py`, and
  `core/enums.py` — do not redefine status strings or write `Asset.status`
  directly anywhere in this module.**
- Do not add Alembic, Redis, Celery, Kubernetes, microservices, repository-pattern
  abstractions, or a new state-management library.
- Do not create duplicate shared models or a second database connection layer.
- Prefer existing dependencies. Add a package only when the feature cannot
  reasonably be implemented without it.
- Preserve the existing health endpoint and Docker setup.
- Register every new SQLAlchemy model in `backend/app/models/__init__.py`.
- Build the simplest responsive UI matching the supplied Excalidraw screens.
- Do not push or merge to `main`. Push only the assigned feature branch and open
  a PR for review.
- Before finishing: run Docker, verify manually, verify `/api/v1/health`, and
  report exact failures instead of claiming success.

## New models

```
Allocation
TransferRequest
Booking
MaintenanceRequest
```

Statuses come from `core/enums.py` — add them there if they don't already exist;
do not declare local `Enum`/string-literal classes inside this module's files.

### Allocation

```
id
asset_id
employee_id            nullable
department_id           nullable
allocated_by
allocated_at
expected_return_date    nullable
return_requested_at     nullable   -- NEW: set when holder initiates return
returned_at             nullable   -- set only on manager approval
return_condition        nullable
return_notes            nullable
approved_by             nullable   -- NEW: who approved the return
status                  ACTIVE | RETURN_REQUESTED | RETURNED
```

`RETURN_REQUESTED` is the one addition to the status enum from v1 — it's what
makes the approval step real instead of cosmetic, without inventing a second table.

### TransferRequest — unchanged from v1

```
id, asset_id, current_allocation_id, requested_by,
target_employee_id (nullable), target_department_id (nullable),
reason (nullable), status [REQUESTED|APPROVED|REJECTED],
approved_by (nullable), requested_at, resolved_at (nullable)
```

### Booking — unchanged from v1

```
id, asset_id, booked_by, start_time, end_time,
status [ACTIVE|CANCELLED], created_at
```

Upcoming/Ongoing/Completed derived from current time in API/UI — no scheduler.

### MaintenanceRequest — unchanged from v1

```
id, asset_id, requested_by, description, priority,
status [PENDING|APPROVED|REJECTED|TECHNICIAN_ASSIGNED|IN_PROGRESS|RESOLVED],
assigned_to (nullable), created_at, resolved_at (nullable), resolution_notes (nullable)
```

Priorities: `LOW | MEDIUM | HIGH | CRITICAL`

---

## Backend endpoints

### Allocation / transfer / return

```
GET  /api/v1/allocations
POST /api/v1/allocations
POST /api/v1/allocations/{id}/return-request     -- holder initiates
POST /api/v1/allocations/{id}/return-approve      -- Asset Manager / Admin only

POST /api/v1/transfers
POST /api/v1/transfers/{id}/approve
POST /api/v1/transfers/{id}/reject
```

**Double-allocation — app check + DB constraint, both required:**

```python
# app-level check (for a friendly error with current-holder info)
existing = db.query(Allocation).filter(
    Allocation.asset_id == asset_id, Allocation.status == AllocationStatus.ACTIVE
).first()
if existing:
    raise HTTPException(409, detail={"held_by": existing.employee_id, "department": existing.department_id})
```

```sql
-- the actual safety net — add in the same migration/init step as the model
CREATE UNIQUE INDEX one_active_allocation
  ON allocations (asset_id) WHERE status = 'ACTIVE';
```

**Allocation sets asset status via the shared service, never inline:**
```python
AssetStateService.transition(asset_id, AssetStatus.ALLOCATED, actor=current_user)
AssetHistoryService.log(asset_id, "allocated", {"employee_id": employee_id}, actor=current_user)
ActivityService.record({"type": "asset_allocated", "asset_id": asset_id, ...})
```

**Return is now two calls:**
```
POST /allocations/{id}/return-request   -- current holder only; sets return_requested_at
POST /allocations/{id}/return-approve   -- Asset Manager/Admin only; requires condition + notes;
                                            sets returned_at, approved_by;
                                            AssetStateService.transition(asset_id, AVAILABLE)
```
Reject `/return-approve` with a 403 if the caller isn't Asset Manager or Admin — use
`core/rbac.py`'s `require_asset_manager` dependency, don't hand-roll the check here.

**Transfer approval — role check plus department scope:**
```python
if current_user.role == Role.DEPARTMENT_HEAD:
    if current_user.department_id != transfer.target_department_id:
        raise HTTPException(403, detail="Can only approve transfers within your own department")
```
A Department Head passing `require_dept_head` is necessary but not sufficient —
this row-level check is what the spec's "within their department" actually requires.

Overdue allocation is still derived, not stored:
```
status == ACTIVE and expected_return_date < today
```

### Booking

```
GET   /api/v1/bookings
POST  /api/v1/bookings
PATCH /api/v1/bookings/{id}/reschedule
POST  /api/v1/bookings/{id}/cancel
```

Rules (unchanged from v1): only `Asset.is_bookable = True`; reject incompatible
asset statuses; `start_time < end_time`; overlap when
`new_start < existing_end AND new_end > existing_start`; adjacent slots allowed.

**Add the DB constraint alongside the app check — this is the one judges will
specifically try to break:**
```sql
ALTER TABLE bookings ADD CONSTRAINT no_overlap
  EXCLUDE USING gist (
    asset_id WITH =,
    tstzrange(start_time, end_time, '[)') WITH &&
  ) WHERE (status <> 'CANCELLED');
```
(`btree_gist` should already be enabled from the hour-1 setup — confirm before
writing this migration, don't re-enable it here.)

**Booking now touches asset status, via the shared service:**
```python
# on create
AssetStateService.transition(asset_id, AssetStatus.RESERVED, actor=current_user)
# on cancel, or when end_time passes (checked on next read, no scheduler)
AssetStateService.transition(asset_id, AssetStatus.AVAILABLE, actor=current_user)
```
Call `ActivityService.record()` on both create and cancel.

### Maintenance

```
GET  /api/v1/maintenance
POST /api/v1/maintenance
POST /api/v1/maintenance/{id}/approve
POST /api/v1/maintenance/{id}/reject
POST /api/v1/maintenance/{id}/assign
POST /api/v1/maintenance/{id}/start
POST /api/v1/maintenance/{id}/resolve
```

Workflow unchanged from v1:
```
PENDING → APPROVED / REJECTED
APPROVED → TECHNICIAN_ASSIGNED → IN_PROGRESS → RESOLVED
```

**On approval and resolution, use the shared service — not `Asset.status = X`:**
```python
# approve
AssetStateService.transition(asset_id, AssetStatus.UNDER_MAINTENANCE, actor=current_user)
AssetHistoryService.log(asset_id, "maintenance_approved", {...}, actor=current_user)
ActivityService.record({"type": "maintenance_approved", ...})

# resolve
AssetStateService.transition(asset_id, AssetStatus.AVAILABLE, actor=current_user)
AssetHistoryService.log(asset_id, "maintenance_resolved", {...}, actor=current_user)
ActivityService.record({"type": "maintenance_resolved", ...})
```

Do not build photo attachments unless time remains; if you do, use the shared
`/api/v1/upload` endpoint from Module 2 — don't build a second upload path.

---

## Frontend

Build: `/allocations`, `/bookings`, `/maintenance` — same screens as v1, with two
additions:

- **Allocation screen:** the "Return" action is now two states in the UI —
  holder sees "Request Return," Asset Manager sees a pending-returns list with
  "Approve Return" (condition + notes fields) instead of a single "Return" button.
- **Transfer approval:** if the logged-in user is a Department Head and the
  transfer's target department isn't theirs, don't show the approve/reject
  buttons at all (defense in depth — the backend check is the real gate).

Everything else — asset/employee selectors, conflict messaging, overlap error,
status board layout — unchanged from v1.

---

## Authorization

Use Module 1's `core/rbac.py` dependencies (`require_asset_manager`,
`require_dept_head`, etc.) directly — do not build another auth system, and do
not hand-roll role checks that duplicate what `RoleChecker` already does. The one
exception is the department-scope check above, which is necessarily specific to
this endpoint and can't be expressed as a generic role dependency.

If auth isn't merged yet, keep endpoints easy to wire in and do not hardcode fake
users into the final PR.

## Do not build

Schedulers/background jobs · email/SMS reminders · cloud uploads (beyond the
shared upload endpoint if reused) · complex calendar libraries · audit · reports.

---

## Acceptance test

**Allocation**
1. Available asset can be allocated; `Asset.status` becomes `ALLOCATED` via `AssetStateService`.
2. Second allocation is blocked by both the app check and the DB constraint (test by attempting two allocations concurrently, not just sequentially).
3. Transfer approval reallocates and preserves history via `AssetHistoryService`.
4. A Department Head cannot approve a transfer outside their own department (403).
5. Return requires two steps: holder requests, Asset Manager approves with condition notes; asset becomes `AVAILABLE` only after approval.
6. Overdue status derives correctly from `expected_return_date`.

**Booking**
1. Bookable asset can be booked; asset becomes `RESERVED`.
2. Overlap is rejected by both the app check and the DB exclusion constraint.
3. Adjacent booking succeeds.
4. Cancel reverts asset to `AVAILABLE`; reschedule works.

**Maintenance**
1. Request can be raised.
2. Invalid state transitions fail.
3. Approval sets asset to `UNDER_MAINTENANCE` via `AssetStateService`.
4. Resolution returns asset to `AVAILABLE` via `AssetStateService`.

Verify `/api/v1/health` after all model additions.

## Completion report

Report models, endpoints, UI routes, workflow rules, dependencies added, tests
performed, shared files changed, and known limitations — including whether the
DB constraints were actually added (not just the app-level checks) and whether
the department-scope check on transfer approval was tested.
