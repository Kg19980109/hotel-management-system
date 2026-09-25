# StayHub Layout Rules & Shell Architecture

## 1. Application Shell Structure

The StayHub application shell provides a persistent frame for all hotel operations views:

```
AppShell
 ├── Sidebar (Desktop >= 1024px, fixed left, collapsible)
 ├── MobileNav (Mobile < 1024px, off-canvas Drawer)
 ├── Topbar (Fixed top, dynamic left offset, responsive)
 └── Main Content Area (Fluid width, max-w constrained, scrollable)
      └── ContentContainer (default | wide | narrow)
           └── Page Content
```

## 2. Desktop Sidebar
- **Background**: Dark Navy (`#0F172A`, `--sidebar-bg`)
- **Expanded Width**: `260px` (`--sidebar-width`)
- **Collapsed Width**: `72px` (`--sidebar-collapsed-width`)
- **Transition**: `300ms ease-in-out` on width and main content margin-left
- **Active Navigation Indicator**:
  - Full-width background highlight (`#1E293B`, `--sidebar-item-active-bg`)
  - Left accent border bar (4px width, `#4F46E5`, `--primary`)
  - White text with font-semibold weight
- **Collapsed Mode Tooltips**:
  - Hovering collapsed icon displays dark tooltip popover with label and badge counter
  - Tooltips are placed `left-full ml-3` with high z-index and zero pointer interference
- **Property Selector**:
  - Embedded in bottom drawer area of sidebar
  - Supports quick hotel switching with initials badge, location, and room count

## 3. Mobile Navigation
- **Breakpoint**: Viewports below `1024px` (`lg` breakpoint)
- **Trigger**: Hamburger button `[☰]` in topbar
- **Drawer**: Slid from left edge (`side="left"`), full-height, width `280px` (`max-w-[85vw]`)
- **Backdrop**: Semi-transparent dark overlay with `backdrop-blur-xs`
- **Behaviors**:
  - Automatically closes upon route navigation
  - Closes upon `Escape` key press
  - Closes upon clicking outside backdrop
  - Traps focus and locks body scrolling (`overflow: hidden`)

## 4. Topbar
- **Height**: `64px` (`--topbar-height`)
- **Background**: Semi-transparent white (`rgba(255, 255, 255, 0.95)` with backdrop blur)
- **Positioning**: Fixed top with dynamic `left` offset:
  - Mobile (< 1024px): `left: 0px`
  - Desktop Expanded: `left: 260px`
  - Desktop Collapsed: `left: 72px`
- **Components**:
  - Left: Hamburger toggle (mobile) + Property selector (mobile/tablet)
  - Center: GlobalSearch input with `⌘K` keyboard shortcut and quick results popover
  - Right: Desktop PropertySelector, NotificationsDropdown with unread badge, and ProfileMenu

## 5. Content Container
- **Default (`max-w-[1400px]`)**: Standard width for dashboards, KPI grids, forms, and cards
- **Wide (`max-w-full`)**: Full viewport width for Gantt charts, tape-chart booking calendars, and wide data tables
- **Narrow (`max-w-3xl`)**: Focused width for single-column settings, checkout wizards, and confirmation dialogs
- **Padding**:
  - Mobile: `16px` (`p-4`)
  - Tablet: `24px` (`p-6`)
  - Desktop: `32px` (`p-8`)

## 6. Accessibility & Keyboard Control
- All interactive controls have visible focus rings (`focus-visible:ring-2 focus-visible:ring-[var(--primary)]`)
- Navigation links declare `aria-current="page"` when active
- Modals, drawers, and popovers listen to `Escape` key to close
- Landmarks declared: `<aside aria-label="Main navigation">`, `<header>`, `<main>`, `<nav aria-label="Breadcrumb">`