# STAYHUB — PHASE 7: FOOD ORDERING & KDS END-TO-END ARCHITECTURE AUDIT

## 1. Executive Summary

This document performs an exhaustive, architectural audit of the entire STAYHUB food ordering lifecycle, spanning:
1. **Admin Restaurant & Menu Configuration** (`/restaurant`, `/restaurant/menu`, `/restaurant/tables`, `/restaurant/orders`)
2. **Customer QR Dining Experience** (`/guest/dining`, `/guest/dining/[restaurantId]`, `/guest/cart`, `/guest/orders`, `/guest/orders/[orderId]`)
3. **Server-Authoritative Price & Availability Calculation** (`create_guest_food_order` RPC)
4. **Kitchen Display System (KDS) & Station Routing** (`create_or_fire_kitchen_ticket`, `/restaurant/kds`, `/restaurant/kitchen/stations`)
5. **Real-time Status Synchronization** (Postgres Changes, Supabase Realtime Channels, Steppers)

---

## 2. Route & Component Inventory

### Admin & Staff Routes
- `/restaurant`: Restaurant outlet selection, metrics, quick links to POS, KDS, Tables, Menu.
- `/restaurant/menu`: Menu categories, dishes, prices, availability toggles, dietary tags, station mappings.
- `/restaurant/tables`: Floor areas, tables, real-time occupancy status.
- `/restaurant/orders`: Restaurant order ledger with status filters (OPEN, CONFIRMED, PREPARING, READY, SERVED, CANCELLED).
- `/restaurant/orders/[orderId]`: Order detail dossier, line items, timestamps, table/room destination, payments/folio billing.
- `/restaurant/kds`: Live kitchen queue grouped by station, priority filters, cook timers, item completion controls.
- `/restaurant/kds/history`: Historical ticket logs and performance metrics.
- `/restaurant/kitchen/stations`: Kitchen production stations configuration (Hot Line, Pantry, Bar, Grill).

### Customer Guest Routes
- `/guest`: Redirects to `/guest/home`.
- `/guest/home`: Digital concierge, active order progress ticker, room service banner, quick services.
- `/guest/dining`: Restaurant outlet selection for property, room delivery notice, cuisine tags.
- `/guest/dining/[restaurantId]`: Category tabs, dish cards, real-time search, sold-out badges, Food Detail Modal, 1-tap add.
- `/guest/cart`: Itemized basket, special requests, verified room destination, delivery charge breakdown.
- `/guest/orders`: Active orders with live prep badges vs. Past orders ledger.
- `/guest/orders/[orderId]`: Live 4-stage tracking stepper with Supabase Realtime updates.

---

## 3. Database Schema & Data Flow Analysis

### Core Tables
1. `public.restaurants`: Multi-tenant restaurant outlets scoped by `property_id`.
2. `public.menu_categories`: Categories scoped by `restaurant_id` with `display_order` and `is_active`.
3. `public.menu_items`: Dishes scoped by `restaurant_id` and `category_id`. Columns: `price`, `currency`, `is_available`, `is_active`, `dietary_tags`.
4. `public.restaurant_orders`: Orders table. Columns: `property_id`, `restaurant_id`, `room_id`, `table_id`, `guest_id`, `stay_id`, `order_number`, `order_type` (ROOM_SERVICE, DINE_IN, TAKEAWAY, DELIVERY), `status` (OPEN, CONFIRMED, PREPARING, READY, SERVED, COMPLETED, CANCELLED), `subtotal`, `tax_amount`, `total_amount`, `currency`.
5. `public.restaurant_order_items`: Snapshotted order items. Columns: `menu_item_id`, `item_name`, `unit_price`, `quantity`, `line_total`, `notes`, `status`.
6. `public.kitchen_stations`: Production stations (e.g. `HOT_KITCHEN`, `PANTRY`, `BAR`, `GRILL`).
7. `public.menu_item_kitchen_stations`: Many-to-many routing mapping dishes to stations.
8. `public.kitchen_tickets`: KDS tickets. Columns: `property_id`, `restaurant_id`, `restaurant_order_id`, `ticket_number`, `status` (QUEUED, IN_PROGRESS, READY, COMPLETED, CANCELLED), `priority`, `fired_at`, `started_at`, `ready_at`, `completed_at`.
9. `public.kitchen_ticket_items`: Individual items in KDS ticket assigned to `station_id` with item-level `status`.
10. `public.kitchen_ticket_events`: Full audit trail of kitchen transitions.

---

## 4. Key Architectural Findings & Deficiencies Discovered

### A. Kitchen Ticket to Restaurant Order Status Disconnect
**Finding**: When KDS operators advance item/ticket statuses (`start_kitchen_ticket_item` -> `IN_PROGRESS`, `ready_kitchen_ticket_item` -> `READY`, `complete_kitchen_ticket_item` -> `COMPLETED`), the parent `restaurant_orders.status` was **not automatically synchronized**.
**Impact**:
- Admin checking `/restaurant/orders` or `/restaurant/orders/[orderId]` would see the order permanently stuck in `CONFIRMED`.
- The customer orders list (`/guest/orders`), which queries `restaurant_orders`, would not reflect progress.
- Statuses between KDS and restaurant orders would become contradictory.
**Resolution Needed**:
Implement an automatic trigger/synchronization function so that when `kitchen_tickets` transitions (`IN_PROGRESS`, `READY`, `COMPLETED`, `CANCELLED`), the parent `restaurant_orders` status automatically updates (`PREPARING`, `READY`, `COMPLETED`/`SERVED`, `CANCELLED`) and broadcasts via Realtime.

### B. Duplicate Order Protection (Idempotency)
**Finding**: If a guest experiences network delay or rapidly taps "Place Order" twice, two identical orders could theoretically be created.
**Impact**: Risk of double billing and duplicate kitchen tickets.
**Resolution Needed**:
Add `idempotency_key` support to `restaurant_orders` and `create_guest_food_order`. If a submission with the same idempotency key arrives, return the existing order without creating a duplicate.

### C. Realtime Sync & Reconnect Recovery
**Finding**: The customer order detail page tracks status via Supabase Realtime, but if the device temporarily disconnects (e.g., screen lock or elevator WiFi loss), it relied solely on incoming socket events.
**Resolution Needed**:
Add auto-reconnect recovery in `GuestOrderDetailView`: on window focus/online event, re-fetch the latest authoritative status from the server.

### D. Table Ordering Support
**Finding**: `create_guest_food_order` hardcoded `order_type = 'ROOM_SERVICE'`.
**Impact**: Does not flexibly support in-restaurant table ordering when a guest orders while seated at a restaurant table.
**Resolution Needed**:
Support optional `p_order_type` and `p_table_id` in `create_guest_food_order`, maintaining backward compatibility and defaulting to `ROOM_SERVICE`.

---

## 5. End-to-End Operational Lifecycle Plan

```
[ ADMIN CONFIG ]
Menu Item configured ($450.00, Available, Routed to Hot Line)
       ↓
[ GUEST QR SCAN ]
Verified Guest Session (HMAC signed token, checked-in stay)
       ↓
[ CUSTOMER CART ]
Select item, specify notes, view live subtotal & room destination
       ↓
[ CHECKOUT & RPC ]
`create_guest_food_order` verifies session, active stay, restaurant,
re-calculates prices from DB, checks stock, creates restaurant_order
       ↓
[ KDS AUTO-DISPATCH ]
`create_or_fire_kitchen_ticket` generates ticket & assigns stations
       ↓
[ KITCHEN STAGE UPDATES ]
KDS chef starts item → Ticket: IN_PROGRESS → Order: PREPARING
KDS chef readies item → Ticket: READY → Order: READY
KDS chef completes item → Ticket: COMPLETED → Order: COMPLETED
       ↓
[ REALTIME BROADCAST ]
Supabase Realtime sends UPDATE to:
- Admin Orders Dashboard (`/restaurant/orders`)
- Customer Live Tracker (`/guest/orders/[orderId]`)
       ↓
[ COMPLETION ]
Order marked delivered. Guest receives final confirmation.
```

---

## 6. Implementation & Verification Summary

### Implemented Enhancements
1. **Database Migration** (`supabase/migrations/20260927000001_phase7_food_ordering_e2e_sync.sql`):
   - Trigger `trg_sync_kitchen_ticket_status` on `kitchen_tickets` maintaining bidirectional status synchronization with `restaurant_orders`.
   - Idempotency column `idempotency_key VARCHAR(100)` and unique constraint on `restaurant_orders`.
   - Enhanced `create_guest_food_order` supporting idempotent submission, table dining (`DINE_IN`), and authoritative stock/price calculation.
2. **Client Components**:
   - `cart-view.tsx`: Client-generated idempotency key preventing duplicate orders upon rapid double-clicks.
   - `guest-order-detail-view.tsx`: Realtime channel subscription + network reconnect synchronization (online & visibility change triggers) + 15-second heartbeat poll fallback.
3. **Automated Verification**:
   - Dedicated Phase 7 E2E Suite (`scripts/test_phase7_food_ordering_e2e.js`): 40/40 assertions passed across 15 core scenarios.
   - Full regression suite (`scripts/run_all_tests.js`): 837/837 tests passed across all 22 system suites.
   - TypeScript compilation: 0 errors (`tsc --noEmit`).
   - ESLint: 0 errors (`npm run lint`).
   - Production Build: 84/84 routes generated successfully (`next build`).

