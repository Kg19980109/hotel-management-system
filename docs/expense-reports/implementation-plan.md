# StayHub Expense Management & Owner Business Intelligence — Implementation Plan

**Date:** 2026-09-28  
**Author:** StayHub Senior Full-Stack SaaS & Financial Architecture Team  
**Status:** Approved for Implementation  

---

## 1. Existing Architecture Discovered
- **Framework & Runtime:** Next.js 16.3.6 (Turbopack, App Router, React 19, Server Actions, Route Handlers, SSR/Client Components).
- **Database & Auth:** Supabase PostgreSQL with Row-Level Security (RLS), multi-tenant isolation keyed by `property_id`, and role-based permissions (`SUPER_ADMIN`, `HOTEL_OWNER`, `GENERAL_MANAGER`, `ACCOUNTANT`, `FRONT_DESK`, etc.).
- **Design System:** Luxury hotel styling with midnight navigation, warm ivory/slate surfaces, refined cards, KPI counters, Lucide icons, accessible dialogs, and responsive grids.
- **Data Layers:**
  - **Billing & Folios:** `billing_folios`, `billing_charges`, `billing_payments`, `invoices` (`src/lib/billing/*`).
  - **Inventory & Suppliers:** `suppliers`, `purchase_orders`, `inventory_items`, `inventory_stock` (`src/lib/inventory/*`, `src/lib/suppliers/*`).
  - **Staff & Departments:** `staff_members`, `staff_departments`, `staff_attendance` (`src/lib/staff/*`).
  - **Restaurant & KDS:** `restaurant_orders`, `restaurant_order_items`, `kitchen_tickets` (`src/lib/restaurant/*`, `src/lib/kds/*`).
  - **Rooms & Stays:** `rooms`, `stays`, `bookings`, `guests` (`src/lib/rooms/*`, `src/lib/bookings/*`, `src/lib/front-desk/*`).
  - **Reporting Engine:** Authoritative metrics in `src/lib/reports/queries.ts` and `src/lib/reports/metrics.ts`.

---

## 2. Existing Expense Functionality Discovered
- **Placeholder Route:** `src/app/(app)/expenses/page.tsx` was rendering a placeholder page.
- **Database Tables:**
  - `public.expense_categories` (id, property_id, name, description, is_active, created_at, updated_at).
  - `public.staff_expenses` (id, property_id, staff_id, expense_number, category_id, expense_date, amount, currency, merchant, description, status, submitted_at, approved_by, approved_at, notes, created_at, updated_at).
  - `public.staff_expense_receipts` (id, property_id, expense_id, file_name, storage_path, mime_type, file_size, uploaded_by, created_at).
- **Gap Analysis:**
  - Hotel operational expenses (utilities, vendor payments, maintenance, laundry, software, rent, taxes) need a first-class, general hotel expense system (`public.expenses` table or unified expense model) that supports:
    - Expense Name/Title
    - Category & Subcategory
    - Direct Vendor/Supplier linkage to `public.suppliers`
    - Department linkage to `public.staff_departments`
    - Payment Method (`CASH`, `BANK_TRANSFER`, `UPI`, `CREDIT_CARD`, `DEBIT_CARD`, `CHEQUE`, `OTHER`)
    - Invoice/Reference Number
    - Status lifecycle (`DRAFT`, `RECORDED`, `PENDING`, `PAID`, `CANCELLED` / `VOID`)
    - Attachments/Receipts
    - Audit tracking (who created/updated/voided)

---

## 3. Existing Reporting Functionality Discovered
- **Reports Hub:** `src/app/(app)/reports/page.tsx` exists with 16 sub-reports (`occupancy`, `revenue`, `financials`, `restaurant`, `kitchen`, `housekeeping`, `maintenance`, `inventory`, `suppliers`, `staff`, `expenses`, `guest-services`, etc.).
- **Permissions Engine:** `src/lib/reports/permissions.ts` defines `ROLE_REPORT_PERMISSIONS` and `getAccessibleReportRoutes`.
- **Query Aggregations:** `src/lib/reports/queries.ts` provides authoritative SQL queries for room nights, ADR, RevPAR, ALOS, billing totals, F&B revenue, housekeeping tasks, maintenance issues, staff attendance, etc.

---

## 4. Existing Financial Sources of Truth
- **Room & Stay Revenue:** `billing_charges` (where `charge_type IN ('ROOM_NIGHT', 'ROOM_RATE')` or folio charges) and `stays` room tariffs.
- **F&B Revenue:** `restaurant_orders` (sum of `total_amount` for completed/confirmed orders) and F&B folio charges.
- **Cash & Payments Collected:** `billing_payments` (actual cash/bank/card captured) and `invoices` settled amounts.
- **Outstanding Receivables:** `billing_folios` (`balance_amount > 0`) and unpaid `invoices`.
- **Operating Result:** Authoritative formula:
  $$\text{Operating Result} = \text{Total Operating Revenue} - \text{Total Operating Expenses}$$
  *(Explicitly distinct from Net Profit to avoid fabricating non-operational financial entries like depreciation, amortization, and income tax provision).*

---

## 5. Existing Tables That Can Be Reused
1. `public.properties` (Tenant scoping)
2. `public.expense_categories` (Category master hierarchy)
3. `public.suppliers` (Vendor directory)
4. `public.staff_departments` (Department attribution)
5. `public.staff_members` (Employee attribution/claims)
6. `public.billing_folios`, `public.billing_charges`, `public.billing_payments` (Folio financial source of truth)
7. `public.invoices` (Tax invoice source of truth)
8. `public.restaurant_orders`, `public.restaurant_order_items` (F&B source of truth)
9. `public.stays`, `public.bookings`, `public.rooms` (Room occupancy, ADR, RevPAR source of truth)
10. `public.housekeeping_tasks`, `public.maintenance_requests` (Operations source of truth)
11. `public.inventory_items`, `public.inventory_stock`, `public.purchase_orders` (Inventory source of truth)
12. `public.staff_attendance` (Staff attendance source of truth)
13. `public.guest_service_requests` (Guest concierge/service requests)

---

## 6. New Tables Required
- **`public.expenses`**: General operational expenses table for hotel properties, linked to `properties`, `expense_categories`, `suppliers`, `staff_departments`, `staff_members`, and `auth.users`.
- **`public.expense_audit_logs`**: Immutable audit ledger recording creation, updates, and cancellations/voids for financial compliance.
- **`public.expense_attachments`**: Secure file attachments/receipt references linked to expenses.

---

## 7. New RPCs Required
- **`create_property_expense`**: Atomically creates an expense with sequential numbering (`EXP-YYYY-XXXX`), validates property isolation, and records audit trail.
- **`void_property_expense`**: Safely marks an expense as `CANCELLED`/`VOID` with audit reason without destructive deletion.
- **`get_expense_analytics_summary`**: High-performance SQL aggregation returning period totals, average daily expense, category breakdown, vendor rankings, and period comparison.
- **`get_owner_business_intelligence`**: Server-side unified executive reporting engine returning complete cross-module metrics in a single optimized payload.

---

## 8. New Server Actions Required
- **Expense Actions (`src/lib/expenses/actions.ts`):**
  - `fetchExpensesAction(propertyId, filters, pagination, sort)`
  - `fetchExpenseSummaryAction(propertyId, periodParams)`
  - `createExpenseAction(propertyId, input)`
  - `updateExpenseAction(propertyId, expenseId, input)`
  - `voidExpenseAction(propertyId, expenseId, reason)`
  - `fetchExpenseCategoriesAction(propertyId)`
  - `createExpenseCategoryAction(propertyId, input)`
  - `exportExpensesCsvAction(propertyId, filters)`
- **Owner Business Reports Actions (`src/lib/reports/business-actions.ts`):**
  - `fetchOwnerBusinessReportAction(propertyId, periodParams)`
  - `exportOwnerBusinessReportCsvAction(propertyId, periodParams)`

---

## 9. New Routes
- **`/expenses`**: Complete hotel expense management command center with executive KPIs, visual trends, category breakdown, vendor rankings, ledger table with filtering/sorting/pagination, and Add/Edit/Void modals.
- **`/reports/business`**: Dedicated Owner Business Intelligence dashboard with Executive KPIs, Financial Performance, Revenue vs Expenses, Room/ADR/RevPAR metrics, F&B breakdown, Operations reports, Outstanding receivables, and Data-Driven Business Attention alerts.

---

## 10. New Permissions
- Integrated directly with existing RBAC:
  - `EXPENSES_VIEW`, `EXPENSES_MANAGE`, `EXPENSES_EXPORT`
  - `REPORT_BUSINESS_INTELLIGENCE` (available to `HOTEL_OWNER`, `SUPER_ADMIN`, `GENERAL_MANAGER`, `ACCOUNTANT`).

---

## 11. Existing Components That Can Be Reused
- `src/components/ui/card.tsx`, `src/components/ui/button.tsx`, `src/components/ui/input.tsx`, `src/components/ui/dialog.tsx`
- `src/components/reports/kpi-card.tsx`, `src/components/reports/report-header.tsx`, `src/components/reports/report-nav.tsx`
- `src/components/shared/empty-state.tsx`, `src/components/shared/loading-state.tsx`, `src/components/shared/page-header.tsx`

---

## 12. Performance Considerations
- Database composite indexes on `(property_id, expense_date)`, `(property_id, category_id)`, `(property_id, vendor_id)`, `(property_id, status)`.
- Server-side pagination and debounced search to avoid loading thousands of rows in the client.
- Single-pass aggregated queries for the Owner Business Intelligence dashboard to prevent N+1 queries.
- Visible-only light polling (2s) where real-time synchronization is needed.

---

## 13. Security Considerations
- Strict RLS on all expense tables checking `public.user_belongs_to_property(auth.uid(), property_id)`.
- All Server Actions authenticate the active session and verify user membership in the target property.
- Financial audit trail: No destructive deletion of financial history; only voiding with reason.

---

## 14. Risks & Mitigations
- **Risk:** Inconsistent financial totals between Billing, Invoices, and Owner Reports.  
  **Mitigation:** Directly reuse existing authoritative billing and folio SQL aggregators from `src/lib/reports/queries.ts`.
- **Risk:** Missing categories for new hotels.  
  **Mitigation:** Automatic default category provisioning (Utilities, Maintenance, Housekeeping, F&B, Staff, Marketing, IT, Rent, Taxes, Office, Miscellaneous) on property initialization.

---

## 15. Testing Plan
1. Schema and migration application via SQL script.
2. TypeScript compilation check (`npm run build`).
3. Multi-tenant isolation verification.
4. Expense CRUD, filter, search, sort, void, export test.
5. Owner Business Intelligence accuracy test across all date ranges.
6. Zero-regression verification across all existing modules.
