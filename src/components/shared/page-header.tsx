import * as React from "react";
import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";
import { cn } from "@/lib/utils";

// ============================================================
// BREADCRUMB SYSTEM
// ============================================================

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
  showHome?: boolean;
}

/**
 * Breadcrumb navigation.
 * When showHome is true, prepends a Home link.
 * The last item is always non-clickable (current page).
 *
 * Usage:
 * <Breadcrumb items={[{ label: "Bookings", href: "/bookings" }, { label: "New Booking" }]} />
 */
export function Breadcrumb({ items, className, showHome = false }: BreadcrumbProps) {
  const allItems: BreadcrumbItem[] = showHome
    ? [{ label: "Home", href: "/dashboard" }, ...items]
    : items;

  return (
    <nav
      aria-label="Breadcrumb"
      className={cn("flex items-center flex-wrap", className)}
    >
      <ol className="flex items-center gap-0.5 flex-wrap">
        {allItems.map((item, idx) => {
          const isLast = idx === allItems.length - 1;
          return (
            <li key={idx} className="flex items-center gap-0.5">
              {idx > 0 && (
                <ChevronRight
                  className="text-[var(--foreground-subtle)] shrink-0"
                  style={{ width: 13, height: 13 }}
                  aria-hidden="true"
                />
              )}
              {idx === 0 && showHome && (
                <Home
                  className="mr-0.5 text-[var(--foreground-subtle)]"
                  style={{ width: 13, height: 13 }}
                  aria-hidden="true"
                />
              )}
              {isLast || !item.href ? (
                <span
                  className="text-[12px] font-medium text-[var(--foreground)] truncate"
                  aria-current="page"
                >
                  {item.label}
                </span>
              ) : (
                <Link
                  href={item.href}
                  className="text-[12px] font-medium text-[var(--foreground-muted)] hover:text-[var(--primary)] transition-colors truncate"
                >
                  {item.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

// ============================================================
// PAGE HEADER
// ============================================================

interface PageHeaderProps {
  title: string;
  description?: string;
  breadcrumbs?: BreadcrumbItem[];
  /** Primary CTA button(s) */
  actions?: React.ReactNode;
  /** Secondary actions, rendered to the left of primary actions */
  secondaryActions?: React.ReactNode;
  className?: string;
}

/**
 * Reusable page header used across all StayHub pages.
 *
 * Layout:
 * ┌─ breadcrumbs ─────────────────────────────────────────────┐
 * │  title                   [secondary actions] [primary CTA] │
 * │  description                                               │
 * └────────────────────────────────────────────────────────────┘
 */
export function PageHeader({
  title,
  description,
  breadcrumbs,
  actions,
  secondaryActions,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn("mb-6", className)}>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <Breadcrumb items={breadcrumbs} className="mb-2" />
      )}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-slate-900 leading-tight tracking-tight truncate">
            {title}
          </h1>
          {description && (
            <p className="text-[13.5px] text-slate-500 mt-1 leading-relaxed">
              {description}
            </p>
          )}
        </div>
        {(actions || secondaryActions) && (
          <div className="flex items-center gap-2 shrink-0 pt-0.5">
            {secondaryActions}
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
