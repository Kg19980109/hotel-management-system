# StayHub QR Request Dispatch, Realtime Staff Alerting & Buzzer Architecture (Phase 23)

## 1. Executive Summary & Objective

In hospitality operations, guest service requests submitted via in-room QR codes (housekeeping items, maintenance defects, room service dining, front desk inquiries) cannot rely on manual page refreshes, generic notification bell counters, or delayed batch syncs.

Phase 23 establishes a deterministic, closed-loop, real-time hotel operational alerting system:
1. **Instant Operational Ingestion**: A guest request or dining order created via verified session token hash is persisted in the database.
2. **Departmental Deterministic Routing**: Maps requests to the designated operational department (`HOUSEKEEPING`, `MAINTENANCE`, `FRONT_DESK`, `CONCIERGE`, `RESTAURANT`, `KITCHEN`).
3. **Property-Scoped Supabase Realtime**: Broadcasts `INSERT` and `UPDATE` events strictly within the tenant property boundaries.
4. **Persistent Global Alert Layer (`OperationalAlertOverlay`)**: Displays an unmissable modal/banner across all pages of the authenticated staff web application (`/dashboard`, `/rooms`, `/housekeeping`, etc.).
5. **Audible Browser Buzzer (`OperationalAlertManager`)**: Synthesizes pure Web Audio API tones that pulse and repeat according to request priority (`URGENT`, `HIGH`, `NORMAL`) until formally acknowledged.
6. **Multi-Staff Device Synchronization**: When one staff member clicks **Acknowledge**, the buzzer and modal instantly dismiss across all connected staff devices in that department.
7. **Guest Live Stepper**: The mobile Guest Portal automatically updates in real-time as the request advances through `SUBMITTED` -> `ACKNOWLEDGED` -> `ASSIGNED` -> `IN_PROGRESS` -> `COMPLETED` without manual browser reloading.

---

## 2. Core Operational Workflow

```
   GUEST QR
      ↓
   Scan Room QR & Authenticate Session
      ↓
   Submit Request / Food Order
      ↓
   SERVER RPC (Atomic Tenant Validation)
      ↓
   PostgreSQL Database (`guest_service_requests` / `restaurant_orders`)
      ↓
   Supabase Realtime (`supabase_realtime` publication)
      ↓
   Staff Client (`OperationalAlertProvider`)
      ↓
   Department & Role Relevance Filter
      ↓
   Global Overlay Modal + Web Audio Buzzer Loop
      ↓
   Staff Clicks [ACKNOWLEDGE]
      ↓
   `staff_acknowledge_guest_request` RPC (`status = 'ACKNOWLEDGED'`)
      ↓
   Realtime `UPDATE` Event Broadcast
      ↓
   ┌──────────────────────────────────┴──────────────────────────────────┐
   │                                                                     │
   ▼                                                                     ▼
All Staff Devices:                                                Guest Mobile Device:
- Buzzer stops immediately                                        - Live Stepper advances to "Acknowledged"
- Alert dismisses from queue                                      - Message from staff displayed
```

---

## 3. Departmental Request Routing Matrix

| Request Category | Target Department | Eligible Staff Roles | Default Priority |
| :--- | :--- | :--- | :--- |
| **ROOM_SERVICE / FOOD** | Restaurant / KDS | `RESTAURANT_STAFF`, `KITCHEN_STAFF`, Management | `NORMAL` |
| **HOUSEKEEPING** | Housekeeping Queue | `HOUSEKEEPING`, Management | `NORMAL` |
| **LAUNDRY** | Housekeeping / Laundry | `HOUSEKEEPING`, Management | `NORMAL` |
| **MAINTENANCE** | Maintenance Queue | `MAINTENANCE`, Management | `HIGH` |
| **FRONT_DESK** | Front Desk Queue | `FRONT_DESK`, `RECEPTIONIST`, Management | `NORMAL` |
| **CONCIERGE** | Concierge Queue | `FRONT_DESK`, `RECEPTIONIST`, Management | `NORMAL` |
| **SPA** | Spa / Wellness | `FRONT_DESK`, Management | `NORMAL` |
| **TRANSPORT** | Concierge / Front Desk | `FRONT_DESK`, Management | `NORMAL` |
| **OTHER** | General Operations | `FRONT_DESK`, Management | `NORMAL` |

*Note: Property Management Roles (`HOTEL_OWNER`, `GENERAL_MANAGER`, `SUPER_ADMIN`) have global property-wide visibility across all operational departments.*

---

## 4. Audio Alert Synthesizer (`OperationalAlertManager`)

### Browser Autoplay Policy Compliance
Modern web browsers (Chrome, Safari, Firefox, Edge) block audio playback until the user has interacted with the document. StayHub handles this cleanly:
1. **User Gesture Hook**: The application attaches a passive one-shot pointerdown/keydown listener that automatically unlocks the `AudioContext` as soon as the staff member clicks anywhere on the screen.
2. **Audio Status & Enable Controls**: The persistent Topbar includes an `AlertSoundController` component with visual indicators (`Muted` / `Audible`) and a one-click "Unlock Audio / Test Buzzer" control.
3. **Preference Persistence**: Staff audio mute preferences are persisted in `localStorage` (`stayhub_sound_alerts_enabled`).

### Harmonic Alert Tone Profiles
Tones are synthesized on-the-fly using Web Audio API sine oscillators with exponential volume decays, guaranteeing zero network asset latency:
- **NORMAL / LOW**: Dual harmonic chime (587.33 Hz [D5] -> 880 Hz [A5]), repeating every 7.0 seconds.
- **HIGH**: Urgent two-tone warning chime (880 Hz -> 659.25 Hz), repeating every 5.0 seconds.
- **URGENT**: Triple alternating high-pitch alarm (880 Hz -> 1174.66 Hz -> 880 Hz), repeating aggressively every 3.5 seconds.

---

## 5. Queue Management & Escalation

1. **Deduplication**: Operational alerts are keyed by `request.id` or `order.id`. Repeated or duplicate Realtime events for the same request do not trigger multiple concurrent buzzers.
2. **Multiple Unacknowledged Requests**: If multiple requests arrive simultaneously (e.g. Room 204 towels and Room 305 plumbing), the manager queues them and alerts at the highest active priority.
3. **Elapsed Time Escalation**: The alert overlay counts elapsed time live (`0s ago`, `45s ago`, `2m ago`). If a request remains unacknowledged for >60 seconds, the modal's visual prominence escalates with glowing warning borders.

---

## 6. Multi-Tenant Security & Realtime Isolation

- **Tenant Scoping**: All Supabase Realtime subscriptions filter strictly by `property_id=eq.${propertyId}`. Clients never receive events belonging to another property.
- **Session Identity Binding**: Guest requests are cryptographically bound to `guest_sessions` via SHA-256 token hashing. Guests cannot spoof room numbers, guest IDs, or stay IDs.
- **Server Mutation Atomic Guards**: RPC functions verify that caller or session token matches property context before executing state changes.
