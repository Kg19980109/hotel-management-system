import * as React from "react";
import { Construction } from "lucide-react";
import { PageHeader } from "./page-header";
import type { BreadcrumbItem } from "./page-header";

// ============================================================
// PLACEHOLDER PAGE
// Used for routes not yet implemented.
// Verifies routing, layout, active nav, and breadcrumbs.
// ============================================================

interface PlaceholderPageProps {
  title: string;
  description?: string;
  breadcrumbs?: BreadcrumbItem[];
  phase?: string;
}

export function PlaceholderPage({
  title,
  description = "This module will be available in a future phase.",
  breadcrumbs,
  phase,
}: PlaceholderPageProps) {
  return (
    <div>
      <PageHeader
        title={title}
        description={description}
        breadcrumbs={breadcrumbs}
      />
      <div className="mt-8 flex flex-col items-center justify-center py-20 rounded-[var(--radius-xl)] border border-dashed border-[var(--border)] bg-[var(--card)]">
        <div className="h-16 w-16 rounded-full bg-[var(--secondary)] flex items-center justify-center mb-5">
          <Construction
            className="text-[var(--foreground-subtle)]"
            style={{ width: 28, height: 28 }}
          />
        </div>
        <h2 className="text-[16px] font-semibold text-[var(--foreground)]">
          Coming in a future phase
        </h2>
        <p className="text-[13px] text-[var(--foreground-muted)] mt-1.5 text-center max-w-xs leading-relaxed">
          {description}
        </p>
        {phase && (
          <span className="mt-4 text-[11px] font-semibold tracking-widest uppercase text-[var(--primary)] bg-[var(--primary-light)] px-3 py-1 rounded-full">
            {phase}
          </span>
        )}
      </div>
    </div>
  );
}
