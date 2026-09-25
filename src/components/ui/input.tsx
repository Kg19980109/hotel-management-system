import * as React from "react";
import { cn } from "@/lib/utils";

// --- Base Input ---
const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & {
    error?: boolean;
    leftElement?: React.ReactNode;
    rightElement?: React.ReactNode;
  }
>(({ className, type = "text", error, leftElement, rightElement, ...props }, ref) => {
  if (leftElement || rightElement) {
    return (
      <div className="relative flex items-center">
        {leftElement && (
          <span className="absolute left-3 flex items-center text-[var(--foreground-subtle)] pointer-events-none z-10">
            {leftElement}
          </span>
        )}
        <input
          type={type}
          ref={ref}
          className={cn(
            "stayhub-input-base h-9",
            leftElement && "pl-9",
            rightElement && "pr-9",
            error && "border-[var(--danger)] focus:ring-red-100",
            className
          )}
          {...props}
        />
        {rightElement && (
          <span className="absolute right-3 flex items-center text-[var(--foreground-subtle)]">
            {rightElement}
          </span>
        )}
      </div>
    );
  }

  return (
    <input
      type={type}
      ref={ref}
      className={cn(
        "stayhub-input-base h-9",
        error && "border-[var(--danger)] focus:ring-red-100",
        className
      )}
      {...props}
    />
  );
});
Input.displayName = "Input";

// --- Textarea ---
const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement> & { error?: boolean }
>(({ className, error, ...props }, ref) => (
  <textarea
    ref={ref}
    rows={4}
    className={cn(
      "stayhub-input-base resize-none py-2.5 min-h-[80px]",
      error && "border-[var(--danger)]",
      className
    )}
    {...props}
  />
));
Textarea.displayName = "Textarea";

// --- Label ---
const Label = React.forwardRef<
  HTMLLabelElement,
  React.LabelHTMLAttributes<HTMLLabelElement> & { required?: boolean }
>(({ className, required, children, ...props }, ref) => (
  <label
    ref={ref}
    className={cn("block text-[13px] font-medium text-[var(--foreground)] mb-1.5", className)}
    {...props}
  >
    {children}
    {required && <span className="text-[var(--danger)] ml-0.5">*</span>}
  </label>
));
Label.displayName = "Label";

// --- Form Group (Label + Input) ---
const FormGroup = ({
  label,
  required,
  error,
  hint,
  children,
  className,
}: {
  label?: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) => (
  <div className={cn("flex flex-col gap-0", className)}>
    {label && <Label required={required}>{label}</Label>}
    {children}
    {hint && !error && (
      <p className="text-[12px] text-[var(--foreground-muted)] mt-1">{hint}</p>
    )}
    {error && (
      <p className="text-[12px] text-[var(--danger)] mt-1">{error}</p>
    )}
  </div>
);

// --- Search Input ---
const SearchInput = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, placeholder = "Search...", ...props }, ref) => {
  return (
    <div className="relative flex items-center">
      <span className="absolute left-3 pointer-events-none text-[var(--foreground-subtle)]">
        <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
      </span>
      <input
        ref={ref}
        type="search"
        placeholder={placeholder}
        className={cn(
          "stayhub-input-base h-9 pl-9 bg-[var(--secondary)]",
          "border-transparent focus:bg-white focus:border-[var(--primary)]",
          className
        )}
        {...props}
      />
    </div>
  );
});
SearchInput.displayName = "SearchInput";

// --- Select ---
const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement> & { error?: boolean }
>(({ className, error, children, ...props }, ref) => (
  <div className="relative">
    <select
      ref={ref}
      className={cn(
        "stayhub-input-base h-9 appearance-none pr-8",
        error && "border-[var(--danger)]",
        className
      )}
      {...props}
    >
      {children}
    </select>
    <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--foreground-muted)]">
      <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <polyline points="6 9 12 15 18 9" />
      </svg>
    </span>
  </div>
));
Select.displayName = "Select";

export { Input, Textarea, Label, FormGroup, SearchInput, Select };
