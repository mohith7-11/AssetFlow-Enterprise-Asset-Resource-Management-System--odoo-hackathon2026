# Team Ownership

## Shared models that must not be recreated

- User
- Department
- AssetCategory
- Asset

## Member 1 - Auth and Organization

Owns signup and login, password hashing, JWT authentication, current-user dependency, role-based access control, user management, departments, asset categories, employee directory, and role management.

Uses existing `User`, `Department`, and `AssetCategory`.

## Member 2 - Assets, Allocation and Transfer

Owns asset CRUD, asset-tag generation, search and filtering, asset details, allocation, duplicate-allocation prevention, transfer requests and approval, returns, and asset history.

Future models:

- Allocation
- TransferRequest

Uses existing `Asset`, `User`, `Department`, and `AssetCategory`. Do not recreate `Asset`.

## Member 3 - Booking and Maintenance

Owns resource booking, overlap validation, cancellation and rescheduling, maintenance requests, approval, technician assignment, progress, and resolution.

Future models:

- Booking
- MaintenanceRequest

Uses existing `Asset`, `User`, and `Department`.

A bookable resource is `Asset.is_bookable = True`. Do not create a duplicate Resource model.

## Member 4 - Audit and Dashboard

Owns audit cycles, auditor assignment, audit items, asset verification, missing and damaged reporting, audit closure, and dashboard summary queries.

Future models:

- AuditCycle
- AuditAssignment
- AuditItem

Uses existing `Asset`, `User`, and `Department`.

## Lightweight future model guidance

These are guidance only and are not implemented yet.

### Allocation

Suggested fields: `id`, `asset_id`, `employee_id`, `department_id`, `allocated_by`, `allocated_at`, `expected_return_date`, `returned_at`, `return_condition`, `return_notes`, `status`.

### TransferRequest

Suggested fields: `id`, `asset_id`, `current_allocation_id`, `requested_by`, `target_employee_id`, `target_department_id`, `reason`, `status`, `approved_by`, `requested_at`, `resolved_at`.

### Booking

Suggested fields: `id`, `asset_id`, `booked_by`, `start_time`, `end_time`, `status`, `created_at`.

Overlap rule:

new_start < existing_end
AND
new_end > existing_start

Only assets with `is_bookable = True` may be booked.

### MaintenanceRequest

Suggested fields: `id`, `asset_id`, `requested_by`, `description`, `priority`, `status`, `assigned_to`, `created_at`, `resolved_at`, `resolution_notes`.

### AuditCycle

Suggested fields: `id`, `name`, `start_date`, `end_date`, `status`, `created_by`, `created_at`, `closed_at`.

### AuditAssignment

Suggested fields: `id`, `audit_cycle_id`, `auditor_id`.

### AuditItem

Suggested fields: `id`, `audit_cycle_id`, `asset_id`, `verification_status`, `verified_by`, `notes`, `verified_at`.

Feature owners may refine these when implementing actual requirements, but must reuse the shared core models.