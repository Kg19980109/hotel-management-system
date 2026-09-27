"use client";

import * as React from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth/context";
import { PageHeader } from "@/components/shared/page-header";
import { LoadingState, ErrorState } from "@/components/ui/states";
import { getPropertyFolios } from "@/lib/billing/queries";
import { GuestFolio } from "@/lib/billing/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  RotateCcw,
  Receipt,
  Eye,
  Bed,
  ArrowLeft,
  X,
  CheckCircle2,
  Clock,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function FoliosPage() {
  const { currentProperty, loading: authLoading } = useAuth();
  const activePropertyId = currentProperty?.property_id;

  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [folios, setFolios] = React.useState<GuestFolio[]>([]);
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("ALL");

  const loadData = React.useCallback(async () => {
    if (!activePropertyId) return;
    try {
      setLoading(true);
      setError(null);
      const data = await getPropertyFolios(activePropertyId, {
        status: statusFilter,
      });
      setFolios(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load folios.");
    } finally {
      setLoading(false);
    }
  }, [activePropertyId, statusFilter]);

  React.useEffect(() => {
    let isMounted = true;
    if (!authLoading && activePropertyId) {
      void Promise.resolve().then(() => {
        if (!isMounted) return;
        loadData();
      });
    }
    return () => {
      isMounted = false;
    };
  }, [authLoading, activePropertyId, loadData]);

  const filtered = React.useMemo(() => {
    return folios.filter((f) => {
      if (search.trim().length > 0) {
        const s = search.toLowerCase().trim();
        const num = (f.folio_number || "").toLowerCase();
        const guest = `${f.guest?.first_name || ""} ${f.guest?.last_name || ""}`.toLowerCase();
        const room = (f.stay?.room?.room_number || "").toLowerCase();
        if (!num.includes(s) && !guest.includes(s) && !room.includes(s)) {
          return false;
        }
      }
      return true;
    });
  }, [folios, search]);

  if (authLoading || (loading && !folios.length)) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Guest Stay Folios"
          description="Master ledger of all guest stay folios, incidental room charges, and payment settlements."
          breadcrumbs={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Billing", href: "/billing" },
            { label: "Folios" },
          ]}
        />
        <LoadingState message="Loading guest stay folios..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Guest Stay Folios"
          description="Master ledger of all guest stay folios, incidental room charges, and payment settlements."
          breadcrumbs={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Billing", href: "/billing" },
            { label: "Folios" },
          ]}
        />
        <ErrorState description={error} onRetry={() => void loadData()} />
      </div>
    );
  }

  const openCount = folios.filter((f) => f.status === "OPEN").length;
  const settledCount = folios.filter((f) => f.status === "SETTLED").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/billing"
              className="text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground flex items-center gap-1 transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Billing Hub
            </Link>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2.5">
            <Receipt className="w-6 h-6 text-amber-500" />
            <span>Guest Stay Folios</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Master financial ledger for all in-house rooms, incidental charges, and check-out settlements.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/billing">
            <Button size="sm" variant="outline" className="text-xs font-bold">
              View All Bills
            </Button>
          </Link>
          <Button size="sm" variant="outline" onClick={loadData} title="Refresh Folios">
            <RotateCcw className="w-3.5 h-3.5 mr-1" />
            Refresh
          </Button>
        </div>
      </div>

      {/* KPI Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-card border shadow-xs space-y-1">
          <span className="text-[10.5px] font-bold text-muted-foreground uppercase">Total Folios</span>
          <p className="text-xl font-black text-foreground">{folios.length}</p>
        </div>
        <div className="p-4 rounded-2xl bg-card border border-amber-500/30 shadow-xs space-y-1 border-l-4 border-l-amber-500">
          <span className="text-[10.5px] font-bold text-amber-600 uppercase">Open In-House</span>
          <p className="text-xl font-black text-amber-600">{openCount}</p>
        </div>
        <div className="p-4 rounded-2xl bg-card border border-emerald-500/30 shadow-xs space-y-1 border-l-4 border-l-emerald-500">
          <span className="text-[10.5px] font-bold text-emerald-600 uppercase">Settled / Closed</span>
          <p className="text-xl font-black text-emerald-600">{settledCount}</p>
        </div>
        <div className="p-4 rounded-2xl bg-card border shadow-xs space-y-1">
          <span className="text-[10.5px] font-bold text-muted-foreground uppercase">Currency</span>
          <p className="text-xl font-black text-foreground">INR (₹)</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-xl bg-card border shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search folio #, guest name, room 302..."
              className="pl-9 h-9 text-xs"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2.5 w-full md:w-auto justify-end">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9 px-3 rounded-lg border border-border bg-card text-xs focus:outline-none focus:ring-2 focus:ring-amber-500 text-foreground"
            >
              <option value="ALL">All Statuses ({folios.length})</option>
              <option value="OPEN">Open ({openCount})</option>
              <option value="SETTLED">Settled ({settledCount})</option>
              <option value="CLOSED">Closed</option>
              <option value="VOID">Void</option>
            </select>
          </div>
        </div>
      </div>

      {/* Folios Table */}
      {filtered.length === 0 ? (
        <div className="p-16 text-center rounded-2xl bg-card border border-dashed space-y-3">
          <Receipt className="w-10 h-10 text-muted-foreground mx-auto" />
          <h3 className="text-sm font-bold text-foreground">No Folios Found</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            No guest folios match your current filter criteria.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border bg-card shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b bg-muted/50 text-muted-foreground text-[11px] font-bold uppercase tracking-wider">
                  <th className="py-3 px-4">Folio Number</th>
                  <th className="py-3 px-4">Guest</th>
                  <th className="py-3 px-4">Room</th>
                  <th className="py-3 px-4">Stay Dates</th>
                  <th className="py-3 px-4">Opened Date</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((f) => (
                  <tr key={f.id} className="hover:bg-muted/20 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-black text-foreground">
                      <Link href={`/billing/folios/${f.id}`} className="hover:text-amber-600 flex items-center gap-1.5">
                        <Receipt className="w-3.5 h-3.5 text-muted-foreground" />
                        <span>{f.folio_number}</span>
                      </Link>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-foreground">
                      <div>{f.guest?.first_name} {f.guest?.last_name}</div>
                      {f.guest?.email && (
                        <div className="text-[10.5px] text-muted-foreground font-normal">
                          {f.guest.email}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded-md font-black bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs border border-amber-500/20">
                        Room {f.stay?.room?.room_number || "N/A"}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-muted-foreground text-[11px]">
                      {f.stay?.check_in_date} &rarr; {f.stay?.expected_check_out_date}
                    </td>
                    <td className="py-3.5 px-4 text-muted-foreground text-[11px]">
                      {new Date(f.opened_at).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border",
                          f.status === "SETTLED"
                            ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                            : f.status === "OPEN"
                            ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30"
                            : "bg-muted text-muted-foreground border-border"
                        )}
                      >
                        {f.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Link href={`/billing/folios/${f.id}`}>
                        <Button size="sm" variant="outline" className="h-7 text-xs font-bold gap-1">
                          <Eye className="w-3.5 h-3.5" />
                          View Ledger
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
