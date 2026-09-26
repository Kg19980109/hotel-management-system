import * as React from "react";
import { cn } from "@/lib/utils";

// --- Card Root ---
const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    hoverable?: boolean;
    flat?: boolean;
  }
>(({ className, hoverable = false, flat = false, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      flat ? "stayhub-card-flat" : hoverable ? "stayhub-card-hover" : "stayhub-card",
      className
    )}
    {...props}
  />
));
Card.displayName = "Card";

// --- Card Header ---
const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col gap-1 px-5 pt-5 pb-0", className)}
    {...props}
  />
));
CardHeader.displayName = "CardHeader";

// --- Card Title ---
const CardTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      "text-[14.5px] font-semibold leading-tight text-[var(--card-foreground)] tracking-tight",
      className
    )}
    {...props}
  />
));
CardTitle.displayName = "CardTitle";

// --- Card Description ---
const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-[12.5px] text-[var(--foreground-muted)] leading-relaxed", className)}
    {...props}
  />
));
CardDescription.displayName = "CardDescription";

// --- Card Content ---
const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("px-5 py-4", className)} {...props} />
));
CardContent.displayName = "CardContent";

// --- Card Footer ---
const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "flex items-center px-5 pb-4 pt-3 border-t border-[var(--border)] mt-1",
      className
    )}
    {...props}
  />
));
CardFooter.displayName = "CardFooter";

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter };
