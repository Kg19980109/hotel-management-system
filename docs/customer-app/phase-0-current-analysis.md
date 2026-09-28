# STAYHUB CUSTOMER APP — PHASE 0 ANALYSIS
**Comprehensive Architecture Audit, Route Inventory, State Analysis & Performance Investigation**

---

## 1. Executive Summary

StayHub currently possesses a functional, end-to-end guest application servicing in-room guests, restaurant diners, and direct booking consumers. It handles QR code resolution, encrypted guest session management, multi-outlet food ordering with live kitchen display system (KDS) integration, real-time housekeeping/concierge service requests, guest room folio tracking with itemized charges, and public room booking.

However, the current customer experience suffers from notable interaction latency ("click-wait-react" lag) and an interface styling that does not match modern ultra-luxury hospitality standards. 

This Phase 0 audit was conducted under a **strict read-only mandate**: no application code, database schema, server actions, RPCs, routes, or billing logic were modified. Every finding, route, query, and bottleneck in this report was verified against active source code.

### Key Architectural Highlights
- **Session Model**: Secure, cookie-based session token (`stayhub_guest_session`) hashed via SHA-256 and verified through Postgres RPCs (`validate_guest_session`, `verify_and_create_guest_session`, `resolve_guest_qr_access`).
- **Data Synchronization**: Hybrid model utilizing Supabase Realtime channels with an aggressive 2-second fallback polling mechanism (`GuestLiveRefresher`) executing `router.refresh()`.
- **Primary Root Cause of UI Lag**: The interaction lag is driven by the 2000ms `router.refresh()` polling loop mounted across active guest screens, synchronous `localStorage` updates blocking the main thread in `CartProvider`, un-memoized client trees, and extensive `revalidatePath` calls on server actions.

---

## 2. Complete Customer Route Inventory

### 2.1 `/guest` & `/guest/home`
- **Route**: `/guest` (redirects to `/guest/home`) & `/guest/home`
- **Purpose**: Guest portal landing screen and control center.
- **Who uses it**: Verified in-house room guests, table diners, and unauthenticated public visitors exploring hotel amenities.
- **Data Displayed**: Property branding, guest personalized greeting, room number badge, stay countdown, quick action grid (Dining, Housekeeping, Maintenance, Spa, Folio, Front Desk), active order/request status pills, hotel amenities, and Wi-Fi network/password card.
- **Actions**: Navigate to dining menu, trigger service request bottom sheet/modal, copy Wi-Fi password, view stay details, call front desk (`tel:` link).
- **Components Used**: `GuestShell`, `GuestLiveRefresher`, `StayVerificationCard`, `WifiCopyButton`, `ServicesView` (when modal triggered), Lucide icons.
- **Server Actions / Queries**: `getActiveGuestSession()`, `getPublicRestaurants(propertyId)`.
- **Realtime Subscriptions**: `guest-session-{sessionId}` (via `GuestLiveRefresher`).
- **Auth/Session Requirements**: Open access (gracefully adapts UI if session is `VERIFIED_STAY`, `TABLE_ORDERING`, or `PUBLIC_EXPLORATION`).
- **Dependencies**: `/guest/dining`, `/guest/services`, `/guest/stay`, `/guest/folio`.

### 2.2 `/guest/dining` & `/guest/dining/[restaurantId]`
- **Route**: `/guest/dining` & `/guest/dining/[restaurantId]`
- **Purpose**: Multi-restaurant outlet browsing and catalog menu exploration.
- **Who uses it**: In-room guests ordering room service, seated table diners, and exploring visitors.
- **Data Displayed**: Restaurant cards (name, description, operational status, cuisine, image), categorized menu items (dishes, prices, veg/non-veg tags, spice levels, allergens, preparation times, stock status).
- **Actions**: Filter categories (Starters, Mains, Desserts, Beverages), search dishes, open food item detail modal, customize preparation notes, adjust quantity, add to cart.
- **Components Used**: `DiningMenuView`, `FoodItemModal`, `CartDrawer` trigger, `Badge`, `Button`.
- **Server Actions / Queries**: `getActiveGuestSession()`, `getPublicRestaurants(propertyId)`, `getPublicRestaurantMenu(restaurantId)`.
- **Realtime Subscriptions**: None directly on menu; relies on layout shell.
- **Auth/Session Requirements**: Accessible publicly; ordering requires valid session token.

### 2.3 `/guest/cart`
- **Route**: `/guest/cart`
- **Purpose**: Guest cart review, order summary, tip selection, special delivery instructions, and order placement.
- **Who uses it**: Guests preparing to submit an in-room dining or table food order.
- **Data Displayed**: Itemized list of selected dishes, customizations, item quantities, subtotal, CGST/SGST tax calculation, service charge, delivery destination (Room # or Table #).
- **Actions**: Increase/decrease item quantity, remove items, add cooking instructions, select tip preset, submit order via `placeGuestFoodOrderAction`.
- **Components Used**: `CartView`, `CartItemRow`, `Button`, `Input`.
- **Server Actions / Queries**: `getActiveGuestSession()`, `placeGuestFoodOrderAction(payload)`.
- **Realtime Subscriptions**: None on cart page.
- **Auth/Session Requirements**: Active guest session with room or table binding.

### 2.4 `/guest/orders` & `/guest/orders/[orderId]`
- **Route**: `/guest/orders` & `/guest/orders/[orderId]`
- **Purpose**: Order history overview and real-time live kitchen prep / delivery tracking.
- **Who uses it**: Guests tracking placed food and beverage orders.
- **Data Displayed**: Order number, order status timeline (`RECEIVED` → `PREPARING` → `READY` → `SERVED` / `DELIVERED`), estimated delivery time, item breakdown, payment status, kitchen notes.
- **Actions**: View past orders, track live status, return to menu, contact room service.
- **Components Used**: `GuestOrderDetailView`, `GuestLiveRefresher`, `OrderStatusTimeline`, `Badge`.
- **Server Actions / Queries**: `getGuestFoodOrders(sessionCookie)`, `getGuestFoodOrderDetail(orderId, sessionCookie)`.
- **Realtime Subscriptions**: Supabase channel `guest-order-{orderId}` listening to `postgres_changes` on `orders` and `order_items`.
- **Auth/Session Requirements**: Active session cookie required to view private orders.

### 2.5 `/guest/services` & `/guest/requests` & `/guest/requests/[requestId]`
- **Route**: `/guest/services`, `/guest/requests`, `/guest/requests/[requestId]`
- **Purpose**: Interactive catalog of hotel services (Housekeeping, Concierge, Maintenance, Laundry, Spa, Luggage) and tracking of active service tickets.
- **Who uses it**: In-room guests requiring room assistance or amenities.
- **Data Displayed**: Service categories, standard request catalog items (Extra Pillows, Dental Kit, Towels, Room Cleaning, AC Repair, Luggage Assistance), priority selector, custom notes field, ticket status (`SUBMITTED` → `ASSIGNED` → `IN_PROGRESS` → `COMPLETED` / `CANCELLED`), assigned staff name, request timeline.
- **Actions**: Submit service ticket, cancel ticket, view ticket details, track staff assignment.
- **Components Used**: `ServicesView`, `GuestRequestDetailView`, `GuestLiveRefresher`, `RequestTimeline`.
- **Server Actions / Queries**: `getGuestServiceRequests(sessionCookie)`, `getGuestServiceRequestDetail(requestId, sessionCookie)`, `createGuestServiceRequestAction(payload)`, `cancelGuestServiceRequestAction(payload)`.
- **Realtime Subscriptions**: Channel `guest-request-{requestId}` listening to `guest_service_requests`.
- **Auth/Session Requirements**: Session type must be `VERIFIED_STAY`.

### 2.6 `/guest/stay` & `/guest/hotel`
- **Route**: `/guest/stay` & `/guest/hotel`
- **Purpose**: 
  - `/guest/stay`: In-house itinerary, stay dates (check-in/out), primary guest info, room number, party size, active orders summary, and stay timeline.
  - `/guest/hotel`: Public hotel directory, property address, contact phone/email, check-in/out policies, Wi-Fi details, dining outlets, and hotel highlights.
- **Who uses it**: In-house guests (`/guest/stay`) and all visitors (`/guest/hotel`).
- **Data Displayed**: Room type, occupancy, check-in timestamp, expected check-out timestamp, active order count, live requests count, Wi-Fi credentials, hotel directory info.
- **Components Used**: `GuestLiveRefresher`, `WifiCopyButton`, `BedDouble`, `ShieldCheck`.
- **Server Actions / Queries**: `getActiveGuestSession()`, `getGuestFoodOrders()`, `getGuestServiceRequests()`, `getPublicRestaurants()`.

### 2.7 `/guest/folio`
- **Route**: `/guest/folio`
- **Purpose**: Transparent, live room bill and statement of accounts for in-room guest.
- **Who uses it**: In-house verified guests tracking charges.
- **Data Displayed**: Folio number, current balance due, settlement status, itemized posted charges (Room rate charges, Food & Beverage orders, Spa/Laundry service charges), charge timestamps, tax breakdown (GST), recorded payments (advance deposits, card/cash settlements).
- **Actions**: Review itemized charges, check balance due.
- **Components Used**: `GuestFolioView`, `Receipt`, `CreditCard`, `ArrowLeft`.
- **Server Actions / Queries**: `getActiveGuestSession()`, `getActiveGuestSessionToken()`, `getGuestPortalFolio(rawToken)`.
- **Realtime Subscriptions**: Realtime updates via layout/polling.
- **Auth/Session Requirements**: Strict `VERIFIED_STAY` session.

### 2.8 `/guest/qr/[token]`
- **Route**: `/guest/qr/[token]`
- **Purpose**: Entry landing point when a guest scans a physical QR code placed on a nightstand, tent card, or restaurant table.
- **Who uses it**: Any mobile guest scanning a StayHub QR code.
- **Data Displayed**: QR verification status, property name, room number or table number, welcome hero, seamless 1-tap entry button or manual confirmation lookup.
- **Actions**: One-tap unlock (`unlockSeamlessRoomSessionAction`), manual confirmation lookup (`verifyStayAndCreateSessionAction`), or public exploration (`establishPublicHotelSessionAction`).
- **Components Used**: `StayVerificationCard`, `Loader2`, `Sparkles`.
- **Server Actions / Queries**: `resolveGuestQrAccess(token)`.

### 2.9 `/book/[propertySlug]` & `/book/[propertySlug]/checkout` & `/book/[propertySlug]/confirmation/[confirmationNumber]`
- **Route**: `/book/[propertySlug]/*`
- **Purpose**: Direct public reservation engine for prospective hotel guests.
- **Data Displayed**: Property details, availability search bar, room types, night rates, occupancy rules, booking checkout form (guest info, payment method selection), booking confirmation summary.
- **Actions**: Search dates, select room type, input guest details, submit reservation.
- **Components Used**: `PublicBookingPortalPage`, `BookingCheckoutPage`, `BookingConfirmationPage`.
- **Server Actions / Queries**: `searchPublicAvailabilityAction`, `createPublicBookingAction`.

---

## 3. Complete Feature Inventory

| Feature Area | User Access Path | Data Dependencies | Backend Functions / RPCs | Post-Click Behavior | Realtime Mechanism | Security Constraints |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **QR Onboarding** | Scan QR → `/guest/qr/[token]` | `guest_qr_codes`, `rooms`, `stays` | `resolve_guest_qr_access`, `unlockSeamlessRoomSessionAction` | Sets HTTP-only cookie `stayhub_guest_session`, redirects to `/guest/home` | None | SHA-256 token hash validation |
| **Guest Home** | Bottom nav / `/guest/home` | `guest_sessions`, `stays`, `properties` | `getActiveGuestSession` | Navigates to sub-features or opens quick action sheets | Polling + Session channel | Session token verification |
| **Dining Discovery** | Nav tab / `/guest/dining` | `restaurants`, `properties` | `getPublicRestaurants` | Opens restaurant menu `/guest/dining/[id]` | None | Open / Guest context |
| **Menu Catalog** | `/guest/dining/[id]` | `menu_categories`, `menu_items` | `getPublicRestaurantMenu` | Opens item detail modal with add-to-cart | None | Outlet active check |
| **Food Customization** | Tap food item in menu | `menu_items`, `allergens` | Client State (`CartContext`) | Adds customized item with notes to cart | None | None (client state) |
| **Cart Management** | Floating cart button / `/guest/cart` | `CartContext`, `localStorage` | Client state | Updates quantities, computes taxes/tips | None | Validates quantities > 0 |
| **Food Order Submission** | Cart checkout button | `stayhub_guest_cart`, session cookie | `placeGuestFoodOrderAction` → `create_guest_food_order` (RPC) | Clears cart, redirects to `/guest/orders/[orderId]` | Order channel broadcast to KDS & guest | Checks active stay/table, calculates taxes server-side |
| **Live Order Tracking** | `/guest/orders/[id]` | `orders`, `order_items`, `kds_tickets` | `getGuestFoodOrderDetail` | Renders live prep stage (`RECEIVED` → `SERVED`) | Postgres changes on `orders` + 2s polling | Guest session must match order |
| **Service Catalog** | `/guest/services` | Hardcoded catalog + category schema | `getGuestServiceRequests` | Opens service request sheet with prefilled title | None | Requires `VERIFIED_STAY` |
| **Service Request Submission** | Service sheet submit button | Form payload + session cookie | `createGuestServiceRequestAction` → `create_guest_service_request` (RPC) | Closes sheet, routes to `/guest/requests/[id]` | Realtime channel + dashboard alerts | Checks active room stay |
| **Service Ticket Tracking** | `/guest/requests/[id]` | `guest_service_requests`, `staff_profiles` | `getGuestServiceRequestDetail` | Shows staff assignment & status transitions | Channel `guest-request-{id}` + 2s polling | Guest session match |
| **Stay Details** | Nav tab / `/guest/stay` | `stays`, `rooms`, `guest_profiles` | `getActiveGuestSession`, queries | Displays check-in/out timeline, active counters | Polling 2s | `VERIFIED_STAY` |
| **Hotel Directory** | Nav tab / `/guest/hotel` | `properties`, `restaurants` | `getPublicRestaurants` | Shows contact info, amenities, Wi-Fi | None | Publicly accessible |
| **Wi-Fi 1-Tap Copy** | Wi-Fi card on Home/Stay/Hotel | `properties.wifi_ssid`, `wifi_password` | Client Clipboard API | Copies password to clipboard, shows check icon | None | Active stay only for password |
| **Folio & Billing** | Home card / `/guest/folio` | `folios`, `folio_charges`, `payments` | `getGuestPortalFolio` → `get_guest_folio` (RPC) | Displays balance due, itemized bills, payments | Realtime/Polling | Session token validation |
| **Public Direct Booking**| `/book/[propertySlug]` | `properties`, `room_types`, `rates` | `searchPublicAvailabilityAction`, `createPublicBookingAction` | Confirms reservation, generates confirmation # | None | Public rate validation |

---

## 4. Customer User Journeys

### JOURNEY A — QR → Guest App
```
Physical QR Scan (Room / Table)
       ↓
Browser opens /guest/qr/[token]
       ↓
Server executes resolveGuestQrAccess(rawToken)
  ↳ Computes SHA-256 hash
  ↳ Calls RPC: resolve_guest_qr_access(p_token_hash)
  ↳ Returns: qr_type ('ROOM' | 'HOTEL_GENERAL' | 'TABLE'), property_id, room_id, has_active_stay
       ↓
StayVerificationCard renders on client
  ↳ If ROOM and has_active_stay: triggers unlockSeamlessRoomSessionAction(rawToken)
  ↳ Calls RPC: verify_and_create_guest_session(...)
  ↳ Issues HTTP-only cookie: stayhub_guest_session (Max-Age: 7 days, SameSite: Lax)
       ↓
Client Router pushes to /guest/home
       ↓
Guest Home renders personalized room greeting & unlocked service controls
```

### JOURNEY B — Food Ordering
```
Guest Home (/guest/home)
       ↓
Navigate to Dining (/guest/dining) → Select Restaurant (/guest/dining/[restaurantId])
       ↓
Browse Categorized Dishes → Tap Food Card
       ↓
FoodDetailModal opens (Custom instructions, Quantity selector)
       ↓
Tap "Add to Order" → CartContext updates state & localStorage (stayhub_guest_cart)
       ↓
Open Cart (/guest/cart) → Review Items, Taxes, and Tip
       ↓
Tap "Place Order" → Calls placeGuestFoodOrderAction(payload)
  ↳ Validates session cookie via validate_guest_session
  ↳ Calls RPC: create_guest_food_order(p_session_token_hash, p_order_items, ...)
  ↳ Postgres atomically:
       1. Inserts into orders (type: ROOM_SERVICE | DINE_IN, status: RECEIVED)
       2. Inserts into order_items
       3. Creates kds_tickets for kitchen stations
       4. Posts charge to active stay folio (if configured for room billing)
       5. Fires Supabase realtime broadcast
       ↓
Server Action calls revalidatePath on /guest/orders, /kds, /dashboard
       ↓
Client CartContext clears cart → router.push('/guest/orders/[orderId]')
       ↓
Guest tracks live kitchen progress in real-time
```

### JOURNEY C — Service Request
```
Guest Home (/guest/home) or Services (/guest/services)
       ↓
Select Category (HOUSEKEEPING, MAINTENANCE, CONCIERGE, LAUNDRY, SPA)
       ↓
Open Service Sheet → Select Preset or Custom Notes → Set Priority
       ↓
Tap "Submit Request" → Calls createGuestServiceRequestAction(payload)
  ↳ Validates stay session via validate_guest_session
  ↳ Calls RPC: create_guest_service_request(p_session_token_hash, category, title, description, priority)
  ↳ Inserts into guest_service_requests (status: SUBMITTED)
  ↳ Triggers operational alerts on Staff Dashboard & Housekeeping Board
       ↓
Server Action revalidates /guest/requests and /guest-requests
       ↓
Client redirects to /guest/requests/[requestId]
       ↓
Realtime subscription listens for staff assignment and status changes:
  SUBMITTED → ASSIGNED → IN_PROGRESS → COMPLETED
```

### JOURNEY D — Bill / Folio
```
Guest on /guest/home or /guest/stay
       ↓
Taps "View Stay Folio & Itemized Bill" → Navigates to /guest/folio
       ↓
Server executes getGuestPortalFolio(rawToken)
  ↳ Calls RPC: get_guest_folio(p_session_token_hash)
  ↳ Queries folios joined with folio_charges and payments
       ↓
Calculates:
  - Charges Subtotal (Room rent + In-room dining + Paid service incidentals)
  - Applicable Taxes (CGST + SGST)
  - Net Payments recorded (Deposits, Card/Cash settlements)
  - Current Balance Due (Charges + Taxes - Payments)
       ↓
Renders GuestFolioView with color-coded settlement status:
  - Outstanding: Amber alert with "Settlement due upon check-out"
  - Settled (Balance <= 0): Emerald alert with "All charges settled"
```

### JOURNEY E — My Stay
```
Guest Navigates to /guest/stay
       ↓
Server loads session via getActiveGuestSession()
       ↓
Parallel fetch:
  - getGuestFoodOrders(sessionCookie)
  - getGuestServiceRequests(sessionCookie)
       ↓
Renders:
  - Assigned Accommodation (Room number, Room type)
  - Primary Guest details & party size
  - Stay schedule (Check-in time, expected check-out timestamp)
  - Quick 1-tap service shortcuts
  - In-Room Wi-Fi credentials with copy button
  - Active Orders live preview counter
  - Active Requests live preview counter
  - Itemized folio spend preview
  - Front Desk direct dial button
```

---

## 5. Current UI Architecture

The guest application UI is contained within `src/app/guest` and rendered inside a custom client-side wrapper `GuestShell` (`src/components/guest/guest-shell.tsx`).

### Shell & Layout Structure
- **Root Layout** (`src/app/guest/layout.tsx`):
  - Injects `CartProvider` at the top level.
  - Wraps all guest routes with `GuestShell`.
  - Sets dark background (`bg-[#050B14] text-slate-100`).
- **Guest Shell Header** (`GuestShell`):
  - Fixed top bar (`backdrop-blur-md bg-[#08111F]/90 border-b border-slate-800/80`).
  - Brand avatar, property name, room status badge, and floating cart icon with item count badge.
- **Guest Bottom Navigation** (`GuestShell`):
  - Fixed mobile bottom bar with 5 primary destinations:
    1. **Home** (`/guest/home` — `Home` icon)
    2. **Dining** (`/guest/dining` — `Utensils` icon)
    3. **Services** (`/guest/services` — `Bell` icon)
    4. **My Stay** (`/guest/stay` — `BedDouble` icon)
    5. **Hotel** (`/guest/hotel` — `Building2` icon)

---

## 6. Component Architecture

```
src/
├── app/guest/
│   ├── layout.tsx                     # Top-level CartProvider & GuestShell wrapper
│   ├── page.tsx                       # Root redirector to /guest/home
│   ├── home/page.tsx                  # Home portal server component
│   ├── dining/
│   │   ├── page.tsx                   # Restaurant outlets list
│   │   └── [restaurantId]/page.tsx    # Menu & dish catalog
│   ├── cart/page.tsx                  # Cart review & ordering page
│   ├── orders/
│   │   ├── page.tsx                   # Orders list
│   │   └── [orderId]/page.tsx         # Order tracking page
│   ├── services/page.tsx              # Service categories & request trigger
│   ├── requests/
│   │   ├── page.tsx                   # Active service tickets
│   │   └── [requestId]/page.tsx       # Service ticket detail & tracking
│   ├── stay/page.tsx                  # In-house room stay timeline
│   ├── hotel/page.tsx                 # Hotel directory & information
│   ├── folio/page.tsx                 # Room folio & bill statement
│   └── qr/[token]/page.tsx            # QR code verification entrypoint
├── components/guest/
│   ├── guest-shell.tsx                # Layout shell, top bar, bottom navigation
│   ├── cart-context.tsx               # Cart state, item storage & math
│   ├── cart-view.tsx                  # Cart screen interactive component
│   ├── dining-menu-view.tsx           # Category tabs, food cards, search & filters
│   ├── guest-folio-view.tsx           # Folio charges & settlement breakdown
│   ├── guest-order-detail-view.tsx    # Live order tracker & timeline
│   ├── guest-request-detail-view.tsx  # Service ticket tracking & cancel flow
│   ├── services-view.tsx              # Service categories & submission sheet
│   ├── stay-verification-card.tsx     # QR resolution, auto-unlock & manual login
│   ├── guest-live-refresher.tsx       # 2-second background router.refresh() poller
│   └── wifi-copy-button.tsx           # Clipboard interaction button
└── lib/
    ├── guest-portal/                  # Session actions, QR resolution, queries
    ├── guest-ordering/                # Food ordering actions, queries, types
    ├── guest-services/                # Service request actions, queries, types
    └── billing/                       # Folio queries & calculation contracts
```

---

## 7. State Management

| State Domain | Location / Store | Trigger / Update Mechanism | Dependent Components | Performance Impact |
| :--- | :--- | :--- | :--- | :--- |
| **Cart Items** | `CartContext` (`localStorage` key: `stayhub_guest_cart`) | `addItem`, `removeItem`, `updateQuantity`, `clearCart` | `GuestShell` (badge), `DiningMenuView`, `CartView` | High: Synchronous `localStorage.setItem` inside state updater runs on every tap |
| **Active Session** | HTTP-only Cookie (`stayhub_guest_session`) | QR unlock or manual verification action | Server components, layouts, shell header | Low (evaluated server-side) |
| **Menu Filter / Search** | `DiningMenuView` local React state (`useState`) | Category pill tap, search input change | `DiningMenuView` dish list | Low / Medium (client-side filtering) |
| **Service Modal State** | `ServicesView` local React state (`useState`) | Service tile click, close button tap | `ServicesView` bottom sheet / modal | Low |
| **Live Tracking State** | `GuestLiveRefresher` + Supabase Realtime | 2000ms timer + websocket payload | Entire server component tree via `router.refresh()` | **CRITICAL**: Causes constant server re-renders every 2 seconds |

---

## 8. Authentication / Guest Session Architecture

### Session Generation & Storage
1. When a QR code is scanned or unlocked, the server generates a cryptographically secure random session token.
2. A SHA-256 hash of this token is computed and stored in the PostgreSQL database table `guest_sessions`.
3. The raw token is returned to the client as an HTTP-only cookie named **`stayhub_guest_session`**:
   - `httpOnly: true`
   - `sameSite: 'lax'`
   - `secure: process.env.NODE_ENV === 'production'`
   - `maxAge: 7 * 24 * 60 * 60` (7 days)
   - `path: '/'`

### Session Validation Flow
Every server action (`placeGuestFoodOrderAction`, `createGuestServiceRequestAction`, etc.) and query reads `cookies().get("stayhub_guest_session")`. The raw token is hashed (`crypto.createHash('sha256').update(rawToken).digest('hex')`) and passed to the Postgres RPC:
```sql
validate_guest_session(p_session_token_hash)
```
The RPC returns:
- `is_valid` (boolean)
- `session_id`, `property_id`, `stay_id`, `room_id`, `room_number`, `session_type`, `guest_id`, `guest_first_name`, `guest_last_name`

### Session Types
- `VERIFIED_STAY`: Bound to an active in-house room reservation (`stay_id`). Can place room service orders and create housekeeping/maintenance requests.
- `TABLE_ORDERING`: Bound to a restaurant table (`table_id`). Can place dine-in orders.
- `PUBLIC_EXPLORATION`: General visitor session. Can browse menus and hotel directory, but cannot bill charges to rooms.

---

## 9. QR Architecture

```
Physical QR Code URL: https://stayhub.app/guest/qr/<raw_token>
```
1. Physical QR codes contain a high-entropy string (`token`).
2. The database stores the SHA-256 hash of this token in `guest_qr_codes`.
3. When resolved via `resolveGuestQrAccess(token)`:
   - Queries `guest_qr_codes` where `qr_code_hash = hash(token)` and `is_active = true`.
   - Checks if linked to a `room_id` or `property_id`.
   - If linked to a room, checks for an active stay where `status = 'CHECKED_IN'`.
4. If an active stay exists:
   - `StayVerificationCard` automatically executes `unlockSeamlessRoomSessionAction(rawToken)`.
   - The user seamlessly transitions into the verified room portal without needing to type a confirmation code.

---

## 10. Food Ordering Architecture

### Order Flow Contract
1. **Client**: `CartView` aggregates cart items with restaurant ID and notes.
2. **Server Action**: `placeGuestFoodOrderAction(payload)`:
   - Extracts `stayhub_guest_session` from cookie.
   - Computes SHA-256 hash.
   - Validates session with `validate_guest_session`.
   - Invokes Postgres RPC:
     ```sql
     create_guest_food_order(
       p_session_token_hash,
       p_restaurant_id,
       p_order_type, -- 'ROOM_SERVICE' | 'DINE_IN'
       p_items,      -- JSONB array of { menu_item_id, quantity, unit_price, notes }
       p_special_instructions,
       p_tip_amount
     )
     ```
3. **Database Transaction**:
   - Validates menu item active status and prices.
   - Computes subtotal, taxes (GST), and grand total.
   - Creates record in `orders` (status: `RECEIVED`).
   - Creates individual records in `order_items`.
   - Generates kitchen display tickets in `kds_tickets`.
   - Automatically posts room service charges to the stay's active `folios` record.
4. **Revalidation & Notification**:
   - Calls `revalidatePath('/guest/orders')`, `revalidatePath('/kds')`, `revalidatePath('/dashboard')`.
   - Clears cart and navigates guest to `/guest/orders/[orderId]`.

---

## 11. Service Request Architecture

### Request Flow Contract
1. **Client**: Guest selects service from `ServicesView` (e.g., Housekeeping, Laundry, Concierge).
2. **Server Action**: `createGuestServiceRequestAction(payload)`:
   - Checks `stayhub_guest_session` cookie.
   - Computes SHA-256 hash.
   - Calls Postgres RPC:
     ```sql
     create_guest_service_request(
       p_session_token_hash,
       p_category,    -- 'HOUSEKEEPING' | 'MAINTENANCE' | 'CONCIERGE' | 'LAUNDRY' | 'SPA'
       p_title,
       p_description,
       p_priority     -- 'NORMAL' | 'HIGH' | 'URGENT'
     )
     ```
3. **Database Record**:
   - Inserts row into `guest_service_requests` with status `SUBMITTED`.
   - Notifies staff dashboard and housekeeping alert boards via realtime channels.
4. **Revalidation**:
   - Calls `revalidatePath('/guest/requests')` and `revalidatePath('/guest-requests')`.
   - Navigates guest to `/guest/requests/[requestId]`.

---

## 12. Billing / Folio Architecture

### Folio Source of Truth
The folio implementation is centralized in `src/lib/billing/queries.ts` (`getGuestPortalFolio`) and backed by the Postgres function `get_guest_folio(p_session_token_hash)`.

### Billing Data Flow
```
get_guest_folio(p_session_token_hash)
       ↓
Fetch active folio for stay_id (where status = 'OPEN')
       ↓
Join folio_charges:
  - ROOM (Room tariff / night stay charges)
  - ROOM_SERVICE / RESTAURANT (Food & beverage orders)
  - SERVICE (Paid spa, laundry, or paid incidentals)
       ↓
Join payments:
  - Advance deposits, credit card settlements, UPI/cash transactions
       ↓
Compute Financial Statement:
  - charges_subtotal = SUM(amount)
  - taxes_total = SUM(tax_amount)
  - net_charges = charges_subtotal + taxes_total
  - net_payments = SUM(payment.amount)
  - balance_due = net_charges - net_payments
```
> [!IMPORTANT]
> The single source of truth for all guest balances is `getGuestPortalFolio`. The future UI must simply present this verified data without re-calculating financial totals on the client.

---

## 13. Realtime Architecture

### Active Subscriptions

| Channel Identifier | Target Table & Event | Component Subscribed | Lifecycle | Action on Event |
| :--- | :--- | :--- | :--- | :--- |
| `guest-order-{orderId}` | `postgres_changes` on `orders` & `order_items` | `GuestOrderDetailView` | Mounts on order detail page, unmounts on exit | Updates local state & calls `router.refresh()` |
| `guest-request-{requestId}` | `postgres_changes` on `guest_service_requests` | `GuestRequestDetailView` | Mounts on request detail page, unmounts on exit | Updates local state & calls `router.refresh()` |
| Polling Loop (Fallback) | `setInterval` every 2000ms | `GuestLiveRefresher` | Mounts on `/guest/requests`, `/guest/orders`, `/guest/stay` | Executes `router.refresh()` every 2 seconds |

---

## 14. Database Dependencies

### Database Entity Groups

```
AUTH / SESSIONS
├── guest_sessions              # Session token hashes, stay bindings, expiration
└── guest_qr_codes              # Physical QR token hashes, room/table mappings

PROPERTY & ROOMS
├── properties                  # Hotel metadata, Wi-Fi details, check-in policies
├── rooms                       # Room numbers, floor, room type references
└── room_types                  # Room categories, base rates, amenities

STAYS & GUESTS
├── stays                       # Check-in/out timestamps, status, guest_id
└── guest_profiles              # Guest names, phone numbers, email

DINING & KITCHEN
├── restaurants                 # Outlets, cuisine type, active flags
├── menu_categories             # Category ordering and titles
├── menu_items                  # Dish details, price, allergens, availability
├── orders                      # Order type, status, subtotal, taxes, totals
├── order_items                 # Dish references, quantities, prices, notes
└── kds_tickets                 # Kitchen tickets, station routing, status

SERVICE REQUESTS
└── guest_service_requests      # Category, title, description, status, staff_id

FOLIO & BILLING
├── folios                      # Folio number, stay_id, status (OPEN/CLOSED)
├── folio_charges               # Charge type, amount, tax, description, date
└── payments                    # Amount, payment method, reference, paid_at
```

---

## 15. Server Actions / RPC Contracts

### Server Actions (Must NOT Be Broken)
- `verifyStayAndCreateSessionAction(payload)` (`src/lib/guest-portal/actions.ts`)
- `establishPublicHotelSessionAction(rawToken)` (`src/lib/guest-portal/actions.ts`)
- `unlockSeamlessRoomSessionAction(rawToken)` (`src/lib/guest-portal/actions.ts`)
- `placeGuestFoodOrderAction(payload)` (`src/lib/guest-ordering/actions.ts`)
- `createGuestServiceRequestAction(payload)` (`src/lib/guest-services/actions.ts`)
- `cancelGuestServiceRequestAction(payload)` (`src/lib/guest-services/actions.ts`)
- `searchPublicAvailabilityAction(...)` (`src/lib/booking/actions.ts`)
- `createPublicBookingAction(...)` (`src/lib/booking/actions.ts`)

### Postgres RPCs (Must NOT Be Broken)
- `resolve_guest_qr_access(p_token_hash)`
- `validate_guest_session(p_session_token_hash)`
- `verify_and_create_guest_session(p_raw_token_hash, p_confirmation_number, p_last_name)`
- `create_guest_food_order(p_session_token_hash, p_restaurant_id, p_order_type, p_items, ...)`
- `create_guest_service_request(p_session_token_hash, p_category, p_title, p_description, p_priority)`
- `cancel_guest_service_request(p_session_token_hash, p_request_id)`
- `get_guest_service_request_detail(p_session_token_hash, p_request_id)`
- `get_guest_folio(p_session_token_hash)`

---

## 16. Security & RLS Considerations

- **Session Enclosure**: The guest portal relies on Postgres function security (`SECURITY DEFINER` with internal validation against `guest_sessions`).
- **No Direct Table Exposure**: Client code does not make arbitrary direct table queries to sensitive tables like `folios` or `stays`; all access is mediated through validated RPCs or server actions that hash the `stayhub_guest_session` cookie.
- **Cross-Stay Isolation**: A guest session bound to Room 101 cannot view or modify orders, service tickets, or folios belonging to Room 102.

---

## 17. Responsive Behavior Analysis

### Breakpoint Audit
- **390px (iPhone 12/13/14/15)**: Primary target viewport. Bottom navigation works well, but dense grids (such as 3-column quick actions and 2-column party grids) feel slightly cramped.
- **430px (iPhone Pro Max / Plus)**: Content fits comfortably, standard cards display with appropriate padding.
- **768px (iPad Mini / Tablet)**: Current mobile container (`max-w-lg mx-auto`) leaves excessive empty space on left and right margins; navigation remains stuck to the bottom.
- **1024px – 1440px (Desktop / Laptop)**: App renders as a narrow phone-sized column centered in the browser window with huge black bars on the sides. Desktop users should receive an elegant centered luxury tablet experience or a dedicated responsive layout.

---

## 18. Current Design System Analysis

### Current Visual Traits
- **Backgrounds**: Deep charcoal/navy (`bg-[#050B14]`, `#08111F`, `#0E1B2E`).
- **Accents**: Neon amber/orange gradients (`from-amber-500 to-amber-600`), bright emerald pills, indigo badges.
- **Typography**: System sans-serif with aggressive font weights (`font-black`, `font-extrabold`).
- **Borders & Shadows**: High-contrast borders (`border-slate-800`, `border-amber-500/30`) with neon glow shadows.
- **Cards**: Dense, boxy card layouts with heavy text and prominent icon boxes.

### Visual Transition Needed
The current design feels more like a dark-mode developer/crypto dashboard than a five-star luxury hotel concierge. It needs to transition to warm ivory, midnight navy, champagne gold, serif headings, editorial imagery, and spacious, breathable layouts.

---

## 19. Performance Investigation

### Investigation Overview
The application functionality is verified and robust, but user interactions frequently exhibit a perceptible delay between clicking an interactive element and the UI responding.

### Performance Analysis

```
User Clicks / Interacts
       ↓
[Lag Point 1: Main Thread Contention]
  ↳ Aggressive 2-second router.refresh() timer in GuestLiveRefresher is firing
  ↳ Next.js Server Components are constantly re-executing in the background
       ↓
[Lag Point 2: Synchronous LocalStorage & State Blocking]
  ↳ CartProvider executes synchronous JSON.stringify / setItem operations on every quantity tap
       ↓
[Lag Point 3: Un-memoized Component Re-renders]
  ↳ Top-level state updates propagate down through GuestShell and deep component trees
       ↓
[Lag Point 4: Network Revalidation Cascades]
  ↳ Server Actions trigger multi-path revalidatePath calls across unrelated dashboard & guest routes
```

---

## 20. Interaction-Lag Investigation

### Step-by-Step Interaction Latency Tracing

| Interaction | Client Trigger | State / Storage Step | Server / Network Step | Observed Delay Mechanism |
| :--- | :--- | :--- | :--- | :--- |
| **Tap Dish Card / Open Modal** | `onClick` in `DiningMenuView` | Sets `selectedDish` state | None | Re-renders entire dish list if not memoized |
| **Add Dish to Cart** | Tap "Add to Order" button | `CartContext.addItem` → `localStorage.setItem` | None | Synchronous I/O blocks main thread while re-rendering shell header badge |
| **Adjust Quantity in Cart** | Tap `+` or `-` button | `CartContext.updateQuantity` → `localStorage.setItem` | None | Re-renders entire `CartView` and `GuestShell` |
| **Submit Service Request** | Form submit | Sets local loading spinner | `createGuestServiceRequestAction` → RPC → `revalidatePath` (5 paths) | Client waits for full server response and route revalidation before router pushes |
| **Page Navigation (e.g., Home → Dining)** | Bottom nav tap | Next.js client router transition | Fetches server payload from `/guest/dining` | Flight payload download + un-optimized image downloads |

---

## 21. Identified Bottlenecks

1. **Hyperactive Background Polling (`router.refresh()`)**: `GuestLiveRefresher`, `GuestOrderDetailView`, and `GuestRequestDetailView` execute `router.refresh()` every 2000ms.
2. **Synchronous `localStorage` Operations in `CartContext`**: Synchronous stringification and storage writes inside React state setters.
3. **Over-scoped Server Action Revalidations**: Server actions call `revalidatePath` on `/dashboard`, `/guest-requests`, `/rooms`, `/kds`, and `/guest/orders` simultaneously.
4. **Un-optimized Dynamic Image Requests**: Dish cards make un-cached calls to external Unsplash image URLs without width/height constraints or next/image optimization.
5. **Lack of Interaction Memoization (`React.memo` / `useCallback`)**: Sub-components inside menu, cart, and services re-render upon any state change in parent wrappers.

---

## 22. Evidence for Each Bottleneck

### Bottleneck 1: Continuous Background `router.refresh()` Loop
- **Problem**: UI interactions lag because the React tree is continuously being replaced by server refreshes.
- **Location**: `src/components/guest/guest-live-refresher.tsx` (Lines 11–22), `src/components/guest/guest-order-detail-view.tsx` (Lines 34–41), `src/components/guest/guest-request-detail-view.tsx` (Lines 35–42).
- **User Action**: Any click or scroll on active guest pages.
- **Current Flow**: `setInterval` fires every 2000ms → calls `router.refresh()` → Next.js requests new server flight data → server re-queries database → reconciles entire DOM tree.
- **Evidence**:
  ```tsx
  // src/components/guest/guest-live-refresher.tsx:11-22
  React.useEffect(() => {
    const interval = setInterval(() => {
      router.refresh();
    }, 2000);
    return () => clearInterval(interval);
  }, [router]);
  ```
- **Likely Root Cause**: Aggressive fallback polling implemented before Supabase Realtime was stabilized.
- **Confidence**: High
- **Impact**: High
- **Recommended Fix (for Phase 1)**: Remove interval polling; rely solely on fine-grained Supabase Realtime events. If polling is needed as fallback, increase interval to 15–30s and only poll if realtime is disconnected.

---

### Bottleneck 2: Synchronous LocalStorage Blocking in Cart Context
- **Problem**: Noticeable stutter when tapping `+` / `-` quantity buttons or adding items to cart.
- **Location**: `src/components/guest/cart-context.tsx` (Lines 47–92).
- **User Action**: Tapping Add to Cart, incrementing/decrementing item count.
- **Current Flow**: User taps button → React executes `addItem` → calls `saveCart(updated)` which synchronously runs `localStorage.setItem('stayhub_guest_cart', JSON.stringify(items))` on the main thread.
- **Evidence**:
  ```tsx
  // src/components/guest/cart-context.tsx:47-51
  const saveCart = (newItems: GuestCartItem[]) => {
    setItems(newItems);
    if (typeof window !== "undefined") {
      localStorage.setItem("stayhub_guest_cart", JSON.stringify(newItems));
    }
  };
  ```
- **Likely Root Cause**: Direct synchronous storage access inside React state transitions.
- **Confidence**: High
- **Impact**: Medium / High
- **Recommended Fix (for Phase 1)**: Decouple state update from storage via `useEffect` debounce or `useTransition`.

---

### Bottleneck 3: Heavy Multi-Path Server Action Revalidation
- **Problem**: Submitting food orders or service requests takes 1.5s+ to navigate to the confirmation screen.
- **Location**: `src/lib/guest-ordering/actions.ts` (Lines 118–124), `src/lib/guest-services/actions.ts` (Lines 77–81).
- **User Action**: Tap "Place Order" or "Submit Request".
- **Current Flow**: Action runs RPC → executes 4–5 synchronous `revalidatePath` calls → client router cache is wiped across multiple layouts → browser freezes during flight payload generation.
- **Evidence**:
  ```tsx
  // src/lib/guest-services/actions.ts:77-81
  revalidatePath("/guest-requests");
  revalidatePath("/guest/requests");
  revalidatePath(`/guest/requests/${res.request_id}`);
  revalidatePath("/guest/home");
  revalidatePath("/dashboard");
  ```
- **Likely Root Cause**: Over-broad cache invalidation sweeping both staff and guest routes in a single user transaction.
- **Confidence**: High
- **Impact**: High
- **Recommended Fix (for Phase 1)**: Limit `revalidatePath` strictly to the target guest route and let staff boards update via their dedicated Realtime channels.

---

### Bottleneck 4: External Unsplash Image Layout Shifts & Network Contention
- **Problem**: Scrolling and selecting items on the menu page feels janky on mobile devices.
- **Location**: `src/components/guest/dining-menu-view.tsx` (Lines 31–43).
- **User Action**: Browsing restaurant menu.
- **Current Flow**: Dynamic string matching returns full-resolution Unsplash URLs; standard `<img>` tags load external images without size optimizations, triggering reflows.
- **Evidence**:
  ```tsx
  // src/components/guest/dining-menu-view.tsx:31-43
  export function getFoodImageForDish(name: string, categoryName?: string): string {
    const n = name.toLowerCase();
    if (n.includes("biryani")) return "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500&q=80";
    // ...
  }
  ```
- **Likely Root Cause**: Non-memoized image helper with external image hosts and missing pre-computed aspect ratios.
- **Confidence**: Medium
- **Impact**: Medium
- **Recommended Fix (for Phase 1/3)**: Use Next.js `Image` component with fixed aspect ratios, blurred placeholders, and local luxury asset caching.

---

## 23. Target Luxury UI Mapping

| Current Screen / Feature | Current UI Pattern | Target Luxury UI Direction | Key UX Transformation |
| :--- | :--- | :--- | :--- |
| **Guest Home** | Dark boxy grid with heavy neon amber gradients and dense icons | Image-led editorial luxury hotel hero, warm ivory/cream accents, elegant serif typography, subtle gold badges | Spacious, tranquil resort welcome feel with a prominent yet refined dining CTA |
| **Dining Discovery** | Dark list of restaurant cards with plain descriptions | Full-width photography cards showcasing restaurant ambience, cuisine tags, and opening hours | Editorial culinary curation |
| **Menu Catalog** | Heavy vertical dish list with generic buttons | Refined food catalog with crisp dish photography, elegant serif titles, subtle dietary badges, and one-touch modal trigger | Magazine-style fine dining menu |
| **Food Customization** | Basic centered modal with text inputs | Sleek bottom sheet with high-res dish hero, portion selectors, dietary tags, and smooth champagne gold action buttons | Frictionless mobile-native ordering |
| **Cart & Checkout** | Plain table-style summary with heavy borders | Clean luxury order folio with item cards, subtle tip selector chips, and seamless order submission | Refined, high-trust checkout |
| **Live Order Tracker** | Standard status bar with text labels | Elegant multi-stage luxury progress tracker with live kitchen badge and preparation countdown | Reassuring, refined hospitality updates |
| **Service Catalog** | Boxy 3-column icon grid | Curated lifestyle category tiles (Housekeeping, Wellness, Concierge) with micro-interactions | Boutique concierge desk experience |
| **Service Sheet** | Dark modal form | Minimalist bottom sheet with one-tap amenity chips (Extra Towels, Turn-down Service) and optional note field | 2-tap service dispatch |
| **Stay Timeline** | Dense 2x2 data grid with small text | Elegant guest itinerary card with room suite photography, key dates, and stay countdown | Luxury resort guest passport |
| **Folio Statement** | High-contrast dark statement card | Premium financial statement with ivory background, crisp monetary typography, and clear payment status | Transparent, elite hotel billing |

---

## 24. Design Implementation Risks

1. **High-Resolution Asset Bloat**: High-res editorial hotel images could increase initial page weight if not properly sized, converted to WebP/AVIF, and served with Next.js image optimization.
2. **Animation Overhead**: Introducing complex framer-motion layout animations on low-powered mobile devices could worsen the existing interaction lag if not hardware-accelerated.
3. **Contrast & Readability in Light/Cream Themes**: Shifting from pure dark mode to warm ivory/cream must maintain strict WCAG AAA contrast ratios for all critical text and monetary figures.
4. **Layout Shift during Realtime Updates**: Status changes in orders or service requests must not cause unexpected UI jumps or layout shifts while the user is interacting.

---

## 25. Performance Optimization Opportunities (For Phase 1+)

1. **Replace Polling with True Realtime**: Decommission the 2000ms `GuestLiveRefresher` in favor of scoped Supabase Realtime subscriptions that update local component state instead of refreshing the whole page.
2. **Optimistic UI Updates**: Instantly update cart badge counts, item quantities, and modal states on click before asynchronous operations complete.
3. **Cart State Debouncing**: Debounce `localStorage` sync operations to idle browser frames (`requestIdleCallback`) to prevent blocking click handlers.
4. **Memoization & Component Granularity**: Wrap food items, cart rows, and service cards in `React.memo` with stabilized `useCallback` handlers.
5. **Next.js Image Optimization**: Leverage `next/image` with responsive `sizes`, WebP compression, and low-quality image placeholders (LQIP).

---

## 26. Features & Contracts That MUST NOT Change

To ensure absolute operational stability, the following existing contracts are strictly protected:
- **Cookie Name**: `stayhub_guest_session`
- **Session Types**: `VERIFIED_STAY`, `TABLE_ORDERING`, `PUBLIC_EXPLORATION`
- **Session Storage**: `stayhub_guest_cart` in `localStorage`
- **Postgres RPC Signatures**:
  - `resolve_guest_qr_access(p_token_hash)`
  - `validate_guest_session(p_session_token_hash)`
  - `verify_and_create_guest_session(...)`
  - `create_guest_food_order(...)`
  - `create_guest_service_request(...)`
  - `cancel_guest_service_request(...)`
  - `get_guest_service_request_detail(...)`
  - `get_guest_folio(...)`
- **Server Action Entrypoints**:
  - `placeGuestFoodOrderAction`
  - `createGuestServiceRequestAction`
  - `cancelGuestServiceRequestAction`
  - `verifyStayAndCreateSessionAction`
  - `unlockSeamlessRoomSessionAction`
  - `getGuestPortalFolio`

---

## 27. Recommended Phase Breakdown

```
PHASE 0: DISCOVER + AUDIT (Completed & Documented)
   ↓
PHASE 1: PERFORMANCE FOUNDATION
  ↳ Decommission hyperactive 2s polling loops
  ↳ Stabilize Supabase Realtime events
  ↳ Optimize CartContext & eliminate localStorage blocking
  ↳ Streamline server action revalidation scopes
   ↓
PHASE 2: GUEST SHELL & LUXURY HOME
  ↳ Implement Ivory / Navy / Gold luxury design system & typography tokens
  ↳ Rebuild GuestShell (header, bottom navigation, floating cart)
  ↳ Rebuild /guest/home with editorial hero & luxury action cards
   ↓
PHASE 3: DINING & MENU DISCOVERY
  ↳ Transform /guest/dining and /guest/dining/[restaurantId]
  ↳ Implement luxury culinary cards, category tabs, and search
   ↓
PHASE 4: FOOD DETAIL, CART & CHECKOUT
  ↳ Build luxury Food Detail bottom sheet
  ↳ Redesign /guest/cart and checkout flow
   ↓
PHASE 5: ORDERS & REALTIME TRACKING
  ↳ Redesign /guest/orders and /guest/orders/[orderId]
  ↳ Implement sleek live kitchen progress tracker
   ↓
PHASE 6: SERVICES & CONCIERGE EXPERIENCE
  ↳ Redesign /guest/services, service request sheets, and /guest/requests
   ↓
PHASE 7: MY STAY, FOLIO & HOTEL DIRECTORY
  ↳ Redesign /guest/stay, /guest/folio, and /guest/hotel
   ↓
PHASE 8: FULL PERFORMANCE POLISH & REGRESSION AUDIT
  ↳ End-to-end latency audit, Lighthouse validation, and regression verification
```
