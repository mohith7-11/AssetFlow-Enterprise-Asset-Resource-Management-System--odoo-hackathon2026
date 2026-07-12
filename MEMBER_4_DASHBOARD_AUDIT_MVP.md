# Member 4 --- Dashboard + Audit + Notifications MVP

## Goal

Deliver the operational overview and audit workflow shown in Screens 2,
8, 9, and 10, with strict prioritization.

Owned screens: - Screen 2: Dashboard - Screen 8: Asset Audit - Screen 9:
Reports & Analytics - Screen 10: Activity Logs & Notifications

Branch:

```bash
git checkout main
git pull origin main
git checkout -b feature/dashboard-audit
```

# Common Rules

- This is a hackathon MVP. Implement only the assigned scope.
- Stack: FastAPI, React/Vite, PostgreSQL, Docker Compose.
- Reuse the existing shared SQLAlchemy `Base`, engine, `SessionLocal`,
  and `get_db`.
- Reuse existing shared models: `User`, `Department`, `AssetCategory`,
  `Asset`.
- Do not add Alembic, Redis, Celery, Kubernetes, microservices,
  repository-pattern abstractions, or a new state-management library.
- Do not create duplicate shared models or a second database
  connection layer.
- Prefer existing dependencies. Add a package only when the feature
  cannot reasonably be implemented without it.
- Preserve the existing health endpoint and Docker setup.
- Register every new SQLAlchemy model in
  `backend/app/models/__init__.py`.
- Build the simplest responsive UI matching the supplied Excalidraw
  screens; functionality is more important than pixel-perfect styling.
- Do not push or merge to `main`. Push only the assigned feature
  branch and open a PR for review.
- Before coding: `git checkout main`, `git pull origin main`, then
  create the assigned branch.
- Before finishing: run Docker, verify the feature manually, verify
  `/api/v1/health`, and report exact failures instead of claiming
  success.

## Priority order

Implement in this order:

```text
1. Dashboard
2. Audit
3. Notifications/activity feed
4. Reports polish only if time remains
```

A working dashboard and audit are more important than advanced charts.

## New models

Create only what is required.

### AuditCycle

```text
id
name
department_id nullable
location nullable
start_date
end_date
status
created_by
created_at
closed_at nullable
```

Status:

```text
DRAFT
ACTIVE
CLOSED
```

### AuditAssignment

```text
id
audit_cycle_id
auditor_id
```

### AuditItem

```text
id
audit_cycle_id
asset_id
verification_status
verified_by nullable
notes nullable
verified_at nullable
```

Verification status:

```text
PENDING
VERIFIED
MISSING
DAMAGED
```

### Notification / Activity

For the MVP, prefer one simple `ActivityLog` table that can also feed
the notification/activity screen:

```text
id
user_id nullable
action_type
message
created_at
is_read
```

Do not build a message queue or background worker.

Other modules may create activity records directly through a small
shared helper after integration.

## Dashboard backend

Implement:

```text
GET /api/v1/dashboard/summary
GET /api/v1/dashboard/recent-activity
```

Summary should return available metrics from merged tables.

Minimum:

```text
assets_available
assets_allocated
assets_under_maintenance
active_bookings
pending_transfers
upcoming_returns
overdue_returns
```

If Member 3's models are not merged yet, first implement asset-only
counts cleanly, then add the remaining queries immediately after
integration.

Do not create summary tables.

## Dashboard frontend

Match Screen 2:

KPI cards: - Available - Allocated - Maintenance Today/Under
Maintenance - Active Bookings - Pending Transfers - Upcoming Returns

Also: - overdue-return alert; - quick actions linking to Register Asset,
Book Resource, Raise Maintenance; - recent activity.

Use simple cards and lists. No chart library is needed.

## Audit backend

Implement:

```text
GET  /api/v1/audits
POST /api/v1/audits
POST /api/v1/audits/{id}/assignments
POST /api/v1/audits/{id}/start
GET  /api/v1/audits/{id}/items
PATCH /api/v1/audits/{id}/items/{item_id}
GET  /api/v1/audits/{id}/discrepancies
POST /api/v1/audits/{id}/close
```

Workflow:

1.  create `DRAFT` cycle with department/location scope;
2.  assign auditor(s);
3.  start cycle and generate one item per in-scope asset;
4.  auditor marks each item Verified/Missing/Damaged;
5.  discrepancy view lists Missing/Damaged;
6.  close cycle;
7.  confirmed missing assets may become `LOST`.

Prevent duplicate audit items for the same asset/cycle.

For the MVP, block closing if `PENDING` items remain.

## Audit frontend

Match Screen 8: - audit cycle list; - create cycle; - assignment; -
asset checklist; - verification status; - discrepancy banner/list; -
close cycle.

## Activity/notifications

Implement a simple feed:

```text
GET /api/v1/activity
PATCH /api/v1/activity/{id}/read
```

Display examples when records exist: - asset assigned; - transfer
approved; - maintenance approved/rejected; - booking
confirmed/cancelled; - overdue return; - audit discrepancy.

Do not build: - WebSockets; - push notifications; - email
notifications; - background workers.

Overdue alerts can be computed when dashboard/activity endpoints are
requested.

## Reports screen

Only after Dashboard and Audit work.

Build a lightweight `/reports` page using existing API data.

Minimum useful sections: - assets by status; - department allocation
summary if allocation data is available; - maintenance count by
status/category if available; - most-used bookable resources if booking
data is available.

Use plain cards, tables, and CSS bars if necessary. Do not install a
charting library solely for the MVP.

Export can be a simple CSV response only if time remains.

## Do not build

- advanced analytics pipelines;
- PDF report generation;
- scheduled jobs;
- WebSockets;
- email/push infrastructure;
- a separate notification service;
- complex chart libraries.

## Acceptance test

Dashboard: 1. empty DB returns zeros; 2. counts match actual records; 3.
overdue and upcoming returns are separated; 4. quick-action links work.

Audit: 1. cycle can be created; 2. starting generates items once; 3.
auditor can verify items; 4. discrepancy list works; 5. pending items
block closure; 6. close locks the cycle; 7. missing asset status update
works.

Activity: 1. feed loads; 2. read state works; 3. no server error when
empty.

Verify health endpoint.

## Completion report

Report models, endpoints, UI routes, dashboard metrics, audit rules,
dependencies added, tests performed, shared files changed, and known
limitations.
