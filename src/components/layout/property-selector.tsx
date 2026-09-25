"use client";

import * as React from "react";
import { Building2, Check, ChevronDown, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth/context";
import Link from "next/link";

interface PropertySelectorProps {
  variant?: "sidebar" | "topbar";
  collapsed?: boolean;
}

export function PropertySelector({
  variant = "sidebar",
  collapsed = false,
}: PropertySelectorProps) {
  const { currentProperty, properties, switchProperty } = useAuth();
  const [isOpen, setIsOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Active property details
  const activeName = currentProperty?.property_name || "Primary Hotel";
  const activeLocation = currentProperty
    ? `${currentProperty.city}, ${currentProperty.state}`
    : "Hotel Property";
  const activeInitials = activeName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "SH";

  // Click outside to close
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Escape key
  React.useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  // TOPBAR VARIANT
  if (variant === "topbar") {
    return (
      <div className="relative" ref={containerRef}>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-label={`Selected property: ${activeName}`}
          className={cn(
            "flex items-center gap-2 px-2.5 py-1.5 rounded-[var(--radius)] text-left",
            "border border-[var(--border)] hover:bg-[var(--secondary)] transition-colors",
            isOpen && "bg-[var(--secondary)] ring-2 ring-[var(--ring)]"
          )}
        >
          <div className="h-6 w-6 rounded-[var(--radius-sm)] bg-indigo-600 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
            {activeInitials}
          </div>
          <div className="hidden md:block max-w-[150px]">
            <p className="text-[13px] font-semibold text-[var(--foreground)] truncate leading-tight">
              {activeName}
            </p>
            <p className="text-[11px] text-[var(--foreground-muted)] truncate leading-tight">
              {activeLocation}
            </p>
          </div>
          <ChevronDown className="h-3.5 w-3.5 text-[var(--foreground-muted)] shrink-0 ml-1" />
        </button>

        {isOpen && (
          <div
            role="listbox"
            aria-label="Accessible properties"
            className="absolute left-0 mt-2 w-72 rounded-[var(--radius-lg)] bg-white border border-[var(--border)] shadow-[var(--shadow-lg)] py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="px-3 py-1.5 border-b border-[var(--border)] flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--foreground-subtle)]">
                My Properties ({properties.length || 1})
              </span>
              <Building2 className="h-3.5 w-3.5 text-slate-400" />
            </div>

            <div className="max-h-60 overflow-y-auto py-1">
              {properties.length === 0 ? (
                <div className="px-3 py-2 text-[12px] text-[var(--foreground-muted)]">
                  {activeName} ({activeLocation})
                </div>
              ) : (
                properties.map((prop) => {
                  const isSelected = prop.property_id === currentProperty?.property_id;
                  const initials = prop.property_name
                    .split(" ")
                    .map((w) => w[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase();

                  return (
                    <button
                      key={prop.property_id}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      onClick={async () => {
                        setIsOpen(false);
                        await switchProperty(prop.property_id);
                      }}
                      className={cn(
                        "w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-[var(--secondary)] transition-colors",
                        isSelected && "bg-indigo-50/60"
                      )}
                    >
                      <div className="h-7 w-7 rounded-[var(--radius-sm)] bg-indigo-600 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                        {initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={cn("text-[13px] font-medium truncate", isSelected ? "text-[var(--primary)] font-semibold" : "text-[var(--foreground)]")}>
                          {prop.property_name}
                        </p>
                        <p className="text-[11px] text-[var(--foreground-muted)] truncate">
                          {prop.city}, {prop.state} · <span className="text-indigo-600 font-medium">{prop.role_name}</span>
                        </p>
                      </div>
                      {isSelected && <Check className="h-4 w-4 text-[var(--primary)] shrink-0" />}
                    </button>
                  );
                })
              )}
            </div>

            <div className="pt-1 mt-1 border-t border-[var(--border)]">
              <Link
                href="/onboarding"
                onClick={() => setIsOpen(false)}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-[12px] font-medium text-[var(--primary)] hover:bg-[var(--secondary)] transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Register Another Property</span>
              </Link>
            </div>
          </div>
        )}
      </div>
    );
  }

  // SIDEBAR VARIANT - COLLAPSED
  if (collapsed) {
    return (
      <div className="relative flex justify-center py-2" ref={containerRef}>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          aria-label={`Current property: ${activeName}`}
          className="h-9 w-9 rounded-[var(--radius)] bg-indigo-600 flex items-center justify-center text-white text-[11px] font-bold transition-transform hover:scale-105"
          title={activeName}
        >
          {activeInitials}
        </button>

        {isOpen && (
          <div
            role="listbox"
            className="absolute left-full ml-3 bottom-0 w-72 rounded-[var(--radius-lg)] bg-[var(--sidebar-bg)] border border-[var(--sidebar-border)] shadow-[var(--shadow-xl)] py-1.5 z-50 text-white"
          >
            <div className="px-3 py-1.5 border-b border-[var(--sidebar-border)] flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--sidebar-text)] opacity-70">
                Switch Hotel Property
              </span>
              <Building2 className="h-3.5 w-3.5 text-[var(--sidebar-text)]" />
            </div>

            <div className="max-h-60 overflow-y-auto py-1">
              {properties.length === 0 ? (
                <div className="px-3 py-2 text-[12px] text-[var(--sidebar-text)]">
                  {activeName}
                </div>
              ) : (
                properties.map((prop) => {
                  const isSelected = prop.property_id === currentProperty?.property_id;
                  const initials = prop.property_name
                    .split(" ")
                    .map((w) => w[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase();

                  return (
                    <button
                      key={prop.property_id}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      onClick={async () => {
                        setIsOpen(false);
                        await switchProperty(prop.property_id);
                      }}
                      className={cn(
                        "w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-[var(--sidebar-item-hover)] transition-colors",
                        isSelected && "bg-[var(--sidebar-item-active-bg)]"
                      )}
                    >
                      <div className="h-7 w-7 rounded-[var(--radius-sm)] bg-indigo-600 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                        {initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[12.5px] font-medium text-white truncate">{prop.property_name}</p>
                        <p className="text-[11px] text-[var(--sidebar-text)] truncate">{prop.city} · {prop.role_name}</p>
                      </div>
                      {isSelected && <Check className="h-4 w-4 text-[var(--primary)] shrink-0" />}
                    </button>
                  );
                })
              )}
            </div>

            <div className="pt-1 mt-1 border-t border-[var(--sidebar-border)]">
              <Link
                href="/onboarding"
                onClick={() => setIsOpen(false)}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] font-medium text-indigo-300 hover:text-white transition-colors"
              >
                <Plus className="h-3 w-3" />
                <span>Add Property</span>
              </Link>
            </div>
          </div>
        )}
      </div>
    );
  }

  // SIDEBAR VARIANT - EXPANDED
  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label="Switch hotel property"
        className={cn(
          "w-full flex items-center gap-2.5 bg-white/5 rounded-[var(--radius)] px-3 py-2.5 hover:bg-white/10 cursor-pointer transition-colors text-left",
          isOpen && "bg-white/10 ring-1 ring-white/20"
        )}
      >
        <div className="h-8 w-8 rounded-[var(--radius-sm)] bg-indigo-600 flex items-center justify-center shrink-0 text-white text-[11px] font-bold">
          {activeInitials}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white text-[13px] font-semibold truncate leading-tight">
            {activeName}
          </p>
          <p className="text-[var(--sidebar-text)] text-[11px] truncate leading-tight mt-0.5">
            {activeLocation}
          </p>
        </div>
        <ChevronDown
          className={cn(
            "text-[var(--sidebar-text)] shrink-0 h-4 w-4 transition-transform duration-200",
            isOpen && "rotate-180"
          )}
        />
      </button>

      {isOpen && (
        <div
          role="listbox"
          aria-label="Available hotel properties"
          className="absolute left-0 bottom-full mb-2 w-full rounded-[var(--radius-lg)] bg-[var(--sidebar-bg)] border border-[var(--sidebar-border)] shadow-[var(--shadow-xl)] py-1.5 z-50 text-white animate-in fade-in slide-in-from-bottom-2 duration-150"
        >
          <div className="px-3 py-1.5 border-b border-[var(--sidebar-border)] flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--sidebar-text)] opacity-70">
              Select Property ({properties.length || 1})
            </span>
            <Building2 className="h-3.5 w-3.5 text-[var(--sidebar-text)]" />
          </div>

          <div className="max-h-56 overflow-y-auto py-1">
            {properties.length === 0 ? (
              <div className="px-3 py-2 text-[12px] text-[var(--sidebar-text)]">
                {activeName} ({activeLocation})
              </div>
            ) : (
              properties.map((prop) => {
                const isSelected = prop.property_id === currentProperty?.property_id;
                const initials = prop.property_name
                  .split(" ")
                  .map((w) => w[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase();

                return (
                  <button
                    key={prop.property_id}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={async () => {
                      setIsOpen(false);
                      await switchProperty(prop.property_id);
                    }}
                    className={cn(
                      "w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-[var(--sidebar-item-hover)] transition-colors",
                      isSelected && "bg-[var(--sidebar-item-active-bg)]"
                    )}
                  >
                    <div className="h-7 w-7 rounded-[var(--radius-sm)] bg-indigo-600 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12.5px] font-medium text-white truncate">{prop.property_name}</p>
                      <p className="text-[11px] text-[var(--sidebar-text)] truncate">{prop.city} · {prop.role_name}</p>
                    </div>
                    {isSelected && <Check className="h-4 w-4 text-[var(--primary)] shrink-0" />}
                  </button>
                );
              })
            )}
          </div>

          <div className="pt-1 mt-1 border-t border-[var(--sidebar-border)]">
            <Link
              href="/onboarding"
              onClick={() => setIsOpen(false)}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] font-medium text-indigo-300 hover:text-white transition-colors"
            >
              <Plus className="h-3 w-3" />
              <span>Register Another Property</span>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
