# STAYHUB CUSTOMER APP — PHASE 3 REPORT
## Luxury Dining Discovery + Restaurant + Menu Experience

**Date:** September 29, 2026  
**Status:** COMPLETE  
**Target Visual Direction:** 5-Star Hotel Dining + Editorial Culinary Magazine + Mobile App  
**Scope:** `/guest/dining`, `/guest/dining/[restaurantId]`, `DiningDirectoryView`, `DiningMenuView`

---

## 1. Executive Summary

Phase 3 transforms the STAYHUB customer dining experience into a 5-star resort culinary destination.

The customer app now presents:
- An editorial luxury dining directory featuring high-impact photography of restaurant dining rooms and culinary ambiance.
- Instant client-side search and cuisine filtering across all dining outlets.
- A photography-first restaurant menu view with fast category navigation tabs, high-resolution optimized food cards, live availability/sold-out states, and immediate quantity add/decrement steppers.
- Full integration with the Phase 2 GuestShell, Phase 2 floating cart, and existing CartContext.

All backend business logic, cart persistence, restaurant safeguards, pricing accuracy, and room delivery routing have been preserved with 100% fidelity.

---

## 2. Dining Directory Changes (`/guest/dining`)

- **Editorial Hero Banner:** Deep midnight navy backdrop (`#0B1526`) with subtle gold radiant accents, introducing hotel dining specialties and delivering room number context.
- **Top Quick Navigation:** Fast back link to Home (`/guest/home`) and quick access to My Orders (`/guest/orders`).
- **Interactive Search Bar:** Real-time search across restaurant names, cuisines, and descriptions with zero server lag.
- **Dynamic Cuisine Filters:** Horizontal filter pills automatically derived from active restaurants (e.g. All, Fine Dining, Grill, Italian, Pan-Asian).
- **Image-Led Restaurant Cards:**
  - High-resolution ambiance photography with subtle gradient overlay.
  - Cuisine pill and live kitchen status indicator (`Kitchen Active` with pulsating emerald dot).
  - Restaurant name in luxury serif (`font-serif`), description, and service hours.
  - High-contrast "Explore Menu →" CTA button.
- **Unverified Stay Alert:** Non-intrusive ivory card reminding public guests to scan their room QR for in-room dispatch.
- **Curated Empty State:** Elegant fallback for empty search results or properties with no active outlets.

---

## 3. Restaurant Page Changes (`/guest/dining/[restaurantId]`)

- **Cover Ambiance Header:** Immersive photographic backdrop with soft gradient overlay.
- **Top Breadcrumbs:** Seamless navigation back to `/guest/dining` ("← All Dining") and room delivery context ("Room 302 · Room Service").
- **Operating Hours & Status:** Clear display of active kitchen state and service timings (`07:00 – 23:00`).

---

## 4. Menu Changes

- **Horizontal Category Tabs:** Smooth horizontal scrolling category bar with clear high-contrast active state (`bg-[#0B1526] text-[#E4C980] border-[#D4AF37]/35`).
- **Real-Time Menu Search:** Filters dishes by name and description across all categories instantly without page reloads.
- **Category Grouping:** Organized sections with item counts and category descriptions.

---

## 5. Food Card Changes

- **Photography-First Layout:**
  - Square food thumbnail (`w-28 sm:w-32`) with lazy loading and async decoding.
  - Interactive hover zoom effect (`group-hover:scale-105`).
  - Clicking food image or title triggers the Food Detail modal.
- **Typography & Scannability:**
  - Dish name in high-contrast slate-900.
  - Description constrained to 2 lines for fast mobile scanning.
  - Price in clear font-mono format (`₹[price]`).
- **Direct Add & Stepper Control:**
  - `qty === 0`: Refined `+ Add` button with champagne gold accent.
  - `qty > 0`: In-card stepper with `–`, current quantity, and `+` buttons.
- **Sold Out State:** Muted overlay with red "SOLD OUT" badge and disabled button.

---

## 6. Image Optimization

- Cached culinary catalog matching dish keywords to curated food photography.
- Lightweight image parameters (`auto=format&fit=crop&w=600&q=80`) for rapid mobile delivery.
- `loading="lazy"` on below-the-fold food cards to prevent bandwidth spikes.

---

## 7. Search & Filtering

- 100% client-side instant search across dishes and restaurant directories.
- Zero extra server roundtrips or database calls on keystroke.

---

## 8. Category Navigation

- Instant local filtering without full-page re-renders.
- Smooth horizontal swipe on mobile viewports ($\le 390\text{px}$).

---

## 9. Availability / Sold Out

- Strictly reflects authoritative `item.is_available` database state.
- Disables interaction and displays high-visibility "Sold Out" tag.

---

## 10. Cart Integration

- Fully connected to `useCart()` and `CartContext`.
- Real-time updates reflect in the Phase 2 floating cart pill above the bottom navigation dock.
- Non-blocking deferred localStorage persistence preserved from Phase 1.

---

## 11. Food Detail Integration

- Preserved modal workflow opening on item tap.
- Supports special instructions input and multi-item quantity stepper.
- Ready for full redesign in Phase 4.

---

## 12. Performance

- **Turbopack Build Time:** 2.6 seconds across 80 routes.
- **Interaction Latency:** Instant response on tab switches, search typing, and quantity adjustments.
- **Zero Full-Page Refreshes:** No `router.refresh()` loops or blocking server requests.

---

## 13. Responsive Testing

- **390px (iPhone 12/13/14/15):** Vertical card stacking, clear typography, $48\text{px}$ touch targets, smooth scrolling.
- **430px (iPhone Plus / Pro Max):** Ideal visual breathing room and high-impact hero images.
- **768px (Tablet):** Balanced layout with centered container.
- **1024px – 1440px (Desktop):** Centered mobile concierge canvas with high-res photography.

---

## 14. Accessibility

- Semantic headings (`<h1>` to `<h4>`).
- Accessible touch targets on all add/minus/search buttons.
- Explicit `aria-label` attributes on icon-only and quantity controls.
- High contrast text (`#0B1526` on `#FAF8F5`, `#E4C980` on `#0B1526`).

---

## 15. Existing Functionality Preserved

- `getGuestRestaurants` and `getGuestRestaurantMenu` queries.
- `stayhub_guest_cart` context and single-restaurant order safeguards.
- In-room session room delivery context.
- Quantity calculation and currency formatting.
- Unverified session QR prompt.

---

## 16. Files Modified / Created

### Modified:
- `src/app/guest/dining/page.tsx`
- `src/components/guest/dining-menu-view.tsx`

### Created:
- `src/components/guest/dining-directory-view.tsx`
- `docs/customer-app/phase-3-dining-menu-report.md`

---

## 17. Test Results

- **TypeScript:** PASS (Zero compiler errors)
- **ESLint:** PASS (Guest components clean)
- **Test Runner:** NOT CONFIGURED
- **Next.js Build:** PASS (`next build` compiled all 80 routes)

---

## 18. Known Limitations & Recommendations for Phase 4

- **Out-of-Scope Pages Preserved:** Cart (`/guest/cart`), Food Detail deep customization, Orders (`/guest/orders`), and Services (`/guest/services`) remain untouched as specified.
- **Phase 4 Recommendation:** Redesign the Food Detail Modal, Cart View (`/guest/cart`), Order Summary, and Checkout confirmation into the luxury visual design system.
