const fs = require('fs');
const path = require('path');

const docs = {
  'docs/01-product/product-overview.md': `# STAYHUB - Product Overview

## Vision
StayHub is a complete Hotel Management, Operations, Guest Experience, QR Ordering, and AI Business Intelligence SaaS platform. It is designed to operate as a unified, deeply interconnected system rather than a collection of disjointed modules.

## Core Modules
- **Core PMS**: Dashboard, Rooms, Bookings, Front Desk, Guests
- **Operations**: Housekeeping, Maintenance
- **Restaurant & Kitchen**: POS, Menus, KDS (Kitchen Display System)
- **Guest Experience**: Room/Table QR, Guest Portal, Food Ordering, Service Requests
- **Finance**: Folios, Billing, Payments
- **Inventory**: Stock Management, Suppliers
- **Staff**: Employee Management, Attendance
- **Analytics & Marketing**: Revenue Tracking, Promotions
- **AI Integration**: AI Business Buddy, Insights
- **Platform**: Multi-property support, Integrations
`,
  'docs/01-product/master-prd.md': `# STAYHUB - Master Product Requirements Document

## Introduction
This document serves as the master PRD for StayHub. StayHub is a multi-tenant SaaS application allowing hotel owners to manage their properties, staff, guests, operations, and restaurant/POS from a single pane of glass.

## Key Features
- **Multi-Tenancy**: Support for multiple organizations and multiple properties per organization.
- **Unified Interface**: Modern, clean, professional UX.
- **QR Integrations**: Seamless room and restaurant ordering via QR.
- **AI Business Intelligence**: An AI Buddy for answering natural language queries about authorized hotel data.
- **Role-Based Access Control**: Granular permissions across all operations.

## Roadmap
Developed in 22 distinct phases, starting with foundational architecture and moving towards advanced features like AI and Multi-property support.
`,
  'docs/01-product/user-roles.md': `# User Roles & Access

## Overview
StayHub uses a centralized Role-Based Access Control (RBAC) system.

## Roles
- \`SUPER_ADMIN\`: Platform-level administrator (StayHub employees).
- \`HOTEL_OWNER\`: Top-level tenant administrator. Can view all properties within the organization.
- \`GENERAL_MANAGER\`: Manager of a specific property.
- \`FRONT_DESK\`: Can manage bookings, check-ins, and guest folios.
- \`RECEPTIONIST\`: Similar to front desk, focused on guest interactions.
- \`HOUSEKEEPING\`: Can view and update cleaning tasks.
- \`MAINTENANCE\`: Can view and update repair tickets.
- \`RESTAURANT_STAFF\`: Can manage tables, take orders.
- \`KITCHEN_STAFF\`: Access to KDS (Kitchen Display System) only.
- \`ACCOUNTANT\`: Can view financial reports, folios, and invoices.

## Implementation
Roles will be stored in the database and linked to specific organizations and properties. 
`,
  'docs/01-product/business-rules.md': `# Business Rules & Workflows

## Workflow A — Booking
Booking → Room Assignment → Confirmation → Check-in → Stay → Checkout → Invoice → Payment → Room Dirty → Housekeeping → Inspection → Room Available

## Workflow B — QR Food Order
Guest → Room QR → Guest Portal → Menu → Cart → Order → Kitchen → Preparing → Ready → Delivery → Folio or Online Payment

## Workflow C — Housekeeping
Checkout → Room Dirty → Task Created → Staff Assigned → Cleaning → Inspection → Clean → Available

## Workflow D — Maintenance
Guest/Staff reports issue → Ticket Created → Assigned → In Progress → Resolved → Verified → Closed

## Workflow E — Guest Request
Guest → QR Portal → Service Request → Department → Staff Assignment → In Progress → Completed

## Workflow F — Restaurant Order
Table/Room → Order → Kitchen → Preparation → Ready → Served → Bill → Payment/Folio
`,
  'docs/02-architecture/architecture.md': `# High-Level Architecture

## Framework
- **Frontend/Backend**: Next.js (App Router recommended)
- **Language**: TypeScript

## Data Layer
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth (or similar robust provider)
- **Data Fetching**: Server Components, Server Actions, API routes.

## Deployment
Targeting standard modern platforms like Vercel or standard Node.js Docker containers.

## Core Tenets
- Unified design system.
- Secure API endpoints with rigorous tenant isolation.
- Fast, mobile-friendly QR portals.
`,
  'docs/02-architecture/system-design.md': `# System Design

## Architecture Pattern
Modular monolith architecture implemented in Next.js.

## Components
1. **Web App (Dashboard)**: Desktop/tablet optimized for staff.
2. **Web App (Guest Portal)**: Mobile-optimized PWA-style web app accessed via QR codes.
3. **API Services**: Structured standard REST/RPC endpoints internally within Next.js.
4. **Database (Supabase PostgreSQL)**: Core transactional storage.
5. **AI Layer**: Secure abstraction layer wrapping LLM calls with authorized tools.
`,
  'docs/02-architecture/database-architecture.md': `# Database Architecture

## Strategy
We use a single relational PostgreSQL database (Supabase) structured for multi-tenancy.

## Multi-Tenancy Implementation
- \`organization_id\` at the root of tenant data.
- \`property_id\` for hotel-specific data.
- Use Row Level Security (RLS) to enforce isolation at the database level.
- Strong foreign keys and constraints.

## Best Practices
- UUIDs for primary keys to prevent enumeration.
- Timestamps (\`created_at\`, \`updated_at\`) on all tables.
- Soft-deletes where auditing or historical reference is needed (e.g., deleted bookings).
`,
  'docs/02-architecture/api-architecture.md': `# API Architecture

## API Conventions
Internal APIs will follow RESTful principles grouped by domain:
- \`/api/auth\`
- \`/api/hotels\`
- \`/api/rooms\`
- \`/api/bookings\`
- \`/api/guests\`
- \`/api/housekeeping\`
- \`/api/maintenance\`
- \`/api/restaurants\`
- \`/api/orders\`
- \`/api/kitchen\`
- \`/api/guest-services\`
- \`/api/inventory\`
- \`/api/staff\`
- \`/api/billing\`
- \`/api/reports\`
- \`/api/ai\`

## Structure
- **Validation**: Strict schema validation (e.g., Zod).
- **Authorization**: Middleware/checks on every route for RBAC and tenant matching.
- **Errors**: Standardized JSON error formats (\`{ error: "message", code: 400 }\`).
- **Pagination**: Offset/limit or cursor-based for lists.
`,
  'docs/02-architecture/security.md': `# Security Model

## Principles
1. **Never trust the client**: All validation must happen server-side.
2. **Least Privilege**: Users and service roles only get the access they explicitly need.
3. **Data Isolation**: Strict multi-tenant boundaries.

## Secrets Management
- No secrets in the browser.
- \`SUPABASE_SERVICE_ROLE_KEY\` remains securely on the server.
- Environment variables injected securely during build/runtime.
`,
  'docs/02-architecture/multi-tenancy.md': `# Multi-Tenancy Strategy

## Overview
StayHub is a SaaS platform. Hotel A must NEVER be able to see Hotel B's data under any circumstances.

## Security Layers
1. **Application Level**: All API queries must include and filter by \`organization_id\` and/or \`property_id\` matching the current user's session token.
2. **Database Level**: Supabase Row Level Security (RLS) policies will enforce tenant isolation, ensuring that even if an application bug omits a filter, the database will block unauthorized access.
`,
  'docs/02-architecture/rbac.md': `# RBAC Strategy

## Design
- **Roles**: Predefined set of standard roles (\`SUPER_ADMIN\`, \`HOTEL_OWNER\`, etc.).
- **Permissions**: Atomic permissions mapped to roles.
- **Assignment**: Users are assigned roles contextually (e.g., User A is \`GENERAL_MANAGER\` for Property X, but has no access to Property Y).

## Enforcement
- API routes check \`requirePermission(user, 'CREATE_BOOKING')\`.
- UI conditionally renders elements based on the same permission logic.
`,
  'docs/02-architecture/supabase.md': `# Supabase Strategy

## Database Connectivity
- Supabase is the primary PostgreSQL database.
- Connection is established securely using \`DATABASE_URL\` or \`SUPABASE_URL\` / \`SUPABASE_ANON_KEY\` / \`SUPABASE_SERVICE_ROLE_KEY\`.
- Server-side connections will use the service role key or robust authenticated sessions.

## Features Utilized
- **Database**: Relational data, views, and functions.
- **Row Level Security (RLS)**: Enforcing tenant isolation.
- **Storage** (Future): For guest documents, room images.
- **Auth** (Future): For user identity and session management.

## State
Currently, the database connection has been safely tested. The public schema is currently empty.
`,
  'docs/02-architecture/ai-architecture.md': `# AI Architecture

## StayHub AI Buddy
The AI Buddy provides natural language querying over authorized hotel data.

## Security Constraints
- The AI MUST NOT have raw SQL access.
- It accesses data exclusively through authorized application service tools.

## Architecture Flow
User → AI Interface → AI Orchestrator → Permission Layer → Approved Business Tools → Application Services → Database

## Example Tools
- \`getHotelSummary()\`
- \`getOccupancy()\`
- \`getRevenue()\`
- \`getBookings()\`
`,
  'docs/02-architecture/qr-architecture.md': `# QR System Architecture

## QR Types
1. Room QR (tied to a specific room)
2. Restaurant Table QR
3. General Hotel QR

## Data Security
- QR codes MUST NOT contain private guest information or PII.
- QR codes contain secure, unguessable identifiers/tokens (UUIDs).

## Flow
QR Code Scanned → Resolves to Room UUID → System identifies active Guest Session for Current Booking → Guest accesses Services.
`,
  'docs/02-architecture/audit-logging.md': `# Audit Logging

## Purpose
Track critical actions within the system for security, compliance, and dispute resolution.

## Events to Log
- Booking creations, modifications, cancellations.
- Room status changes.
- Payments, refunds, manual discounts.
- Staff role/permission changes.
- Settings modifications.
- AI actions and queries.

## Structure
- Store in a dedicated \`AuditLogs\` table.
- Include \`timestamp\`, \`user_id\`, \`action_type\`, \`resource_id\`, \`old_value\`, \`new_value\`, and \`ip_address\` (where applicable).
- Never log sensitive information (e.g., raw passwords, full credit card numbers).
`,
  'docs/03-database/entities.md': `# Database Entities

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
- **InventoryItem / Supplier**: Stock management.
`,
  'docs/03-database/relationships.md': `# Entity Relationships

- **Organization (1) -> (N) Hotel**
- **Hotel (1) -> (N) Room**
- **RoomType (1) -> (N) Room**
- **Guest (1) -> (N) Booking**
- **Booking (1) -> (N) FolioItem**
- **Hotel (1) -> (N) UserRole (Employee mapping)**
- **Restaurant (1) -> (N) Order**
- **Order (1) -> (N) OrderItem**
- **Room (1) -> (N) HousekeepingTask**
`,
  'docs/03-database/database-principles.md': `# Database Principles

1. **Normalized Relational Design**: Avoid massive JSON blobs unless for flexible metadata. 
2. **Foreign Keys**: Enforce referential integrity strictly.
3. **Timestamps**: Every table needs \`created_at\` and \`updated_at\`.
4. **UUIDs**: Use UUIDv4 for primary keys to obfuscate IDs and prevent enumeration.
5. **Soft Deletes**: Use \`deleted_at\` timestamps for critical entities (Bookings, Guests) to preserve history.
6. **Data Types**: Use precise numeric types (e.g., \`DECIMAL\` or integer cents) for money. Use \`TIMESTAMPTZ\` for robust timezone handling.
7. **Indexes**: Preemptively plan indexes for foreign keys and common query paths (e.g., booking dates).
`,
  'docs/04-ui/design-system.md': `# Design System

## Direction
Premium, Modern, Clean, Professional, Hospitality-focused.

## Key Elements
- **Sidebar**: Deep navy background, white text, simple line icons. Active states use a blue/purple highlighted rounded background.
- **Top Bar**: Clean search, notifications, and user avatar.
- **Main Content**: Light background, generous spacing, white cards with subtle borders and soft shadows.
- **Primary Actions**: Purple/Indigo colored rounded buttons.

## Status Colors
- **Available**: Green
- **Occupied**: Red
- **Cleaning**: Amber
- **Maintenance**: Gray
- **Blocked**: Purple
`,
  'docs/04-ui/layout-rules.md': `# Layout Rules

## Spacing & Density
- Use generous, consistent padding (e.g., 24px/32px around major containers).
- Avoid cluttered interfaces. Let information breathe.

## Responsiveness
- **Dashboard**: Optimized for Desktop/Laptop/Tablet.
- **Guest QR Portal**: Mobile-first, fast, touch-friendly.
- **Staff Operations**: Mobile/Tablet optimized for on-the-go housekeeping and maintenance.

## Grid
- Use CSS Grid for dashboards and card layouts.
- Standard 12-column foundation for complex forms.
`,
  'docs/04-ui/components.md': `# Component Architecture

## Core Components
- Button, Input, Select, DatePicker, Search, Tabs, Card, Modal, Drawer, Table, Pagination, Dropdown, Toast, Tooltip, Avatar, Badge, StatusBadge, EmptyState, LoadingState, ErrorState, ConfirmationDialog.

## Hotel-Specific Components
- RoomCard, RoomStatusBadge, BookingCard, GuestCard, GuestAvatar, KPIWidget, ArrivalCard, DepartureCard, OrderCard, MenuItemCard, ServiceRequestCard, MaintenanceTicketCard, HousekeepingTaskCard, PaymentSummary, FolioCard.
`,
  'docs/04-ui/pages.md': `# Page Specifications

## Dashboard
- Large hotel hero/banner.
- Weather/date card.
- KPI cards (Revenue, Occupancy).
- Arrivals & Departures lists.

## Room Management
- Grid of room cards.
- Status badges and filters.

## Check-in Flow
- Multi-step wizard layout with progress indicators.

## Guest Mobile Portal
- Dark premium header.
- Large tappable service grid.
`,
  'docs/04-ui/design-reference-analysis.md': `# Visual Design Reference Analysis

## Overall Visual Style
Modern, spacious SaaS interface with premium hospitality aesthetics. High contrast between deep navy navigation and clean white content areas.

## Typography
Clean, modern sans-serif. Clear hierarchy with distinct headers and highly legible data tables.

## Borders & Shadows
- **Border Radius**: Smooth, rounded corners for cards and buttons (likely 8px - 12px).
- **Shadows**: Soft, diffuse shadows on cards to lift them from the light background.

## UI Elements
- **Forms**: Rounded inputs, clear labels, distinct focus states.
- **Buttons**: Purple/indigo primary actions with subtle hover transitions.
- **Cards**: White background, used to group related information cleanly.
`,
  'docs/05-development/existing-project-audit.md': `# Existing Project Audit

## Environment
- **Path**: /Users/apple/Downloads/Hotel Management System
- **Current State**: Initialized repository.
- **Structure**: A fresh setup containing \`package.json\` with \`pg\` dependency installed for connection testing. 
- **Database**: Supabase PostgreSQL is connected via external connection string. The database public schema is currently empty.
- **Framework**: No specific frontend framework (e.g., Next.js) is initialized yet.

## Recommendation
Initialize a Next.js (App Router) project in Phase 2 using the target architecture defined in these documents.
`,
  'docs/05-development/coding-rules.md': `# Development Rules

## Guidelines for AI and Developers
1. **Read Docs**: Always read relevant documentation before coding.
2. **Preserve Architecture**: Do not diverge from the established structure.
3. **TypeScript**: Strict typing required.
4. **Tenant Isolation**: RBAC and organization_id filters are mandatory.
5. **No Secrets**: Never expose secrets in client code or logs.
6. **No Deletions**: Do not delete working functionality without approval.
7. **Safe Database**: No destructive migrations or resetting data unless explicitly approved.
`,
  'docs/05-development/ai-agent-instructions.md': `# AI Agent Instructions

- You are operating within the StayHub development environment.
- Always follow the 22-phase roadmap. Do not jump ahead.
- When generating code, reuse existing components.
- Do not invent new visual styles. Follow the design system.
- Write tests for core business logic.
- Validate database connections and access safely.
`,
  'docs/05-development/development-roadmap.md': `# StayHub 22-Phase Roadmap

- **PHASE 1**: Foundation, architecture, documentation and Supabase strategy *(Current)*
- **PHASE 2**: Design system and exact UI foundation
- **PHASE 3**: Application shell and navigation
- **PHASE 4**: Authentication and hotel onboarding
- **PHASE 5**: Dashboard
- **PHASE 6**: Room management
- **PHASE 7**: Booking management
- **PHASE 8**: Front desk and check-in/check-out
- **PHASE 9**: Guest CRM
- **PHASE 10**: Housekeeping
- **PHASE 11**: Maintenance
- **PHASE 12**: Restaurant POS
- **PHASE 13**: Kitchen Display System
- **PHASE 14**: QR Guest Portal
- **PHASE 15**: QR Ordering and Guest Services
- **PHASE 16**: Billing, payments and folios
- **PHASE 17**: Inventory and suppliers
- **PHASE 18**: Staff, attendance and expenses
- **PHASE 19**: Reports and analytics
- **PHASE 20**: AI Business Buddy
- **PHASE 21**: Notifications, integrations and online booking
- **PHASE 22**: Security, testing, optimization and production deployment
`,
  'README.md': `# StayHub

Welcome to StayHub, the complete Hotel Management + Operations + Guest Experience + QR Ordering + AI Business Intelligence SaaS platform.

## Documentation
Please refer to the \`docs/\` directory for architecture, product, and development guidelines.

## Setup
*(To be populated in Phase 2 upon framework initialization)*
`,
  '.env.example': `# Database Configuration
DATABASE_URL=
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# App Configuration
NEXT_PUBLIC_APP_URL=
`
};

for (const [filePath, content] of Object.entries(docs)) {
  const fullPath = path.join(__dirname, filePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content.trim() + '\\n', 'utf8');
  console.log('Created:', filePath);
}
