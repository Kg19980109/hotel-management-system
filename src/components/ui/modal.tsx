"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "./button";

// ============================================================
// MODAL
// ============================================================

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl" | "full";
  className?: string;
  hideCloseButton?: boolean;
}

const modalSizes = {
  sm: "max-w-sm",
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
  full: "max-w-[95vw]",
};

const Modal = ({ open, onClose, title, description, children, size = "md", className, hideCloseButton }: ModalProps) => {
  // Close on escape key
  React.useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  // Prevent body scroll
  React.useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? "modal-title" : undefined}
    >
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden="true"
      />
      {/* Content */}
      <div
        className={cn(
          "relative w-full rounded-[var(--radius-xl)] bg-white shadow-[var(--shadow-xl)]",
          "flex flex-col max-h-[90vh]",
          "animate-in fade-in zoom-in-95 duration-200",
          modalSizes[size],
          className
        )}
      >
        {(title || !hideCloseButton) && (
          <div className="flex items-start justify-between px-6 py-4 border-b border-[var(--border)] shrink-0">
            <div>
              {title && (
                <h2 id="modal-title" className="text-[16px] font-semibold text-[var(--foreground)]">
                  {title}
                </h2>
              )}
              {description && (
                <p className="text-[13px] text-[var(--foreground-muted)] mt-0.5">{description}</p>
              )}
            </div>
            {!hideCloseButton && (
              <button
                onClick={onClose}
                aria-label="Close modal"
                className="ml-4 shrink-0 rounded-[var(--radius-sm)] p-1 text-[var(--foreground-muted)] hover:bg-[var(--secondary)] hover:text-[var(--foreground)] transition-colors"
              >
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        )}
        <div className="overflow-y-auto flex-1 px-6 py-5">{children}</div>
      </div>
    </div>
  );
};

// ============================================================
// DRAWER (Side panel)
// ============================================================

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  side?: "left" | "right";
  size?: "sm" | "md" | "lg";
  footer?: React.ReactNode;
}

const drawerWidths = {
  sm: "w-80",
  md: "w-96",
  lg: "w-[480px]",
};

const Drawer = ({ open, onClose, title, description, children, side = "right", size = "md", footer }: DrawerProps) => {
  React.useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  React.useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex" role="dialog" aria-modal="true">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden="true"
      />
      {/* Drawer panel */}
      <div
        className={cn(
          "relative bg-white shadow-[var(--shadow-xl)] flex flex-col h-full max-h-screen",
          drawerWidths[size],
          side === "right" ? "ml-auto" : "mr-auto"
        )}
      >
        {title && (
          <div className="flex items-start justify-between px-6 py-4 border-b border-[var(--border)] shrink-0">
            <div>
              <h2 className="text-[16px] font-semibold text-[var(--foreground)]">{title}</h2>
              {description && (
                <p className="text-[13px] text-[var(--foreground-muted)] mt-0.5">{description}</p>
              )}
            </div>
            <button
              onClick={onClose}
              aria-label="Close drawer"
              className="ml-4 shrink-0 rounded-[var(--radius-sm)] p-1 text-[var(--foreground-muted)] hover:bg-[var(--secondary)] transition-colors"
            >
              <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {footer && (
          <div className="shrink-0 px-6 py-4 border-t border-[var(--border)]">{footer}</div>
        )}
      </div>
    </div>
  );
};

// ============================================================
// CONFIRMATION DIALOG
// ============================================================

interface ConfirmationDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "primary";
  loading?: boolean;
}

const ConfirmationDialog = ({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "danger",
  loading,
}: ConfirmationDialogProps) => (
  <Modal open={open} onClose={onClose} title={title} description={description} size="sm">
    <div className="flex gap-3 justify-end pt-2">
      <Button variant="outline" size="sm" onClick={onClose} disabled={loading}>
        {cancelLabel}
      </Button>
      <Button
        variant={variant === "danger" ? "destructive" : "primary"}
        size="sm"
        onClick={onConfirm}
        loading={loading}
      >
        {confirmLabel}
      </Button>
    </div>
  </Modal>
);

export { Modal, Drawer, ConfirmationDialog };
