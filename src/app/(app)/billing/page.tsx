"use client";

import * as React from "react";
import { useAuth } from "@/lib/auth/context";
import { PageHeader } from "@/components/shared/page-header";
import { LoadingState, ErrorState } from "@/components/ui/states";
import {
  getBillingKPIs,
  getPropertyFolios,
  getPropertyInvoices,
  getPropertyPayments,
} from "@/lib/billing/queries";
import {
  BillingKPIs,
  GuestFolio,
  Invoice,
  FolioPayment,
} from "@/lib/billing/types";
import { BillingDashboardView } from "@/components/billing/billing-dashboard-view";

export default function BillingPage() {
  const { currentProperty, loading: authLoading } = useAuth();
  const activePropertyId = currentProperty?.property_id;

  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [kpis, setKpis] = React.useState<BillingKPIs>({
    todayRevenue: 0,
    outstandingBalance: 0,
    openFoliosCount: 0,
    settledFoliosCount: 0,
    todayPaymentsCount: 0,
    todayRefundsTotal: 0,
  });
  const [recentFolios, setRecentFolios] = React.useState<GuestFolio[]>([]);
  const [recentInvoices, setRecentInvoices] = React.useState<Invoice[]>([]);
  const [recentPayments, setRecentPayments] = React.useState<FolioPayment[]>([]);

  const loadData = React.useCallback(async () => {
    if (!activePropertyId) return;
    try {
      setLoading(true);
      setError(null);

      const [kpiData, foliosData, invoicesData, paymentsData] = await Promise.all([
        getBillingKPIs(activePropertyId),
        getPropertyFolios(activePropertyId),
        getPropertyInvoices(activePropertyId),
        getPropertyPayments(activePropertyId),
      ]);

      setKpis(kpiData);
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

  if (authLoading || (loading && !recentFolios.length && !recentInvoices.length)) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Billing & Financial Ledger"
          description="Manage guest folios, record payments, calculate taxes, and generate tax invoices."
          breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Billing" }]}
        />
        <LoadingState message="Loading financial ledger..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Billing & Financial Ledger"
          description="Manage guest folios, record payments, calculate taxes, and generate tax invoices."
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
        description="Manage guest folios, record payments, calculate taxes, and generate tax invoices."
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Billing" }]}
      />
      <BillingDashboardView
        propertyId={activePropertyId || ""}
        kpis={kpis}
        recentFolios={recentFolios}
        recentInvoices={recentInvoices}
        recentPayments={recentPayments}
        onRefresh={loadData}
      />
    </div>
  );
}
