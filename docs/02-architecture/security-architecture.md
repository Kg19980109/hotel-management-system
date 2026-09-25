# StayHub Security Architecture (Phase 22 Production Hardened)

## 1. Overview & Security Philosophy
StayHub employs a defense-in-depth security model designed specifically for multi-tenant, multi-property hospitality operations. All state transitions, data access patterns, and API interactions are secured through multiple authoritative layers rather than relying on perimeter or frontend controls.

```
[ Public Internet / Web Clients ]
              ↓
  (Security Headers & Rate Limiters)
              ↓
  [ Next.js Server Components & Server Actions ]
              ↓ (RBAC & Tenant Validation)
  [ Application Service Layer ]
              ↓ (PostgreSQL RLS & Tenant Helpers)
  [ PostgreSQL Database (Supabase) ]
```

---

## 2. Authentication & Session Architecture

### Staff & Administrative Sessions
- Built upon Supabase Auth with secure HTTP-only session cookies.
- Server-side token verification via `@supabase/ssr`.
- Every authenticated server action checks the active user's session and verifies that their user ID belongs to the active organization and property.

### Guest QR Portal Sessions
- Guest access is strictly separated from administrative Supabase Auth credentials.
- Cryptographically signed QR tokens with HMAC/SHA-256 verification.
- Tokens map directly to an active stay ID (`stays.id`), property ID (`properties.id`), and room ID (`rooms.id`).
- Sessions automatically expire upon guest checkout (`actual_check_out_at`).

---

## 3. Row-Level Security (RLS) & Tenant Isolation

### Authoritative Tenant Helper Functions
All multi-tenant database tables enforce RLS using PostgreSQL `SECURITY DEFINER` functions:
- `public.user_belongs_to_property(user_id, property_id)`
- `public.user_belongs_to_organization(user_id, organization_id)`
- `public.is_platform_super_admin(user_id)`

### Cross-Tenant & Cross-Property Attack Defenses
- Hotel A staff attempting to read, update, or delete Hotel B records receive zero rows or a PostgreSQL policy violation.
- Every SELECT, INSERT, UPDATE, and DELETE policy includes tenant and property checks.
- Partial unique indexes enforce physical domain invariants (e.g. `idx_stays_unique_active_room` prevents more than 1 active checked-in stay per room).

---

## 4. Role-Based Access Control (RBAC)
StayHub uses a centralized role matrix evaluated server-side before any sensitive business action or report query executes:

| Role | Operational Scope | Financial Folios | Integrations | Notifications | AI Business Buddy |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `SUPER_ADMIN` | Global Platform | Full Access | Full Access | Full Access | Full Access |
| `HOTEL_OWNER` | Property-wide | Full Access | Manage | Manage | Full Access |
| `GENERAL_MANAGER` | Property-wide | Full Access | Manage | Manage | Full Access |
| `FRONT_DESK` | Front Desk, Stays | View Only | None | View Only | None |
| `RECEPTIONIST` | Stays, Guests | View Only | None | View Only | None |
| `HOUSEKEEPING` | Cleaning Tasks | None | None | View Only | None |
| `MAINTENANCE` | Work Orders | None | None | View Only | None |
| `RESTAURANT_STAFF` | POS Dining Orders | None | None | View Only | None |
| `KITCHEN_STAFF` | KDS Station Tickets | None | None | View Only | None |
| `ACCOUNTANT` | Financial Reports | Full Access | None | View Only | View Reports |

---

## 5. Public Booking Engine Security Boundary
The public booking engine (`/book/[propertySlug]`) operates under strict defensive controls:

1. **Property Isolation & Slug Resolution**:
   - Slugs are looked up server-side in `property_online_booking_settings`.
   - Disabled or unpublished properties (`is_enabled = false`) return 404 immediately.
   - Internal database IDs, internal staff notes, and room numbers are never exposed.

2. **Price & Capacity Tamper Resistance**:
   - Client-submitted totals and rates are discarded.
   - The server authoritatively recalculates room subtotal, taxes, discounts, and total amount.
   - Guest capacity limits are validated against `room_types.max_occupancy`.

3. **Anti-Enumeration Protection**:
   - Booking confirmation lookups (`/book/[propertySlug]/confirmation/[confirmationNumber]`) require matching both the confirmation number and the guest email address.
   - Sequential enumeration attacks are mitigated via alphanumeric confirmation sequences (`STAY-YY-XXXXXX`) and sliding window rate limiting.

---

## 6. AI Business Buddy Safety & Isolation

1. **Strictly Read-Only Execution**:
   - The AI tool registry contains only idempotent `get_*` report getters.
   - No write, insert, update, or delete tools exist in the AI engine.
2. **Context & Tenant Pinning**:
   - Every tool receives the authenticated user's `propertyId` and `timezone` injected from the server session.
   - Prompts attempting to query other properties are constrained by the server-side context.
3. **Prompt Injection & Secret Redaction**:
   - System prompts are dynamically assembled on the server and contain no database URLs, API keys, or service-role secrets.
   - Audit logs automatically redact API keys, JWT tokens, and guest PII.

---

## 7. Notifications & Integration Secret Management

1. **Server-Side Credentials**:
   - Integration keys (Stripe, Razorpay, Resend, Twilio, WhatsApp, etc.) are stored server-side and never returned to the browser client.
   - Secrets are masked with placeholder bullets (`••••••••••••`) in UI configuration forms.
2. **Template XSS Protection**:
   - All user-supplied variables in notification templates (`{{guest_name}}`, `{{hotel_name}}`) are HTML-entity escaped (`&lt;`, `&gt;`, `&quot;`, `&#039;`) before rendering.
3. **Bounded Retries & Idempotency**:
   - Notification deliveries are bounded to a maximum of 3 retry attempts to eliminate infinite retry storms.
   - Event idempotency keys prevent duplicate message dispatch.

---

## 8. Observability & Production Logging

- Structured JSON logs with timestamp, level (`INFO`, `WARN`, `ERROR`, `DEBUG`), and correlation IDs (`req_*`, `err_*`).
- Automated deep redaction of passwords, secret tokens, bearer headers, credit card numbers, CVVs, and PostgreSQL connection strings.
- Public responses receive sanitized generic messages with correlation request IDs, while internal diagnostic details remain in server logs.
