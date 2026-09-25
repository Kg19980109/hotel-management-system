# StayHub Stay Lifecycle & Front Desk Architecture (Phase 8)

## 1. Domain Separation of Concerns

StayHub enforces a strict three-way domain separation:

```
┌───────────────────────────────────────────────────────────────┐
│ RESERVATION                                                   │
│ Commercial booking commitment (dates, rates, primary guest)   │
└───────────────────────────────┬───────────────────────────────┘
                                │ 1 : N
                                ▼
┌───────────────────────────────────────────────────────────────┐
│ RESERVATION ROOM                                              │
│ Requested category, allocated physical room inventory hold    │
└───────────────────────────────┬───────────────────────────────┘
                                │ 1 : 1 (Active)
                                ▼
┌───────────────────────────────────────────────────────────────┐
│ STAY                                                          │
│ Physical in-house occupancy lifecycle (check-in, check-out)   │
└───────────────────────────────┬───────────────────────────────┘
                                │ N : 1
                                ▼
┌───────────────────────────────────────────────────────────────┐
│ ROOM                                                          │
│ Physical inventory (operational & housekeeping status)        │
└───────────────────────────────────────────────────────────────┘
```

### State Progression Example

1. **Pre-Arrival**:
   - Reservation: `CONFIRMED`
   - Reservation Room: Room allocated, GiST hold active
   - Stay: `EXPECTED` (or not yet created)
   - Room: `AVAILABLE`

2. **At Check-In**:
   - Reservation: `CONFIRMED`
   - Stay: `CHECKED_IN`, `actual_check_in_at = now()`
   - Room: `OCCUPIED`

3. **At Check-Out**:
   - Stay: `CHECKED_OUT`, `actual_check_out_at = now()`
   - Room: `DIRTY` (never directly `AVAILABLE`; housekeeping will advance: `DIRTY` → `CLEANING` → `INSPECTION` → `AVAILABLE` in Phase 10)
   - Reservation: `COMPLETED` (when all reservation room items are checked out)

---

## 2. Invariants & Concurrency Protection

### Invariant 1: Exactly One Active Stay per Physical Room
Enforced by a PostgreSQL partial unique index:
```sql
CREATE UNIQUE INDEX idx_stays_unique_active_room 
ON public.stays (room_id) 
WHERE (status = 'CHECKED_IN');
```
No two guests can be checked into the same physical room simultaneously.

### Invariant 2: Exactly One Active Stay per Reservation Room Item
Enforced by:
```sql
CREATE UNIQUE INDEX idx_stays_unique_active_reservation_room 
ON public.stays (reservation_room_id) 
WHERE (status = 'CHECKED_IN');
```
Prevents duplicate check-in submissions from the front desk console.

### Invariant 3: Room Status Authority & Occupancy Invariant
A room cannot have `status = 'OCCUPIED'` unless an active `CHECKED_IN` stay exists.
Enforced by deferred constraint trigger:
```sql
CREATE CONSTRAINT TRIGGER trg_check_room_occupancy_invariant
AFTER INSERT OR UPDATE OF status ON public.rooms
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION public.check_room_occupancy_invariant();
```

---

## 3. Atomic Database RPCs

### `check_in_reservation_room`
Executes in a single database transaction:
1. Verifies caller authentication and checks front desk roles (`HOTEL_OWNER`, `GENERAL_MANAGER`, `FRONT_DESK`, `RECEPTIONIST`).
2. Validates parent reservation is `CONFIRMED` and not cancelled or no-show.
3. Validates assigned physical room is active, belongs to the same property, and is not `OUT_OF_ORDER`, `OUT_OF_SERVICE`, or `OCCUPIED`.
4. Validates arrival date: if arrival date is in the future, checks `p_is_early = true` (explicit staff override).
5. Assigns physical room in `reservation_rooms`.
6. Inserts `public.stays` record with `CHECKED_IN` status and audit user IDs.
7. Updates room status to `OCCUPIED`.

### `check_out_stay`
Executes in a single database transaction:
1. Verifies caller role and property membership.
2. Validates stay status is `CHECKED_IN`.
3. Records `actual_check_out_at = now()`, `status = 'CHECKED_OUT'`, and staff user ID.
4. Transitions physical room status to `DIRTY` and housekeeping status to `DIRTY`.
5. Queries remaining uncompleted reservation rooms under the same parent reservation. If none remain, sets parent reservation `status = 'COMPLETED'`.

### `mark_reservation_no_show`
1. Verifies caller role.
2. Updates reservation `status = 'NO_SHOW'`.
3. Sets `reservation_rooms.is_cancelled = true`, immediately releasing PostgreSQL GiST exclusion constraint and freeing physical room inventory.
4. Marks any unfulfilled stays as `NO_SHOW`.

---

## 4. Multi-Room Reservation & Partial Check-In
When a reservation contains multiple rooms:
- Each reservation room item has its own independent stay lifecycle.
- Room 1 can be `CHECKED_IN` while Room 2 remains `EXPECTED`.
- Room 1 can be `CHECKED_OUT` while Room 2 remains `CHECKED_IN`.
- Parent reservation remains `CONFIRMED` while any room remains active, and automatically transitions to `COMPLETED` when the last room checks out.

---

## 5. Front Desk KPI & Real Physical Occupancy Metrics
With actual in-house stays established, occupancy metrics now reflect real physical occupancy:

$$\text{Physical Occupancy Rate} = \frac{\text{Active Rooms in Status OCCUPIED}}{\text{Total Active Sellable Rooms (Excluding OUT\_OF\_ORDER/SERVICE)}} \times 100$$

- **Arrivals**: Reservations scheduled to check in today that are eligible for check-in.
- **Departures**: Active stays scheduled for departure today.
- **In-House Guests**: Total active `CHECKED_IN` stays.
- **Rooms Requiring Attention**: Rooms in `DIRTY`, `CLEANING`, `INSPECTION_PENDING`, `OUT_OF_ORDER`, or `OUT_OF_SERVICE`.
