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
import { RoutePermissionGuard } from "@/components/auth/route-permission-guard";

export default function FoliosPage() {
  return (
    <RoutePermissionGuard permission="billing.view" moduleName="Guest Folios">
      <FoliosPageContent />
    </RoutePermissionGuard>
  );
}

function FoliosPageContent() {
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
      {/* ── LUXURY HERO BANNER ── */}
      <div
        className="relative overflow-hidden rounded-[var(--radius-2xl)] px-7 pt-7 pb-6 border border-white/10 shadow-2xl"
        style={{
          background: "linear-gradient(155deg, #08111F 0%, #0D1830 55%, #111A3C 100%)",
          boxShadow: "0 16px 48px rgba(13,24,48,0.22), 0 4px 12px rgba(13,24,48,0.12)",
        }}
      >
        {/* Ambient radial glows */}
        <div
          className="absolute -top-20 -right-20 h-64 w-64 rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(81,70,229,0.18) 0%, transparent 70%)" }}
        />
        <div
          className="absolute bottom-0 left-0 h-40 w-80 rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(214,168,90,0.10) 0%, transparent 70%)" }}
        />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div>
            {/* Back link & Pill Badge */}
            <div className="flex items-center gap-3 mb-3">
              <Link
                href="/billing"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-white/70 hover:text-white transition"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Billing Hub
              </Link>
              <span className="text-white/30">•</span>
              <div
                className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] px-2.5 py-1 rounded-full border"
                style={{
                  color: "var(--brand-gold)",
                  borderColor: "rgba(214,168,90,0.30)",
                  background: "rgba(214,168,90,0.10)",
                }}
              >
                <Receipt className="h-3.5 w-3.5" />
                ROOM & STAY FINANCIAL LEDGERS
              </div>
            </div>

            <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight leading-tight">
              Guest Stay Folios
              <span className="block text-white/60 text-sm font-normal mt-1">
                Master financial ledger for all in-house rooms, incidental charges & checkout settlements
              </span>
            </h1>

            {/* Quick stats in banner */}
            <div className="flex items-center gap-4 mt-4 flex-wrap text-xs text-white/80">
              <span className="flex items-center gap-1.5 font-medium">
                <span className="font-bold text-white text-sm">{folios.length}</span> total folios
              </span>
              <span className="text-white/30">•</span>
              <span className="flex items-center gap-1.5 font-medium text-amber-300">
                <span className="h-2 w-2 rounded-full bg-amber-400"></span>
                <span className="font-bold">{openCount}</span> open in-house
              </span>
              <span className="text-white/30">•</span>
              <span className="flex items-center gap-1.5 font-medium text-emerald-300">
                <span className="h-2 w-2 rounded-full bg-emerald-400"></span>
                <span className="font-bold">{settledCount}</span> settled
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2.5 flex-wrap shrink-0">
            <Link href="/billing">
              <Button
                variant="outline"
                size="sm"
                className="h-10 text-xs font-semibold px-4 border-white/20 bg-white/5 text-white hover:bg-white/15 hover:text-white backdrop-blur-xs"
              >
                View All Bills
              </Button>
            </Link>
            <Button
              size="sm"
              onClick={loadData}
              className="h-10 text-xs px-4 gap-2 font-bold shadow-lg"
              style={{
                background: "linear-gradient(135deg, #D4AF37 0%, #F59E0B 100%)",
                color: "#08111F",
              }}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Refresh
            </Button>
          </div>
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
