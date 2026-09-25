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
import { UserPlus, Search, RefreshCw } from "lucide-react";

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
    if (!activePropertyId) return;

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
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Guest CRM"
        description="Manage guest profiles, stay history, preferences, and corporate relationships."
        breadcrumbs={[{ label: "Operations" }, { label: "Guests" }]}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadData}
              disabled={loading}
              className="gap-1.5"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>

            <Link href="/guests/new">
              <Button size="sm" className="gap-1.5 bg-[var(--primary)] text-white">
                <UserPlus className="h-4 w-4" />
                <span>Add Guest</span>
              </Button>
            </Link>
          </div>
        }
      />

      {/* KPI Section */}
      <GuestKPIGrid stats={kpiStats} />

      {/* Controls & Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-[var(--radius-xl)] border border-[var(--border)] shadow-xs">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
          {(["ALL", "ACTIVE", "INACTIVE", "BLOCKED"] as const).map((st) => (
            <button
              key={st}
              onClick={() => {
                setStatusFilter(st);
                setPage(1);
              }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-[var(--radius-md)] transition-colors whitespace-nowrap ${
                statusFilter === st
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {st === "ALL" ? "All Guests" : st.charAt(0) + st.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        {/* Live Search */}
        <div className="w-full sm:w-72">
          <Input
            placeholder="Search name, email, phone, company..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftElement={<Search className="h-3.5 w-3.5 text-slate-400" />}
            className="h-8 text-xs bg-white"
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
  );
}
