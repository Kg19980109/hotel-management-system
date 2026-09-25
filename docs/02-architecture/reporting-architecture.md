# Reporting & Analytics Architecture (Phase 19)

## 1. Overview
StayHub's centralized reporting and analytics layer provides authoritative, property-scoped operational and financial intelligence across all hotel management domains without creating redundant reporting databases or calculating business logic in React components.

## 2. Core Architectural Separation
The reporting architecture strictly isolates three layers:
1. **Data Retrieval (`src/lib/reports/queries.ts`)**: Server-side PostgreSQL/Supabase queries using RLS and property filtering with efficient database-level aggregation.
2. **Metric Calculation (`src/lib/reports/metrics.ts`)**: Pure, deterministic TypeScript functions for hotel KPIs (Occupancy, ADR, RevPAR, ALOS, Net Revenue, Attendance, Inspection Pass Rates, etc.) and comparison deltas.
3. **UI Presentation (`src/components/reports/` and `src/app/(app)/reports/`)**: Visual, interactive cards, trends, and sortable tables consuming typed report payloads.

## 3. Authoritative Source of Truth
Reports read directly from existing operational domains:
- **Room Availability & Utilization**: `public.rooms`, `public.room_types`
- **Reservations**: `public.reservations`, `public.reservation_rooms`
- **Stays & Front Desk**: `public.stays`, `public.guests`
- **Restaurant & F&B**: `public.restaurant_orders`, `public.restaurant_order_items`, `public.menu_items`
- **Kitchen Display System (KDS)**: `public.kitchen_tickets`, `public.kitchen_ticket_items`
- **Housekeeping**: `public.housekeeping_tasks`, `public.housekeeping_inspections`
- **Maintenance**: `public.maintenance_work_orders`
- **Financial Ledger & Billing**: `public.guest_folios`, `public.folio_charges`, `public.folio_payments`, `public.folio_refunds`, `public.invoices`
- **Inventory & Stock**: `public.inventory_items`, `public.inventory_stock_movements`, `public.suppliers`, `public.purchase_orders`
- **Staff & Attendance**: `public.staff_members`, `public.staff_attendance`, `public.staff_expenses`
- **Guest Services**: `public.guest_service_requests`

## 4. Timezone & Date Range Handling
- All date boundaries (Today, Yesterday, Last 7 Days, Last 30 Days, This Month, Last Month, This Quarter, This Year, Custom) are evaluated relative to the property's configured timezone (e.g. `Asia/Kolkata`), ensuring local business date fidelity.

## 5. Multi-Property Scoping & Security
- Every report query enforces `property_id` filtering and RLS boundaries.
- Cross-property aggregation is strictly restricted to authorized roles (`SUPER_ADMIN`, `HOTEL_OWNER`).
- Departmental RBAC ensures Housekeeping only accesses cleaning reports, Restaurant staff access F&B reports, and sensitive financial reports are restricted to Owner, GM, and Accountant.

## 6. Export Security
- Reports are exportable in sanitized CSV format with property metadata and generation timestamps. Formulas and hidden fields are sanitized to prevent CSV injection.
