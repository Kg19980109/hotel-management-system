# Kitchen Display System (KDS) & Production Workflows Architecture

> **StayHub — Phase 13 Architecture Document**  
> **Status:** Production-Ready / Verified  
> **Scope:** Kitchen stations, menu-item routing, production tickets, item-level state machines, prep timers, remakes/re-firing, audit trails, POS live integration, and multi-tenant isolation.

---

## 1. System Overview & Core Principles

The Kitchen Display System (KDS) is an operational production layer constructed directly on top of the existing StayHub Restaurant POS foundation (`restaurant_orders` and `restaurant_order_items`).

```
Restaurant POS / Online Orders
               ↓
     restaurant_orders
               ↓
   restaurant_order_items (Authoritative Customer Snapshot: Price, Qty, Item Name)
               ↓
    [create_or_fire_kitchen_ticket] (Server-Side Atomic RPC)
               ↓
        kitchen_tickets (Production Ticket: KDS-YY-XXXXXX)
               ↓
      kitchen_ticket_items (Station-Routed Production Items)
               ↓
    [QUEUED → IN_PROGRESS → READY → COMPLETED]
               ↓
   Service Delivery / POS Integration
```

### Key Architectural Invariants
1. **Zero Order Duplication:** KDS never creates a secondary order master or customer bill. `restaurant_orders` and `restaurant_order_items` remain the sole authoritative records of customer billing, discounts, taxes, and price snapshots.
2. **Production State Separation:** Kitchen preparation statuses (`QUEUED`, `IN_PROGRESS`, `READY`, `COMPLETED`, `REMAKE`) are tracked strictly within `kitchen_tickets` and `kitchen_ticket_items`. Kitchen completion never alters unit prices or line totals.
3. **Multi-Tenant & Outlet Isolation:** Every kitchen station and production ticket belongs to a specific `restaurant_id` and `property_id`. Cross-property and cross-restaurant station access is strictly blocked at the database trigger, RLS, and RPC levels.
4. **Idempotent Ticket Firing:** Order confirmation creates or returns the linked kitchen ticket idempotently without creating duplicate tickets upon browser refresh or duplicate confirmation calls.

---

## 2. Database Entities & Schemas

### 2.1 `public.kitchen_stations`
Configurable kitchen preparation stations per restaurant outlet.
- `id` (UUID, Primary Key)
- `restaurant_id` (UUID, References `restaurants.id` ON DELETE CASCADE)
- `name` (VARCHAR(100), e.g., "Hot Kitchen", "Bar & Beverages")
- `code` (VARCHAR(50), e.g., "HOT_KITCHEN", "BAR", "DESSERT")
- `description` (TEXT)
- `display_order` (INT, Default 0)
- `is_active` (BOOLEAN, Default true)
- `created_at`, `updated_at` (TIMESTAMPTZ)
- *Constraint:* `UNIQUE(restaurant_id, code)` — Station codes are unique within an outlet but can be shared across outlets.

### 2.2 `public.menu_item_kitchen_stations`
Routing relation linking menu items to kitchen stations.
- `id` (UUID, Primary Key)
- `menu_item_id` (UUID, References `menu_items.id` ON DELETE CASCADE)
- `kitchen_station_id` (UUID, References `kitchen_stations.id` ON DELETE CASCADE)
- `is_primary` (BOOLEAN, Default true)
- `display_order` (INT, Default 0)
- `created_at`, `updated_at` (TIMESTAMPTZ)
- *Constraint:* `UNIQUE(menu_item_id, kitchen_station_id)`
- *Trigger:* `trg_check_menu_item_kitchen_station_tenant` guarantees `menu_item.restaurant_id == kitchen_station.restaurant_id`.

### 2.3 `public.kitchen_tickets`
Production master ticket linked to the restaurant POS order.
- `id` (UUID, Primary Key)
- `property_id` (UUID, References `properties.id` ON DELETE CASCADE)
- `restaurant_id` (UUID, References `restaurants.id` ON DELETE CASCADE)
- `restaurant_order_id` (UUID, References `restaurant_orders.id` ON DELETE CASCADE)
- `ticket_number` (VARCHAR(30), Unique per property, formatted `KDS-YY-XXXXXX`)
- `status` (`QUEUED`, `IN_PROGRESS`, `READY`, `COMPLETED`, `CANCELLED`)
- `priority` (`LOW`, `NORMAL`, `HIGH`, `URGENT`, Default `NORMAL`)
- `fired_at` (TIMESTAMPTZ, Default `now()`)
- `started_at` (TIMESTAMPTZ, Nullable)
- `ready_at` (TIMESTAMPTZ, Nullable)
- `completed_at` (TIMESTAMPTZ, Nullable)
- `created_at`, `updated_at` (TIMESTAMPTZ)
- *Trigger:* `trg_check_kitchen_ticket_tenant` guarantees `kitchen_ticket.property_id == restaurant_order.property_id` and `kitchen_ticket.restaurant_id == restaurant_order.restaurant_id`.

### 2.4 `public.kitchen_ticket_items`
Individual line item in production with station assignment and preparation status.
- `id` (UUID, Primary Key)
- `kitchen_ticket_id` (UUID, References `kitchen_tickets.id` ON DELETE CASCADE)
- `restaurant_order_item_id` (UUID, References `restaurant_order_items.id` ON DELETE CASCADE)
- `station_id` (UUID, References `kitchen_stations.id` ON DELETE SET NULL, Nullable for unrouted items)
- `item_name` (VARCHAR(255), Snapshotted from order item)
- `quantity` (INT, Snapshotted from order item)
- `notes` (TEXT, Snapshotted item-level notes like "Extra spicy", "No onions")
- `status` (`QUEUED`, `IN_PROGRESS`, `READY`, `COMPLETED`, `CANCELLED`, `REMAKE`)
- `remake_count` (INT, Default 0)
- `remake_reason` (TEXT, Nullable)
- `started_at`, `ready_at`, `completed_at` (TIMESTAMPTZ)
- `created_at`, `updated_at` (TIMESTAMPTZ)

### 2.5 `public.kitchen_ticket_events`
Immutable audit log for all production state changes, priority adjustments, remakes, and cancellations.
- `id` (UUID, Primary Key)
- `property_id` (UUID, References `properties.id` ON DELETE CASCADE)
- `ticket_id` (UUID, References `kitchen_tickets.id` ON DELETE CASCADE)
- `ticket_item_id` (UUID, References `kitchen_ticket_items.id` ON DELETE SET NULL)
- `event_type` (`TICKET_CREATED`, `TICKET_STARTED`, `ITEM_STARTED`, `ITEM_READY`, `TICKET_READY`, `ITEM_COMPLETED`, `TICKET_COMPLETED`, `ITEM_REQUEUED`, `ITEM_REMADE`, `TICKET_CANCELLED`, `PRIORITY_CHANGED`, `STATION_CHANGED`)
- `from_status` (VARCHAR(30))
- `to_status` (VARCHAR(30))
- `performed_by` (UUID, References `profiles.id` ON DELETE SET NULL)
- `notes` (TEXT)
- `created_at` (TIMESTAMPTZ, Default `now()`)

---

## 3. Production Lifecycle & State Machine

```
Item Lifecycle:
  QUEUED ───▶ IN_PROGRESS ───▶ READY ───▶ COMPLETED
    ▲             │               │
    │ (requeue)   │ (remake)      │ (remake)
    └─────────────┴───────────────┴────────▶ REMAKE ───▶ IN_PROGRESS

Ticket Lifecycle (Derived from Active Items):
  QUEUED: Initial state upon order confirmation.
  IN_PROGRESS: When any ticket item transitions to IN_PROGRESS.
  READY: Automatically set when all active ticket items reach READY or COMPLETED.
  COMPLETED: Automatically set when all active ticket items reach COMPLETED or CANCELLED.
  CANCELLED: Automatically synchronized if the parent POS order is cancelled.
```

---

## 4. Atomic Database RPCs

1. **`create_or_fire_kitchen_ticket(p_order_id UUID, p_property_id UUID, p_priority VARCHAR DEFAULT 'NORMAL')`**
   - Atomically verifies the order, validates tenant match, and checks for an existing ticket.
   - Generates sequential ticket number `KDS-YY-XXXXXX` via server sequence.
   - Inserts `kitchen_tickets` record and routes each order item to its configured primary station (or marks unrouted).
   - Updates order status from `DRAFT` to `CONFIRMED` and logs `TICKET_CREATED` audit event.
2. **`start_kitchen_ticket_item(p_ticket_item_id UUID, p_property_id UUID)`**
   - Transitions item from `QUEUED` / `REMAKE` to `IN_PROGRESS`.
   - Transitions ticket to `IN_PROGRESS` if currently `QUEUED`.
   - Emits `ITEM_STARTED` audit event.
3. **`ready_kitchen_ticket_item(p_ticket_item_id UUID, p_property_id UUID)`**
   - Transitions item to `READY` with `ready_at = now()`.
   - Evaluates remaining unfinished items; if all are READY/COMPLETED, auto-promotes ticket to `READY` and logs `TICKET_READY`.
4. **`complete_kitchen_ticket_item(p_ticket_item_id UUID, p_property_id UUID)`**
   - Transitions item to `COMPLETED` with `completed_at = now()`.
   - If all items completed, auto-promotes ticket to `COMPLETED` and logs `TICKET_COMPLETED`.
5. **`requeue_kitchen_ticket_item(p_ticket_item_id UUID, p_property_id UUID, p_notes TEXT)`**
   - Reverts item from `IN_PROGRESS` back to `QUEUED` with operational notes.
6. **`remake_kitchen_ticket_item(p_ticket_item_id UUID, p_property_id UUID, p_reason TEXT)`**
   - Requires non-empty reason. Increments `remake_count`, sets status to `REMAKE`, re-opens ticket to `IN_PROGRESS`, and logs `ITEM_REMADE` with audit reason.
7. **`update_kitchen_ticket_priority(p_ticket_id UUID, p_property_id UUID, p_priority VARCHAR, p_notes TEXT)`**
   - Updates ticket priority (`LOW`, `NORMAL`, `HIGH`, `URGENT`) and logs `PRIORITY_CHANGED`.
8. **`cancel_restaurant_order(p_order_id UUID, p_property_id UUID, p_cancellation_reason TEXT)`**
   - Cancels POS order, releases table to `AVAILABLE`, and cascades cancellation to any linked active kitchen ticket and uncompleted items without deleting historical audit trails.

---

## 5. UI Integration & Routes

- `/restaurant/kds`: Master Kitchen Display terminal with station filter pills (All, Hot Kitchen, Bar, Unrouted), auto-refresh polling (10s), preparation timers, quick actions, audio alerts, and dense high-contrast responsive cards.
- `/restaurant/kds/history`: Kitchen operational production history with date, station, and search filters.
- `/restaurant/kitchen/stations`: Outlet station management (create, edit, soft-deactivate, display reorder).
- `/restaurant/menu`: Integrated station routing selector in menu item modal with unrouted items warning banner.
- `/restaurant/orders/[orderId]`: Live KDS production block in POS order detail displaying ticket status, elapsed waiting/prep duration, and item-by-item status badges.

---

## 6. Verification & Test Suite Summary

- 58 automated assertions in `scripts/test_kds.js` covering stations, routing triggers, ticket sequences, price immutability, independent item states, remake workflows, timers, delay flags, cancellation cascades, RLS policies, RBAC permissions, and soft-deactivation.
- 0 regressions across all 10 project test suites (287 tests passed, 0 failed).
- Next.js build: 50 static and dynamic routes compiled with 0 TypeScript and 0 ESLint errors.
