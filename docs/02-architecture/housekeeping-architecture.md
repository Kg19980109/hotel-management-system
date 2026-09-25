# Housekeeping Management Architecture (Phase 10)

## 1. Executive Summary
The Housekeeping Management module provides end-to-end operational workflows for hotel housekeeping, cleaning task scheduling, staff assignments, multi-tier room cleaning workflows, supervisor inspections, and operational room-readiness synchronization with strict multi-tenant isolation and data consistency.

## 2. Domain Separation & Room Lifecycle
The architecture strictly preserves the fundamental distinction between **Operational Room Status** and **Housekeeping State**:

- **Operational Room Statuses**:
  - `AVAILABLE`: Ready for check-in / booking
  - `OCCUPIED`: Checked in with active guest stay
  - `DIRTY`: Vacated or pending cleaning cycle
  - `CLEANING`: Cleaner actively in progress
  - `INSPECTED`: Cleaned and awaiting supervisor certification
  - `OUT_OF_ORDER`: Maintenance breakdown / blocked
  - `OUT_OF_SERVICE`: Temporary service pause

- **Housekeeping States**:
  - `CLEAN`: Room sanitized and certified
  - `DIRTY`: Awaiting cleaning
  - `CLEANING`: In-progress
  - `INSPECTION_PENDING`: Awaiting quality inspection

### Operational Lifecycle Flow:
```
CHECKED_OUT STAY
       ↓
ROOM BECOMES DIRTY (Automatic Housekeeping Task generated)
       ↓
HOUSEKEEPING TASK ASSIGNED (PENDING → ASSIGNED)
       ↓
CLEANING STARTED (IN_PROGRESS, room → CLEANING)
       ↓
CLEANING COMPLETED (INSPECTION_PENDING, room → INSPECTED)
       ↓
INSPECTION WORKFLOW
   ├── PASSED → Task COMPLETED, room → CLEAN, room → AVAILABLE (if vacant)
   └── FAILED → Task IN_PROGRESS (HIGH priority), room → DIRTY (never AVAILABLE)
```

## 3. Database Safety & Invariants
1. **Occupancy Invariant**: Occupied rooms (`CHECKED_IN` stay) can never become `AVAILABLE` through housekeeping actions.
2. **Out of Order Protection**: Rooms in `OUT_OF_ORDER` or `OUT_OF_SERVICE` retain their operational status when housekeeping inspection passes.
3. **Tenant Consistency**: Foreign key triggers enforce that rooms, tasks, inspections, and assigned staff all share the same `property_id`.
4. **Idempotent Task Generation**: A partial unique index (`idx_unique_active_housekeeping_task`) on `(room_id, task_type)` where status is open ensures no duplicate open cleaning tasks exist.
5. **Checkout Hook**: The atomic `check_out_stay` RPC triggers the generation of an idempotent `CLEANING` task immediately upon stay checkout.

## 4. Permissions & RBAC
Mapped to the centralized RBAC architecture:
- `HOUSEKEEPING_VIEW`: All operational staff
- `HOUSEKEEPING_ASSIGN`: Hotel Owner, General Manager, Front Desk, Housekeeping Supervisor
- `HOUSEKEEPING_START`: Housekeeping staff, General Manager, Hotel Owner
- `HOUSEKEEPING_COMPLETE`: Housekeeping staff, General Manager, Hotel Owner
- `HOUSEKEEPING_INSPECT`: Supervisors, Front Desk, General Manager, Hotel Owner
- `HOUSEKEEPING_MANAGE`: General Manager, Hotel Owner, Super Admin

## 5. UI Components & Mobile Experience
- `/housekeeping`: Primary Operations Board with real-time KPI cards (Dirty, Cleaning, Inspection Pending, Ready, Priority, Out of Service), multi-filter toolbar (Floor, Status, Task Type, Priority, Staff), Kanban cards and List table view, and single-tap actions for mobile-first floor housekeepers.
- `/housekeeping/inspections`: Dedicated queue for supervisor quality reviews with instant Pass and Fail (with mandatory reason log) controls.
- `/rooms/[roomId]`: Integrated Housekeeping card displaying active task, cleaner assignment, recent cleaning history, and inspection audit logs.
- `/front-desk`: Arrivals and room tables integrated with live room housekeeping readiness badges.
