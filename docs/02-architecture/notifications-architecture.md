# Notifications & Event Delivery Architecture (Phase 21)

## 1. Overview
The StayHub centralized notification architecture provides asynchronous, resilient, and multi-channel notification dispatch across all hotel operational domains (Bookings, Front Desk, Housekeeping, Maintenance, Food & Beverage POS, Inventory, Staff, and Guest Services).

## 2. Multi-Channel Abstraction
StayHub abstracts delivery channels behind the `NotificationProvider` interface:
- **IN_APP**: Real-time persisted in-app notifications stored in PostgreSQL, accessible via the top navigation bell dropdown and `/notifications` center.
- **EMAIL**: HTML and plaintext email delivery (Resend / SendGrid / SMTP) with automatic recipient validation.
- **SMS**: Transactional SMS delivery (Twilio / AWS SNS / MessageBird) with E.164 phone formatting.
- **WHATSAPP**: Messaging provider for guest confirmations and QR concierge updates.

## 3. Delivery Lifecycle
```
Event Trigger (e.g. BOOKING_CONFIRMATION)
       ↓
Preference Check (User & Property-level preferences)
       ↓
Template Rendering & XSS Escaping
       ↓
Dispatcher & Idempotency Key Validation
       ↓
Provider Delivery (IN_APP, EMAIL, SMS, WHATSAPP)
       ↓
[Success → SENT / Read Tracking] OR [Failure → Bounded Retry (Max 3 attempts) → FAILED]
```

## 4. Idempotency & Retry Guarantee
- **Idempotency**: Every dispatch operation accepts an optional `idempotencyKey` (e.g. `res_conf_{reservationId}`). Duplicate dispatches with identical keys are skipped to prevent spamming guests or staff.
- **Bounded Retries**: Failed external deliveries are retried up to 3 times before transitioning to `FAILED`. No infinite retry loops are permitted.
- **Non-blocking Guarantee**: Notification dispatch failures never roll back or abort authoritative business entities (e.g., reservation creation or folio payments).

## 5. Security & Isolation
- All notification records are strictly isolated by `organization_id` and `property_id` with PostgreSQL Row Level Security (RLS).
- External API keys (Resend, Twilio) are loaded exclusively on the server (`getNotificationConfig()`) and are never exposed in browser bundles or client responses.
