# User Roles & Access

## Overview
StayHub uses a centralized Role-Based Access Control (RBAC) system.

## Roles
- `SUPER_ADMIN`: Platform-level administrator (StayHub employees).
- `HOTEL_OWNER`: Top-level tenant administrator. Can view all properties within the organization.
- `GENERAL_MANAGER`: Manager of a specific property.
- `FRONT_DESK`: Can manage bookings, check-ins, and guest folios.
- `RECEPTIONIST`: Similar to front desk, focused on guest interactions.
- `HOUSEKEEPING`: Can view and update cleaning tasks.
- `MAINTENANCE`: Can view and update repair tickets.
- `RESTAURANT_STAFF`: Can manage tables, take orders.
- `KITCHEN_STAFF`: Access to KDS (Kitchen Display System) only.
- `ACCOUNTANT`: Can view financial reports, folios, and invoices.

## Implementation
Roles will be stored in the database and linked to specific organizations and properties.\n