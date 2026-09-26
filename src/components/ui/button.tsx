import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-1.5 font-medium select-none",
    "transition-all duration-[var(--transition-fast)]",
    "disabled:pointer-events-none disabled:opacity-50",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2",
    "whitespace-nowrap text-sm rounded-[var(--radius-md)]",
  ],
  {
    variants: {
      variant: {
        // Deep indigo primary — main CTAs
        primary: [
          "bg-[var(--primary)] text-white shadow-[var(--shadow-xs)]",
          "hover:bg-[var(--primary-hover)] active:bg-[var(--primary-active)]",
          "hover:shadow-[var(--shadow-sm)]",
        ],
        // White with subtle border — secondary actions
        secondary: [
          "bg-white text-[var(--secondary-foreground)] border border-[var(--border)]",
          "hover:bg-[var(--surface-hover)] hover:border-[var(--border-strong)]",
          "shadow-[var(--shadow-xs)]",
        ],
        // Border only
        outline: [
          "border border-[var(--border)] bg-transparent text-[var(--foreground)]",
          "hover:bg-[var(--secondary)] hover:border-[var(--border-strong)]",
        ],
        // No background
        ghost: [
          "text-[var(--foreground-muted)] bg-transparent",
          "hover:bg-[var(--secondary)] hover:text-[var(--foreground)]",
        ],
        // Destructive / danger
        destructive: [
          "bg-[var(--danger)] text-white shadow-[var(--shadow-xs)]",
          "hover:opacity-90 active:opacity-100",
        ],
        // Success
        success: [
          "bg-[var(--success)] text-white shadow-[var(--shadow-xs)]",
          "hover:opacity-90",
        ],
        // Gold / premium accent
        premium: [
          "bg-gradient-to-r from-[var(--brand-gold)] to-[var(--brand-champagne)] text-[var(--brand-midnight)]",
          "shadow-[var(--shadow-xs)] hover:opacity-90 font-semibold",
        ],
        // Plain link
        link: [
          "text-[var(--primary)] underline-offset-4 hover:underline",
          "h-auto p-0 shadow-none",
        ],
      },
      size: {
        xs:       "h-7  px-2.5 text-xs  rounded-[var(--radius-sm)]",
        sm:       "h-8  px-3   text-sm",
        md:       "h-9  px-4   text-sm",
        lg:       "h-10 px-5   text-sm  font-semibold",
        xl:       "h-11 px-6   text-base font-semibold",
        icon:     "h-9  w-9   p-0",
        "icon-sm":"h-8  w-8   p-0",
        "icon-lg":"h-10 w-10  p-0",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      loading,
      leftIcon,
      rightIcon,
      fullWidth,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          buttonVariants({ variant, size }),
          fullWidth && "w-full",
          className
        )}
        {...props}
      >
        {loading ? (
          <svg
            className="h-4 w-4 animate-spin shrink-0"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        ) : leftIcon ? (
          <span className="shrink-0">{leftIcon}</span>
        ) : null}
        {children}
        {!loading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = "Button";

export { Button, buttonVariants };
