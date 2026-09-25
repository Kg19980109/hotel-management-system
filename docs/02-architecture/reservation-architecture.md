# StayHub Reservation Architecture & Booking Ledger (Phase 7)

## 1. Domain Overview & Principles

In StayHub, three core concepts are strictly separated:
1. **RESERVATION**: A contractual commercial booking commitment between a guest and a hotel property for a specific date range.
2. **STAY** (Phase 8): The physical check-in, real-time occupancy lifecycle, key issuance, and checkout state of a guest residing on the premises.
3. **ROOM**: The physical inventory unit with maintenance, operational, and housekeeping states.

> **Critical Domain Invariant**:
> Creating or confirming a reservation **NEVER** marks `room.status = OCCUPIED`.
> Physical room occupancy only occurs upon explicit check-in workflows in Phase 8 (Front Desk).

---

## 2. Multi-Tenant Tenancy Boundary

- **Property Scoping**: Guests, Reservations, and Reservation Room Line Items are strictly property-scoped via `property_id`.
- **Cross-Property Isolation**: A guest profile registered at Hotel Alpha cannot be viewed or attached to a booking at Hotel Beta.
- **Cross-Tenant Consistency Enforcement**: PostgreSQL database triggers (`trg_check_reservation_tenant_consistency` and `trg_check_reservation_room_tenant_consistency`) prevent foreign-key tenant leakage, raising immediate transaction exceptions if a room, room type, or guest from an alien property is attached.

---

## 3. Concurrency Protection & Overbooking Prevention

Two concurrent front-desk agents or web channels must never successfully book the same physical room for overlapping stay dates.

### PostgreSQL Native Exclusion Constraint
StayHub enables the `btree_gist` extension in PostgreSQL and defines an exclusion constraint on `public.reservation_rooms`:

```sql
ALTER TABLE public.reservation_rooms
ADD CONSTRAINT uq_no_overlapping_room_bookings
EXCLUDE USING gist (
  room_id WITH =,
  daterange(check_in_date, check_out_date, '[)') WITH &&
)
WHERE (room_id IS NOT NULL AND NOT is_cancelled);
```

### The Half-Open Date Interval `[check_in, check_out)`
- A guest checking in on `2026-10-10` and checking out on `2026-10-12` occupies nights `Oct 10` and `Oct 11`.
- Another guest can check in on `2026-10-12` for the same room. The half-open range `[2026-10-10, 2026-10-12)` does not overlap `[2026-10-12, 2026-10-15)`.
- Concurrent attempts to book the same room during overlapping dates fail with SQLSTATE `23P01` (exclusion_violation) before committing.

---

## 4. Room Allocation Strategy

StayHub natively decouples:
- **Room Type Requested**: e.g., "Deluxe King" (guaranteed category).
- **Physical Room Assigned**: e.g., "Room 204" (optional until check-in or allocation).

This supports:
1. **Unassigned Bookings (Run of House)**: Confirmed bookings reserving category capacity without locking a specific physical room number immediately.
2. **Physical Room Assignment**: Immediate locking of a specific physical room number, enforced by the exclusion constraint.
3. **Multi-Room Bookings**: A single parent reservation with multiple room lines (e.g., Room 101 + Room 102).

---

## 5. Room Availability Calculation

The availability engine `getRoomTypeAvailability` calculates:
```
available_rooms = max(0, total_operational_rooms - reserved_count)
```
Where:
- `total_operational_rooms`: Active rooms of that category where operational status is NOT `OUT_OF_ORDER` and NOT `OUT_OF_SERVICE`.
- `reserved_count`: Active reservation room items (both physical and unassigned) overlapping the date window where `is_cancelled = false` and `status != 'CANCELLED'`.

---

## 6. Reservation Lifecycle & Status Transitions

Valid reservation statuses:
- `PENDING`: Initial inquiry or payment verification pending.
- `CONFIRMED`: Guaranteed booking commitment.
- `CANCELLED`: Cancelled booking. Releases physical room allocation immediately. Retained permanently for historical audits.
- `NO_SHOW`: Guest failed to arrive on scheduled date.
- `COMPLETED`: Completed historical booking lifecycle.

Allowed Transitions:
- `PENDING` -> `CONFIRMED`, `CANCELLED`
- `CONFIRMED` -> `CANCELLED`, `NO_SHOW`, `COMPLETED`
- `NO_SHOW` -> `CANCELLED`

---

## 7. Role-Based Permissions Matrix

| Permission | SUPER_ADMIN / OWNER / GM | FRONT_DESK / RECEPTIONIST | HOUSEKEEPING / MAINTENANCE | ACCOUNTANT | KITCHEN / RESTAURANT |
|---|:---:|:---:|:---:|:---:|:---:|
| `BOOKING_VIEW` | Yes | Yes | Yes (Occupancy) | Yes | Limited |
| `BOOKING_CREATE` | Yes | Yes | No | No | No |
| `BOOKING_UPDATE` | Yes | Yes | No | No | No |
| `BOOKING_CANCEL` | Yes | Yes | No | No | No |
| `BOOKING_ASSIGN_ROOM` | Yes | Yes | No | No | No |
| `BOOKING_CHANGE_STATUS`| Yes | Yes | No | No | No |
| `BOOKING_VIEW_FINANCIALS`| Yes | Yes | No | Yes | No |
