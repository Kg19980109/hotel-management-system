# StayHub Design System

_Last updated: Phase 2_

## Overview
The StayHub design system is built on **Next.js 16** (App Router), **TypeScript**, and **Tailwind CSS v4**. It uses **CSS custom properties** (variables) as the single source of truth for all visual tokens.

## Technology Stack
- **Framework**: Next.js 16.3.6 (App Router)
- **Language**: TypeScript (strict)
- **Styling**: Tailwind CSS v4 + CSS Variables (design tokens)
- **Icons**: Lucide Icons
- **Component utilities**: `class-variance-authority`, `clsx`, `tailwind-merge`

## Design Tokens (CSS Variables)

| Token                        | Purpose                         | Value        |
|------------------------------|---------------------------------|--------------|
| `--primary`                  | Primary indigo action color     | `#4f46e5`    |
| `--sidebar-bg`               | Sidebar background              | `#0f172a`    |
| `--background`               | App background                  | `#f0f2f8`    |
| `--card`                     | Card background                 | `#ffffff`    |
| `--success`                  | Success / Available             | `#16a34a`    |
| `--warning`                  | Warning / Cleaning              | `#d97706`    |
| `--danger`                   | Danger / Occupied               | `#dc2626`    |
| `--accent`                   | Warm gold accent                | `#f59e0b`    |
| `--radius-lg`                | Standard card radius            | `12px`       |
| `--shadow-sm`                | Default card shadow             | Soft diffuse |

## Typography
- **Font**: Inter (Google Fonts)
- **Scale**: Display (36px) → Page Heading (28px) → Section (18px) → Card (15px) → Body (14px) → Small (12px)
- **KPI Numbers**: 32px, tabular-nums, weight 700

## Components Created

### UI Primitives
- `Button` — 7 variants, 7 sizes, loading, icon, full-width
- `Badge` / `StatusBadge` — 20+ semantic variants
- `Card` / `CardHeader` / `CardContent` / `CardFooter`
- `Input` / `Textarea` / `Label` / `FormGroup` / `SearchInput` / `Select`
- `Avatar` / `AvatarGroup` — initials fallback, status indicators
- `Tabs` — underline + pill variants
- `Modal` / `Drawer` / `ConfirmationDialog`
- `Toast` — success/error/warning/info with context provider
- `EmptyState` / `LoadingState` / `Skeleton` / `ErrorState`
- `DataTable` with sorting, selection, pagination
- `Pagination`

### Hotel-Specific
- `KPIWidget` — metric card with trend, icon, color
- `RoomCard` — full + compact variants
- `GuestCard` — VIP badge, booking status
- `BookingCard` — full booking summary

### Layout
- `Sidebar` — collapsible, deep navy, active states
- `Topbar` — search, notifications, user menu
- `AppShell` — sidebar + topbar + main content