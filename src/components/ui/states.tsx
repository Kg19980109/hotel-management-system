import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "./button";

// --- Empty State ---
interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
  className?: string;
  size?: "sm" | "md" | "lg";
}

const EmptyState = ({ icon, title, description, action, className, size = "md" }: EmptyStateProps) => (
  <div
    className={cn(
      "flex flex-col items-center justify-center text-center",
      size === "sm" ? "py-8 px-4" : size === "lg" ? "py-20 px-8" : "py-14 px-6",
      className
    )}
  >
    {icon ? (
      <div className="mb-4 text-[var(--foreground-subtle)]">{icon}</div>
    ) : (
      <div className="mb-4 h-14 w-14 rounded-2xl bg-[var(--secondary)] flex items-center justify-center text-[var(--foreground-subtle)]">
        <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 8v4m0 4h.01" />
        </svg>
      </div>
    )}
    <h3 className={cn("font-semibold text-[var(--foreground)]", size === "sm" ? "text-[13.5px]" : "text-[15px]")}>
      {title}
    </h3>
    {description && (
      <p className="text-[12.5px] text-[var(--foreground-muted)] mt-1.5 max-w-xs leading-relaxed">
        {description}
      </p>
    )}
    {action && (
      <Button variant="primary" size="sm" className="mt-5" onClick={action.onClick}>
        {action.label}
      </Button>
    )}
  </div>
);

// --- Loading State ---
interface LoadingStateProps {
  message?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}

const LoadingState = ({ message = "Loading...", className, size = "md" }: LoadingStateProps) => (
  <div
    className={cn(
      "flex flex-col items-center justify-center text-center",
      size === "sm" ? "py-6" : size === "lg" ? "py-20" : "py-14",
      className
    )}
    role="status"
    aria-live="polite"
  >
    {/* Spinner using brand indigo */}
    <div
      className={cn(
        "rounded-full border-2 border-[var(--border)] border-t-[var(--primary)]",
        "animate-spin",
        size === "sm" ? "h-6 w-6" : size === "lg" ? "h-10 w-10" : "h-8 w-8"
      )}
    />
    {message && (
      <p className="text-[12.5px] text-[var(--foreground-muted)] mt-3">{message}</p>
    )}
  </div>
);

// --- Skeleton Loader ---
const Skeleton = ({ className }: { className?: string }) => (
  <div className={cn("skeleton", className)} />
);

// --- Error State ---
interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  className?: string;
}

const ErrorState = ({
  title = "Something went wrong",
  description = "An unexpected error occurred. Please try again.",
  onRetry,
  className,
}: ErrorStateProps) => (
  <div
    className={cn("flex flex-col items-center justify-center text-center py-14 px-6", className)}
    role="alert"
  >
    <div className="mb-4 h-14 w-14 rounded-2xl bg-[var(--danger-light)] flex items-center justify-center text-[var(--danger)]">
      <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 8v4m0 4h.01" />
      </svg>
    </div>
    <h3 className="text-[15px] font-semibold text-[var(--foreground)]">{title}</h3>
    <p className="text-[12.5px] text-[var(--foreground-muted)] mt-1.5 max-w-xs leading-relaxed">
      {description}
    </p>
    {onRetry && (
      <Button variant="outline" size="sm" className="mt-5" onClick={onRetry}>
        Try Again
      </Button>
    )}
  </div>
);

export { EmptyState, LoadingState, Skeleton, ErrorState };
