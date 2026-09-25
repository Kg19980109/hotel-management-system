# StayHub Guest Portal & QR Session Architecture (Phase 14)

## 1. Overview & Core Philosophy

The StayHub Guest Portal is a mobile-first, contactless digital concierge system built directly on top of the established multi-tenant hotel foundation (Phases 1–13).

### Key Architectural Tenets:
1. **Separation of Concerns**: Guest sessions are strictly separated from staff Supabase Auth sessions. Guests never obtain staff credentials or direct database membership roles.
2. **Access Point Decoupling**: A physical QR code represents a location/access point (`ROOM`, `HOTEL_GENERAL`, `RESTAURANT_TABLE`). It does **not** encode or transmit guest identities, reservation IDs, stay IDs, or personal documents.
3. **Cryptographic Token Hashing**: Raw high-entropy tokens (`randomBytes(32)`) are present only in the QR URL and in-flight HTTP-only cookie. The database stores strictly SHA-256 hashes (`token_hash`, `session_token_hash`).
4. **Checkout Invalidation Invariant**: Guest sessions are bounded by stay lifecycles (`stays.status = 'CHECKED_IN'`). When a guest checks out, their session is immediately invalidated, guaranteeing that previous guests can never observe subsequent occupants of the same room.
5. **Zero Domain Duplication**: Stays, rooms, reservations, guests, and restaurants are read directly from authoritative tables created in earlier phases without duplicated data stores.

---

## 2. QR Code & Access Point Model

```
Physical Room QR Sticker
       ↓
URL: /guest/qr/<raw-opaque-token>
       ↓ (SHA-256 hash)
public.guest_qr_codes (token_hash)
       ↓ (Stay Verification)
public.guest_sessions (session_token_hash)
       ↓
Mobile Guest Portal (/guest/home, /guest/hotel, /guest/stay, /guest/services)
```

### QR Types:
- `ROOM`: Associates with a specific `room_id`. Allows verified in-house guests to unlock digital in-room services and stay itineraries.
- `HOTEL_GENERAL`: Public access point placed in lobbies, receptions, or elevators for exploring property directories, amenities, Wi-Fi credentials, and dining outlets.
- `RESTAURANT_TABLE`: Pre-wired access point for Phase 15 F&B ordering.

---

## 3. Cryptographic Token Lifecycle & Security Model

### Token Generation & Rotation:
- Generated server-side with 256-bit cryptographically secure pseudorandomness (`crypto.randomBytes(32).toString('hex')`).
- Hashed using SHA-256 before insertion into `public.guest_qr_codes` or `public.guest_sessions`.
- When an administrator rotates a QR code via `rotate_guest_qr_code`, the previous hash is replaced atomically, immediately invalidating old printed codes while preserving historical references.

### Privacy Boundary & Enumeration Protection:
- Resolving a QR code at `/guest/qr/[token]` via `resolve_guest_qr_access` returns **zero sensitive guest data** (no guest names, no confirmation numbers, no contact details).
- If a room is vacant (`has_active_stay = false`), the resolver returns a clean room greeting without error disclosure or past guest records.

---

## 4. Stay Verification & Session Creation

### Verification Flow:
1. Guest scans room QR code (`/guest/qr/[token]`).
2. Resolver detects `has_active_stay = true` for the associated room.
3. Guest enters their reservation confirmation number (`confirmation_number`, e.g. `RES-26-000204`) and optional last name.
4. Server executes `verify_and_create_guest_session`:
   - Validates confirmation against the current active `CHECKED_IN` stay for that room.
   - If mismatch: returns a safe generic failure message (`"Unable to verify stay details with the provided information"`).
   - If match: creates a `public.guest_sessions` row with `expires_at = now() + 24 hours` and returns a raw session token.
5. Next.js Server Action writes an `httpOnly`, `SameSite=Lax`, `Secure` cookie (`stayhub_guest_session`).

---

## 5. Session Validation & Turn-over Isolation

Every request to private guest endpoints executes `validate_guest_session(session_token_hash)`:
1. Verifies `expires_at > now()` and `revoked_at IS NULL`.
2. For `VERIFIED_STAY` sessions, dynamically verifies that `stays.status = 'CHECKED_IN'`.
3. If the stay has transitioned to `CHECKED_OUT`, `CANCELLED`, or `NO_SHOW`, access is denied immediately.
4. **Room Turnover Safety**: When Guest A checks out and Guest B checks into Room 204, Guest A's old session token cannot access Guest B's stay or Room 204.

---

## 6. Public Guest UI & Mobile Shell

- **Viewport Optimization**: Styled for mobile devices (360px+ responsive viewport) with high-contrast luxury dark aesthetics, warm gold accents, and large touch targets.
- **Dedicated Shell (`src/components/guest/guest-shell.tsx`)**: Completely standalone from staff `AppShell` with bottom navigation:
  - `/guest/home`: Welcome hero, in-house room card, Wi-Fi 1-tap copy, quick concierge cards, dining previews.
  - `/guest/hotel`: Public hotel details, address, front desk contact, check-in/out policies, amenities, dining outlets.
  - `/guest/stay`: Verified stay itinerary (room assignment, party size, check-in/checkout dates) with strictly zero staff notes or CRM data.
  - `/guest/services`: Service directory foundation with direct front desk dial and placeholders for Phase 15 ordering.

---

## 7. Staff QR Management Console

Located at `/qr-services`:
- **KPI Metrics**: Total Access Points, Active Room QRs, General QRs, Active Guest Sessions.
- **Management Grid**: Search by room number/name, filter by type, view SHA-256 digest, rotate token, deactivate.
- **Printable Modal (`print-qr-modal.tsx`)**: High-resolution printable cards with QR codes, property branding, and scan instructions.

---

## 8. Role-Based Permissions & RLS Matrix

| Role | `GUEST_PORTAL_VIEW` | `GUEST_PORTAL_MANAGE` | `GUEST_QR_CREATE` | `GUEST_QR_ROTATE` | `GUEST_QR_REVOKE` | `GUEST_SESSION_REVOKE` |
|---|---|---|---|---|---|---|
| `SUPER_ADMIN` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `HOTEL_OWNER` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `GENERAL_MANAGER` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `FRONT_DESK` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `RECEPTIONIST` | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ |
| `HOUSEKEEPING` | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `MAINTENANCE` | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `KITCHEN_STAFF` | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
