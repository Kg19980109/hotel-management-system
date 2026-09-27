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
    <div className="relative w-full max-w-sm sm:max-w-md" ref={containerRef}>
      <div className="relative flex items-center">
        <SearchInput
          ref={inputRef}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="Search guests, rooms, bookings..."
          className="pr-11 text-xs sm:text-[13px] bg-white/[0.07] border-white/[0.12] hover:border-white/[0.22] focus:border-indigo-400/80 focus:bg-white/[0.12] focus:ring-2 focus:ring-indigo-500/20 text-white placeholder:text-slate-400 rounded-xl h-9.5 transition-all shadow-inner"
          aria-expanded={isOpen}
          aria-autocomplete="list"
          aria-label="Global search"
        />
        <div className="absolute right-2.5 pointer-events-none hidden sm:flex items-center gap-0.5">
          <kbd className="text-[10px] font-bold text-slate-300 bg-white/[0.10] border border-white/[0.15] px-1.5 py-0.5 rounded-md shadow-2xs">
            ⌘K
          </kbd>
        </div>
      </div>

      {isOpen && (
        <div
          role="listbox"
          aria-label="Search suggestions"
          className="absolute left-0 right-0 mt-2 rounded-2xl bg-[#0A1124] border border-white/[0.12] shadow-2xl py-2 z-50 animate-in fade-in zoom-in-95 duration-150 overflow-hidden backdrop-blur-2xl"
        >
          <div className="px-3.5 py-1.5 flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-slate-400 border-b border-white/[0.08]">
            <span>{query.trim() ? "Search Results" : "Quick Access"}</span>
            <span className="flex items-center gap-1 font-normal lowercase text-indigo-400">
              <Sparkles className="h-3 w-3 text-indigo-400" />
              instant search
            </span>
          </div>

          <div className="py-1 max-h-[300px] overflow-y-auto divide-y divide-white/[0.04]">
            {filtered.length === 0 ? (
              <div className="py-6 text-center text-[13px] text-slate-400">
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
                  className="flex items-center justify-between px-3.5 py-2.5 hover:bg-white/[0.08] cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="h-7.5 w-7.5 rounded-lg bg-white/[0.06] border border-white/[0.08] flex items-center justify-center shrink-0">
                      {getCategoryIcon(item.category)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[13px] font-medium text-slate-100 truncate leading-tight">
                        {item.title}
                      </p>
                      <p className="text-[11px] text-slate-400 truncate leading-tight mt-0.5">
                        {item.subtitle}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    <span className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-white/[0.08] text-slate-300 border border-white/[0.08]">
                      {item.category}
                    </span>
                    <CornerDownLeft className="h-3 w-3 text-slate-400" />
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="px-3.5 py-2 border-t border-white/[0.08] bg-black/20 flex items-center justify-between text-[11px] text-slate-400">
            <span>Press <kbd className="font-semibold text-slate-200">ESC</kbd> to dismiss</span>
            <span><kbd className="font-semibold text-slate-200">↵</kbd> to select</span>
          </div>
        </div>
      )}
    </div>
  );
}
