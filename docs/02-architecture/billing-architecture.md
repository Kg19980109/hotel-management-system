# StayHub Billing, Payments & Guest Folios Architecture (Phase 16)

## 1. Overview & Objectives
The Billing, Payments & Guest Folios module provides StayHub with an institutional-grade financial ledger and billing engine for active stays, incidentals, restaurant charges, taxes, discounts, multi-method payment settlements, and snapshot tax invoices.

### Core Architectural Principles:
1. **Single Primary Active Folio per Stay**: Exactly one `OPEN` or `SETTLED` folio per active stay record, enforcing financial ledger integrity.
2. **Authoritative Server-Side Balance Calculations**: All financial balances (`gross_charges`, `net_payments`, `balance_due`) are computed deterministically in PostgreSQL through `public.get_folio_balance()`.
3. **Immutable Financial History & Voiding Pattern**: Charges, payments, and invoices are never physically deleted. Voiding records `voided_at`, `void_reason`, and `voided_by`, emitting audit events.
4. **Checkout Settlement Enforcement**: Front desk cannot complete check-out if a folio has `balance_due > 0` unless an authorized manager override is explicitly granted.
5. **Secure Guest Portal Exposure**: Verified guests can inspect their live room charges, restaurant orders, and payments via secure session hashing without exposing staff auth or cross-tenant data.

---

## 2. Folio & Financial State Machine

```
      +-----------------------------------------+
      |                  OPEN                   | <--- Created upon check-in or first charge
      +--------------------+--------------------+
                           |
                           | (Balance Settled <= 0.00)
                           v
      +-----------------------------------------+
      |                SETTLED                  | <--- Balance is 0.00; pending checkout
      +--------------------+--------------------+
                           |
                           | (Check-out Completed)
                           v
      +-----------------------------------------+
      |                 CLOSED                  | <--- Stay checked out; ledger locked
      +-----------------------------------------+

  Alternative State:
  - OPEN / SETTLED -> VOID (Admin/Manager voiding before settlement)
```

---

## 3. Database Schema

### `public.guest_folios`
- `id` (UUID, Primary Key)
- `property_id` (UUID, FK -> `properties`, NOT NULL)
- `stay_id` (UUID, FK -> `stays`, NOT NULL)
- `guest_id` (UUID, FK -> `guests`, NOT NULL)
- `reservation_id` (UUID, FK -> `reservations`, NULLABLE)
- `folio_number` (VARCHAR 50, UNIQUE, Format: `FOL-YY-XXXXXX`)
- `status` (`OPEN`, `SETTLED`, `CLOSED`, `VOID`, DEFAULT `OPEN`)
- `currency` (VARCHAR 3, DEFAULT 'INR')
- `opened_at` (TIMESTAMPTZ, DEFAULT now())
- `closed_at` (TIMESTAMPTZ, NULLABLE)
- `created_by` / `updated_by` (UUID, FK -> `profiles`, NULLABLE)

### `public.folio_charges`
- `id` (UUID, Primary Key)
- `property_id` (UUID, FK -> `properties`, NOT NULL)
- `folio_id` (UUID, FK -> `guest_folios`, NOT NULL)
- `stay_id` (UUID, FK -> `stays`, NOT NULL)
- `charge_type` (`ROOM`, `RESTAURANT`, `ROOM_SERVICE`, `LAUNDRY`, `SPA`, `MINIBAR`, `PARKING`, `LATE_CHECKOUT`, `EARLY_CHECKIN`, `DAMAGE`, `MISCELLANEOUS`, `MANUAL`)
- `source_id` (UUID, NULLABLE - e.g. `restaurant_orders.id`)
- `description` (TEXT, NOT NULL)
- `quantity` (NUMERIC 10,2, DEFAULT 1.00)
- `unit_price` (NUMERIC 12,2, NOT NULL)
- `subtotal` (NUMERIC 12,2, NOT NULL)
- `discount_amount` (NUMERIC 12,2, DEFAULT 0.00)
- `tax_rate` (NUMERIC 5,2, DEFAULT 0.00)
- `tax_amount` (NUMERIC 12,2, DEFAULT 0.00)
- `total_amount` (NUMERIC 12,2, NOT NULL)
- `charge_date` (DATE, DEFAULT CURRENT_DATE)
- `posted_at` (TIMESTAMPTZ, DEFAULT now())
- `posted_by` (UUID, FK -> `profiles`, NULLABLE)
- `voided_at` / `void_reason` / `voided_by` (Immutable voiding metadata)

### `public.folio_payments`
- `id` (UUID, Primary Key)
- `property_id` (UUID, FK -> `properties`, NOT NULL)
- `folio_id` (UUID, FK -> `guest_folios`, NOT NULL)
- `payment_reference` (VARCHAR 50, UNIQUE, Format: `PAY-YY-XXXXXX`)
- `payment_method` (`CASH`, `CARD`, `UPI`, `BANK_TRANSFER`, `ONLINE`, `WALLET`, `OTHER`)
- `amount` (NUMERIC 12,2, NOT NULL > 0)
- `currency` (VARCHAR 3, DEFAULT 'INR')
- `status` (`COMPLETED`, `PARTIALLY_REFUNDED`, `REFUNDED`, `VOIDED`)
- `paid_at` (TIMESTAMPTZ, DEFAULT now())
- `received_by` (UUID, FK -> `profiles`, NULLABLE)

### `public.folio_refunds`
- `id` (UUID, Primary Key)
- `property_id` (UUID, FK -> `properties`, NOT NULL)
- `folio_id` (UUID, FK -> `guest_folios`, NOT NULL)
- `payment_id` (UUID, FK -> `folio_payments`, NOT NULL)
- `refund_reference` (VARCHAR 50, UNIQUE, Format: `REF-YY-XXXXXX`)
- `amount` (NUMERIC 12,2, NOT NULL > 0)
- `reason` (TEXT, NOT NULL)
- `status` (`COMPLETED`, `REJECTED`)
- `refunded_at` (TIMESTAMPTZ, DEFAULT now())
- `processed_by` (UUID, FK -> `profiles`, NULLABLE)

### `public.invoices` & `public.invoice_items`
- `invoices`: Snapshot legal tax invoice with unique number `INV-YY-XXXXXX`, status (`ISSUED`, `PAID`, `VOID`), billing address/GSTIN details, and computed totals.
- `invoice_items`: Immutable line-item copies captured at generation time to preserve accounting snapshot integrity.

### `public.folio_events`
- Append-only financial audit log with row-level trigger `trg_prevent_folio_events_mutation` blocking all UPDATE and DELETE mutations.

---

## 4. Key Stored Procedures & Business Logic

| RPC Function | Access Control | Purpose |
|---|---|---|
| `public.get_folio_balance(p_folio_id, p_property_id)` | Staff / Internal | Authoritative live balance calculation: sum(active charges) - net(payments - refunds). |
| `public.get_or_create_stay_folio(p_stay_id, p_property_id)` | Front Desk / Staff | Idempotently resolves or provisions a single primary active folio for a stay. |
| `public.post_room_charges_for_stay(p_stay_id, p_property_id)` | Front Desk / Staff | Posts room nightly rate * nights with GST tax calculation (12%) into folio. |
| `public.post_restaurant_order_to_folio(p_order_id, p_stay_id, p_property_id)` | POS / Kitchen / Staff | Seamlessly routes billable restaurant or room-service orders to the guest's folio. |
| `public.post_manual_folio_charge(...)` | Front Desk / Billing | Posts custom charges (laundry, spa, late checkout, minibar) with tax & discounts. |
| `public.void_folio_charge(p_charge_id, p_property_id, p_reason)` | Managers / Billing | Safely marks a charge as voided without ledger record destruction. |
| `public.record_folio_payment(...)` | Front Desk / Cashier | Records payments across multiple payment channels and auto-updates folio status to `SETTLED` if balance reaches 0. |
| `public.refund_folio_payment(...)` | Managers / Billing | Validates that refund does not exceed net refundable payment amount and logs reason. |
| `public.generate_invoice(...)` | Front Desk / Billing | Generates final printable snapshot tax invoice and copies items into `invoice_items`. |
| `public.void_invoice(p_invoice_id, p_property_id, p_reason)` | Managers / Billing | Voids a tax invoice with audit tracking. |
| `public.get_guest_folio(p_session_token_hash)` | Verified Guest QR Portal | Allows guests to inspect their room folio securely via SHA-256 token validation. |
| `public.check_out_stay(p_stay_id, p_property_id, p_allow_unpaid_override)` | Front Desk | Verifies that folio balance is 0.00 (or override is checked), marks folio `CLOSED`, transitions room to `DIRTY`, and auto-creates cleaning task. |

---

## 5. Security, RBAC & Multi-Tenancy
- **Tenant Isolation**: All queries and mutations are strictly filtered by `property_id` and enforced via PostgreSQL Row Level Security (RLS).
- **Staff Permissions Matrix**:
  - `HOTEL_OWNER` / `SUPER_ADMIN` / `GENERAL_MANAGER`: Full billing permissions (view, post charge, record payment, refund, generate invoice, void charge, void invoice).
  - `FRONT_DESK` / `RECEPTIONIST`: View folios, post charges, record payments, generate invoices. Void and refund require manager permissions.
  - `ACCOUNTANT`: View folios, record payments, generate invoices, view reports.
  - `KITCHEN_STAFF` / `HOUSEKEEPING`: Cannot access or mutate billing folios directly.
- **Guest Privacy**: Verified guest sessions query `get_guest_folio` using SHA-256 session token hashes without ever touching Supabase staff auth or seeing other guests' stays.
