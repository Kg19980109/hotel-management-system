# StayHub Component Architecture & Catalog

## 1. Application Shell & Navigation Components (Phase 3)

### `AppShell`
- Coordinates Desktop Sidebar, Mobile Drawer, Persistent Topbar, and fluid Main Content area.
- Synchronizes sidebar collapse state (`var(--sidebar-width)` vs `var(--sidebar-collapsed-width)`).
- Wraps page views inside responsive `ContentContainer`.

### `navigationConfig` (`src/config/navigation.ts`)
- Centralized data structure defining sections (`Overview`, `Operations`, `Restaurant`, `Guest Experience`, `Business`, `Intelligence`, `System`).
- Encapsulates `label`, `href`, `icon`, `badge`, `matchPaths`, and `permission` (for future RBAC).
- Exposes `isNavItemActive(item, pathname)` for robust URL hierarchy matching.

### `Sidebar` (`src/components/layout/sidebar.tsx`)
- Dark Navy enterprise sidebar.
- Collapsible from `260px` to `72px` with tooltip hovers in collapsed state.
- Integrated `PropertySelector` and collapse toggle button.

### `MobileNav` (`src/components/layout/mobile-nav.tsx`)
- Off-canvas left sliding drawer for viewports under `1024px`.
- Reuses Phase 2 drawer aesthetics, traps focus, supports `Escape` dismissal, and closes automatically upon route navigation.

### `Topbar` (`src/components/layout/topbar.tsx`)
- Header with dynamic left-offset corresponding to sidebar status.
- Integrates mobile menu button, `GlobalSearch`, `PropertySelector`, `NotificationsDropdown`, and `ProfileMenu`.

### `PropertySelector` (`src/components/layout/property-selector.tsx`)
- Multi-property switcher supporting hotel initials, name, location, and room counts.
- Provided in both `sidebar` and `topbar` layout variants.

### `GlobalSearch` (`src/components/layout/global-search.tsx`)
- Fast command-bar search leveraging Phase 2 `SearchInput`.
- Supports `⌘K` / `Ctrl+K` keyboard shortcut and instant category suggestions (Bookings, Guests, Rooms, Invoices).

### `NotificationsDropdown` (`src/components/layout/notifications-dropdown.tsx`)
- Topbar bell icon with unread count badge.
- Interactive popover displaying categorized operational alerts (Bookings, Housekeeping, Maintenance, Billing), timestamp, and "Mark all read" control.

### `ProfileMenu` (`src/components/layout/profile-menu.tsx`)
- User avatar, name ("Koushik Dey"), role ("Hotel Owner"), and property affiliation.
- Dropdown menu for My Profile, Hotel Settings, Roles & Permissions, and Sign Out.

### `Breadcrumb` & `PageHeader` (`src/components/shared/page-header.tsx`)
- `Breadcrumb`: Accessible ordered list with chevron dividers, home icon, and active item indicators.
- `PageHeader`: Standardized header supporting title, description, breadcrumbs, primary CTAs, and secondary actions.

### `ContentContainer` (`src/components/shared/content-container.tsx`)
- Container enforcing max widths: `default` (1400px), `wide` (100%), or `narrow` (768px).

### `PlaceholderPage` (`src/components/shared/placeholder-page.tsx`)
- Visual placeholder for unbuilt modules with phase roadmap badge and clean empty-state aesthetics.

---

## 2. Preserved Phase 2 Foundation Components

### Core UI
- `Button` — Primary, Secondary, Outline, Ghost, Destructive, Success, Link
- `Badge` & `StatusBadge` — Status pills with semantic color mapping
- `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`
- `Input`, `SearchInput`, `Textarea`, `Label`, `FormGroup`, `Select`
- `Avatar`, `AvatarGroup` — Initials fallback with deterministic background colors
- `Tabs` — Underline and pill variants with active states
- `Modal`, `Drawer`, `ConfirmationDialog` — Accessible dialogs with Escape & scroll lock
- `Toast`, `ToastProvider`, `useToast` — Floating toast notification system
- `EmptyState`, `LoadingState`, `Skeleton`, `ErrorState`
- `DataTable`, `Pagination` — Sortable tabular data layout

### Hotel Specific
- `KPIWidget` — Metric display with trend badges and color themes
- `RoomCard` — Standard and compact room status cards
- `BookingCard` — Guest reservation card with status badges and stay details
- `GuestCard` — Guest profile card with contact and VIP tagging