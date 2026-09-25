"use client";

import * as React from "react";
import { searchGuests } from "@/lib/guests/queries";
import { GuestCRM } from "@/lib/guests/types";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Search, UserPlus, Check, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface GuestLookupProps {
  propertyId: string;
  selectedGuest: GuestCRM | null;
  onSelectGuest: (guest: GuestCRM | null) => void;
  onCreateNew?: () => void;
  placeholder?: string;
  className?: string;
  error?: string;
}

export function GuestLookup({
  propertyId,
  selectedGuest,
  onSelectGuest,
  onCreateNew,
  placeholder = "Search existing guest by name, email, or phone...",
  className,
  error,
}: GuestLookupProps) {
  const supabase = React.useMemo(() => createClient(), []);
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<GuestCRM[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [isOpen, setIsOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  React.useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Debounced search
  React.useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await searchGuests(supabase, propertyId, query, 8);
        if (isMounted) {
          setResults(data);
        }
      } catch (err) {
        console.error("GuestLookup search error:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }, 250);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [query, propertyId, isOpen, supabase]);

  const handleSelect = (guest: GuestCRM) => {
    onSelectGuest(guest);
    setIsOpen(false);
    setQuery("");
  };

  const handleClear = () => {
    onSelectGuest(null);
    setQuery("");
  };

  return (
    <div ref={containerRef} className={cn("relative w-full space-y-1.5", className)}>
      {selectedGuest ? (
        <div className="p-3 bg-indigo-50/60 rounded-[var(--radius-lg)] border border-indigo-200 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Avatar
              name={`${selectedGuest.first_name} ${selectedGuest.last_name}`}
              size="md"
            />
            <div>
              <div className="font-semibold text-sm text-[var(--foreground)] flex items-center gap-1.5">
                <span>
                  {selectedGuest.first_name} {selectedGuest.last_name}
                </span>
                <span className="text-[10px] uppercase font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded">
                  Selected
                </span>
              </div>
              <div className="text-xs text-[var(--foreground-muted)] flex items-center gap-2">
                {selectedGuest.phone && <span>{selectedGuest.phone}</span>}
                {selectedGuest.email && <span>• {selectedGuest.email}</span>}
                {selectedGuest.company_name && <span>• {selectedGuest.company_name}</span>}
              </div>
            </div>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClear}
            className="h-8 w-8 p-0 text-slate-500 hover:text-rose-600"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <div className="relative">
          <Input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            placeholder={placeholder}
            leftElement={<Search className="h-4 w-4 text-slate-400" />}
            rightElement={
              loading ? (
                <Loader2 className="h-4 w-4 text-slate-400 animate-spin" />
              ) : onCreateNew ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={onCreateNew}
                  className="h-7 text-xs text-indigo-600 hover:text-indigo-800 gap-1 px-2"
                >
                  <UserPlus className="h-3 w-3" />
                  <span>New Guest</span>
                </Button>
              ) : undefined
            }
            className="text-xs"
            error={Boolean(error)}
          />

          {/* Results Dropdown */}
          {isOpen && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-[var(--radius-lg)] border border-[var(--border)] shadow-lg z-50 overflow-hidden divide-y divide-slate-100 max-h-64 overflow-y-auto">
              {results.length > 0 ? (
                results.map((guest) => (
                  <button
                    key={guest.id}
                    type="button"
                    onClick={() => handleSelect(guest)}
                    className="w-full p-2.5 text-left hover:bg-slate-50 flex items-center justify-between gap-3 transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <Avatar
                        name={`${guest.first_name} ${guest.last_name}`}
                        size="sm"
                      />
                      <div className="text-xs">
                        <div className="font-semibold text-slate-800">
                          {guest.first_name} {guest.last_name}
                        </div>
                        <div className="text-slate-500 text-[11px] flex items-center gap-1.5">
                          {guest.email && <span>{guest.email}</span>}
                          {guest.phone && <span>• {guest.phone}</span>}
                        </div>
                      </div>
                    </div>

                    <Check className="h-4 w-4 text-slate-300 hover:text-emerald-600" />
                  </button>
                ))
              ) : (
                <div className="p-4 text-center text-xs text-slate-500 space-y-2">
                  <p>No matching guests found.</p>
                  {onCreateNew && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={onCreateNew}
                      className="text-xs gap-1.5 h-7"
                    >
                      <UserPlus className="h-3.5 w-3.5" />
                      <span>Create New Guest Profile</span>
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {error && <p className="text-xs text-rose-600 mt-1">{error}</p>}
    </div>
  );
}
