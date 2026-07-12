# Member 2 --- Asset Registration + Directory MVP

## Goal

Deliver the central asset registry shown in Screen 4.

Owned screen: - Screen 4: Asset Registration & Directory

Branch:

``` bash
git checkout main
git pull origin main
git checkout -b feature/assets
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

## Dependency

Use the existing shared: - `Asset` - `AssetCategory` - `Department` -
`User`

Do not recreate or substantially redesign these models.

## Backend

Implement only:

``` text
GET  /api/v1/assets
POST /api/v1/assets
GET  /api/v1/assets/{id}
PATCH /api/v1/assets/{id}
```

### Asset creation

Support the fields already available in the shared model:

``` text
name
category_id
serial_number
acquisition_date
acquisition_cost
condition
location
is_bookable
department_id
```

Generate a unique Asset Tag such as:

``` text
AF-0001
AF-0002
```

New assets start as:

``` text
AVAILABLE
```

Do not let ordinary create requests arbitrarily set lifecycle status.

### Directory

Support practical query filters:

``` text
search
category_id
status
department_id
location
is_bookable
```

`search` should match useful existing fields such as asset tag, name, or
serial number.

Keep filtering as normal SQLAlchemy queries. Do not add Elasticsearch or
any search service.

### Asset details

Return enough information for: - category; - department; - creator if
available; - current condition/status.

History sections may initially show empty states until Member 3's
workflow tables are merged.

### Photos/documents and QR

These are in the full problem statement but are not required for the
first MVP integration.

If time remains: - allow one simple local-upload attachment or photo; -
display the asset tag in a QR-like placeholder.

Do not add cloud storage, S3, object-storage services, or a complex
document system.

## Frontend

Build: - `/assets` - asset registration form/modal - asset detail view
or drawer

Match Screen 4: - search box; - category/status/department filters; -
asset table; - Register Asset button.

Minimum table columns:

``` text
Asset Tag
Name
Category
Status
Location
```

Required behavior: - create asset; - refresh/list immediately; - filter
assets; - open asset details.

## Integration contract for Member 3

Member 3 will reference:

``` text
Asset.id
Asset.status
Asset.is_bookable
```

Do not rename these.

## Do not build

-   allocations;
-   transfers;
-   returns;
-   bookings;
-   maintenance;
-   audit;
-   reports;
-   cloud file storage.

## Acceptance test

1.  Register an asset.
2.  Asset receives a unique `AF-xxxx` tag.
3.  Asset appears in directory.
4.  Search by tag/name works.
5.  Filters work.
6.  Asset details load.
7.  Duplicate serial/tag constraints return a useful API error.
8.  Health endpoint remains healthy.

## Completion report

Report endpoints, UI routes/components, asset-tag strategy, dependencies
added, tests performed, shared files changed, and known limitations.
