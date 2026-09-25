"use client";

import * as React from "react";
import { SearchInput } from "@/components/ui/input";
import { Users, CalendarDays, BedDouble, Receipt, CornerDownLeft, Sparkles } from "lucide-react";

interface QuickResult {
  category: "Bookings" | "Guests" | "Rooms" | "Invoices";
  title: string;
  subtitle: string;
  href: string;
}

const mockSuggestions: QuickResult[] = [
  {
    category: "Bookings",
    title: "#BK-8492 — Rajesh Khanna",
    subtitle: "Check-in today · Deluxe Room 204",
    href: "/bookings",
  },
  {
    category: "Guests",
    title: "Ananya Deshmukh",
    subtitle: "VIP Guest · 5 stays · +91 98201 44321",
    href: "/guests",
  },
  {
    category: "Rooms",
    title: "Room 304 — Presidential Suite",
    subtitle: "Floor 3 · Occupied until tomorrow",
    href: "/rooms",
  },
  {
    category: "Invoices",
    title: "#INV-2024-102 — ₹32,400",
    subtitle: "Pending payment · Corporate booking",
    href: "/billing",
  },
];

export function GlobalSearch() {
  const [query, setQuery] = React.useState("");
  const [isOpen, setIsOpen] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Global ⌘K / Ctrl+K shortcut
  React.useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      }
      if (event.key === "Escape" && isOpen) {
        setIsOpen(false);
        inputRef.current?.blur();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  // Click outside to close results dropdown
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

  const filtered = query.trim()
    ? mockSuggestions.filter(
        (s) =>
          s.title.toLowerCase().includes(query.toLowerCase()) ||
          s.subtitle.toLowerCase().includes(query.toLowerCase()) ||
          s.category.toLowerCase().includes(query.toLowerCase())
      )
    : mockSuggestions;

  const getCategoryIcon = (cat: QuickResult["category"]) => {
    switch (cat) {
      case "Bookings":
        return <CalendarDays className="h-3.5 w-3.5 text-indigo-500" />;
      case "Guests":
        return <Users className="h-3.5 w-3.5 text-emerald-500" />;
      case "Rooms":
        return <BedDouble className="h-3.5 w-3.5 text-purple-500" />;
      case "Invoices":
        return <Receipt className="h-3.5 w-3.5 text-amber-500" />;
    }
  };

  return (
    <div className="relative w-full max-w-md" ref={containerRef}>
      <div className="relative flex items-center">
        <SearchInput
          ref={inputRef}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="Search guests, bookings, rooms, invoices..."
          className="pr-12 text-[13px] bg-[var(--secondary)]"
          aria-expanded={isOpen}
          aria-autocomplete="list"
          aria-label="Global search"
        />
        <div className="absolute right-2.5 pointer-events-none hidden sm:flex items-center gap-0.5">
          <kbd className="text-[10px] font-medium text-[var(--foreground-muted)] bg-white border border-[var(--border)] px-1.5 py-0.5 rounded shadow-xs">
            ⌘K
          </kbd>
        </div>
      </div>

      {isOpen && (
        <div
          role="listbox"
          aria-label="Search suggestions"
          className="absolute left-0 right-0 mt-2 rounded-[var(--radius-xl)] bg-white border border-[var(--border)] shadow-[var(--shadow-xl)] py-2 z-50 animate-in fade-in zoom-in-95 duration-150 overflow-hidden"
        >
          <div className="px-3.5 py-1.5 flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-[var(--foreground-subtle)] border-b border-[var(--border)]">
            <span>{query.trim() ? "Search Results" : "Quick Access"}</span>
            <span className="flex items-center gap-1 font-normal lowercase">
              <Sparkles className="h-3 w-3 text-indigo-500" />
              instant search
            </span>
          </div>

          <div className="py-1 max-h-[300px] overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="py-6 text-center text-[13px] text-[var(--foreground-muted)]">
                No matching results found for &ldquo;{query}&rdquo;
              </div>
            ) : (
              filtered.map((item, idx) => (
                <div
                  key={idx}
                  role="option"
                  aria-selected={false}
                  onClick={() => {
                    setIsOpen(false);
                    // Navigate to destination
                    window.location.href = item.href;
                  }}
                  className="flex items-center justify-between px-3.5 py-2 hover:bg-[var(--secondary)] cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="h-7 w-7 rounded-[var(--radius-sm)] bg-[var(--secondary)] flex items-center justify-center shrink-0">
                      {getCategoryIcon(item.category)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[13px] font-medium text-[var(--foreground)] truncate leading-tight">
                        {item.title}
                      </p>
                      <p className="text-[11px] text-[var(--foreground-muted)] truncate leading-tight mt-0.5">
                        {item.subtitle}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    <span className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-[var(--secondary)] text-[var(--foreground-muted)]">
                      {item.category}
                    </span>
                    <CornerDownLeft className="h-3 w-3 text-[var(--foreground-subtle)]" />
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="px-3.5 py-2 border-t border-[var(--border)] bg-[var(--surface)] flex items-center justify-between text-[11px] text-[var(--foreground-muted)]">
            <span>Press <kbd className="font-semibold text-[var(--foreground)]">ESC</kbd> to dismiss</span>
            <span><kbd className="font-semibold text-[var(--foreground)]">↵</kbd> to select</span>
          </div>
        </div>
      )}
    </div>
  );
}
