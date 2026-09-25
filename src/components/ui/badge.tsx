import * as React from "react";
import { cn } from "@/lib/utils";
import type { BadgeVariant } from "@/types";

const badgeConfig: Record<BadgeVariant, { bg: string; text: string; dot: string }> = {
  available: {
    bg: "bg-[var(--success-light)]",
    text: "text-[var(--success-foreground)]",
    dot: "bg-[var(--success)]",
  },
  occupied: {
    bg: "bg-[var(--danger-light)]",
    text: "text-[var(--danger-foreground)]",
    dot: "bg-[var(--danger)]",
  },
  cleaning: {
    bg: "bg-[var(--warning-light)]",
    text: "text-[var(--warning-foreground)]",
    dot: "bg-[var(--warning)]",
  },
  maintenance: {
    bg: "bg-slate-100",
    text: "text-slate-600",
    dot: "bg-slate-400",
  },
  blocked: {
    bg: "bg-[var(--purple-light)]",
    text: "text-[var(--purple-foreground)]",
    dot: "bg-[var(--purple)]",
  },
  reserved: {
    bg: "bg-[var(--info-light)]",
    text: "text-[var(--info-foreground)]",
    dot: "bg-[var(--info)]",
  },
  confirmed: {
    bg: "bg-[var(--success-light)]",
    text: "text-[var(--success-foreground)]",
    dot: "bg-[var(--success)]",
  },
  pending: {
    bg: "bg-[var(--warning-light)]",
    text: "text-[var(--warning-foreground)]",
    dot: "bg-[var(--warning)]",
  },
  cancelled: {
    bg: "bg-[var(--danger-light)]",
    text: "text-[var(--danger-foreground)]",
    dot: "bg-[var(--danger)]",
  },
  checked_in: {
    bg: "bg-[var(--primary-light)]",
    text: "text-[var(--primary-active)]",
    dot: "bg-[var(--primary)]",
  },
  checked_out: {
    bg: "bg-slate-100",
    text: "text-slate-600",
    dot: "bg-slate-400",
  },
  paid: {
    bg: "bg-[var(--success-light)]",
    text: "text-[var(--success-foreground)]",
    dot: "bg-[var(--success)]",
  },
  partial: {
    bg: "bg-[var(--warning-light)]",
    text: "text-[var(--warning-foreground)]",
    dot: "bg-[var(--warning)]",
  },
  refunded: {
    bg: "bg-[var(--info-light)]",
    text: "text-[var(--info-foreground)]",
    dot: "bg-[var(--info)]",
  },
  success: {
    bg: "bg-[var(--success-light)]",
    text: "text-[var(--success-foreground)]",
    dot: "bg-[var(--success)]",
  },
  warning: {
    bg: "bg-[var(--warning-light)]",
    text: "text-[var(--warning-foreground)]",
    dot: "bg-[var(--warning)]",
  },
  danger: {
    bg: "bg-[var(--danger-light)]",
    text: "text-[var(--danger-foreground)]",
    dot: "bg-[var(--danger)]",
  },
  info: {
    bg: "bg-[var(--info-light)]",
    text: "text-[var(--info-foreground)]",
    dot: "bg-[var(--info)]",
  },
  default: {
    bg: "bg-slate-100",
    text: "text-slate-600",
    dot: "bg-slate-400",
  },
  due_out: {
    bg: "bg-orange-100",
    text: "text-orange-700",
    dot: "bg-orange-500",
  },
  no_show: {
    bg: "bg-slate-100",
    text: "text-slate-500",
    dot: "bg-slate-300",
  },
};

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  showDot?: boolean;
  size?: "sm" | "md";
}

const BADGE_LABELS: Partial<Record<BadgeVariant, string>> = {
  available: "Available",
  occupied: "Occupied",
  cleaning: "Cleaning",
  maintenance: "Maintenance",
  blocked: "Blocked",
  reserved: "Reserved",
  confirmed: "Confirmed",
  pending: "Pending",
  cancelled: "Cancelled",
  checked_in: "Checked In",
  checked_out: "Checked Out",
  paid: "Paid",
  partial: "Partial",
  refunded: "Refunded",
  due_out: "Due Out",
  no_show: "No Show",
};

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = "default", showDot = true, size = "md", children, ...props }, ref) => {
    const config = badgeConfig[variant];
    return (
      <span
        ref={ref}
        className={cn(
          "inline-flex items-center gap-1.5 font-medium rounded-[var(--radius-full)]",
          size === "sm" ? "text-[11px] px-2 py-0.5" : "text-[12px] px-2.5 py-1",
          config.bg,
          config.text,
          className
        )}
        {...props}
      >
        {showDot && (
          <span className={cn("shrink-0 rounded-full", size === "sm" ? "h-1.5 w-1.5" : "h-2 w-2", config.dot)} />
        )}
        {children ?? BADGE_LABELS[variant] ?? variant}
      </span>
    );
  }
);
Badge.displayName = "Badge";

// StatusBadge: convenience wrapper
const StatusBadge = ({ status, ...props }: { status: BadgeVariant } & Omit<BadgeProps, "variant">) => (
  <Badge variant={status} {...props} />
);

export { Badge, StatusBadge, badgeConfig };
export type { BadgeVariant, BadgeProps };
