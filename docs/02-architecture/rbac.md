# StayHub Role-Based Access Control (RBAC)

## 1. Role Architecture & Hierarchy

StayHub decouples platform authority (`SUPER_ADMIN`) from operational property-level authority. System roles are seeded in `public.roles`:

| Role Code | Role Name | Scope | Level | Responsibilities |
| :--- | :--- | :--- | :--- | :--- |
| `SUPER_ADMIN` | Platform Super Administrator | Platform | 100 | Cross-tenant administration, system migrations, global telemetry. |
| `HOTEL_OWNER` | Hotel Owner | Property | 90 | Primary property administrator with financial, billing, and staff authority. |
| `GENERAL_MANAGER` | General Manager | Property | 80 | Daily operational leader managing rooms, housekeeping, inventory, and staff. |
| `FRONT_DESK` | Front Desk Supervisor | Property | 60 | Check-in lead, room assignment, walk-in reservations, reception team. |
| `RECEPTIONIST` | Receptionist | Property | 50 | Front desk operator handling guest arrivals, departures, and inquiries. |
| `ACCOUNTANT` | Accountant | Property | 50 | Invoices, expenses, tax compliance, petty cash, and financial reporting. |
| `HOUSEKEEPING` | Housekeeping Staff | Property | 40 | Room cleaning updates, inspection checks, and linen supply tracking. |
| `MAINTENANCE` | Maintenance Technician | Property | 40 | Work orders, equipment repairs, room maintenance tickets. |
| `RESTAURANT_STAFF` | Restaurant / F&B Staff | Property | 40 | Table dining orders, KDS routing, and POS room bill charges. |
| `KITCHEN_STAFF` | Kitchen Staff / Chef | Property | 40 | Kitchen Display System operator preparing orders and managing tickets. |

---

## 2. Platform Super Admin vs. Hotel Owner
- **SUPER_ADMIN**: Cannot be self-assigned during sign-up or onboarding. Dedicated to StayHub SaaS platform operators.
- **HOTEL_OWNER**: Automatically assigned by the atomic onboarding RPC (`create_hotel_onboarding`) to the initial registering user.
- **Tenant Protection**: `HOTEL_OWNER` cannot inspect or alter data belonging to other organizations or hotels.

---

## 3. Centralized Authorization Helpers (`src/lib/auth/roles.ts`)
```tsx
import { isSuperAdmin, isHotelManager, canManageStaff, canViewFinancials } from "@/lib/auth/roles";

if (canViewFinancials(currentRole)) {
  // Render financial summaries
}
```
Client-side checks govern UX presentation; PostgreSQL RLS policies enforce hard security boundaries.