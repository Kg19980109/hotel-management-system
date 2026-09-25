# Database Entities

## Core Hierarchy
- **Organization**: Top-level tenant.
- **Hotel**: Properties belonging to an Organization.
- **User / Role / Permission**: Security mapping.

## PMS
- **Floor / Room / RoomType**: Physical property structure.
- **Guest**: Centralized guest profiles.
- **Booking**: Reservation data linking Guest, Room, Dates, and Finances.

## Operations
- **HousekeepingTask**: Cleaning jobs linked to rooms.
- **MaintenanceTicket**: Repair jobs.

## Restaurant
- **Restaurant / MenuCategory / MenuItem**: F&B catalog.
- **Order / OrderItem**: POS transactions.

## Finances & Inventory
- **Folio / Invoice / Payment**: Billing.
- **InventoryItem / Supplier**: Stock management.\n