# STAYHUB Expense Management & Owner Business Intelligence — Implementation Report

## 1. Executive Summary

This report documents the architectural design, database extensions, backend data layer, frontend interfaces, security posture, and verification of two major enterprise modules added to STAYHUB:
1. **Expense Management System** (`/expenses`)
2. **Owner Business Intelligence & Reporting System** (`/reports/business`)

Both modules adhere strictly to STAYHUB's multi-tenant isolation model (`property_id` scoping), financial source-of-truth invariants, immutable audit trail principles (VOID/CANCEL rather than financial deletion), and the luxury hospitality visual design language.

---

## 2. Existing Architecture Discovered

Prior to writing code, a complete audit of STAYHUB's code and database was performed:
- **Multi-Tenancy**: Organization → Property hierarchy scoped via `property_id` and Supabase RLS.
- **Financial Architecture**:
  - `folios`, `folio_charges`, `payments`, `invoices`, and `payment_transactions`.
  - Distinctions strictly maintained between Revenue (accrual from folio charges/orders), Cash Collected (payment transactions), and Outstanding Receivables (unsettled folio balances).
- **Operations & Inventory**:
  - `restaurant_orders`, `restaurant_order_items`, `kitchen_tickets` for F&B.
  - `inventory_items`, `inventory_transactions`, `suppliers` for supply chain.
  - `housekeeping_tasks`, `maintenance_requests`, `staff_members`, `attendance_records` for operational staff.
- **Reporting Engine**:
  - Metric computation utilities in `src/lib/reports/metrics.ts` (`calculateOccupancy`, `calculateADR`, `calculateRevPAR`, `calculateALOS`, `calculateLeadTime`).
  - Period calculation functions in `src/lib/reports/periods.ts`.
  - Export utilities in `src/lib/reports/export.ts`.

---

## 3. Existing Expense & Reporting Functionality

- **Expenses**: Previously, no dedicated `expenses` table or ledger existed in the active Postgres schema. Expense reporting was a minimal placeholder.
- **Reporting**: Existing reports covered Front Desk, Occupancy, Revenue, Financials, Kitchen, Inventory, Housekeeping, Maintenance, and Staff in individual silos. No unified executive/owner dashboard existed to consolidate all hotel operations into a single operational result overview.

---

## 4. Database Architecture & Migrations

### Applied Migration
- **File**: `supabase/migrations/20260928000005_create_hotel_expenses_and_business_bi.sql`

### Database Entities Created / Extended
1. **`public.expense_categories`**: Hierarchical category tree (Category & Subcategory) with default system categories seeded for luxury hospitality (Utilities, Maintenance, Housekeeping & Laundry, Food & Beverage, Staff & Welfare, Marketing & Sales, Admin & Software, Property & Lease).
2. **`public.expenses`**:
   - `id`: UUID (Primary Key)
   - `property_id`: UUID (Foreign Key to properties, ON DELETE CASCADE)
   - `name`: VARCHAR(255) (Expense Name/Title)
   - `amount`: NUMERIC(12,2) (Amount >= 0)
   - `expense_date`: DATE (Incurred Date)
   - `category_id`: UUID (Foreign Key to expense_categories)
   - `category_name`, `subcategory_name`: Denormalized for fast indexed queries
   - `payment_method`: VARCHAR(50) (Cash, Bank Transfer, UPI, Credit Card, Debit Card, Cheque, Other)
   - `status`: VARCHAR(20) ('recorded', 'paid', 'pending', 'cancelled', 'void')
   - `vendor_id`: UUID (Foreign Key to suppliers, ON DELETE SET NULL)
   - `vendor_name`: VARCHAR(255)
   - `department`: VARCHAR(100) (Front Desk, Housekeeping, F&B, Maintenance, Management, Admin, Security, General)
   - `invoice_number`, `reference_number`: VARCHAR(100)
   - `description`, `notes`: TEXT
   - `attachment_url`: TEXT
   - `created_by`: UUID (Foreign key to auth.users / profiles)
   - `created_at`, `updated_at`, `cancelled_at`, `cancellation_reason`
3. **`public.expense_audit_logs`**:
   - Immutable audit trail capturing every creation, edit, and void action with user attribution, timestamps, and JSON diffs.

### PostgreSQL RPCs Created
1. `create_hotel_expense(...)`: Atomically inserts expense records and writes an initial audit log entry.
2. `void_hotel_expense(...)`: Enforces non-destructive cancellation of financial records by setting `status = 'void'`, recording `cancellation_reason`, and writing to `expense_audit_logs`.

### Existing Tables Reused (Zero Duplication)
- `properties`
- `suppliers` (Vendor link)
- `folios`, `folio_charges`, `payments`, `invoices`
- `bookings`, `stays`, `rooms`, `room_types`
- `restaurant_orders`, `restaurant_order_items`, `kitchen_tickets`
- `inventory_items`, `inventory_transactions`
- `housekeeping_tasks`, `maintenance_requests`
- `staff_members`, `attendance_records`
- `guest_requests`
- `organization_members`

---

## 5. Backend Architecture & Server Actions

### Expense Data Layer
- `src/lib/expenses/types.ts`: Comprehensive TypeScript interfaces, filters, pagination models, enums.
- `src/lib/expenses/queries.ts`: Query functions with parameter-safe SQL filtering, KPI aggregations, category breakdowns, department spend, vendor rankings, and period comparison (current vs previous).
- `src/lib/expenses/actions.ts`: Next.js Server Actions for secure CRUD, voiding, category retrieval, and CSV ledger export.

### Owner Business Intelligence Data Layer
- `src/lib/reports/business-types.ts`: Domain models for Executive KPIs, Financial Performance, Room/Booking metrics, F&B operations, Department Intelligence, Outstanding Receivables, and Data-Driven Attention Alerts.
- `src/lib/reports/business-queries.ts`: Unified aggregation engine combining room metrics, F&B, expenses, and operational workflows into a single pass using parallelized queries.
- `src/lib/reports/business-actions.ts`: Server Actions for fetching aggregated owner reports and full CSV exports.

---

## 6. Frontend Architecture & UI Components

### Expense Management (`/expenses`)
- `src/app/(app)/expenses/page.tsx`: Route page with permission checks and metadata.
- `src/components/expenses/expense-manager-view.tsx`: Command center orchestrating filters, period selection, KPI strips, analytics tabs, responsive ledger table, modals.
- `src/components/expenses/expense-kpi-summary.tsx`: Executive summary strip (Total, This Month, Today, Count, Avg Daily, Top Category, Largest Expense).
- `src/components/expenses/expense-analytics-charts.tsx`: Expense Trend (Daily/Weekly/Monthly), Category Donut/Bar, Department Breakdown, Top Vendors, Largest Expenses.
- `src/components/expenses/expense-filters.tsx`: Debounced search, multi-faceted filtering (Category, Vendor, Department, Payment Method, Status, Amount Range).
- `src/components/expenses/expense-ledger-table.tsx`: Desktop table + mobile card view with server-side sorting, pagination, and quick actions.
- `src/components/expenses/add-edit-expense-modal.tsx`: Accessible dialog form with vendor lookup, category pickers, and currency formatting.
- `src/components/expenses/expense-detail-modal.tsx`: Financial detail sheet with full audit history timeline.
- `src/components/expenses/void-expense-modal.tsx`: Controlled reason dialog for auditable cancellation.

### Owner Business Intelligence (`/reports/business`)
- `src/app/(app)/reports/business/page.tsx`: Route page integrated with reports navigation.
- `src/components/reports/business/owner-executive-kpis.tsx`: 9 core KPIs (Gross Revenue, Total Expenses, Operating Result, Occupancy Rate, ADR, RevPAR, Total Bookings, Average Booking Value, Outstanding Receivables) with period-over-period percentage trends.
- `src/components/reports/business/business-attention-card.tsx`: Real-time data-driven alerts for low occupancy, unpaid invoices, high cancellation rates, low inventory, housekeeping/maintenance backlogs.
- `src/components/reports/business/financial-operating-section.tsx`: Authoritative breakdown of Room Revenue, F&B Revenue, Operating Expenses, Operating Result, Taxes, Refunds, Cash Collected, and Receivables.
- `src/components/reports/business/room-booking-performance.tsx`: Occupancy, ADR, RevPAR, Room status counts (Available/Occupied/OOO), Booking status funnel, Average Length of Stay, Booking Lead Time.
- `src/components/reports/business/restaurant-fb-performance.tsx`: Total F&B Sales, Restaurant vs Room Service revenue, Orders count, Average Order Value, Top-selling items, KDS avg prep time.
- `src/components/reports/business/operations-intelligence-section.tsx`: Housekeeping task completion/inspection rates, Maintenance resolution times, Staff attendance/lateness, Inventory stock alerts & consumption.
- `src/components/reports/business/outstanding-money-section.tsx`: Unsettled folios, unpaid invoices, pending payments, refund logs.
- `src/components/reports/business/business-trends-section.tsx`: Daily revenue vs expense trends, occupancy trajectories.

---

## 7. Security, Permissions, and Multi-Tenancy

- **Row-Level Security (RLS)**:
  - Enabled on `expenses`, `expense_categories`, and `expense_audit_logs`.
  - All read and write operations are strictly validated against `property_id` matching active user memberships.
- **RBAC**:
  - Added `REPORT_BUSINESS` to `src/lib/reports/permissions.ts`.
  - Owner and Property Manager roles have full access to Business Intelligence and financial analytics. Staff roles with restricted permissions cannot view sensitive operating margins.
- **Zero Cross-Tenant Leakage**:
  - Every query and server action requires an explicit `property_id` check against verified authenticated sessions.

---

## 8. Financial Calculations & Integrity

- **Operating Result Formula**:
  $$\text{Operating Result} = \text{Operating Revenue} - \text{Operating Expenses}$$
- **Distinctions Maintained**:
  1. **Gross Revenue**: Sum of room charges, restaurant orders, guest service charges, and miscellaneous fees.
  2. **Cash Inflow**: Sum of completed payment transactions.
  3. **Outstanding Balance**: Total unpaid balances across open guest folios and issued invoices.
  4. **Operating Expenses**: Sum of recorded non-voided hotel operational expenses.

---

## 9. Performance & Build Verification

- **Parallelized Data Fetching**: `Promise.all` batches independent queries for revenue, expenses, room metrics, F&B, and operations to avoid sequential waterfall bottlenecks.
- **Pagination & Debouncing**: Ledger queries limit page sizes with server-side offsets and debounced search handlers.
- **Build Status**:
  - Next.js Turbopack build: **84 of 84 pages compiled cleanly** with **0 errors**.
  - Verified static and dynamic route generation.

---

## 10. Known Limitations & Future Enhancements

1. **Receipt Storage**: Direct storage bucket integration for image attachments is wired for URL linking; can be enhanced with drag-and-drop S3/Supabase Storage direct upload widget if storage bucket policy is expanded.
2. **Multi-Property Group Rollup**: Currently, reports are scoped to the active selected property. Future iterations can add an enterprise organization-wide multi-property consolidated view.
