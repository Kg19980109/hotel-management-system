"use client";

import * as React from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/client";
import { GuestCRM, GuestKPIStats, GuestStatus } from "@/lib/guests/types";
import { fetchGuests, fetchGuestKPIs } from "@/lib/guests/queries";
import { GuestKPIGrid, GuestTable } from "@/components/guests";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LoadingState, ErrorState } from "@/components/ui/states";
import { UserPlus, Search, RefreshCw, Users } from "lucide-react";

export default function GuestsPage() {
  const { currentProperty, loading: authLoading } = useAuth();
  const supabase = React.useMemo(() => createClient(), []);
  const activePropertyId = currentProperty?.property_id;

  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [guests, setGuests] = React.useState<GuestCRM[]>([]);
  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const [pageSize] = React.useState(10);

  // Filters
  const [statusFilter, setStatusFilter] = React.useState<GuestStatus | "ALL">("ALL");
  const [search, setSearch] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");

  // KPI Stats
  const [kpiStats, setKpiStats] = React.useState<GuestKPIStats>({
    totalGuests: 0,
    activeGuests: 0,
    returningGuests: 0,
    currentlyInHouse: 0,
    arrivingToday: 0,
    departingToday: 0,
  });

  // Debounce search
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);

  const loadData = React.useCallback(async () => {
    if (!activePropertyId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const [kpiData, guestData] = await Promise.all([
        fetchGuestKPIs(supabase, activePropertyId),
        fetchGuests(supabase, activePropertyId, {
          page,
          pageSize,
          status: statusFilter,
          search: debouncedSearch,
        }),
      ]);

      setKpiStats(kpiData);
      setGuests(guestData.guests);
      setTotal(guestData.total);
    } catch (err: unknown) {
      console.error("GuestsPage load error:", err);
      setError(err instanceof Error ? err.message : "Failed to load guest records.");
    } finally {
      setLoading(false);
    }
  }, [activePropertyId, page, pageSize, statusFilter, debouncedSearch, supabase]);

  React.useEffect(() => {
    let isMounted = true;
    void Promise.resolve().then(() => {
      if (isMounted) loadData();
    });
    return () => {
      isMounted = false;
    };
  }, [loadData]);

  if (authLoading) {
    return <LoadingState message="Authenticating session..." />;
  }

  return (
    <div className="space-y-6 relative -mt-4 -mx-6 px-6 pt-4">
      {/* 5-Star Resort Hero Ambient Background */}
      <div 
        className="absolute top-0 left-0 w-full h-[280px] bg-cover bg-center z-0 opacity-25 dark:opacity-15 pointer-events-none"
        style={{ backgroundImage: 'url("https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&q=80")' }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-background/0 via-background/60 to-background" />
      </div>

      <div className="relative z-10 space-y-6">
        {/* Luxury Page Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-2 border-b border-[var(--border)]">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[11px] font-bold text-amber-600 uppercase tracking-widest flex items-center gap-1.5 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20">
                <Users className="w-3.5 h-3.5 text-amber-600" />
                VIP & Guest Relationship Management
              </span>
              <span className="text-slate-400">•</span>
              <span className="text-xs text-slate-500 font-medium">
                {total} Guest Profiles Recorded
              </span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-serif font-bold text-slate-900 tracking-tight">
              Guest Profiles & CRM
            </h1>

            <p className="text-sm text-slate-600 mt-1 max-w-2xl">
              Track luxury guest profiles, stay history, room preferences, corporate billing accounts, and VIP loyalty milestones.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={loadData}
              disabled={loading}
              className="gap-1.5 bg-white/80 backdrop-blur-sm border-slate-300 hover:bg-white shadow-xs"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>

            <Link href="/guests/new">
              <Button size="sm" className="gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-md shadow-indigo-500/20 font-semibold px-4 py-2 rounded-xl transition-all hover:scale-[1.02]">
                <UserPlus className="h-4 w-4" />
                <span>Add VIP Guest</span>
              </Button>
            </Link>
          </div>
        </div>

        {/* KPI Section */}
        <GuestKPIGrid stats={kpiStats} />

        {/* Controls & Filter Bar (Glassmorphic) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 bg-white/90 backdrop-blur-md p-3 rounded-2xl border border-slate-200/80 shadow-sm">
          {/* Status Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {(["ALL", "ACTIVE", "INACTIVE", "BLOCKED"] as const).map((st) => {
              const active = statusFilter === st;
              return (
                <button
                  key={st}
                  onClick={() => {
                    setStatusFilter(st);
                    setPage(1);
                  }}
                  className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all duration-200 whitespace-nowrap ${
                    active
                      ? "bg-slate-900 text-white shadow-sm scale-100"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                  }`}
                >
                  {st === "ALL" ? "All Guests" : st.charAt(0) + st.slice(1).toLowerCase()}
                </button>
              );
            })}
          </div>

          {/* Live Search */}
          <div className="w-full sm:w-80">
            <Input
              placeholder="Search by name, phone, email, company..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              leftElement={<Search className="h-3.5 w-3.5 text-slate-400" />}
              className="h-9 text-xs bg-slate-50/70 border-slate-200 focus:bg-white rounded-xl transition-all"
            />
          </div>
        </div>

        {/* Main Content Area */}
        {error ? (
          <ErrorState
            title="Failed to Load Guest Data"
            description={error}
            onRetry={loadData}
          />
        ) : loading && guests.length === 0 ? (
          <LoadingState message="Loading guest database..." />
        ) : (
          <GuestTable
            guests={guests}
            total={total}
            page={page}
            pageSize={pageSize}
            onPageChange={setPage}
          />
        )}
      </div>
    </div>
  );
}
