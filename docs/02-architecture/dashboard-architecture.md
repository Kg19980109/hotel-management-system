# StayHub Dashboard & Metrics Engine Architecture (Phase 5)

## 1. Architectural Overview

StayHub implements a decoupled, server-validated metrics engine designed to deliver real-time hotel operational analytics while preserving strict multi-tenant boundaries.

```
+-------------------------------------------------------------------+
|                        Dashboard UI                                |
| (Header, KPI Grid, Room Status, Arrivals/Departures, Analytics)  |
+-------------------------------------------------------------------+
                                  |
                                  v
+-------------------------------------------------------------------+
|                 Dashboard Server Action Layer                     |
|           (src/lib/dashboard/metrics.ts - getDashboardData)       |
+-------------------------------------------------------------------+
                                  |
               +------------------+------------------+
               | User Auth Check                     | Active Property Membership Check
               v                                     v
+-------------------------------------------------------------------+
|                     Metric Query Functions                        |
|                  (src/lib/dashboard/queries.ts)                   |
|  - queryPropertyDetails        - queryRoomInventorySummary         |
|  - queryTodayArrivals          - queryTodayDepartures             |
|  - queryOperationalAttention   - queryRecentActivity              |
+-------------------------------------------------------------------+
                                  |
                                  v
+-------------------------------------------------------------------+
|                     Supabase PostgreSQL & RLS                     |
|  - properties                  - property_memberships              |
|  - [rooms - Phase 6]           - [bookings - Phase 7]             |
+-------------------------------------------------------------------+
```

---

## 2. Multi-Tenant Property Isolation

1. **Active Property Context**: The dashboard reads the active property ID from the authenticated user's session context (`useAuth()`), synchronized via the `stayhub_active_property_id` secure cookie.
2. **Server-Side Membership Verification**:
   The server action `getDashboardData(propertyId)` never trusts client parameters blindly. It validates that the authenticated user possesses an active record in `public.property_memberships` for the requested `property_id`:
   ```sql
   SELECT id FROM public.property_memberships
   WHERE user_id = auth.uid() AND property_id = :propertyId AND status = 'active';
   ```
3. **RLS as Final Security Boundary**: All database queries are executed using the user's Supabase session client, enforcing Row Level Security on the PostgreSQL engine level.

---

## 3. Graceful Empty & Setup States (No Fabricated Data)

StayHub strictly prohibits manufacturing fake business data. In Phase 5:
- **Rooms Table**: Not yet created (Phase 6). The query layer detects the absence of configured inventory and returns `{ isConfigured: false }`.
- **Occupancy KPI**: Renders `0%` with the subtitle *"No inventory configured yet"* instead of fake percentages.
- **Revenue Analytics**: Renders `₹0` (or the property's configured currency) with the honest status *"Billing module not yet enabled"*.
- **Arrivals & Departures**: Display clean empty state illustrations prompting front desk reservation creation.
- **Operational Attention**: Surfaces a actionable *"Room Inventory Setup Pending"* alert with a direct CTA to `/rooms`.

---

## 4. Property-Aware Currency & Timezone Handling

- **Currency**: Dynamically formatted per property (`INR` -> `₹`, `USD` -> `$`, `AED` -> `AED`, `EUR` -> `€`) via `src/lib/dashboard/formatters.ts`.
- **Timezone**: All dates, operational greetings, and daily metrics are computed relative to the property's configured IANA timezone (`property.timezone`), insulating hotel operations from the browser's local timezone.

---

## 5. Resilience & Fault Isolation

Queries execute concurrently via `Promise.allSettled`. If an individual metric or audit query fails, the error is isolated, allowing the remaining cards and modules to render without crashing the entire dashboard.
