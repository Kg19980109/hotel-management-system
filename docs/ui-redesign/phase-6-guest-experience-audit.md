# STAYHUB — PHASE 6 AUDIT REPORT
## Guest Experience Redesign, Customer QR Dining & Food Ordering

**Date**: 2026-09-27  
**Status**: Comprehensive Pre-Implementation Audit Complete  

---

### 1. Existing Guest Routes & Pages

| Route | File Path | Current Status & Functional Role |
| :--- | :--- | :--- |
| `/guest` | `src/app/guest/page.tsx` | Root redirect → `/guest/home`. |
| `/guest/home` | `src/app/guest/home/page.tsx` | Main guest portal home page: displays hotel welcome, room info, Wi-Fi widget, and service links. |
| `/guest/dining` | `src/app/guest/dining/page.tsx` | Landing screen for in-room dining: lists available restaurant outlets. |
| `/guest/dining/[restaurantId]` | `src/app/guest/dining/[restaurantId]/page.tsx` | Main customer menu: displays restaurant banner, categories, and culinary dishes with add-to-cart controls. |
| `/guest/cart` | `src/app/guest/cart/page.tsx` | Guest shopping cart & checkout review page. |
| `/guest/orders` | `src/app/guest/orders/page.tsx` | Active and historical food orders list for the verified stay. |
| `/guest/orders/[orderId]` | `src/app/guest/orders/[orderId]/page.tsx` | Real-time live order progress tracker & itemized receipt. |
| `/guest/qr/[token]` | `src/app/guest/qr/[token]/page.tsx` | Seamless in-room QR code entry point & verification resolver. |
| `/guest/services` | `src/app/guest/services/page.tsx` | Digital concierge service requests (housekeeping, towels, luggage, maintenance). |
| `/guest/stay` | `src/app/guest/stay/page.tsx` | In-house guest stay itinerary, check-in/out times, room details. |
| `/guest/hotel` | `src/app/guest/hotel/page.tsx` | Hotel directory, contact numbers, amenities list. |
| `/guest/folio` | `src/app/guest/folio/page.tsx` | Live room billing folio & charge ledger for verified guests. |

---

### 2. Existing Guest Components

| Component | File Path | Role |
| :--- | :--- | :--- |
| `GuestShell` | `src/components/guest/guest-shell.tsx` | Root mobile layout shell: top hospitality header, bottom navigation bar. |
| `DiningMenuView` | `src/components/guest/dining-menu-view.tsx` | Customer menu view: category tabs, dish cards, quantity buttons. |
| `CartView` | `src/components/guest/cart-view.tsx` | Cart items, tax breakdown, room notes, place order action. |
| `CartProvider` / `useCart` | `src/components/guest/cart-context.tsx` | React Context for persistent guest cart in `localStorage` (`stayhub_guest_cart`). |
| `GuestOrderDetailView` | `src/components/guest/guest-order-detail-view.tsx` | Live 4-stage stepper tracker with Supabase Realtime subscriptions. |
| `StayVerificationCard` | `src/components/guest/stay-verification-card.tsx` | Seamless 1-tap room unlock and confirmation number fallback. |
| `ServicesView` | `src/components/guest/services-view.tsx` | Guest service requests selector & dispatch submission. |
| `WifiCopyButton` | `src/components/guest/wifi-copy-button.tsx` | 1-tap Wi-Fi network and password copier. |

---

### 3. Existing Data Flow & Architectural Pipeline

The customer food ordering pipeline follows a single server-authoritative source of truth:
```
1. Admin Menu (Phase 5)
   ↓ Saves dishes to public.menu_categories & public.menu_items
2. Database (PostgreSQL)
   ↓ Fetched via getGuestRestaurantMenu(restaurantId)
3. Customer Menu (/guest/dining/[restaurantId])
   ↓ Category Tabs + Food Cards (consumes is_available and authoritative price)
4. Guest Cart (CartContext / localStorage)
   ↓ Client holds menu_item_id, name, quantity, client notes
5. Order Checkout (/guest/cart)
   ↓ Invokes placeGuestFoodOrderAction(payload)
6. Server RPC (public.create_guest_food_order)
   ↓ Validates session cookie (stay_id, property_id, guest_id)
   ↓ Re-queries public.menu_items to verify is_available = true
   ↓ Snaps server-authoritative price into restaurant_order_items (client price ignored)
   ↓ Generates restaurant_orders record with status = 'OPEN' and order_type = 'ROOM_SERVICE'
7. Kitchen Ticket Pipeline (KDS)
   ↓ Automatically triggers public.create_or_fire_kitchen_ticket
   ↓ Distributes items to kitchen stations (Hot Line, Pantry, Bar, Grill)
8. Live Realtime Tracking (/guest/orders/[orderId])
   ↓ Supabase Realtime listens to postgres_changes on restaurant_orders & kitchen_tickets
   ↓ Live 4-stage progress update (Received → Preparing → Ready → Delivered)
```

---

### 4. Existing Server Actions, RPCs & Queries

- `getActiveGuestSession()` (`src/lib/guest-portal/actions.ts`): Reads encrypted HMAC session cookie `stayhub_guest_session`.
- `resolveGuestQrAccess(token)` (`src/lib/guest-portal/queries.ts`): Validates QR token against `guest_qr_codes` table.
- `getGuestRestaurants(propertyId)` (`src/lib/guest-ordering/queries.ts`): Queries active restaurants for the property.
- `getGuestRestaurantMenu(restaurantId)` (`src/lib/guest-ordering/queries.ts`): Authoritative query pulling active categories and active menu items.
- `placeGuestFoodOrderAction(payload)` (`src/lib/guest-ordering/actions.ts`): Server action executing RPC `create_guest_food_order`.
- `getGuestFoodOrders(sessionCookie)` (`src/lib/guest-ordering/queries.ts`): Retrieves stay's dining orders.
- `getGuestFoodOrderDetail(orderId, sessionCookie)` (`src/lib/guest-ordering/queries.ts`): Retrieves single order with items and KDS status.

---

### 5. Identified Gaps & Missing / Hidden Functionality

1. **Dining & Orders Missing from Bottom Navigation**:
   - `GuestShell` only had: `Home`, `Hotel`, `My Stay`, `Services`.
   - Guests had NO direct bottom navigation item for **Dining** (`/guest/dining`) or **Orders** (`/guest/orders`).
2. **Broken Navigation on Guest Home**:
   - The "Dining & Food" quick card on the home page routed to `/guest/services` instead of `/guest/dining`.
   - On-site restaurant cards rendered as static non-clickable divs without links to `/guest/dining/[restaurantId]`.
3. **No Sticky Cart Bar on Menu Screen**:
   - While browsing the menu, guests who added items had no floating sticky cart pill showing item count and total at the bottom of the screen.
4. **No Food Detail View**:
   - Clicking a food card did not open a dedicated gourmet detail sheet/modal displaying high-definition food photography, dietary badges, description, and quantity selector.
5. **Visual Styling Disconnect**:
   - Guest UI was styled with dark generic slate tones (`bg-slate-950`) rather than the signature StayHub luxury visual language (Warm Ivory surfaces, Midnight Navy `#08111F`, Champagne Gold `#D4AF37`, refined typography, and gourmet imagery).
6. **Room Service vs Dining Clarity**:
   - The prompt explicitly requires making **Room Service** ("Order from your room") immediately recognizable and accessible with a single tap.
7. **Checkout & Order Confirmation Polish**:
   - Cart checkout lacked room delivery badges, order summary breakdown, and luxury confirmation feedback.
8. **Live Order Tracker Visual Elevation**:
   - Order tracking needed an elevated 4-stage stepper, real-time live pulse, driver/server dispatch details, and clear feedback on kitchen updates.

---

### 6. Functionality That Must NOT Be Replaced
- **HMAC / SHA-256 Guest Session Security**: `stayhub_guest_session` cookie verification.
- **Server RPC `create_guest_food_order`**: Authoritative price calculation and order validation.
- **KDS Kitchen Ticket Routing**: Station assignment and automatic ticket firing.
- **Phase 5 Authoritative Menu Schema**: Single source of truth in `public.menu_items` and `public.menu_categories`.
- **Phase 23 Service Request Dispatch**: Housekeeping and guest service request pipelines.

---

### 7. Implementation Plan for Phase 6
1. **Redesign `GuestShell` (`src/components/guest/guest-shell.tsx`)**:
   - Luxury StayHub branding with Warm Ivory / White content surfaces or sleek Midnight Navy contrast.
   - Upgrade bottom navigation to: **Home**, **Dining**, **Orders**, **Services**, **My Stay**.
   - Floating Cart Indicator pill when items exist in cart.
2. **Redesign Guest Home (`src/app/guest/home/page.tsx`)**:
   - Prominent **Room Service / Order Food** luxury hero card.
   - Fix navigation links: Dining & Food → `/guest/dining`.
   - Clickable on-site dining cards directly opening `/guest/dining/[restaurantId]`.
   - Active order banner if the guest has an in-progress food order.
3. **Redesign Dining Directory (`src/app/guest/dining/page.tsx`)**:
   - Luxury restaurant outlet cards with cuisine tags, hours, location, and "Order Now" action.
4. **Redesign Customer Menu (`src/components/guest/dining-menu-view.tsx`)**:
   - Search bar + Category pills tab bar.
   - Premium culinary food cards with appetizing photography, pricing, and 1-tap add.
   - Interactive **Food Detail Modal** when tapping a dish.
   - Real-time sticky cart floating summary bar at bottom.
5. **Redesign Cart & Checkout (`src/components/guest/cart-view.tsx`)**:
   - Itemized dish cards, quantity increment/decrement, special instructions.
   - Clear delivery destination: "Delivering to Room [X]".
   - Authoritative bill breakdown (Subtotal, GST/Tax, Total).
   - Instant order placement with smooth transition.
6. **Redesign Live Order Tracker (`src/components/guest/guest-order-detail-view.tsx`)**:
   - 4-stage luxury stepper with live pulse (Order Received → Kitchen Preparing → Ready for Delivery → Delivered).
   - Realtime Supabase listener for instant status transition without manual refresh.
7. **Redesign My Orders (`src/app/guest/orders/page.tsx`)**:
   - Active orders vs past orders segmentation.
   - Direct link to live tracker and re-order CTA.
