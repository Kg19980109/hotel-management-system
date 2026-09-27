"use client";

// ============================================================
// STAYHUB UNIFIED BILLS & ORDERS MANAGEMENT VIEW
// Complete Master Billing Hub: POS Bills, QR Orders, Room Folios, Invoices & Payments
// Currency: INR (₹)
// ============================================================

import * as React from "react";
import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Search,
  Receipt,
  Store,
  QrCode,
  Bed,
  FileText,
  CreditCard,
  Printer,
  RotateCcw,
  Eye,
  CheckCircle2,
  Clock,
  AlertCircle,
  X,
  ExternalLink,
  ChevronDown,
  Download,
  Filter,
  DollarSign,
  UtensilsCrossed,
  Sparkles,
  Car,
  Shirt,
  Check,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import {
  UnifiedBill,
  UnifiedBillingKPIs,
  UnifiedBillSource,
  UnifiedBillCategory,
  UnifiedBillPaymentStatus,
  GuestFolio,
  Invoice,
  FolioPayment,
} from "@/lib/billing/types";
import { completeOrderAction } from "@/lib/restaurant/actions";
import { cn } from "@/lib/utils";

interface UnifiedBillsViewProps {
  propertyId: string;
  propertyName?: string;
  kpis: UnifiedBillingKPIs;
  bills: UnifiedBill[];
  recentFolios?: GuestFolio[];
  recentInvoices?: Invoice[];
  recentPayments?: FolioPayment[];
  onRefresh: () => void;
}

export function UnifiedBillsView({
  propertyId,
  propertyName = "Grand Azure Resort & Spa",
  kpis,
  bills,
  recentFolios = [],
  recentInvoices = [],
  recentPayments = [],
  onRefresh,
}: UnifiedBillsViewProps) {
  const { success, error: toastError } = useToast();

  // Active Tab View
  const [activeTab, setActiveTab] = useState<
    "ALL" | "POS" | "QR" | "FOLIO" | "INVOICES" | "PAYMENTS"
  >("ALL");

  // Filters State
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState<UnifiedBillSource | "ALL">("ALL");
  const [categoryFilter, setCategoryFilter] = useState<UnifiedBillCategory | "ALL">("ALL");
  const [statusFilter, setStatusFilter] = useState<UnifiedBillPaymentStatus | "ALL">("ALL");
  const [dateFilter, setDateFilter] = useState<"ALL" | "TODAY" | "YESTERDAY" | "WEEK" | "MONTH">("ALL");
  const [sortBy, setSortBy] = useState<"NEWEST" | "OLDEST" | "AMOUNT_HIGH" | "AMOUNT_LOW">("NEWEST");

  // Selected Bill for Receipt Modal
  const [selectedBill, setSelectedBill] = useState<UnifiedBill | null>(null);
  const [isSettlingOrder, setIsSettlingOrder] = useState<string | null>(null);

  // Tab counts
  const tabCounts = useMemo(() => {
    const posCount = bills.filter((b) => b.source === "POS_ORDER").length;
    const qrCount = bills.filter((b) => b.source === "QR_ORDER" || b.source === "QR_SERVICE").length;
    const folioCount = bills.filter((b) => b.source === "FOLIO_CHARGE" || b.source === "ROOM_STAY").length;
    const invoiceCount = bills.filter((b) => b.source === "TAX_INVOICE").length + recentInvoices.length;
    const paymentCount = recentPayments.length;
    return {
      all: bills.length,
      pos: posCount,
      qr: qrCount,
      folio: folioCount,
      invoices: invoiceCount,
      payments: paymentCount,
    };
  }, [bills, recentInvoices.length, recentPayments.length]);

  // Filtered & Sorted Bills
  const filteredBills = useMemo(() => {
    return bills
      .filter((b) => {
        // Tab-level filtering
        if (activeTab === "POS" && b.source !== "POS_ORDER") return false;
        if (activeTab === "QR" && b.source !== "QR_ORDER" && b.source !== "QR_SERVICE") return false;
        if (activeTab === "FOLIO" && b.source !== "FOLIO_CHARGE" && b.source !== "ROOM_STAY") return false;
        if (activeTab === "INVOICES" && b.source !== "TAX_INVOICE") return false;

        // Custom Source filter
        if (sourceFilter !== "ALL" && b.source !== sourceFilter) return false;

        // Category filter
        if (categoryFilter !== "ALL" && b.category !== categoryFilter) return false;

        // Status filter
        if (statusFilter !== "ALL" && b.paymentStatus !== statusFilter) return false;

        // Date filter
        if (dateFilter !== "ALL") {
          const billDate = new Date(b.createdAt);
          const now = new Date();
          const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          const yesterdayStart = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000);
          const weekStart = new Date(todayStart.getTime() - 7 * 24 * 60 * 60 * 1000);
          const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

          if (dateFilter === "TODAY" && billDate < todayStart) return false;
          if (dateFilter === "YESTERDAY" && (billDate < yesterdayStart || billDate >= todayStart)) return false;
          if (dateFilter === "WEEK" && billDate < weekStart) return false;
          if (dateFilter === "MONTH" && billDate < monthStart) return false;
        }

        // Search text matching
        if (search.trim().length > 0) {
          const q = search.toLowerCase().trim();
          const matchNum = b.billNumber.toLowerCase().includes(q);
          const matchGuest = b.guestName.toLowerCase().includes(q);
          const matchRoom = (b.roomNumber || "").toLowerCase().includes(q);
          const matchTable = (b.tableNumber || "").toLowerCase().includes(q);
          const matchStaff = (b.cashierOrStaff || "").toLowerCase().includes(q);
          const matchItems = b.items.some((i) => i.name.toLowerCase().includes(q));
          const matchTitle = b.title.toLowerCase().includes(q);

          if (!matchNum && !matchGuest && !matchRoom && !matchTable && !matchStaff && !matchItems && !matchTitle) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === "NEWEST") return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        if (sortBy === "OLDEST") return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        if (sortBy === "AMOUNT_HIGH") return b.totalAmount - a.totalAmount;
        if (sortBy === "AMOUNT_LOW") return a.totalAmount - b.totalAmount;
        return 0;
      });
  }, [bills, activeTab, sourceFilter, categoryFilter, statusFilter, dateFilter, search, sortBy]);

  // Handle Quick Settlement for Pending Orders
  const handleSettleOrder = async (bill: UnifiedBill) => {
    if (!bill.orderId) return;
    try {
      setIsSettlingOrder(bill.id);
      await completeOrderAction(propertyId, bill.orderId, "Settled from Unified Billing Hub");
      success("Bill Settled", `Bill ${bill.billNumber} has been marked as Completed / Settled.`);
      onRefresh();
    } catch (err: unknown) {
      toastError("Settlement Failed", err instanceof Error ? err.message : "Could not settle order");
    } finally {
      setIsSettlingOrder(null);
    }
  };

  // Trigger Print Receipt
  const handlePrintReceipt = () => {
    window.print();
  };

  // Helper for Category Icons
  const getCategoryIcon = (category: UnifiedBillCategory) => {
    switch (category) {
      case "FOOD_BEVERAGE":
        return <UtensilsCrossed className="w-3.5 h-3.5 text-amber-500" />;
      case "ROOM_TARIFF":
        return <Bed className="w-3.5 h-3.5 text-blue-500" />;
      case "SPA_WELLNESS":
        return <Sparkles className="w-3.5 h-3.5 text-rose-500" />;
      case "LAUNDRY":
        return <Shirt className="w-3.5 h-3.5 text-indigo-500" />;
      case "TRANSPORT":
        return <Car className="w-3.5 h-3.5 text-teal-500" />;
      default:
        return <Receipt className="w-3.5 h-3.5 text-slate-500" />;
    }
  };

  // Helper for Source Badges
  const renderSourceBadge = (source: UnifiedBillSource) => {
    switch (source) {
      case "POS_ORDER":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <Store className="w-3 h-3" />
            <span>POS Counter</span>
          </span>
        );
      case "QR_ORDER":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <QrCode className="w-3 h-3" />
            <span>Guest QR Order</span>
          </span>
        );
      case "QR_SERVICE":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
            <Sparkles className="w-3 h-3" />
            <span>QR Service Charge</span>
          </span>
        );
      case "ROOM_STAY":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-bold bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
            <Bed className="w-3 h-3" />
            <span>Room Tariff</span>
          </span>
        );
      case "FOLIO_CHARGE":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
            <Receipt className="w-3 h-3" />
            <span>Folio Charge</span>
          </span>
        );
      case "TAX_INVOICE":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
            <FileText className="w-3 h-3" />
            <span>Tax Invoice</span>
          </span>
        );
    }
  };

  // Helper for Payment Status Badge
  const renderStatusBadge = (status: UnifiedBillPaymentStatus) => {
    switch (status) {
      case "PAID":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-3 h-3" />
            <span>Paid / Settled</span>
          </span>
        );
      case "ROOM_CHARGED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/30">
            <Bed className="w-3 h-3" />
            <span>Charged to Room</span>
          </span>
        );
      case "PENDING":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
            <Clock className="w-3 h-3" />
            <span>Pending Payment</span>
          </span>
        );
      case "VOID":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30">
            <X className="w-3 h-3" />
            <span>Cancelled / Void</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* ── 1. MASTER FINANCIAL KPI STRIP ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total Billed Revenue */}
        <div className="p-4 rounded-xl bg-card border shadow-xs space-y-1">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
            <TrendingUp className="w-3 h-3 text-emerald-500" />
            <span>Total Billed Sales</span>
          </p>
          <p className="text-xl font-black text-foreground">
            ₹{kpis.totalBilledAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[10px] text-muted-foreground">
            {bills.length} total bills created
          </p>
        </div>

        {/* POS Counter Sales */}
        <div className="p-4 rounded-xl bg-card border shadow-xs space-y-1 border-l-4 border-l-emerald-500">
          <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider flex items-center gap-1">
            <Store className="w-3 h-3 text-emerald-500" />
            <span>POS Counter Sales</span>
          </p>
          <p className="text-xl font-black text-emerald-600">
            ₹{kpis.posSalesTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[10px] text-muted-foreground">
            {kpis.posOrdersCount} counter / dine-in orders
          </p>
        </div>

        {/* Guest QR Digital Orders */}
        <div className="p-4 rounded-xl bg-card border shadow-xs space-y-1 border-l-4 border-l-amber-500">
          <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wider flex items-center gap-1">
            <QrCode className="w-3 h-3 text-amber-500" />
            <span>Guest QR Orders</span>
          </p>
          <p className="text-xl font-black text-amber-600">
            ₹{kpis.qrOrdersTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[10px] text-muted-foreground">
            {kpis.qrOrdersCount} in-room & digital charges
          </p>
        </div>

        {/* Room Folio Charges */}
        <div className="p-4 rounded-xl bg-card border shadow-xs space-y-1">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
            <Bed className="w-3 h-3 text-sky-500" />
            <span>Room Stay Charges</span>
          </p>
          <p className="text-xl font-black text-foreground">
            ₹{kpis.folioChargesTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[10px] text-muted-foreground">
            {kpis.folioChargesCount} posted room tariffs
          </p>
        </div>

        {/* Outstanding Balance */}
        <div className="p-4 rounded-xl bg-card border shadow-xs space-y-1 border-l-4 border-l-rose-500">
          <p className="text-[10px] font-bold text-rose-600 uppercase tracking-wider flex items-center gap-1">
            <AlertCircle className="w-3 h-3 text-rose-500" />
            <span>Outstanding Due</span>
          </p>
          <p className="text-xl font-black text-rose-600">
            ₹{kpis.outstandingBalance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[10px] text-muted-foreground">Unsettled room & order balance</p>
        </div>

        {/* Today's Payments Collected */}
        <div className="p-4 rounded-xl bg-card border shadow-xs space-y-1">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
            <CreditCard className="w-3 h-3 text-emerald-500" />
            <span>Today's Receipts</span>
          </p>
          <p className="text-xl font-black text-emerald-600">
            ₹{kpis.todayRevenue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[10px] text-muted-foreground">
            {kpis.todayPaymentsCount} payment transaction{kpis.todayPaymentsCount === 1 ? "" : "s"}
          </p>
        </div>
      </div>

      {/* ── 2. QUICK NAVIGATION TABS ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3">
        <div className="flex flex-wrap items-center gap-1.5 bg-muted/40 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => {
              setActiveTab("ALL");
              setSourceFilter("ALL");
            }}
            className={cn(
              "px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5",
              activeTab === "ALL"
                ? "bg-card text-foreground shadow-xs font-black border"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Receipt className="w-3.5 h-3.5 text-amber-500" />
            <span>All Bills & Orders</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-muted font-bold">
              {tabCounts.all}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("POS");
              setSourceFilter("POS_ORDER");
            }}
            className={cn(
              "px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5",
              activeTab === "POS"
                ? "bg-card text-foreground shadow-xs font-black border"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Store className="w-3.5 h-3.5 text-emerald-500" />
            <span>POS Counter Bills</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-500/10 text-emerald-600 font-bold">
              {tabCounts.pos}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("QR");
              setSourceFilter("ALL");
            }}
            className={cn(
              "px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5",
              activeTab === "QR"
                ? "bg-card text-foreground shadow-xs font-black border"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <QrCode className="w-3.5 h-3.5 text-amber-500" />
            <span>Guest QR Orders</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500/10 text-amber-600 font-bold">
              {tabCounts.qr}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("FOLIO");
              setSourceFilter("ALL");
            }}
            className={cn(
              "px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5",
              activeTab === "FOLIO"
                ? "bg-card text-foreground shadow-xs font-black border"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Bed className="w-3.5 h-3.5 text-sky-500" />
            <span>Room Folio Charges</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-sky-500/10 text-sky-600 font-bold">
              {tabCounts.folio}
            </span>
          </button>

          <Link href="/billing/invoices">
            <Button size="sm" variant="ghost" className="h-8 text-xs font-bold text-muted-foreground hover:text-foreground">
              <FileText className="w-3.5 h-3.5 mr-1 text-indigo-500" />
              Tax Invoices ({tabCounts.invoices})
            </Button>
          </Link>

          <Link href="/billing/payments">
            <Button size="sm" variant="ghost" className="h-8 text-xs font-bold text-muted-foreground hover:text-foreground">
              <CreditCard className="w-3.5 h-3.5 mr-1 text-emerald-500" />
              Payments ({tabCounts.payments})
            </Button>
          </Link>
        </div>

        {/* Top Actions */}
        <div className="flex items-center gap-2">
          <Link href="/restaurant/pos">
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-xs">
              <Store className="w-3.5 h-3.5 mr-1.5" />
              Open POS Terminal
            </Button>
          </Link>

          <Button size="sm" variant="outline" onClick={onRefresh} title="Refresh Live Bills">
            <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
            Refresh
          </Button>
        </div>
      </div>

      {/* ── 3. ADVANCED MULTI-FILTER TOOLBAR ── */}
      <div className="p-4 rounded-xl bg-card border shadow-xs space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-3 items-center">
          {/* Search Box */}
          <div className="lg:col-span-4 relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search bill #, guest name, room 302, item..."
              className="pl-9 h-9.5 text-xs bg-muted/20"
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

          {/* Category Filter */}
          <div className="lg:col-span-2">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as any)}
              aria-label="Filter by Service Category"
              className="w-full h-9.5 px-3 rounded-lg border border-border bg-card text-xs focus:outline-none focus:ring-2 focus:ring-amber-500 text-foreground"
            >
              <option value="ALL">All Categories</option>
              <option value="FOOD_BEVERAGE">Dining & Bar</option>
              <option value="ROOM_TARIFF">Room Accommodation</option>
              <option value="SPA_WELLNESS">Spa & Wellness</option>
              <option value="LAUNDRY">Laundry & Press</option>
              <option value="TRANSPORT">Transport & Cabs</option>
              <option value="SERVICES">Hotel Services</option>
            </select>
          </div>

          {/* Payment Status Filter */}
          <div className="lg:col-span-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              aria-label="Filter by Payment Status"
              className="w-full h-9.5 px-3 rounded-lg border border-border bg-card text-xs focus:outline-none focus:ring-2 focus:ring-amber-500 text-foreground"
            >
              <option value="ALL">All Payment Statuses</option>
              <option value="PAID">Paid / Settled</option>
              <option value="PENDING">Pending Payment</option>
              <option value="ROOM_CHARGED">Charged to Room Folio</option>
              <option value="VOID">Cancelled / Void</option>
            </select>
          </div>

          {/* Date Filter */}
          <div className="lg:col-span-2">
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as any)}
              aria-label="Filter by Date Range"
              className="w-full h-9.5 px-3 rounded-lg border border-border bg-card text-xs focus:outline-none focus:ring-2 focus:ring-amber-500 text-foreground"
            >
              <option value="ALL">All Dates</option>
              <option value="TODAY">Today</option>
              <option value="YESTERDAY">Yesterday</option>
              <option value="WEEK">Last 7 Days</option>
              <option value="MONTH">This Month</option>
            </select>
          </div>

          {/* Sort By */}
          <div className="lg:col-span-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              aria-label="Sort Bills By"
              className="w-full h-9.5 px-3 rounded-lg border border-border bg-card text-xs focus:outline-none focus:ring-2 focus:ring-amber-500 text-foreground"
            >
              <option value="NEWEST">Newest First</option>
              <option value="OLDEST">Oldest First</option>
              <option value="AMOUNT_HIGH">Amount: High to Low</option>
              <option value="AMOUNT_LOW">Amount: Low to High</option>
            </select>
          </div>
        </div>

        {/* Active Filter Chips summary */}
        {(search || sourceFilter !== "ALL" || categoryFilter !== "ALL" || statusFilter !== "ALL" || dateFilter !== "ALL") && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t text-[11px] text-muted-foreground">
            <span className="font-semibold">Active Filters:</span>
            {search && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 font-medium">
                Keyword: &quot;{search}&quot;
                <button onClick={() => setSearch("")}><X className="w-3 h-3" /></button>
              </span>
            )}
            {categoryFilter !== "ALL" && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 font-medium">
                Category: {categoryFilter}
                <button onClick={() => setCategoryFilter("ALL")}><X className="w-3 h-3" /></button>
              </span>
            )}
            {statusFilter !== "ALL" && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 font-medium">
                Status: {statusFilter}
                <button onClick={() => setStatusFilter("ALL")}><X className="w-3 h-3" /></button>
              </span>
            )}
            {dateFilter !== "ALL" && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-600 font-medium">
                Date: {dateFilter}
                <button onClick={() => setDateFilter("ALL")}><X className="w-3 h-3" /></button>
              </span>
            )}
            <button
              onClick={() => {
                setSearch("");
                setSourceFilter("ALL");
                setCategoryFilter("ALL");
                setStatusFilter("ALL");
                setDateFilter("ALL");
              }}
              className="text-amber-600 hover:text-amber-700 font-bold underline ml-2"
            >
              Reset All Filters
            </button>
          </div>
        )}
      </div>

      {/* ── 4. MASTER BILLS DATA TABLE ── */}
      {filteredBills.length === 0 ? (
        <div className="p-16 text-center rounded-2xl bg-card border border-dashed space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-muted/60 flex items-center justify-center mx-auto text-muted-foreground">
            <Receipt className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-foreground">No Bills Found</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            No bills or orders match your current filter selection. Try changing the filter criteria or creating a new bill.
          </p>
          <div className="pt-2 flex items-center justify-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearch("");
                setSourceFilter("ALL");
                setCategoryFilter("ALL");
                setStatusFilter("ALL");
                setDateFilter("ALL");
              }}
            >
              Clear Filters
            </Button>
            <Link href="/restaurant/pos">
              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
                <Store className="w-3.5 h-3.5 mr-1.5" />
                Create POS Bill
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border bg-card shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b bg-muted/50 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  <th className="py-3 px-4">Bill # / Reference</th>
                  <th className="py-3 px-4">Source & Category</th>
                  <th className="py-3 px-4">Customer / Location</th>
                  <th className="py-3 px-4">Item Breakdown</th>
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-4 text-right">Amount (₹)</th>
                  <th className="py-3 px-4 text-center">Payment Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredBills.map((bill) => {
                  return (
                    <tr
                      key={bill.id}
                      className="hover:bg-muted/20 transition-colors group cursor-pointer"
                      onClick={() => setSelectedBill(bill)}
                    >
                      {/* Bill # */}
                      <td className="py-3.5 px-4">
                        <div className="font-mono font-black text-foreground group-hover:text-amber-600 text-xs flex items-center gap-1.5">
                          <Receipt className="w-3.5 h-3.5 text-muted-foreground group-hover:text-amber-500" />
                          <span>{bill.billNumber}</span>
                        </div>
                        {bill.cashierOrStaff && (
                          <span className="text-[10px] text-muted-foreground block truncate max-w-[140px]">
                            {bill.cashierOrStaff}
                          </span>
                        )}
                      </td>

                      {/* Source & Category */}
                      <td className="py-3.5 px-4 space-y-1">
                        <div>{renderSourceBadge(bill.source)}</div>
                        <div className="flex items-center gap-1 text-[11px] text-muted-foreground font-medium">
                          {getCategoryIcon(bill.category)}
                          <span>{bill.categoryLabel}</span>
                        </div>
                      </td>

                      {/* Customer / Location */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-foreground text-xs">{bill.guestName}</div>
                        <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                          {bill.roomNumber && (
                            <span className="px-1.5 py-0.2 rounded font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10.5px]">
                              Room {bill.roomNumber}
                            </span>
                          )}
                          {bill.tableNumber && (
                            <span className="px-1.5 py-0.2 rounded font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10.5px]">
                              Table {bill.tableNumber}
                            </span>
                          )}
                          {bill.guestPhone && (
                            <span className="text-[10.5px] text-muted-foreground font-mono">
                              {bill.guestPhone}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Items Summary */}
                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="flex flex-wrap gap-1">
                          {bill.items.slice(0, 2).map((it, idx) => (
                            <span
                              key={idx}
                              className="px-1.5 py-0.5 rounded bg-muted/70 text-foreground text-[10.5px] font-medium truncate max-w-[150px]"
                            >
                              {it.quantity}x {it.name}
                            </span>
                          ))}
                          {bill.items.length > 2 && (
                            <span className="px-1.5 py-0.5 rounded bg-muted/90 text-muted-foreground text-[10px] font-bold">
                              +{bill.items.length - 2} more
                            </span>
                          )}
                        </div>
                        {bill.description && (
                          <p className="text-[10px] text-muted-foreground italic truncate mt-0.5">
                            {bill.description}
                          </p>
                        )}
                      </td>

                      {/* Date & Time */}
                      <td className="py-3.5 px-4 text-muted-foreground text-[11px] whitespace-nowrap">
                        <div className="font-medium text-foreground">
                          {new Date(bill.createdAt).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </div>
                        <div className="text-[10px]">
                          {new Date(bill.createdAt).toLocaleTimeString(undefined, {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      </td>

                      {/* Amount */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="font-mono font-black text-sm text-foreground">
                          ₹{bill.totalAmount.toFixed(2)}
                        </div>
                        {bill.taxAmount > 0 && (
                          <div className="text-[10px] text-muted-foreground font-mono">
                            incl. ₹{bill.taxAmount.toFixed(2)} tax
                          </div>
                        )}
                      </td>

                      {/* Payment Status */}
                      <td className="py-3.5 px-4 text-center">
                        {renderStatusBadge(bill.paymentStatus)}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Settle Action if pending */}
                          {bill.paymentStatus === "PENDING" && bill.orderId && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-[11px] font-bold bg-emerald-500/10 text-emerald-600 border-emerald-500/30 hover:bg-emerald-500 hover:text-white"
                              disabled={isSettlingOrder === bill.id}
                              onClick={() => handleSettleOrder(bill)}
                            >
                              <Check className="w-3 h-3 mr-1" />
                              {isSettlingOrder === bill.id ? "Settling..." : "Settle"}
                            </Button>
                          )}

                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-muted-foreground hover:text-foreground"
                            onClick={() => setSelectedBill(bill)}
                            title="View Itemized Receipt"
                          >
                            <Eye className="w-3.5 h-3.5 mr-1" />
                            <span>View</span>
                          </Button>

                          {bill.folioId && (
                            <Link href={`/billing/folios/${bill.folioId}`}>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 px-1.5 text-muted-foreground hover:text-foreground"
                                title="Open Guest Folio"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </Button>
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Table Footer */}
          <div className="p-3 border-t bg-muted/20 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
            <div>
              Showing <span className="font-bold text-foreground">{filteredBills.length}</span> of{" "}
              <span className="font-bold text-foreground">{bills.length}</span> total bills
            </div>
            <div className="flex items-center gap-4 font-mono font-bold text-foreground">
              <span>
                Filtered Total:{" "}
                <span className="text-emerald-600 dark:text-emerald-400">
                  ₹{filteredBills.reduce((acc, b) => acc + (b.paymentStatus !== "VOID" ? b.totalAmount : 0), 0).toFixed(2)}
                </span>
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ── 5. ITEMIZED RECEIPT / BILL MODAL ── */}
      {selectedBill && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-card border rounded-3xl p-6 space-y-5 shadow-2xl max-h-[92vh] overflow-y-auto print:p-0 print:border-none print:shadow-none">
            {/* Modal Actions */}
            <div className="flex items-center justify-between pb-3 border-b print:hidden">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-amber-500" />
                <h3 className="font-black text-foreground text-base">Tax Receipt & Bill</h3>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handlePrintReceipt}
                  className="h-8 text-xs font-bold"
                >
                  <Printer className="w-3.5 h-3.5 mr-1" />
                  Print Bill
                </Button>
                <button
                  onClick={() => setSelectedBill(null)}
                  className="w-8 h-8 rounded-full bg-muted/60 hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Printable Receipt Paper Container */}
            <div className="space-y-4 p-5 rounded-2xl bg-muted/30 border font-mono text-xs">
              {/* Hotel Header */}
              <div className="text-center space-y-1 pb-3 border-b border-dashed">
                <h2 className="text-base font-black text-foreground uppercase tracking-wider">
                  {propertyName}
                </h2>
                <p className="text-[11px] text-muted-foreground">
                  Luxury Hospitality & Guest Services
                </p>
                <p className="text-[10px] text-muted-foreground">
                  GSTIN: 27AABCS1429B1Z • Official Tax Invoice / Bill
                </p>
              </div>

              {/* Bill Details Info Grid */}
              <div className="grid grid-cols-2 gap-2 text-[11px] pb-3 border-b border-dashed">
                <div>
                  <span className="text-muted-foreground block text-[10px]">BILL / ORDER NUMBER:</span>
                  <span className="font-bold text-foreground">{selectedBill.billNumber}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px]">DATE & TIME:</span>
                  <span className="font-bold text-foreground">
                    {new Date(selectedBill.createdAt).toLocaleString(undefined, {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px]">BILLED TO / GUEST:</span>
                  <span className="font-bold text-foreground">{selectedBill.guestName}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px]">LOCATION / ROOM:</span>
                  <span className="font-bold text-foreground">
                    {selectedBill.roomNumber ? `Room ${selectedBill.roomNumber}` : selectedBill.tableNumber ? `Table ${selectedBill.tableNumber}` : "Counter Sales"}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px]">SOURCE:</span>
                  <span className="font-bold text-foreground">{selectedBill.sourceLabel}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px]">SERVER / CASHIER:</span>
                  <span className="font-bold text-foreground">{selectedBill.cashierOrStaff || "Staff"}</span>
                </div>
              </div>

              {/* Itemized Line Items Table */}
              <div className="space-y-2 pb-3 border-b border-dashed">
                <div className="grid grid-cols-12 text-[10.5px] font-bold text-muted-foreground uppercase border-b pb-1">
                  <span className="col-span-6">Item Description</span>
                  <span className="col-span-2 text-center">Qty</span>
                  <span className="col-span-2 text-right">Price</span>
                  <span className="col-span-2 text-right">Total</span>
                </div>

                {selectedBill.items.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-12 text-[11px] text-foreground">
                    <div className="col-span-6">
                      <span className="font-medium">{item.name}</span>
                      {item.notes && (
                        <span className="block text-[9.5px] text-muted-foreground italic">
                          ({item.notes})
                        </span>
                      )}
                    </div>
                    <span className="col-span-2 text-center text-muted-foreground">{item.quantity}</span>
                    <span className="col-span-2 text-right text-muted-foreground">₹{item.unitPrice.toFixed(2)}</span>
                    <span className="col-span-2 text-right font-bold">₹{item.totalPrice.toFixed(2)}</span>
                  </div>
                ))}
              </div>

              {/* Financial Calculation Totals */}
              <div className="space-y-1.5 text-[11px]">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal Amount:</span>
                  <span>₹{selectedBill.subtotal.toFixed(2)}</span>
                </div>
                {selectedBill.discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-600 font-bold">
                    <span>Discount Applied:</span>
                    <span>-₹{selectedBill.discountAmount.toFixed(2)}</span>
                  </div>
                )}
                {selectedBill.taxAmount > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>Goods & Services Tax (GST 5% / 18%):</span>
                    <span>+₹{selectedBill.taxAmount.toFixed(2)}</span>
                  </div>
                )}
                {selectedBill.serviceChargeAmount && selectedBill.serviceChargeAmount > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>Service Charge:</span>
                    <span>+₹{selectedBill.serviceChargeAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-black text-foreground pt-2 border-t border-dashed">
                  <span>GRAND TOTAL (INR):</span>
                  <span className="text-amber-600 dark:text-amber-400">
                    ₹{selectedBill.totalAmount.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Payment Stamp */}
              <div className="pt-3 border-t border-dashed flex items-center justify-between text-[11px]">
                <div>
                  <span className="text-muted-foreground block text-[10px]">PAYMENT METHOD:</span>
                  <span className="font-bold text-foreground uppercase">{selectedBill.paymentMethod || "CASH"}</span>
                </div>
                <div className="text-right">
                  <span className="text-muted-foreground block text-[10px]">STATUS:</span>
                  <div>{renderStatusBadge(selectedBill.paymentStatus)}</div>
                </div>
              </div>

              {/* Notes */}
              {selectedBill.notes && (
                <div className="pt-2 text-[10px] text-muted-foreground italic border-t border-dashed">
                  Note: {selectedBill.notes}
                </div>
              )}
            </div>

            {/* Modal Bottom Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 print:hidden">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedBill(null)}
                className="text-xs"
              >
                Close Receipt
              </Button>

              <div className="flex items-center gap-2">
                {selectedBill.paymentStatus === "PENDING" && selectedBill.orderId && (
                  <Button
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
                    disabled={isSettlingOrder === selectedBill.id}
                    onClick={() => handleSettleOrder(selectedBill)}
                  >
                    <Check className="w-3.5 h-3.5 mr-1" />
                    {isSettlingOrder === selectedBill.id ? "Settling..." : "Mark as Paid / Settled"}
                  </Button>
                )}

                <Button
                  size="sm"
                  onClick={handlePrintReceipt}
                  className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs"
                >
                  <Printer className="w-3.5 h-3.5 mr-1.5" />
                  Print Receipt
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
