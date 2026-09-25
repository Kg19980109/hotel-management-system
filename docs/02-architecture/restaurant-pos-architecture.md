# Restaurant POS & Dining Operations Architecture (Phase 12)

## 1. Domain Overview
StayHub Phase 12 establishes the multi-tenant hotel Restaurant Point of Sale (POS) and Dining Operations module. It models dining outlets as property-scoped entities (`restaurants`) that contain physical dining areas (`restaurant_areas`), dining tables (`restaurant_tables`), menu catalogs (`menu_categories`, `menu_items`), and dining transactions (`restaurant_orders`, `restaurant_order_items`, `restaurant_order_events`).

---

## 2. Multi-Tenancy & Outlets Hierarchy
The restaurant domain strictly inherits StayHub's Organization & Property tenancy structure:

```
Organization
└── Property
    └── Restaurant Outlet (e.g., Main Dining, Sky Bar)
        ├── Restaurant Areas (e.g., Indoor, Rooftop Terrace)
        │   └── Restaurant Tables (e.g., T-01, T-02)
        ├── Menu Categories (e.g., Starters, Main Course, Beverages)
        │   └── Menu Items (with NUMERIC prices, stock availability)
        └── Restaurant Orders
            ├── Line Items (snapshot item name & unit price)
            └── Order Audit Events
```

### Tenancy Enforcement Rules:
1. Every outlet belongs to a `property_id`.
2. Tables, areas, menu categories, and items reference a specific `restaurant_id`.
3. Database triggers enforce that a dining table's `area_id` must match its `restaurant_id`.
4. Database triggers enforce that a menu item's `category_id` must match its `restaurant_id`.
5. Database triggers enforce that an order's `table_id`, `guest_id`, and `stay_id` belong strictly to the same property and restaurant boundaries.
6. Row Level Security (RLS) is active on every table, utilizing `user_belongs_to_property(auth.uid(), property_id)`.

---

## 3. Core Entities & Database Schema

### `public.restaurants`
- `id` (UUID PK)
- `property_id` (UUID FK -> `properties.property_id`)
- `name` (TEXT)
- `code` (TEXT) - Unique within property
- `description` (TEXT)
- `currency` (VARCHAR(3))
- `timezone` (TEXT)
- `is_active` (BOOLEAN)
- `created_at`, `updated_at` (TIMESTAMPTZ)

### `public.restaurant_areas`
- `id` (UUID PK)
- `restaurant_id` (UUID FK -> `restaurants.id`)
- `name` (TEXT)
- `description` (TEXT)
- `display_order` (INTEGER)
- `is_active` (BOOLEAN)
- `created_at`, `updated_at` (TIMESTAMPTZ)

### `public.restaurant_tables`
- `id` (UUID PK)
- `restaurant_id` (UUID FK -> `restaurants.id`)
- `area_id` (UUID FK -> `restaurant_areas.id`)
- `table_number` (VARCHAR(50)) - Unique per restaurant
- `display_name` (VARCHAR(100))
- `capacity` (INTEGER, default 2, >= 1)
- `status` (`AVAILABLE`, `OCCUPIED`, `RESERVED`, `CLEANING`, `OUT_OF_SERVICE`)
- `is_active` (BOOLEAN)
- `created_at`, `updated_at` (TIMESTAMPTZ)

### `public.menu_categories`
- `id` (UUID PK)
- `restaurant_id` (UUID FK -> `restaurants.id`)
- `name` (TEXT)
- `description` (TEXT)
- `display_order` (INTEGER)
- `is_active` (BOOLEAN)
- `created_at`, `updated_at` (TIMESTAMPTZ)

### `public.menu_items`
- `id` (UUID PK)
- `restaurant_id` (UUID FK -> `restaurants.id`)
- `category_id` (UUID FK -> `menu_categories.id`)
- `name` (TEXT)
- `short_name` (VARCHAR(100))
- `description` (TEXT)
- `sku` (VARCHAR(100))
- `price` (NUMERIC(12,2), >= 0)
- `currency` (VARCHAR(3))
- `is_available` (BOOLEAN)
- `is_active` (BOOLEAN)
- `display_order` (INTEGER)
- `created_at`, `updated_at` (TIMESTAMPTZ)

### `public.restaurant_orders`
- `id` (UUID PK)
- `property_id` (UUID FK -> `properties.property_id`)
- `restaurant_id` (UUID FK -> `restaurants.id`)
- `table_id` (UUID FK -> `restaurant_tables.id`, nullable for takeaway)
- `order_number` (VARCHAR(50) UNIQUE) - Format `POS-YY-XXXXXX`
- `order_type` (`DINE_IN`, `TAKEAWAY`, `ROOM_SERVICE`, `DELIVERY`)
- `status` (`DRAFT`, `OPEN`, `CONFIRMED`, `PREPARING`, `READY`, `SERVED`, `COMPLETED`, `CANCELLED`)
- `guest_id` (UUID FK -> `guests.id`, optional)
- `stay_id` (UUID FK -> `stays.id`, optional)
- `created_by` (UUID FK -> `profiles.id`)
- `assigned_to` (UUID FK -> `profiles.id`, optional)
- `notes` (TEXT)
- `subtotal` (NUMERIC(12,2), >= 0)
- `discount_amount` (NUMERIC(12,2), default 0)
- `tax_amount` (NUMERIC(12,2), default 0)
- `service_charge_amount` (NUMERIC(12,2), default 0)
- `total_amount` (NUMERIC(12,2), >= 0)
- `currency` (VARCHAR(3))
- `created_at`, `updated_at`, `completed_at`, `cancelled_at` (TIMESTAMPTZ)
- `cancelled_by` (UUID FK -> `profiles.id`)
- `cancellation_reason` (TEXT)

### `public.restaurant_order_items`
- `id` (UUID PK)
- `order_id` (UUID FK -> `restaurant_orders.id` ON DELETE CASCADE)
- `menu_item_id` (UUID FK -> `menu_items.id` ON DELETE RESTRICT)
- `item_name` (VARCHAR(255)) - **Historical Snapshot**
- `unit_price` (NUMERIC(12,2)) - **Historical Snapshot**
- `quantity` (INTEGER, >= 1)
- `discount_amount` (NUMERIC(12,2), default 0)
- `tax_amount` (NUMERIC(12,2), default 0)
- `line_total` (NUMERIC(12,2), derived: `(unit_price * quantity) - discount + tax`)
- `notes` (TEXT)
- `status` (`PENDING`, `CONFIRMED`, `CANCELLED`, `SERVED`)
- `created_at`, `updated_at` (TIMESTAMPTZ)

### `public.restaurant_order_events`
- `id` (UUID PK)
- `property_id` (UUID FK -> `properties.property_id`)
- `order_id` (UUID FK -> `restaurant_orders.id` ON DELETE CASCADE)
- `event_type` (TEXT) - `CREATED`, `CONFIRMED`, `COMPLETED`, `CANCELLED`, `STATUS_CHANGED`, `ITEM_ADDED`
- `from_status`, `to_status` (TEXT)
- `performed_by` (UUID FK -> `profiles.id`)
- `notes` (TEXT)
- `created_at` (TIMESTAMPTZ)

---

## 4. Key Architectural Guarantees

### 1. Historical Price Snapshot Integrity
When an order is created, the item's `item_name` and `unit_price` are captured at order time. Any subsequent changes to `menu_items.price` or deactivation (`is_active = false`) do not alter historical orders or receipts.

### 2. Atomic Order Number Generation
Order numbers follow `POS-YY-XXXXXX` generated via a PostgreSQL sequence (`restaurant_order_num_seq`) inside the atomic RPC `generate_restaurant_order_number()`. Browser-supplied order numbers are never trusted.

### 3. Server-Side Financial Calculations
Prices, line totals, subtotals, discount boundaries, and totals are computed strictly server-side within the `create_restaurant_order()` RPC. Negative discounts or discounts exceeding the subtotal are rejected.

### 4. Table State Synchronization & Collision Prevention
- When a `DINE_IN` order is created, the target table is validated to ensure it is not already occupied by another active order.
- The table status is automatically set to `OCCUPIED`.
- Upon order completion (`complete_restaurant_order`) or cancellation (`cancel_restaurant_order`), if no other active orders remain on that table, the table is automatically returned to `AVAILABLE`.

### 5. Role-Based Permissions
- `RESTAURANT_VIEW`: View restaurant outlets, tables, and menus.
- `RESTAURANT_MANAGE`: Configure outlets and areas.
- `RESTAURANT_MENU_VIEW` / `RESTAURANT_MENU_MANAGE`: Read and edit menu items and categories.
- `RESTAURANT_POS_ACCESS`: Access POS cashier interface.
- `RESTAURANT_ORDER_CREATE` / `RESTAURANT_ORDER_UPDATE` / `RESTAURANT_ORDER_CANCEL` / `RESTAURANT_ORDER_VIEW`: Manage orders.
- `RESTAURANT_TABLE_MANAGE`: Create, edit, and adjust table statuses.
- `RESTAURANT_DISCOUNT_APPLY`: Apply discounts on orders.

---

## 5. Phase Boundaries & Future Roadmap
- **Phase 12 Scope (Current)**: POS terminals, table maps, menu editor, order ledger, order details, multi-tenancy, price snapshots, table sync, audit logging.
- **Future Phase 13**: Kitchen Display System (KDS) & kitchen production workflows.
- **Future Phase 14**: Guest QR ordering & digital portal.
- **Future Phase 15/16**: Room service workflows, guest folio posting, and payment gateway billing.
