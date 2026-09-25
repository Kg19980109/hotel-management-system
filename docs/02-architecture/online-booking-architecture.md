# Online Booking Engine Architecture (Phase 21)

## 1. Overview
The StayHub Online Booking Engine provides a direct, public-facing consumer hotel booking portal without exposing internal hotel operations, physical room IDs, or staff data.

## 2. Public Route Topology
- `/book/[propertySlug]`: Public hotel discovery, dates/guests search, and live room-type availability matrix.
- `/book/[propertySlug]/checkout`: Mobile-first guest details submission, price breakdown, and booking policy agreement.
- `/book/[propertySlug]/confirmation/[confirmationNumber]`: Verified booking receipt with anti-enumeration email/phone verification.

## 3. Availability Calculation Engine
Availability is calculated strictly server-side using existing authoritative tables:
`rooms` + `room_types` + `reservations` + `reservation_rooms` + `stays`

Algorithm:
1. Fetch sellable rooms per room type (`status NOT IN ('OUT_OF_ORDER', 'OUT_OF_SERVICE')`).
2. Query overlapping active reservations (`check_in_date < targetCheckOut AND check_out_date > targetCheckIn`) in statuses `CONFIRMED`, `IN_HOUSE`, `CHECKED_IN`, `PENDING`.
3. Compute `availableCount = totalSellable - bookedCount`.
4. Enforce room capacity: `(adults + children) <= maxOccupancy * roomsCount`.

## 4. Controlled Pricing Architecture
- Server-authoritative computation using safe 2-decimal arithmetic.
- Pricing variables:
  - `nightlyRate`: Room type base rate.
  - `nights`: Date difference (min 1, max 30 nights).
  - `roomSubtotal = nightlyRate * nights * roomsCount - discountAmount`.
  - `taxAmount = (roomSubtotal * taxRatePercent) / 100`.
  - `totalAmount = roomSubtotal + taxAmount`.
- Client-submitted totals, prices, or rates are completely ignored and recomputed on the server.

## 5. Payment Boundary
- Supports the **"Pay at Hotel"** settlement model by default.
- Reservations are created in `CONFIRMED` status with source `ONLINE_BOOKING`.
- No live payment charges are fabricated; payments follow the authoritative Phase 16 Folio settlement workflow upon guest arrival.
