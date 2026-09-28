# STAYHUB CUSTOMER APP — PHASE 2 REPORT
## Guest Shell + Luxury Home Experience Visual Transformation

**Date:** September 29, 2026  
**Status:** COMPLETE  
**Target Visual Direction:** 5-Star Luxury Resort + Premium Mobile App + Digital Concierge  
**Scope:** `GuestShell`, Global Customer Header, Customer Bottom Navigation, Floating Cart, `/guest/home`

---

## 1. Executive Summary

Phase 2 successfully executes the visual transformation of the STAYHUB customer guest application from an operations-style dashboard into an editorial 5-star digital concierge experience.

All functional capabilities—including authentication, QR room binding, live stay verification, cart state, server actions, RPCs, realtime updates, Wi-Fi copy, front desk hotlines, and routing—have been preserved with 100% parity.

---

## 2. GuestShell Changes

- **Background Canvas:** Shifted from dark slate `#090D1A` to Warm Ivory (`#FAF8F5`) with a soft outer canvas (`#F0EBE1`) and delicate champagne-gold borders (`#EAE3D2`).
- **Container Structure:** Standardized max-width mobile column (`max-w-md md:max-w-lg mx-auto`) with responsive centering for tablets/desktops.
- **Micro-Interactions:** Subtle CSS transforms and fast active feedback (`active:scale-[0.98]`).

---

## 3. Header Changes

- **Typography & Branding:** Incorporated luxury serif styling (`font-serif`) for property names (`session?.property_name || "StayHub Resort & Spa"`) and subtle gold monogram compass mark.
- **In-House Guest Badge:** Clean inline status (`Room 302 · In-House Guest` or `Digital Concierge`) with emerald/gold check indicators.
- **Hospitality Action Buttons:** Refined circular quick-contact buttons for Front Desk Calling (`tel:${session.front_desk_phone}`) and Session Exit (`clearGuestSessionAction`).

---

## 4. Bottom Navigation Changes

- **Visual Architecture:** Docked floating bar with translucent glassmorphism (`bg-white/95 backdrop-blur-xl border-t border-[#EAE3D2]`).
- **Touch Ergonomics:** All 5 tabs feature $\ge 48\text{px}$ touch targets meeting WCAG mobile standards.
- **Tab Indicators:** Active state highlighted via warm ivory pill (`#FAF4E6`) and gold tint (`#A67C1E`) with high-contrast icon strokes.
- **Route Mappings:** Preserved exact 5 customer routes:
  1. `Home` (`/guest/home`)
  2. `Dining` (`/guest/dining`)
  3. `Orders` (`/guest/orders`)
  4. `Services` (`/guest/services`)
  5. `My Stay` (`/guest/stay`) for verified guests or `Hotel` (`/guest/hotel`) for general sessions.

---

## 5. Floating Cart Changes

- **Presentation:** Positioned safely above the bottom navigation dock (`bottom-20`).
- **Styling:** Midnight Navy pill (`#0B1526`) with champagne gold border (`#D4AF37`/35) and gold bag badge.
- **Data & Interaction:** Real-time item count, formatted subtotal (`₹[total]`), and instant link to `/guest/cart`.
- **Integrity:** Zero changes to `useCart`, `stayhub_guest_cart` localStorage structure, or ordering actions.

---

## 6. Home Page Changes (`/guest/home`)

- **Hero Banner:**
  - Time-aware greeting (`Good morning`, `Good afternoon`, `Good evening`, `${guest_first_name}`).
  - Image-led backdrop with Next.js optimized `<Image>` (responsive `sizes`, `priority`, `fill`) if `cover_image_url` is provided, paired with a midnight architectural gradient fallback.
- **Stay Passport Card:** Single unified luxury card displaying room type, check-in date, check-out date, remaining nights, and direct navigation to stay details.
- **3 Primary Action Pillars:**
  1. 🍽️ **Order Food** (`/guest/dining`)
  2. 🛎️ **Request Help** (`/guest/services`)
  3. 🧾 **My Bill** (`/guest/folio`)
- **Live Status Trackers (Conditional):**
  - Active Food Orders: Real-time kitchen progress pill with order number and live status indicator.
  - Active Service Tickets: Live request counter with link to `/guest/requests`.
  - *Omitted cleanly when no active orders/requests exist.*
- **Editorial Dining Invitation:** Magazine-style feature section highlighting in-room dining with fast CTA to menus.
- **Curated Quick Services Grid:** Clean 6-card hospitality grid (Housekeeping, Front Desk, Maintenance, Laundry, Spa, Transport) with subtle warm card styling.
- **Complimentary Wi-Fi:** Warm card with 1-tap copy button (`WifiCopyButton`).
- **Front Desk Concierge Hotline:** Direct 24/7 one-tap calling card.

---

## 7. Components Created/Modified

- `src/components/guest/guest-shell.tsx` *(Redesigned)*
- `src/components/guest/wifi-copy-button.tsx` *(Refined styling)*
- `src/app/guest/home/page.tsx` *(Redesigned)*

---

## 8. Existing Functionality Preserved

- `stayhub_guest_session` cookie verification and session hydration.
- `validate_guest_session` validation routines.
- `stayhub_guest_cart` context and non-blocking client operations.
- `placeGuestFoodOrderAction` and `create_guest_food_order`.
- `createGuestServiceRequestAction` and `cancelGuestServiceRequestAction`.
- `verifyStayAndCreateSessionAction` and `unlockSeamlessRoomSessionAction`.
- `getGuestPortalFolio` queries and routing.
- Real-time order and service request subscriptions.
- 1-tap Wi-Fi clipboard copy.
- 24/7 Front desk telephone dialing.

---

## 9. Routes Preserved

- `/guest/home`
- `/guest/dining`
- `/guest/dining/[restaurantId]`
- `/guest/cart`
- `/guest/orders`
- `/guest/orders/[orderId]`
- `/guest/services`
- `/guest/requests`
- `/guest/requests/[requestId]`
- `/guest/stay`
- `/guest/hotel`
- `/guest/folio`
- `/guest/qr/[token]`

---

## 10. Performance Considerations

- **No Polling Regressions:** Preserved the 25–30s conditional fallback and realtime-first architecture established in Phase 1.
- **No Heavy JS Animation Libraries:** Used pure Tailwind CSS transitions and hardware-accelerated transforms.
- **Fast Next.js Compilation:** Full production build compiled in 1.89 seconds across 80 routes.

---

## 11. Image Optimization

- Hero images utilize Next.js `<Image>` with explicit responsive `sizes="(max-width: 768px) 100vw, 480px"`, `priority={true}` for above-the-fold hero rendering, and `mix-blend-luminosity` for contrast readability.
- Graceful architectural SVG/gradient fallback for properties without configured cover photos.

---

## 12. Responsive Testing

- **390px (iPhone 12/13/14/15):** Verified zero horizontal scroll, touch targets $\ge 48\text{px}$, bottom bar docked cleanly above safe area.
- **430px (iPhone Pro Max / Plus):** Verified optimal typography hierarchy and grid distribution.
- **768px – 1024px (Tablet):** Container cleanly centered at max-width 480px–512px with luxury backdrop.
- **1280px – 1440px (Desktop):** Centered phone-canvas concierge format.

---

## 13. Accessibility

- Semantic HTML headings (`<h1>`, `<h2>`, `<h3>`, `<h4>`).
- Touch targets $\ge 48\text{px}$ across all navigation items.
- High contrast text (`#0B1526` on `#FAF8F5`, `#E4C980` on `#0B1526`).
- ARIA labels on icon-only buttons (`aria-label="Call Front Desk Concierge"`, `aria-label="Exit Guest Session"`).

---

## 14. Regression Testing

- [x] QR code to Guest Home flow.
- [x] Guest Home $\rightarrow$ Dining navigation.
- [x] Guest Home $\rightarrow$ Orders navigation.
- [x] Guest Home $\rightarrow$ Services navigation.
- [x] Guest Home $\rightarrow$ My Stay navigation.
- [x] Guest Home $\rightarrow$ My Bill (Folio) navigation.
- [x] Guest Home $\rightarrow$ Front desk telephone dialing.
- [x] Wi-Fi password copy to clipboard.
- [x] Floating Cart appearance when cart contains items.
- [x] Exit session / sign out action.

---

## 15. Before / After Visual Summary

| Aspect | Before Phase 2 | After Phase 2 |
| :--- | :--- | :--- |
| **Theme** | Heavy dark navy/slate dashboard (`#090D1A`) | Editorial warm ivory (`#FAF8F5`) + Champagne gold |
| **Hero** | Text-heavy dark box with generic welcome | High-fashion editorial hero with time greeting & room badge |
| **Actions** | 10+ competing dark cards | 3 clean primary pillars (Food, Help, Bill) + Curated grid |
| **Bottom Bar** | Dark bar with small icons | 48px+ touch dock with glassmorphism & gold indicators |
| **Cart** | Bright orange bar | Refined Midnight Navy & Gold floating pill |
| **Tone** | Hotel operations management software | 5-Star Luxury Resort Digital Concierge |

---

## 16. Known Limitations & Recommendations for Phase 3

- **Scope Boundary Respected:** Out-of-scope customer pages (`/guest/dining`, `/guest/cart`, `/guest/orders`, `/guest/services`, etc.) remain in their Phase 1 state awaiting their dedicated phases.
- **Phase 3 Recommendation:** Apply the new luxury warm ivory and midnight accent design language to the Dining Outlet Catalog and Restaurant Menu views (`/guest/dining` and `/guest/dining/[restaurantId]`).
