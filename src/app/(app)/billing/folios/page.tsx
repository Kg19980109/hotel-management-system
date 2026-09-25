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
} from "lucide-react";

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
          title="Guest Folios"
          description="Master ledger of all guest stay folios, incidental charges, and payment settlements."
          breadcrumbs={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Billing", href: "/billing" },
            { label: "Folios" },
          ]}
        />
        <LoadingState message="Loading guest folios..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Guest Folios"
          description="Master ledger of all guest stay folios, incidental charges, and payment settlements."
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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Guest Folios"
        description="Master ledger of all guest stay folios, incidental charges, and payment settlements."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Billing", href: "/billing" },
          { label: "Folios" },
        ]}
      />

      {/* Filter Bar */}
      <div className="p-4 rounded-xl bg-card border shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search folio #, guest name, room..."
              className="pl-9"
            />
          </div>

          <div className="flex items-center gap-2.5 w-full md:w-auto justify-end">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-10 px-3 rounded-lg border border-[var(--border)] bg-card text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 text-[var(--foreground)]"
            >
              <option value="ALL">All Statuses</option>
              <option value="OPEN">Open</option>
              <option value="SETTLED">Settled</option>
              <option value="CLOSED">Closed</option>
              <option value="VOID">Void</option>
            </select>

            <Button variant="outline" size="icon" onClick={loadData} title="Refresh">
              <RotateCcw className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Folios Table */}
      {filtered.length === 0 ? (
        <div className="p-12 text-center rounded-xl bg-card border border-dashed space-y-2">
          <Receipt className="w-10 h-10 text-muted-foreground mx-auto" />
          <h3 className="text-sm font-bold text-foreground">No Folios Found</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            No guest folios match your current filter criteria.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border bg-card shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b bg-muted/40 text-muted-foreground text-left">
                  <th className="py-3 px-4 font-semibold">Folio Number</th>
                  <th className="py-3 px-4 font-semibold">Guest</th>
                  <th className="py-3 px-4 font-semibold">Room</th>
                  <th className="py-3 px-4 font-semibold">Stay Dates</th>
                  <th className="py-3 px-4 font-semibold">Opened At</th>
                  <th className="py-3 px-4 font-semibold text-center">Status</th>
                  <th className="py-3 px-4 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map((f) => (
                  <tr key={f.id} className="hover:bg-muted/10 transition">
                    <td className="py-3.5 px-4 font-mono font-bold text-foreground">
                      <Link href={`/billing/folios/${f.id}`} className="hover:text-amber-600">
                        {f.folio_number}
                      </Link>
                    </td>
                    <td className="py-3.5 px-4 font-medium text-foreground">
                      {f.guest?.first_name} {f.guest?.last_name}
                      {f.guest?.email && (
                        <span className="block text-[11px] text-muted-foreground font-normal">
                          {f.guest.email}
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded font-bold bg-slate-100 dark:bg-slate-800 text-foreground">
                        Room {f.stay?.room?.room_number || "N/A"}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-muted-foreground">
                      {f.stay?.check_in_date} &rarr; {f.stay?.expected_check_out_date}
                    </td>
                    <td className="py-3.5 px-4 text-muted-foreground">
                      {new Date(f.opened_at).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <Badge
                        variant={f.status === "SETTLED" ? "success" : f.status === "CLOSED" ? "default" : f.status === "VOID" ? "danger" : "warning"}
                        size="sm"
                      >
                        {f.status}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Link href={`/billing/folios/${f.id}`}>
                        <Button size="sm" variant="outline" className="h-7 text-xs">
                          <Eye className="w-3.5 h-3.5 mr-1" />
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
