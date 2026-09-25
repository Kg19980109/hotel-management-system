"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import type { ToastType } from "@/types";

// ============================================================
// TOAST SYSTEM
// ============================================================

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  duration?: number;
}

interface ToastContextValue {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, "id">) => void;
  removeToast: (id: string) => void;
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
  warning: (title: string, description?: string) => void;
  info: (title: string, description?: string) => void;
}

const ToastContext = React.createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([]);

  const addToast = React.useCallback((toast: Omit<Toast, "id">) => {
    const id = Math.random().toString(36).slice(2);
    const duration = toast.duration ?? 4000;
    setToasts((prev) => [...prev, { ...toast, id }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }, []);

  const removeToast = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const success = (title: string, description?: string) =>
    addToast({ type: "success", title, description });
  const error = (title: string, description?: string) =>
    addToast({ type: "error", title, description });
  const warning = (title: string, description?: string) =>
    addToast({ type: "warning", title, description });
  const info = (title: string, description?: string) =>
    addToast({ type: "info", title, description });

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, success, error, warning, info }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

const toastConfig: Record<ToastType, { icon: React.ReactNode; bar: string }> = {
  success: {
    icon: (
      <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center shrink-0">
        <svg width="16" height="16" fill="none" stroke="#16a34a" strokeWidth="2.5" viewBox="0 0 24 24">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>
    ),
    bar: "bg-[var(--success)]",
  },
  error: {
    icon: (
      <div className="h-8 w-8 rounded-full bg-red-100 flex items-center justify-center shrink-0">
        <svg width="16" height="16" fill="none" stroke="#dc2626" strokeWidth="2.5" viewBox="0 0 24 24">
          <path d="M18 6 6 18M6 6l12 12" />
        </svg>
      </div>
    ),
    bar: "bg-[var(--danger)]",
  },
  warning: {
    icon: (
      <div className="h-8 w-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
        <svg width="16" height="16" fill="none" stroke="#d97706" strokeWidth="2.5" viewBox="0 0 24 24">
          <path d="M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        </svg>
      </div>
    ),
    bar: "bg-[var(--warning)]",
  },
  info: {
    icon: (
      <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
        <svg width="16" height="16" fill="none" stroke="#2563eb" strokeWidth="2.5" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 16v-4m0-4h.01" />
        </svg>
      </div>
    ),
    bar: "bg-[var(--info)]",
  },
};

function ToastContainer({ toasts, onRemove }: { toasts: Toast[]; onRemove: (id: string) => void }) {
  return (
    <div
      className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 max-w-sm w-full pointer-events-none"
      role="region"
      aria-live="polite"
      aria-label="Notifications"
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: (id: string) => void }) {
  const config = toastConfig[toast.type];

  return (
    <div
      className={cn(
        "relative pointer-events-auto flex gap-3 items-start",
        "bg-white rounded-[var(--radius-lg)] shadow-[var(--shadow-lg)]",
        "p-4 pr-10 border border-[var(--border)]",
        "overflow-hidden"
      )}
      role="alert"
    >
      {/* Left bar */}
      <div className={cn("absolute left-0 top-0 bottom-0 w-1 rounded-l-[var(--radius-lg)]", config.bar)} />
      <div className="pl-1">{config.icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-semibold text-[var(--foreground)] leading-snug">{toast.title}</p>
        {toast.description && (
          <p className="text-[13px] text-[var(--foreground-muted)] mt-0.5 leading-snug">{toast.description}</p>
        )}
      </div>
      <button
        onClick={() => onRemove(toast.id)}
        aria-label="Dismiss notification"
        className="absolute top-3 right-3 text-[var(--foreground-subtle)] hover:text-[var(--foreground)] transition-colors"
      >
        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path d="M18 6 6 18M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
