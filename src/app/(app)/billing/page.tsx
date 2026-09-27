"use client";

import * as React from "react";
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
    <div className="space-y-6">
      <PageHeader
        title="Billing & Financial Ledger"
        description="Master billing hub: POS counter bills, guest QR orders, room stay charges, and tax receipts."
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Billing" }]}
      />
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

