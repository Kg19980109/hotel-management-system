# Room Management & Inventory Architecture (Phase 6)

## 1. Overview
The Room Management module is StayHub's foundational operational asset module. It models physical and logical lodging inventory (`floors`, `room_types`, `rooms`) strictly bound to a tenant `property_id`.

## 2. Core Entities
1. **`floors`**: Represents physical or named building levels. Allows arbitrary strings (e.g. "Ground Floor", "Penthouse") alongside optional numeric ordering.
2. **`room_types`**: Stores room category definitions, pricing, bed configurations, standard capacity, and amenities. Pricing uses `NUMERIC(12,2)` precision to avoid floating-point inaccuracies.
3. **`rooms`**: Represents physical units. References `property_id`, `floor_id` (optional), and `room_type_id`. Holds unit-specific operational status, housekeeping status, availability state, and view type.

## 3. Operational & Housekeeping Status Models

To maintain separation of concerns ahead of Phase 7 (Bookings) and Phase 8+ (Housekeeping / Maintenance), status is split into orthogonal attributes:

### Operational Status (`status`)
- `AVAILABLE`: Ready for guest check-in.
- `OCCUPIED`: Guest currently residing (Note: Bookings in Phase 7 will manage occupancy transitions).
- `DIRTY`: Vacated room requiring turnover cleaning.
- `CLEANING`: Attendant currently servicing room.
- `INSPECTED`: Housekeeping supervisor has verified room condition.
- `OUT_OF_ORDER`: Room has physical/mechanical defects requiring maintenance; unavailable for inventory.
- `OUT_OF_SERVICE`: Room temporarily taken off-market for administrative reasons.

### Housekeeping Status (`housekeeping_status`)
- `CLEAN`: Sanitized and prepared with fresh linens.
- `DIRTY`: Requires linen turnover and sanitation.
- `CLEANING`: In-progress cleaning.
- `INSPECTION_PENDING`: Awaiting supervisor audit.

### Soft Deactivation (`is_active`)
Rooms are never hard-deleted once created. Deactivation sets `is_active = false`, excluding the room from front desk booking availability while maintaining foreign key integrity for future folios, billing reports, and audit logs.

## 4. Multi-Tenant Security & Cross-Tenant Integrity

### Row Level Security (RLS)
Every table has RLS enabled with `FORCE ROW LEVEL SECURITY`. Access is mediated through `public.has_property_role(auth.uid(), property_id, ...)`:
- Read access: Granted to any user with an active membership in the property.
- Write/Admin access: Restricted to `SUPER_ADMIN`, `HOTEL_OWNER`, and `GENERAL_MANAGER`.
- Operational Status updates: Authorized for front desk and housekeeping staff (`FRONT_DESK`, `RECEPTIONIST`, `HOUSEKEEPING`, `MAINTENANCE`).

### Cross-Tenant Foreign Key Consistency
To prevent a malicious or erroneous payload where Hotel A's room references Hotel B's `floor_id` or `room_type_id`:
1. **Database Trigger**: `trg_check_room_tenant_consistency` executes before `INSERT` or `UPDATE` on `public.rooms`. It validates that `floor.property_id == room.property_id` and `room_type.property_id == room.property_id`, raising a SQL exception on mismatch.
2. **Server Action Validation**: `createRoomAction` and `updateRoomAction` verify all foreign IDs against the user's active property ID before database submission.

## 5. Centralized Permission Matrix
Implemented in `src/lib/rooms/permissions.ts`:
- `ROOM_VIEW`: All property staff.
- `ROOM_CREATE`: Owner, General Manager, Super Admin.
- `ROOM_UPDATE`: Owner, General Manager, Super Admin.
- `ROOM_DELETE`: Owner, Super Admin.
- `ROOM_STATUS_UPDATE`: Owner, GM, Front Desk, Receptionist, Housekeeping, Maintenance.
- `ROOM_TYPE_MANAGE`: Owner, GM, Super Admin.
- `FLOOR_MANAGE`: Owner, GM, Super Admin.

## 6. Dashboard Integration
The Phase 5 Dashboard Metrics Engine (`src/lib/dashboard/queries.ts`) directly queries `public.rooms` to calculate:
- Total Rooms (`is_active = true`)
- Available Rooms (`status = 'AVAILABLE'`)
- Occupied Rooms (`status = 'OCCUPIED'`)
- Dirty Rooms (`status = 'DIRTY' OR housekeeping_status = 'DIRTY'`)
- Cleaning Rooms (`status = 'CLEANING' OR housekeeping_status = 'CLEANING'`)
- Out of Order Rooms (`status IN ('OUT_OF_ORDER', 'OUT_OF_SERVICE')`)
Occupancy displays `0% ("No active stays yet")` until Phase 7 introduces the booking ledger.
