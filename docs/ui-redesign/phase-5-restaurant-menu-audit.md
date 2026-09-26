# STAYHUB PHASE 5 — RESTAURANT & MENU MANAGEMENT AUDIT
**Audit Date:** 2026-09-27  
**System:** StayHub Hotel Management System  
**Module:** Restaurant, Menu Catalog, Tables, POS, Guest QR Dining & Kitchen Display System (KDS)

---

## 1. Existing Restaurant Pages
- **`/restaurant` (`src/app/(app)/restaurant/page.tsx`):**
  - Outlets overview, restaurant selector, outlet creation modal (`name`, `code`, `description`).
  - Restaurant KPI row (`RestaurantKpiGrid`) showing Open Orders, Active Tables, Available Tables, Today's Orders, Sales, and Cancelled Orders.
  - Quick navigation cards to POS Terminal, Dining Tables Map, Menu & Item Pricing, and Orders & Invoices.
  - Recent order ledger list (last 10 orders) with status badges and details link.
- **`/restaurant/tables` (`src/app/(app)/restaurant/tables/page.tsx`):**
  - Dining room floor plan and table map manager (`TableMap`).
  - Area creation, table creation with capacity, active table status transitions.
- **`/restaurant/pos` (`src/app/(app)/restaurant/pos/page.tsx`):**
  - High-speed cashier and waiter point-of-sale terminal (`PosTerminal`).
  - Table selection, order type (Dine-in, Takeaway, Room Service), menu catalog with category filter, order line item cart, payment / checkout.
- **`/restaurant/orders` (`src/app/(app)/restaurant/orders/page.tsx`):**
  - Complete restaurant order ledger.
  - Multi-outlet, status, order type, and date filters with search and pagination.
- **`/restaurant/orders/[orderId]` (`src/app/(app)/restaurant/orders/[orderId]/page.tsx`):**
  - Order dossier, guest context, table assignment, items snapshot, payment breakdown, KDS ticket link, action buttons (Confirm, Complete, Cancel).
- **`/restaurant/kds` (`src/app/(app)/restaurant/kds/page.tsx`) & `/restaurant/kitchen/stations` (`src/app/(app)/restaurant/kitchen/stations/page.tsx`):**
  - Live kitchen display system board with station routing, item timers, bumped state, and station configuration.

---

## 2. Existing Menu Pages
- **`/restaurant/menu` (`src/app/(app)/restaurant/menu/page.tsx`):**
  - Admin menu management container with outlet picker (`restaurants.map`), link to POS terminal, and data refresh.
  - Embeds `MenuEditor` (`src/components/restaurant/menu-editor.tsx`).
- **`MenuEditor` (`src/components/restaurant/menu-editor.tsx`):**
  - Category selector pills (`ALL` + active categories).
  - Search input for menu items.
  - Add Category modal (`name`, `description`, `display_order`).
  - Add / Edit Menu Item modal (`category_id`, `name`, `short_name`, `sku`, `description`, `price`, `is_available`, `display_order`, `station_id`).
  - Unrouted items warning banner if items lack kitchen station assignment.
  - Table view of menu items with availability pill toggle, edit button, and deactivation button.

---

## 3. Existing Menu Categories
- **Database Table:** `public.menu_categories`
  - Columns: `id`, `restaurant_id`, `name`, `description`, `display_order`, `is_active`, `created_at`, `updated_at`.
  - Constraint: `uq_menu_category_restaurant_name (restaurant_id, name)`.
- **Existing Actions (`src/lib/restaurant/actions.ts`):**
  - `createCategoryAction(propertyId, { restaurant_id, name, description, display_order })`.
- **Identified Gap:**
  - Missing `updateCategoryAction` (editing category name, description, display_order, is_active).
  - Missing `deactivateCategoryAction` / category deletion modal in the UI.

---

## 4. Existing Menu Item Implementation
- **Database Table:** `public.menu_items`
  - Columns: `id`, `restaurant_id`, `category_id`, `name`, `description`, `short_name`, `sku`, `price`, `currency`, `is_available`, `is_active`, `display_order`, `created_at`, `updated_at`.
- **Existing Actions (`src/lib/restaurant/actions.ts`):**
  - `createMenuItemAction`: creates new item with price validation and category association.
  - `updateMenuItemAction`: updates name, short_name, sku, description, price, category_id, availability, display_order.
  - `toggleMenuItemAvailabilityAction`: instantaneous availability toggle (`is_available: true/false`).
  - `deactivateMenuItemAction`: soft deletes item (`is_active: false`), preserving historical orders and billing snapshots.
- **KDS Kitchen Station Routing:**
  - `saveMenuItemRoutingAction(itemId, stationId, isPrimary)` in `src/lib/kds/actions.ts` maps items to prep stations.

---

## 5. Existing Restaurant Configuration
- **Database Table:** `public.restaurants`
  - Columns: `id`, `property_id`, `name`, `code`, `description`, `cuisine_type`, `currency`, `timezone`, `opening_time`, `closing_time`, `is_active`, `created_at`, `updated_at`.
- **Actions:**
  - `createRestaurantAction` sets up property-scoped dining outlets.
  - Multi-outlet support allows hotel properties to run multiple restaurants, bars, and cafes concurrently.

---

## 6. Existing Guest Dining Implementation
- **Customer Pages:**
  - `/guest/dining` (`src/app/guest/dining/page.tsx`): lists available dining outlets for the guest's verified stay or general QR session.
  - `/guest/dining/[restaurantId]` (`src/app/guest/dining/[restaurantId]/page.tsx`): renders customer-facing menu view (`DiningMenuView`).
- **Data Flow:**
  - `getGuestRestaurantMenu(restaurantId)` queries `menu_categories` (`is_active = true`) and `menu_items` (`is_active = true`) ordered by `display_order`.
  - Maps categories with their active items, displaying real-time prices, descriptions, and stock availability (`is_available`).
  - Items out of stock show disabled "Out of Stock" state on guest mobile UI.
  - Verified in-room guests can add available items to cart and place room service orders.

---

## 7. Existing Order Creation
- **Guest In-Room QR Ordering:**
  - RPC `public.create_guest_food_order(p_session_token_hash, p_restaurant_id, p_items, p_notes)`.
  - Authoritatively checks session token, stay verification (`CHECKED_IN`), restaurant tenancy (`property_id = session.property_id`), and item stock (`is_available = true`).
  - Calculates server-authoritative line totals and tax, preventing client price tampering.
  - Creates `restaurant_orders` (type `ROOM_SERVICE`, status `CONFIRMED`), inserts immutable snapshot rows in `restaurant_order_items`, logs audit event, and automatically fires KDS ticket via `public.create_or_fire_kitchen_ticket`.
- **POS Terminal Ordering:**
  - RPC `public.create_restaurant_order` via `createOrderAction(input)` for dine-in tables, takeaway, and front-desk phone orders.

---

## 8. Existing KDS Integration
- Automatic trigger fires `public.create_or_fire_kitchen_ticket` when orders are placed.
- Items are split and routed to target kitchen stations (e.g. Grill, Pantry, Fryer, Bar) based on `menu_item_kitchen_stations` routing.
- Real-time station views update on bump and completion.

---

## 9. Existing Realtime Integration
- Postgres changes on `restaurant_orders` and `kitchen_tickets` broadcast live updates to POS, KDS, and Guest Orders pages.
- Fallback interval heartbeats ensure zero stale state.

---

## 10. Missing UI & Incomplete Features (To Implement in Phase 5)
1. **Design Alignment:**
   - Existing restaurant admin pages (`/restaurant`, `/restaurant/menu`, `/restaurant/orders`, `/restaurant/tables`) use generic/legacy styling rather than the Phase 1/2/3 StayHub design system:
     - Missing signature Midnight Navy & Gold command hero headers.
     - `RestaurantKpiGrid` uses basic divs rather than canonical `KPIWidget` cards.
     - Outlets navigation, quick cards, and order tables need elevation to `stayhub-card`.
2. **Category Administration Operations:**
   - Admin cannot currently edit category names, descriptions, or display order after creation.
   - Admin cannot currently toggle category active state or delete empty categories.
   - We need to add `updateCategoryAction` and `deactivateCategoryAction` to `src/lib/restaurant/actions.ts` and build Category Edit/Delete modal in `MenuEditor`.
3. **Menu Item Presentation & Visual Excellence:**
   - Menu items currently only display in a plain text table with basic edit/deactivate icons.
   - Need a premium toggle between **Rich Menu Cards View** (high-visual presentation with food badges, pricing heroes, availability toggles, station pills) and **Dense Table View**.
4. **Customer Menu Live Preview:**
   - Staff should have a "Preview Guest Menu" drawer or view so hotel admins can immediately see how the menu looks to guests on their phones without having to scan a physical QR code.
5. **Enhanced Metrics:**
   - Display menu statistics (Total Items, In-Stock Items, Out-of-Stock Items, Categories Count, Unrouted Items) using `KPIWidget`.

---

## 11. What Must NOT Be Changed
- Database schemas and column types (no migrations needed; existing schemas fully support categories, items, and restaurants).
- Authentication, RLS policies, role-based authorization, and tenant isolation.
- Existing RPCs (`create_guest_food_order`, `create_restaurant_order`, `create_or_fire_kitchen_ticket`).
- Server-authoritative pricing validation and billing folios integration.
