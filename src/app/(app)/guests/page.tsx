"use client";

import * as React from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/client";
import { GuestCRM, GuestKPIStats, GuestStatus } from "@/lib/guests/types";
import { fetchGuests, fetchGuestKPIs } from "@/lib/guests/queries";
import { GuestKPIGrid, GuestTable } from "@/components/guests";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LoadingState, ErrorState } from "@/components/ui/states";
import { UserPlus, Search, RefreshCw, Users, Star, TrendingUp } from "lucide-react";

const STATUS_TABS: { label: string; value: GuestStatus | "ALL"; color: string; activeClass: string }[] = [
  { label: "All Guests", value: "ALL", color: "bg-slate-900 text-white", activeClass: "bg-slate-900 text-white shadow-sm" },
  { label: "Active", value: "ACTIVE", color: "bg-emerald-600 text-white", activeClass: "bg-emerald-600 text-white shadow-sm shadow-emerald-200" },
  { label: "Inactive", value: "INACTIVE", color: "bg-slate-500 text-white", activeClass: "bg-slate-500 text-white shadow-sm" },
  { label: "Blocked", value: "BLOCKED", color: "bg-red-600 text-white", activeClass: "bg-red-600 text-white shadow-sm shadow-red-200" },
];

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
  const [statusFilter, setStatusFilter] = React.useState<GuestStatus | "ALL">("ALL");
  const [search, setSearch] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [kpiStats, setKpiStats] = React.useState<GuestKPIStats>({
    totalGuests: 0,
    activeGuests: 0,
    returningGuests: 0,
    currentlyInHouse: 0,
    arrivingToday: 0,
    departingToday: 0,
  });

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);

  const loadData = React.useCallback(async () => {
    if (!activePropertyId) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      const [kpiData, guestData] = await Promise.all([
        fetchGuestKPIs(supabase, activePropertyId),
        fetchGuests(supabase, activePropertyId, { page, pageSize, status: statusFilter, search: debouncedSearch }),
      ]);
      setKpiStats(kpiData);
      setGuests(guestData.guests);
      setTotal(guestData.total);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load guest records.");
    } finally {
      setLoading(false);
    }
  }, [activePropertyId, page, pageSize, statusFilter, debouncedSearch, supabase]);

  React.useEffect(() => {
    let isMounted = true;
    void Promise.resolve().then(() => { if (isMounted) loadData(); });
    return () => { isMounted = false; };
  }, [loadData]);

  if (authLoading) return <LoadingState message="Authenticating session..." />;

  return (
    <div className="space-y-6">
      {/* ── HERO HEADER ── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#070c18] via-[#151040] to-[#0a0d1e] px-7 pt-7 pb-6 shadow-xl">
        {/* Decorative orbs */}
        <div className="absolute -top-10 -right-10 w-56 h-56 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-20 w-40 h-40 bg-violet-600/15 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute top-4 left-1/2 w-72 h-16 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div>
            {/* Tag */}
            <div className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-amber-400/90 bg-amber-400/10 border border-amber-400/20 px-2.5 py-1 rounded-full mb-3">
              <Star className="h-3 w-3" />
              Guest Relationship Management
            </div>

            <h1 className="text-3xl sm:text-4xl font-serif font-black text-white tracking-tight leading-tight">
              Guest Profiles
              <span className="block text-indigo-300/80 text-xl font-semibold mt-0.5">& CRM Intelligence</span>
            </h1>

            <div className="flex items-center gap-4 mt-4">
              <div className="flex items-center gap-1.5">
                <div className="h-5 w-5 rounded-full bg-white/10 flex items-center justify-center">
                  <Users className="h-3 w-3 text-white/70" />
                </div>
                <span className="text-white/70 text-xs"><span className="font-bold text-white">{total}</span> guest profiles</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-5 w-5 rounded-full bg-white/10 flex items-center justify-center">
                  <TrendingUp className="h-3 w-3 text-emerald-400" />
                </div>
                <span className="text-white/70 text-xs"><span className="font-bold text-emerald-400">{kpiStats.currentlyInHouse}</span> in-house</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={loadData}
              disabled={loading}
              className="h-9 px-3.5 rounded-xl flex items-center gap-2 text-sm font-semibold text-white/80 bg-white/10 hover:bg-white/15 border border-white/10 transition-all"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <Link href="/guests/new">
              <button className="h-9 px-4 rounded-xl flex items-center gap-2 text-sm font-bold text-indigo-900 bg-gradient-to-r from-amber-400 to-yellow-300 hover:from-amber-300 hover:to-yellow-200 shadow-md shadow-amber-400/30 transition-all">
                <UserPlus className="h-4 w-4" />
                Add Guest
              </button>
            </Link>
          </div>
        </div>
      </div>

      {/* ── KPI GRID ── */}
      <GuestKPIGrid stats={kpiStats} />

      {/* ── FILTER + SEARCH BAR ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white rounded-2xl border border-slate-200/80 shadow-xs p-3">
        {/* Status tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
          {STATUS_TABS.map((tab) => {
            const isActive = statusFilter === tab.value;
            return (
              <button
                key={tab.value}
                onClick={() => { setStatusFilter(tab.value); setPage(1); }}
                className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all duration-150 whitespace-nowrap ${
                  isActive ? tab.activeClass : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by name, phone, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-9 pl-9 pr-4 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all text-slate-800 placeholder:text-slate-400"
          />
        </div>
      </div>

      {/* ── CONTENT ── */}
      {error ? (
        <ErrorState title="Failed to Load Guest Data" description={error} onRetry={loadData} />
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
  );
}
