# StayHub Page Specifications & Route Architecture

## 1. Authentication & Onboarding Route Hierarchy (Phase 4)

StayHub implements an isolated `(auth)` route group for identity, account management, and multi-step property onboarding:

### Authentication & Account Access
- `/login` — User authentication portal with email/password, show/hide password toggle, redirect preservation (`?redirectTo=...`), accessible error alerts, and direct link to hotel registration.
- `/signup` — Initial hotel operator registration with full name, work email, password verification, and instant continuation to onboarding.
- `/forgot-password` — Password recovery flow dispatching secure Supabase reset links.
- `/reset-password` — Password update form with dual validation.
- `/onboarding` — Multi-step Hotel Onboarding Wizard:
  1. **Welcome**: Operator profile verification.
  2. **Organization**: Corporate group / holding company details.
  3. **Property**: Primary hotel name, code, and address.
  4. **Operations**: Check-in / check-out schedule and currency.
  5. **Review**: Configuration summary before activation.
  6. **Complete**: Atomic database creation via RPC and dashboard launch.

---

## 2. Protected Management Route Hierarchy (`(app)`)

All management routes require an active authenticated session. Unauthenticated access redirects immediately to `/login`.

### Overview
- `/dashboard` — Master hotel operations dashboard & metrics engine (Phase 5).
  - **Property Context Header**: Active hotel name, city/country, property-configured timezone, live date/greeting, and quick action launcher.
  - **Core KPI Grid**: 6 primary operational KPIs (Occupancy %, Available Rooms, Today's Arrivals, Today's Departures, In-House Guests, Today's Revenue) with property currency formatting and truthful empty states.
  - **Arrivals & Departures Hub**: Tabbed operational check-in/check-out view with deep links to Front Desk.
  - **Room Inventory Status**: Visual room capacity distribution (Available, Occupied, Needs Cleaning, Maintenance) with empty onboarding prompt when unconfigured.
  - **Revenue & Occupancy Analytics**: Container architecture for timeframe trends (Today, 7D, 30D) with clear setup states until billing and reservations are populated.
  - **Needs Attention**: Real operational alert engine displaying setup prerequisites and priority notices.
  - **Recent Activity**: Live operational audit log architecture.
  - **AI Business Buddy**: Preview card demonstrating upcoming Phase 18 intelligence features without calling an LLM or fabricating metrics.
  - **Responsive Layout**: Multi-column at 1440px+, 2-column at 1024px, reflowed stack at 768px tablet, and single-column touch-friendly view at 390px mobile.

### Operations
- `/bookings` — Master Booking Management & Reservation Ledger (Phase 7).
  - **KPI Section**: 6 real-time metrics (Today's Arrivals, Today's Departures, Confirmed, Pending, Cancelled, In-House Reservations).
  - **Search & Filter Engine**: Server-side search across confirmation number, guest names, email, phone, and room number; filter by status, booking source, and date presets (Today, Tomorrow, 7D, 30D).
  - **Production DataTable**: Displays confirmation number, primary guest, room number, room category, check-in, check-out, nights, guest count, source badge, status badge, amount, and actions.
  - **Action Modals**: Assign physical room, change status, and confirm cancellation with inventory release.
- `/bookings/new` — Multi-Step Reservation Creation Wizard (Phase 7).
  - Step 1: Stay Dates with property-local date validation (check-in < check-out) and night count computation.
  - Step 2: Guest counts (Adults >= 1, Children >= 0).
  - Step 3: Room Category selection showing live rates, max capacity, and available room counts.
  - Step 4: Optional physical room allocation (or unassigned run-of-house booking).
  - Step 5: Guest contact details (first name, last name, email, phone, nationality).
  - Step 6: Booking channel, special requests, internal notes, and atomic booking creation.
- `/bookings/[bookingId]` — Reservation Profile & Ledger Detail (Phase 7).
  - Comprehensive view of confirmation number, stay status badge, guest details, stay window, nights, room line-items, nightly rates, total amount in property currency, and internal notes.
  - Action launcher: Edit reservation, change status, assign/reassign room, and cancel reservation.
- `/bookings/[bookingId]/edit` — Reservation Modification View (Phase 7).
  - Modify stay dates, guest counts, booking source, special requests, and internal notes with server-side overlap validation.
- `/bookings/calendar` — Reservation Tape Chart & Calendar (Phase 7).
  - High-density visual tape chart displaying rooms as rows and daily columns with color-coded reservation blocks, guest names, confirmation numbers, and quick navigation.
- `/front-desk` — Master Front Desk Console (Phase 8).
  - **KPI Section**: 6 real-time operational indicators (Today's Arrivals, Today's Departures, Currently In-House, Occupied Rooms + Occupancy %, Available Rooms, Rooms Requiring Attention).
  - **Tabbed Reception Views**:
    - **Arrivals**: Today's scheduled arrivals with status, primary guest, room category, assigned room, and quick Check-In action.
    - **Departures**: Today's scheduled departures with stay status and explicit Check-Out action.
    - **In-House**: Active checked-in guests with check-in timestamp, expected departure, room transfer action, and checkout.
    - **Room Status**: Real-time room inventory health grid highlighting rooms requiring attention (Dirty, Cleaning, Inspection, Out of Order).
  - **Interactive Modals**:
    - Atomic Check-In Modal with room selector, guest count controls, early check-in override, and internal notes.
    - Check-Out Modal with explicit confirmation and alert showing room transitions to `DIRTY`.
    - Room Reassignment Modal updating previous room to `DIRTY` and new room to `OCCUPIED`.
    - No-Show Modal marking reservation as no-show and immediately releasing held physical inventory.
  - **Quick Action Launcher**: Walk-in reservation launcher pre-populating `source=WALK_IN`.
- `/front-desk/stays/[stayId]` — Stay Profile & Occupancy Console (Phase 8).
  - Complete stay lifecycle record displaying stay status badge, check-in timestamp, actual/expected checkout dates, physical room card, primary guest card, and staff audit metadata.
  - Direct links to parent commercial reservation contract.
  - Operational action buttons: Room Transfer (Move Room) and Check-Out.
  - Non-functional UI placeholders for future billing folios, guest requests, and housekeeping logs without premature module implementation.
- `/rooms` — Master Room Management Hub (Phase 6).
  - **KPI Header**: Real-time room counts (Total Rooms, Available, Occupied, Dirty, Cleaning, Out of Order).
  - **Search & Filters**: Debounced search by room number/name, filters by status, floor, room type, and active/inactive.
  - **Dual Views**: Seamless toggle between production DataTable and visual Card Grid view.
  - **Quick Status Modal**: Fast operational status updates directly from list or card actions.
  - **Empty & Loading States**: Clean guidance for newly onboarded properties with zero rooms.
- `/rooms/new` — Create Room Wizard (Phase 6).
  - Validates room number uniqueness, assigns property-scoped room type and floor.
  - Configures initial operational and housekeeping status, custom capacity override, view type, and notes.
- `/rooms/[roomId]` — Room Detail View (Phase 6).
  - Complete operational profile, housekeeping state, base rates, bed configuration, amenities list, and notes.
  - Quick action controls for operational status updates and soft deactivation/reactivation.
  - Preserves placeholders for future booking history, guest stays, and maintenance logs.
- `/rooms/[roomId]/edit` — Room Configuration Editor (Phase 6).
  - Update room number, category, floor assignment, operational status, view type, and custom notes.
- `/rooms/types` — Room Category & Rate Management (Phase 6).
  - List and configure property room types with code, max occupancy, base rates, bed configurations, sizes, and amenities.
  - Shows active room inventory count per category; prevents deletion of categories referenced by active rooms.
- `/rooms/floors` — Building Floor Management (Phase 6).
  - Configure named floors/levels, optional floor numbers, sort ordering, and track room counts per level.
- `/rooms/floor-view` — Interactive Visual Floor Plan (Phase 6).
  - Grouped floor-by-floor layout displaying room tiles with real-time status badges, capacity, and quick navigation.
- `/rooms/calendar` — Room Availability Matrix & Tape Chart (Phase 6 & 7).
  - High-density room row and date column calendar matrix integrated with live reservations.
  - Visually distinguishes Available (green), Booked Confirmed (indigo), Booked Pending (amber), and Out of Order (slate) with deep links into booking details.
- `/guests` — Master Guest CRM & Profile Management Directory (Phase 9).
  - **KPI Section**: 6 real-time operational CRM metrics (Total Guests, Active Guests, Returning Guests, Currently In-House, Arriving Today, Departing Today).
  - **Status Tabs & Filter Bar**: Filter by status (ALL, ACTIVE, INACTIVE, BLOCKED), nationality selector, and debounced typeahead search.
  - **Guest DataTable**: Guest name, avatar initials, returning guest sparkles, contact details, nationality, visits count, last stay date, current stay badge, status badge, and quick actions.
- `/guests/new` — Comprehensive Guest Registration View (Phase 9).
  - **Personal Information**: Title, First/Middle/Last Name, Preferred Name, Date of Birth, Gender, Nationality, Preferred Language.
  - **Contact & Communication**: Email, Primary Phone, Alternate Phone.
  - **Address Information**: Street Address, City, State, Postal Code, Country.
  - **Identity Documentation**: Document Type (Passport, Driver's License, National ID, Other), Document Number, Issuing Country.
  - **Corporate & Business**: Company Name, Job Title.
  - **Preferences & Compliance**: General notes, Marketing Communications Consent, Guest Status.
  - **Live Duplicate Detection**: Detects matching email, phone, or name; displays `DuplicateWarningModal` with candidate profiles, matching reasons, and explicit "Use Existing" or "Proceed Anyway" options.
- `/guests/[guestId]` — Master Guest Profile Console (Phase 9).
  - **Profile Header**: Full name, VIP/Returning guest badge, status badge, email, phone, nationality, and quick actions (Edit, New Booking, View Current Stay, Deactivate).
  - **Summary Metrics Grid**: Total stays, Completed stays, Currently In-House badge, Total nights, First visit date, Last visit date.
  - **Current Stay & Upcoming Reservation Banners**: Prominently highlights in-house room occupancy with deep link to Front Desk, and next confirmed arrival.
  - **Tabbed Sub-Consoles**:
    1. **Overview Tab**: Personal, contact, address, corporate details, and full operational summary.
    2. **Reservations Tab**: Complete booking ledger history with confirmation number, dates, room category, channel, status, and direct booking links.
    3. **Stays Tab**: Historical stay records with physical room numbers, actual check-in/out timestamps, duration, and status.
    4. **Preferences Tab**: Structured guest preferences (Room, Bed, Floor, Smoking, Dietary, Amenity, Accessibility) with modal creation and deletion.
    5. **Staff Notes Tab**: Private internal staff notes with pinned highlights and role-protected operational remarks.
- `/guests/[guestId]/edit` — Guest Profile Modification View (Phase 9).
  - Modify all contact, address, identity, and corporate metadata with active property tenant validation.
- `/housekeeping` — Master Housekeeping Management & Operations Board (Phase 10).
  - **KPI Section**: 6 real-time operational housekeeping metrics (Dirty Rooms, In Progress / Cleaning, Awaiting Inspection, Ready / Clean, Priority Tasks, Out of Service).
  - **Filter & Search Bar**: Filter by Floor, Room Status (ALL, DIRTY, CLEANING, INSPECTION_PENDING, CLEAN), Task Type (ALL, CLEANING, DEEP_CLEAN, TURNDOWN, INSPECTION), Priority (ALL, URGENT, HIGH, NORMAL, LOW), Assigned Staff member, and search query.
  - **View Modes**: Switchable Kanban Board view (organized by room operational states with quick inline actions) and Comprehensive Tabular Task Ledger view.
  - **Operational Workflow Modals**:
    - `AssignTaskModal`: Assign staff member, select priority, and add special instructions.
    - `NewTaskModal`: Create manual cleaning, turndown, deep clean, or inspection tasks for rooms with tenant validation.
    - `InspectionModal`: Pass room (synchronizes room readiness into `AVAILABLE` if vacant) or Fail room (re-queues room for cleaning with required failure notes).
- `/housekeeping/inspections` — Dedicated Housekeeping Inspection Queue & Audit Log (Phase 10).
  - **Pending Inspection Review Queue**: Direct supervisor interface showing all rooms currently awaiting inspection with cleaner attribution, completion timestamps, and one-click Pass/Fail dialogs.
  - **Completed Inspections History Table**: Full historical audit trail with inspection date, room, inspector, result badge (Passed/Failed), and inspection notes.
- `/maintenance` — Master Maintenance Operations & Work Orders Board (Phase 11).
  - **KPI Section**: 8 live operational indicators (Open, Assigned, In Progress, On Hold, Resolved, Urgent, Overdue Schedule, Out of Order Rooms).
  - **Filter & Search Toolbar**: Filter by Status (OPEN, ASSIGNED, IN_PROGRESS, ON_HOLD, RESOLVED, CLOSED, CANCELLED), Priority (LOW, NORMAL, HIGH, URGENT), Category (PLUMBING, ELECTRICAL, HVAC, APPLIANCE, FURNITURE, LIGHTING, DOOR_LOCK, TV, WIFI_NETWORK, CIVIL, SAFETY, OTHER), Room / Facility area, Assigned Technician, Overdue toggle, and debounced text search.
  - **Dual Operations Views**: Kanban Status Board view (5 workflow columns with quick inline repair actions) and Comprehensive Tabular Task Ledger view.
  - **Operational Workflow Modals**:
    - `NewWorkOrderModal`: Report repair issues with category, priority, room/area, technician assignment, scheduled due date, and detailed symptoms.
    - `AssignWorkOrderModal`: Assign technician with handover notes and target SLA timestamp.
    - `ResolveWorkOrderModal`: Mandatory resolution notes capture upon repair completion without silently overriding room lifecycle rules.
    - `StatusTransitionModal`: Controlled actions for Put On Hold, Resume, Close, Cancel, Reopen, Priority Change, and Internal Notes.
    - `RoomStatusOverrideModal`: Management-authorized override to transition rooms to `OUT_OF_ORDER` / `OUT_OF_SERVICE` or back to service.
- `/maintenance/[workOrderId]` — Work Order Console & Audit Detail View (Phase 11).
  - Complete work order information, room context / central facility indicator, reporter profile, assigned technician, category and priority badges.
  - Operational repair console: Start Repair, Put On Hold, Resume, Resolve, Close, Reopen, Cancel, Add Internal Note.
  - Resolution summary display and full chronological audit timeline (`public.maintenance_work_order_events`) showing performer and status history.
- `/maintenance/new` — Dedicated Maintenance Work Order Creation Page (Phase 11).
  - Comprehensive form for reporting facilities tickets, equipment defects, and room maintenance requests.

### Food & Beverage (F&B) — Restaurant POS & Operations (Phase 12)
- `/restaurant` — Master Restaurant & Outlets Management Console.
  - **KPI Section**: 6 real-time operational indicators (Open Orders, Active Tables, Today's Orders, Today's Order Sales in property currency, Cancelled Orders, Available Tables).
  - **Outlets Directory**: Outlet cards with code, currency, timezone, active areas, tables, menu categories, and item counts.
  - **Outlet Configuration Modal**: Create and edit dining outlets with timezone and currency.
- `/restaurant/pos` — Primary High-Speed POS Cashier Terminal.
  - **Category Tabs & Menu Item Grid**: Rapid item discovery, live search, prices in property currency, and visual disabled states for out-of-stock items.
  - **Dynamic Order Cart**: Add/remove items, quantity adjustments, line item notes, order-level notes, table selector (for DINE_IN), takeaway switch, and server-side calculated financial totals.
  - **One-Click Order Creation**: Atomic server-side creation, price snapshotting, order number generation, and automatic table `OCCUPIED` synchronization.
- `/restaurant/tables` — Dining Tables & Seating Management.
  - **Area Sectioning**: Group tables by area (Main Dining, Outdoor, Rooftop, etc.).
  - **Table Map & Capacity**: Visual table tiles displaying table number, capacity, current operational status, and active order linkage.
  - **Status & Table Modals**: Create tables, edit capacity, soft-deactivate, and toggle operational status.
- `/restaurant/menu` — Menu Catalog, Pricing & Kitchen Station Routing.
  - **Category Management**: Create and organize menu categories with display order.
  - **Menu Item Creation & Editing**: Set item name, short name, SKU, decimal pricing, stock availability toggle (`is_available`), and Primary Kitchen Station routing.
  - **Unrouted Items Banner**: Prominently flags items without assigned kitchen prep stations with direct assignment shortcuts.
  - **Soft Deactivation**: Deactivate obsolete items (`is_active = false`) without breaking historical orders.
- `/restaurant/orders` — Restaurant Orders Ledger & Historical Transactions.
  - **Comprehensive Ledger**: Search by order number, filter by date, outlet, status (`OPEN`, `CONFIRMED`, `COMPLETED`, `CANCELLED`), and order type (`DINE_IN`, `TAKEAWAY`).
  - **Table View**: Order number, dining outlet, table, type, item counts, server-verified amounts, and creator details.
- `/restaurant/orders/[orderId]` — Restaurant Order Detail, POS Actions & Live KDS Production Status.
  - **Order Profile**: Metadata, table, creator, order instructions, snapshot line items with locked unit prices, and subtotal/discount/tax breakdown.
  - **Live KDS Production Block**: Live kitchen ticket status, priority badges, item-by-item preparation states, and station tags.
  - **POS Actions**: Confirm Order (`OPEN` -> `CONFIRMED` -> auto-fires KDS ticket), Complete Order (`CONFIRMED` -> `COMPLETED`, freeing table), and Cancel Order (with mandatory cancellation reason and automatic KDS ticket cancellation).
  - **Audit Timeline**: Visual history of status transitions and staff actions.

### Kitchen Display System (KDS) & Production Workflows (Phase 13)
- `/restaurant/kds` — Kitchen Display System Main Production Terminal.
  - **KPI Header**: Real-time operational metrics (Queued Tickets, In Progress, Ready, Delayed Tickets, Unrouted Items, Active Remakes).
  - **Station Switcher**: Rapid station queue filter (All Stations, Hot Kitchen, Cold Kitchen, Bar, Bakery, Dessert, etc.) with unrouted item warnings.
  - **Production Ticket Cards**: Responsive, high-contrast cards designed for large kitchen monitors and tablets. Displays ticket number (`KDS-YY-XXXXXX`), POS order number, table/takeaway status, order priority, wait timer with dynamic delay threshold highlighting, order notes, and item-level prep controls.
  - **Item Prep Controls**: One-touch Start (`QUEUED` -> `IN_PROGRESS`), Ready (`IN_PROGRESS` -> `READY`), Complete (`READY` -> `COMPLETED`), and Requeue actions.
  - **Remake/Re-fire Modal**: Controlled remake workflow capturing staff member, timestamp, and structured reason while preserving historical pricing snapshots.
  - **Priority Elevate**: Rapid priority toggle (`LOW`, `NORMAL`, `HIGH`, `URGENT`).
  - **Auto-Refresh & Real-time Integration**: Live auto-refresh toggle with Supabase Realtime channel integration.
- `/restaurant/kds/history` — Kitchen Operational Production History.
  - **Historical Audit Trail**: Filterable historical ledger of finished, cancelled, and remade kitchen tickets and items.
  - **Production Metrics**: Filter by date range, station, and outlet with exact timestamps (fired, started, ready, completed) and remake counts.
- `/restaurant/kitchen/stations` — Kitchen Station Configuration Console.
  - **Station Management**: Create, edit, and soft-deactivate physical kitchen preparation stations per outlet.
  - **Display Reordering**: Configure queue display priority order.
  - **Protection Guard**: Soft-deactivation prevents breaking historical tickets.
- `/kitchen` — Convenience redirect route pointing directly to `/restaurant/kds`.

### Guest Experience & QR Portal (Phase 14)
- `/qr-services` — Staff Guest QR Access Points & Session Management Console.
  - **KPI Section**: Real-time counters (Total Access Points, Active Room QRs, General Hotel QRs, Active Verified Sessions).
  - **QR Code Directory**: Filter by type (`ROOM`, `HOTEL_GENERAL`), search by room or label, view SHA-256 token digests.
  - **Create QR Access Point Modal**: Generate new QR codes for rooms or general hotel directories with cryptographic token hashing.
  - **Rotate Token Action**: Atomically rotate security tokens, immediately invalidating old codes.
  - **Printable QR Card Modal**: High-resolution print previews with QR codes, property branding, and scanning instructions.
- `/qr-services/rooms` — Direct redirect to `/qr-services` (Room QR management).
- `/qr-services/tables` — Direct redirect to `/qr-services` (Table QR pre-wired for Phase 15).
- `/qr-services/requests` — Placeholder for Phase 15 Live Guest Requests & QR Ordering.

### Mobile-First Guest Portal Experience (Phase 14)
- `/guest/qr/[token]` — Public QR Access Point Resolver.
  - Resolves QR access point from opaque raw token hash without leaking guest PII.
  - For `HOTEL_GENERAL`: Displays hotel welcome screen with single-tap explore entry.
  - For `ROOM`: Detects active checked-in stay; renders stay verification card (confirmation number + last name).
  - Vacant state: Safely displays room welcome without past guest leakage.
- `/guest/home` — Guest Portal Digital Concierge Home.
  - Hero greeting with verified guest name and room number badge.
  - High-Speed Wi-Fi quick connect card with 1-tap password copy.
  - Stay schedule summary (check-in/checkout dates & times).
  - Quick action directory for dining, housekeeping, front desk, and hotel highlights.
- `/guest/hotel` — Public Hotel Directory & Amenities.
  - Hotel address, front desk contact, email, and standard check-in/out policies.
  - On-site dining outlets listing with active hours and descriptions.
  - Comprehensive hotel amenities and features checklist.
- `/guest/stay` — In-House Guest Stay Itinerary & Policies.
  - Verified room number, room type, guest party count (adults/children), and checkout schedule.
  - Guest checkout guidance and front desk direct dial.
  - Strict privacy boundary: zero exposure of internal CRM notes, identity documents, or staff comments.
- `/guest/dining` — Guest Restaurant Outlets (Phase 15).
  - Outlets directory with cuisine types, opening/closing hours, descriptions, and direct menu access.
- `/guest/dining/[restaurantId]` — In-Room Dining Menu & Customization (Phase 15).
  - Categorized menu items, descriptions, authoritative prices, real-time availability badges, and quantity increment/decrement controls with sticky cart footer CTA.
- `/guest/cart` — Room Service Cart & Order Confirmation (Phase 15).
  - Verified destination room display, order items list, item quantities, special kitchen/delivery notes, authoritative tax/subtotal calculation, and atomic submission.
- `/guest/orders` — Guest In-Room Dining Order History (Phase 15).
  - Active and past orders with real-time status badges (Order Received, Preparing, Ready, Delivered, Cancelled) and deep links.
- `/guest/orders/[orderId]` — Guest Order Progress & Timeline (Phase 15).
  - Real-time preparation progress tracker, ordered items breakdown, frozen price snapshots, delivery instructions, and destination room summary.
- `/guest/services` — Guest Service Request Portal (Phase 15).
  - Interactive luxury cards for 9 service categories (Housekeeping, Front Desk, Concierge, Maintenance, Laundry, Spa, Transport, In-Room Dining, Other) with quick request chips, description notes, and atomic submission.
- `/guest/requests` — Guest Service Requests History (Phase 15).
  - List of active and resolved service requests with status indicators and quick links.
- `/guest/requests/[requestId]` — Guest Service Request Detail (Phase 15).
  - Status progression tracker, request summary, guest-visible resolution notes, and self-service cancellation for open requests.
- `/guest/folio` — Mobile Guest Folio & Bill View (Phase 16).
  - Live guest bill with active charges (room nights, restaurant orders, room service, incidentals), taxes, discounts, recorded payments, and real-time outstanding balance due.

### Guest Services & Operations (Staff)
- `/guest-requests` — Master Guest Service Requests Board (Phase 15).
  - Real-time KPI summary (Total, Submitted, In Progress / Assigned, Completed Today).
  - Multi-criteria filter engine (Category, Status, Priority, Room, Guest Name, Request ID).
  - Interactive action launchers: Acknowledge, Assign Department/Staff Member, Start Work, and Complete Request with guest-visible notice.
- `/guest-requests/[requestId]` — Staff Guest Request Detail & Timeline (Phase 15).
  - Complete request overview with room, guest profile, stay details, assigned department, assigned staff member, internal staff notes, and immutable audit event timeline.

### Billing, Payments & Guest Folios (Phase 16)
- `/billing` — Master Financial & Billing Dashboard (Phase 16).
  - 6 Key Financial KPIs (Today's Revenue, Outstanding Due, Open Folios, Settled Folios, Transactions Today, Refunds Today).
  - Recent Guest Folios and Recent Tax Invoices quick overview tables with direct action links.
  - Quick navigation bar to all folios, tax invoices, and payments register.
- `/billing/folios` — All Guest Folios Directory (Phase 16).
  - Searchable and filterable registry of all stay folios across the property.
  - Filter by status (`OPEN`, `SETTLED`, `CLOSED`, `VOID`) and search by folio number, guest name, or room number.
- `/billing/folios/[folioId]` — Comprehensive Guest Folio Detail (Phase 16).
  - Authoritative financial balance summary (Charges Subtotal, Tax GST, Gross Total, Net Paid, Balance Due).
  - Real-time action launchers: Post Room Charges, Post Custom/Incidental Charge, Record Multi-Method Payment, Process Refund, Generate Snapshot Invoice, and Void Charge.
  - Itemized charge line-items with void history, payments list, refunds list, and immutable audit event stream.
- `/billing/invoices` — Tax Invoices Ledger & Archive (Phase 16).
  - Complete legal tax invoice registry with snapshot amounts, status badges (`PAID`, `ISSUED`, `VOID`), and direct links.
- `/billing/invoices/[invoiceId]` — Tax Invoice Detail & Printable View (Phase 16).
  - Clean printable tax invoice formatted with property header, guest billing address/GSTIN, itemized charge snapshot, tax rate breakdown, and manager voiding capability.
- `/billing/payments` — Payments Register & Transaction Ledger (Phase 16).
  - Comprehensive ledger of all cash, card, UPI, bank transfer, and online gateway payments with transaction references and refund links.

### Business & Finance
- `/inventory` — Supplies, linen, toiletries, and purchase order tracking (Phase 17).
- `/staff` — Staff roster, shift attendance, roles, and handover logs (Phase 18).
- `/expenses` — Operating expenditures, vendor payables, staff expense claims (Phase 18).
- `/reports` — Centralized Hotel Reports & Analytics Suite (Phase 19).
  - `/reports/occupancy` — Occupancy %, sellable rooms, ADR, and RevPAR.
  - `/reports/rooms` — Room performance by room, type, and floor.
  - `/reports/reservations` — Booking volume, source mix, and ALOS.
  - `/reports/front-desk` — Arrivals, departures, and in-house stay logs.
  - `/reports/guests` — Demographics, nationality, and guest loyalty.
  - `/reports/revenue` — Gross charges, discounts, taxes, and net revenue.
  - `/reports/financials` — Guest folios, payments, refunds, and tax invoices.
  - `/reports/restaurant` — F&B sales, order types, and AOV.
  - `/reports/kitchen` — Kitchen Display System (KDS) prep durations and delays.
  - `/reports/housekeeping` — Task completion, inspection pass rates, and cleaning time.
  - `/reports/maintenance` — Work order turnaround, resolution times, and downtime.
  - `/reports/inventory` — Stock levels, low stock alerts, and movement ledgers.
  - `/reports/inventory/consumption` — F&B recipe usage and waste analysis.
  - `/reports/suppliers` — Purchase orders and vendor commitments.
  - `/reports/staff` — Employee punctuality and attendance rates.
  - `/reports/expenses` — Staff expense claims and reimbursement tracking.
  - `/reports/guest-services` — Service requests and fulfillment SLAs.
- `/marketing` — Promotional campaigns, WhatsApp/SMS alerts, OTA channel rates.

### Intelligence & System
- `/ai` — StayHub AI Business Buddy (Phase 20).
  - **Authenticated Hospitality Assistant**: Read-only business intelligence across occupancy, ADR, RevPAR, revenue, folios, dining, KDS, housekeeping, maintenance, inventory, suppliers, staff, expenses, and guest services.
  - **Controlled Tool Execution**: 17 typed business tools with strict property scoping and permission checks.
  - **Conversational Interface**: Natural-language queries, short-term context retention, source report attribution badges, markdown formatting, and interactive quick action chips.
  - **Context Sidebar**: Current property context, server timezone, and role-filtered suggested questions.
  - **Strict Security Guardrails**: Prompt injection defense, zero direct SQL access, no PII leakage, and audit logging.
- `/notifications` — Master Notifications Center (Phase 21).
  - Centralized in-app notifications hub with category filtering (Bookings, Front Desk, Housekeeping, Maintenance, Dining, Folios, Inventory, Staff, Guest Services, System), unread filters, live mark-as-read, mark-all-as-read, and channel delivery indicators.
- `/integrations` — Integrations & Services Directory (Phase 21).
  - Server-side secured integration catalog for Payment Gateways (Stripe, Razorpay), Communications (Resend, Twilio, WhatsApp), OTAs (SiteMinder), Accounting (QuickBooks), and Smart Hardware (SALTO Electronic Door Locks) with secret masking.
- `/online-booking` — Online Booking Engine Settings (Phase 21).
  - Authenticated hotel manager console to toggle direct online booking, edit public description, contact details, cancellation policy, and booking terms.
- `/settings` — Property settings, tax rules, user roles, integrations.

---

## 3. Public Consumer Direct Booking Route Hierarchy (`/book/[propertySlug]`) (Phase 21)

- `/book/[propertySlug]` — Public Hotel Direct Booking Portal.
  - High-conversion, mobile-first consumer booking page displaying hotel branding, amenities, interactive date & guest search bar, live room category availability cards, room specs (capacity, beds, size), transparent price breakdowns, and direct booking triggers.
- `/book/[propertySlug]/checkout` — Public Guest Checkout & Reservation Creation.
  - Secure booking submission form collecting guest details (name, email, phone, special requests), pricing breakdown (subtotal, taxes, discounts, total amount), terms and cancellation policy agreement, and Pay at Hotel confirmation.
- `/book/[propertySlug]/confirmation/[confirmationNumber]` — Public Booking Confirmation Receipt.
  - Verified booking receipt showing confirmation number (`SH-YY-XXXXXX`), stay details, total amount, contact information, print receipt action, and anti-enumeration email/phone verification guard.

---

## 3. Page Structure Standard

Every management page adheres to the standard layout:

```tsx
<AppShell contentWidth="default" | "wide" | "narrow">
  <PageHeader
    title="Page Title"
    description="Contextual description of the operational view"
    breadcrumbs={[
      { label: "Section", href: "/section" },
      { label: "Sub-page" }
    ]}
    actions={<Button variant="primary">Action</Button>}
  />
  {/* Page Body */}
</AppShell>
```