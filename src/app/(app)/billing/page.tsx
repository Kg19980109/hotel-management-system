"use client";

import * as React from "react";
import { Receipt } from "lucide-react";
import { useAuth } from "@/lib/auth/context";
import { PageHeader } from "@/components/shared/page-header";
import { LoadingState, ErrorState } from "@/components/ui/states";
import {
  getUnifiedBills,
  getUnifiedBillingKPIs,
  getPropertyFolios,
  getPropertyInvoices,
  getPropertyPayments,
} from "@/lib/billing/queries";
import {
  UnifiedBill,
  UnifiedBillingKPIs,
  GuestFolio,
  Invoice,
  FolioPayment,
} from "@/lib/billing/types";
import { UnifiedBillsView } from "@/components/billing/unified-bills-view";

export default function BillingPage() {
  const { currentProperty, loading: authLoading } = useAuth();
  const activePropertyId = currentProperty?.property_id;

  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [kpis, setKpis] = React.useState<UnifiedBillingKPIs>({
    todayRevenue: 0,
    outstandingBalance: 0,
    openFoliosCount: 0,
    settledFoliosCount: 0,
    todayPaymentsCount: 0,
    todayRefundsTotal: 0,
    totalBilledAmount: 0,
    posSalesTotal: 0,
    posOrdersCount: 0,
    qrOrdersTotal: 0,
    qrOrdersCount: 0,
    folioChargesTotal: 0,
    folioChargesCount: 0,
    invoicesTotal: 0,
    invoicesCount: 0,
  });
  const [bills, setBills] = React.useState<UnifiedBill[]>([]);
  const [recentFolios, setRecentFolios] = React.useState<GuestFolio[]>([]);
  const [recentInvoices, setRecentInvoices] = React.useState<Invoice[]>([]);
  const [recentPayments, setRecentPayments] = React.useState<FolioPayment[]>([]);

  const loadData = React.useCallback(async () => {
    if (!activePropertyId) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);

      const [unifiedBillsData, foliosData, invoicesData, paymentsData] = await Promise.all([
        getUnifiedBills(activePropertyId),
        getPropertyFolios(activePropertyId),
        getPropertyInvoices(activePropertyId),
        getPropertyPayments(activePropertyId),
      ]);

      const extendedKpis = await getUnifiedBillingKPIs(activePropertyId, unifiedBillsData);

      setBills(unifiedBillsData);
      setKpis(extendedKpis);
      setRecentFolios(foliosData);
      setRecentInvoices(invoicesData);
      setRecentPayments(paymentsData);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load billing dashboard.");
    } finally {
      setLoading(false);
    }
  }, [activePropertyId]);

  React.useEffect(() => {
    let isMounted = true;
    if (!authLoading) {
      if (activePropertyId) {
        void Promise.resolve().then(() => {
          if (!isMounted) return;
          loadData();
        });
      } else {
        setLoading(false);
      }
    }
    return () => {
      isMounted = false;
    };
  }, [authLoading, activePropertyId, loadData]);

  if (authLoading || (loading && !bills.length && !recentFolios.length)) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Billing & Financial Ledger"
          description="Master billing hub: POS counter bills, guest QR orders, room stay charges, and tax receipts."
          breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Billing" }]}
        />
        <LoadingState message="Loading hotel bills and ledger..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Billing & Financial Ledger"
          description="Master billing hub: POS counter bills, guest QR orders, room stay charges, and tax receipts."
          breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Billing" }]}
        />
        <ErrorState description={error} onRetry={() => void loadData()} />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* ── LUXURY BILLING HERO BANNER ── */}
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
            {/* Tag */}
            <div
              className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] px-2.5 py-1 rounded-full border mb-3"
              style={{
                color: "var(--brand-gold)",
                borderColor: "rgba(214,168,90,0.30)",
                background: "rgba(214,168,90,0.10)",
              }}
            >
              <Receipt className="h-3.5 w-3.5" />
              Unified Billing &amp; Financial Ledger
            </div>

            <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight leading-tight">
              Master Billing Hub &amp; Folios
              <span className="block text-white/60 text-sm font-normal mt-1">
                Real-Time Room Folios, POS Counter Bills, QR Dining Orders &amp; Tax Receipts
              </span>
            </h1>

            <div className="flex items-center gap-4 mt-4 flex-wrap text-xs text-white/80">
              <div>
                <span className="font-bold text-white">{bills.length}</span> recorded bills
              </div>
              <span className="text-white/20">·</span>
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                <span><span className="font-bold text-white">₹{kpis.todayRevenue.toLocaleString("en-IN")}</span> revenue today</span>
              </div>
              <span className="text-white/20">·</span>
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-amber-400" />
                <span><span className="font-bold text-white">{kpis.openFoliosCount}</span> open folios</span>
              </div>
              <span className="text-white/20">·</span>
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-indigo-400" />
                <span><span className="font-bold text-white">₹{kpis.outstandingBalance.toLocaleString("en-IN")}</span> outstanding balance</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <UnifiedBillsView
        propertyId={activePropertyId || ""}
        propertyName={currentProperty?.property_name || "Grand Azure Resort & Spa"}
        kpis={kpis}
        bills={bills}
        recentFolios={recentFolios}
        recentInvoices={recentInvoices}
        recentPayments={recentPayments}
        onRefresh={loadData}
      />
    </div>
  );
}

