# Public Booking Security & Anti-Abuse (Phase 21)

## 1. Threat Model & Mitigations

### 1.1 Property Slug Enumeration & Isolation
- Public properties are resolved strictly by unique slug where `status = 'active'`.
- Draft, archived, or unpublished properties are completely rejected with generic error messages.

### 1.2 Price & Total Tampering Defense
- Client-side submitted prices, currency, room subtotals, or taxes are never trusted.
- The server recalculates pricing using authoritative `room_types.base_price` and date arithmetic.

### 1.3 Double-Booking & Race Condition Defense
- Availability is verified immediately before reservation record insertion within an atomic database transaction.
- Overlapping reservations for the same room inventory are prevented via PostgreSQL constraints and RPC checks.

### 1.4 Confirmation Number Enumeration Defense
- Confirmation lookup via `/book/[propertySlug]/confirmation/[confirmationNumber]` requires matching the booking guest's email address or phone number.
- Unauthorized attempts to view other guests' confirmation numbers are denied.

### 1.5 Rate Limiting & Input Sanitization
- Public booking and search endpoints enforce client rate-limiting (max 40 requests per 10-minute window).
- Guest names, notes, and special requests are sanitized against XSS (`<script>` removal) and processed through parameterized database queries to prevent SQL injection.
