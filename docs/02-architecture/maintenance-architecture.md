# Maintenance Architecture & Work Order Operations (Phase 11)

## 1. Domain Separation Principle

StayHub enforces a strict operational separation between **Housekeeping** and **Maintenance**:

| Feature / Domain | Housekeeping | Maintenance |
| :--- | :--- | :--- |
| **Operational Focus** | Cleaning, linen changes, turndowns, room readiness inspections | Equipment repairs, plumbing, HVAC, electrical, physical defects |
| **Core Entity** | `housekeeping_tasks` | `maintenance_work_orders` |
| **Staff Roles** | `HOUSEKEEPING` | `MAINTENANCE` technicians, facility engineers |
| **Lifecycle** | `UNASSIGNED` → `ASSIGNED` → `IN_PROGRESS` → `INSPECTION_PENDING` → `COMPLETED` | `OPEN` → `ASSIGNED` → `IN_PROGRESS` → `RESOLVED` → `CLOSED` |
| **Room Impact** | Sets `housekeeping_status` (`CLEAN`, `DIRTY`, etc.) | Does not automatically change room readiness; manager override for `OUT_OF_ORDER` / `OUT_OF_SERVICE` |

A room may simultaneously have an active housekeeping status and one or more maintenance work orders. Neither system overwrites the other.

---

## 2. Work Order Lifecycle State Machine

```
              ┌────────────────────────────────────────┐
              │                                        │
              ▼                                        │
┌───────────────────────────┐                          │
│           OPEN            │ ◄────────────────────────┼───────┐
└─────────────┬─────────────┘                          │       │
              │ assign_maintenance_work_order         │       │
              ▼                                        │       │
┌───────────────────────────┐                          │       │
│         ASSIGNED          │                          │       │
└─────────────┬─────────────┘                          │       │
              │ start_maintenance_work_order          │       │
              ▼                                        │       │
┌───────────────────────────┐                          │       │
│        IN_PROGRESS        │ ◄──── resume_... ────┐   │       │
└──────┬────────────────────┘                      │   │       │
       │                   │ hold_...              │   │       │
       │                   ▼                       │   │       │
       │             ┌───────────┐                 │   │       │
       │             │  ON_HOLD  │ ────────────────┘   │       │
       │             └───────────┘                     │       │
       │ resolve_maintenance_work_order                │       │
       ▼                                               │       │
┌───────────────────────────┐                          │       │
│         RESOLVED          │                          │       │
└─────────────┬─────────────┘                          │       │
              │ close_maintenance_work_order           │       │
              ▼                                        │       │
┌───────────────────────────┐                          │       │
│          CLOSED           │ ─────────────────────────┘       │
└───────────────────────────┘        reopen_...                │
                                                               │
Any active status ─── cancel_maintenance_work_order ───────────┴──► CANCELLED
```

### Transition Invariants:
1. **Resolution Requirement**: Transitioning to `RESOLVED` strictly requires non-empty resolution notes describing the corrective actions taken.
2. **Administrative Closure**: `CLOSED` signifies administrative signoff. Closed tickets can only be reopened back to `OPEN` through an explicit `reopen_maintenance_work_order` call with documented justification.
3. **Cancellation**: Cancelling records a cancellation event in the immutable audit stream.

---

## 3. Room Operational Safety & Invariants

1. **Resolution NEVER forces `AVAILABLE`**:
   - When a maintenance work order is marked `RESOLVED`, the room is never automatically made `AVAILABLE`.
   - If an active guest stay exists (`OCCUPIED`), the room must strictly remain `OCCUPIED`.
   - If the room was marked `OUT_OF_ORDER` or `OUT_OF_SERVICE`, an authorized manager (`HOTEL_OWNER` or `GENERAL_MANAGER`) must explicitly review and release the room back into inventory using `set_room_maintenance_status`.
2. **Management Authorization for Out of Service**:
   - Maintenance staff or technicians cannot arbitrarily take a room `OUT_OF_ORDER` or `OUT_OF_SERVICE`. This requires manager-level authorization to prevent unauthorized removal of inventory.

---

## 4. Multi-Tenant Consistency & Database Triggers

Every maintenance record is strictly property-scoped:

1. **Room Consistency**: `trg_check_maintenance_work_order_tenant` guarantees that if `room_id` is set, `room.property_id == work_order.property_id`.
2. **Asset Consistency**: If `asset_id` is set, `asset.property_id == work_order.property_id`.
3. **Staff Consistency**: Both `assigned_to` and `reported_by` must have active property memberships in `work_order.property_id`.
4. **Schedule Consistency**: `trg_check_maintenance_schedule_tenant` enforces matching tenant boundaries on preventive maintenance rules.

---

## 5. Audit Timeline & Events

Every state transition and operational note triggers an event insert into `public.maintenance_work_order_events`:

- `CREATED`
- `ASSIGNED`
- `STARTED`
- `PUT_ON_HOLD`
- `RESUMED`
- `RESOLVED`
- `CLOSED`
- `CANCELLED`
- `REOPENED`
- `PRIORITY_CHANGED`
- `NOTE_ADDED`

The events stream includes `performer_id`, `from_status`, `to_status`, `notes`, and UTC timestamp.
