"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { ExpenseKpiSummaryView } from "./expense-kpi-summary";
import { ExpenseAnalyticsCharts } from "./expense-analytics-charts";
import { ExpenseFiltersView } from "./expense-filters";
import { ExpenseLedgerTable } from "./expense-ledger-table";
import { ExpenseDetailModal } from "./expense-detail-modal";
import { AddEditExpenseModal } from "./add-edit-expense-modal";
import { VoidExpenseModal } from "./void-expense-modal";
import {
  fetchExpensesAction,
  fetchExpenseSummaryAction,
  fetchExpenseFormDataAction,
  exportExpensesCsvAction,
} from "@/lib/expenses/actions";
import type {
  HotelExpense,
  ExpenseCategory,
  ExpenseFilterParams,
  ExpensePaginationResult,
  ExpenseAnalyticsData,
} from "@/lib/expenses/types";
import {
  Plus,
  Download,
  Receipt,
  RefreshCw,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface ExpenseManagerViewProps {
  propertyId: string;
  propertyName: string;
  currency?: string;
}

const DEFAULT_FILTERS: ExpenseFilterParams = {
  preset: "THIS_MONTH",
  page: 1,
  pageSize: 20,
  sortBy: "expense_date",
  sortOrder: "desc",
};

export function ExpenseManagerView({
  propertyId,
  propertyName,
  currency = "INR",
}: ExpenseManagerViewProps) {
  // State for filters & data
  const [filters, setFilters] = React.useState<ExpenseFilterParams>(DEFAULT_FILTERS);
  const [ledgerData, setLedgerData] = React.useState<ExpensePaginationResult>({
    items: [],
    totalCount: 0,
    page: 1,
    pageSize: 20,
    totalPages: 0,
  });
  const [analytics, setAnalytics] = React.useState<ExpenseAnalyticsData>({
    summary: {
      totalExpenses: 0,
      thisMonthExpenses: 0,
      todayExpenses: 0,
      expenseCount: 0,
      averageDailyExpense: 0,
      topCategory: null,
      largestExpense: null,
      previousPeriodTotal: 0,
      changePercentage: 0,
    },
    byCategory: [],
    byDepartment: [],
    topVendors: [],
    dailyTrends: [],
    largestExpenses: [],
  });

  // Supporting form options
  const [categories, setCategories] = React.useState<ExpenseCategory[]>([]);
  const [suppliers, setSuppliers] = React.useState<Array<{ id: string; name: string }>>([]);
  const [departments, setDepartments] = React.useState<Array<{ id: string; name: string }>>([]);

  // Loading & export states
  const [isLoadingLedger, setIsLoadingLedger] = React.useState(true);
  const [isLoadingAnalytics, setIsLoadingAnalytics] = React.useState(true);
  const [isExporting, setIsExporting] = React.useState(false);
  const [showAnalyticsSection, setShowAnalyticsSection] = React.useState(true);

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = React.useState(false);
  const [expenseToEdit, setExpenseToEdit] = React.useState<HotelExpense | null>(null);
  const [expenseToView, setExpenseToView] = React.useState<HotelExpense | null>(null);
  const [expenseToVoid, setExpenseToVoid] = React.useState<HotelExpense | null>(null);

  // Load Form Options once
  React.useEffect(() => {
    let active = true;
    void fetchExpenseFormDataAction(propertyId).then((res) => {
      if (active && res.data) {
        setCategories(res.data.categories);
        setSuppliers(res.data.suppliers);
        setDepartments(res.data.departments);
      }
    });
    return () => {
      active = false;
    };
  }, [propertyId]);

  // Load Ledger Table
  const loadLedger = React.useCallback(async () => {
    setIsLoadingLedger(true);
    try {
      const res = await fetchExpensesAction(propertyId, filters);
      if (res.data) {
        setLedgerData(res.data);
      }
    } catch (err) {
      console.error("Failed to load expenses ledger:", err);
    } finally {
      setIsLoadingLedger(false);
    }
  }, [propertyId, filters]);

  // Load Analytics Summary
  const loadAnalytics = React.useCallback(async () => {
    setIsLoadingAnalytics(true);
    try {
      const res = await fetchExpenseSummaryAction(propertyId, {
        preset: filters.preset,
        startDate: filters.startDate,
        endDate: filters.endDate,
      });
      if (res.data) {
        setAnalytics(res.data);
      }
    } catch (err) {
      console.error("Failed to load expense analytics:", err);
    } finally {
      setIsLoadingAnalytics(false);
    }
  }, [propertyId, filters.preset, filters.startDate, filters.endDate]);

  // Initial and reactive load
  React.useEffect(() => {
    void loadLedger();
  }, [loadLedger]);

  React.useEffect(() => {
    void loadAnalytics();
  }, [loadAnalytics]);

  // Fast 2s visible-only poll for real-time live synchronization
  React.useEffect(() => {
    const timer = setInterval(() => {
      if (document.visibilityState !== "visible") return;
      void loadLedger();
      void loadAnalytics();
    }, 2000);

    return () => clearInterval(timer);
  }, [loadLedger, loadAnalytics]);

  // Filter handlers
  const handleFiltersChange = (newPartial: Partial<ExpenseFilterParams>) => {
    setFilters((prev) => ({ ...prev, ...newPartial }));
  };

  const handleResetFilters = () => {
    setFilters(DEFAULT_FILTERS);
  };

  const handlePageChange = (newPage: number) => {
    setFilters((prev) => ({ ...prev, page: newPage }));
  };

  const handleSortChange = (sortBy: ExpenseFilterParams["sortBy"]) => {
    setFilters((prev) => ({
      ...prev,
      sortBy,
      sortOrder: prev.sortBy === sortBy && prev.sortOrder === "asc" ? "desc" : "asc",
      page: 1,
    }));
  };

  // CSV Export
  const handleExportCsv = async () => {
    setIsExporting(true);
    try {
      const res = await exportExpensesCsvAction(propertyId, filters);
      if (res.data?.content) {
        const blob = new Blob([res.data.content], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", res.data.filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (err) {
      console.error("Failed to export CSV:", err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-5 pb-12">
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
            {/* Pill Badge */}
            <div
              className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] px-2.5 py-1 rounded-full border mb-3"
              style={{
                color: "var(--brand-gold)",
                borderColor: "rgba(214,168,90,0.30)",
                background: "rgba(214,168,90,0.10)",
              }}
            >
              <Receipt className="h-3.5 w-3.5" />
              FINANCIAL AUDIT & EXPENDITURES
            </div>

            <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight leading-tight">
              Expense Management
              <span className="block text-white/60 text-sm font-normal mt-1">
                Operational expenditures, vendor invoices, utility bills & departmental costs for {propertyName}
              </span>
            </h1>

            {/* Quick KPI stats in banner */}
            <div className="flex items-center gap-4 mt-4 flex-wrap text-xs text-white/80">
              <span className="flex items-center gap-1.5 font-medium">
                <span className="font-bold text-white text-sm">
                  {analytics.summary.expenseCount}
                </span>{" "}
                records logged
              </span>
              <span className="text-white/30">•</span>
              <span className="flex items-center gap-1.5 font-medium">
                <span className="h-2 w-2 rounded-full bg-amber-400"></span>
                Total:{" "}
                <span className="font-bold text-amber-300">
                  {currency === "INR" ? "₹" : currency}{" "}
                  {Number(analytics.summary.totalExpenses || 0).toLocaleString("en-IN", {
                    maximumFractionDigits: 0,
                  })}
                </span>
              </span>
              <span className="text-white/30">•</span>
              <span className="flex items-center gap-1.5 font-medium">
                <span className="h-2 w-2 rounded-full bg-cyan-400"></span>
                This Month:{" "}
                <span className="font-bold text-cyan-200">
                  {currency === "INR" ? "₹" : currency}{" "}
                  {Number(analytics.summary.thisMonthExpenses || 0).toLocaleString("en-IN", {
                    maximumFractionDigits: 0,
                  })}
                </span>
              </span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2.5 flex-wrap shrink-0">
            <Button
              variant="outline"
              size="sm"
              disabled={isExporting}
              onClick={handleExportCsv}
              className="h-10 text-xs font-semibold px-4 border-white/20 bg-white/5 text-white hover:bg-white/15 hover:text-white backdrop-blur-xs gap-2"
            >
              <Download className="w-3.5 h-3.5" />
              {isExporting ? "Exporting..." : "Export CSV"}
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setExpenseToEdit(null);
                setIsAddModalOpen(true);
              }}
              className="h-10 text-xs px-4 gap-2 font-bold shadow-lg"
              style={{
                background: "linear-gradient(135deg, #D4AF37 0%, #F59E0B 100%)",
                color: "#08111F",
              }}
            >
              <Plus className="w-4 h-4" />
              Record Expense
            </Button>
          </div>
        </div>
      </div>

      {/* 1. Executive KPI Strip */}
      <ExpenseKpiSummaryView
        summary={analytics.summary}
        currency={currency}
        isLoading={isLoadingAnalytics}
      />

      {/* 2. Visual Analytics Section (Collapsible) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <SlidersHorizontal className="w-3.5 h-3.5 text-primary" />
            Spending Intelligence & Analytics
          </div>
          <button
            type="button"
            onClick={() => setShowAnalyticsSection((prev) => !prev)}
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
          >
            {showAnalyticsSection ? (
              <>
                Hide Charts <ChevronUp className="w-3 h-3" />
              </>
            ) : (
              <>
                Show Charts <ChevronDown className="w-3 h-3" />
              </>
            )}
          </button>
        </div>

        {showAnalyticsSection && (
          <ExpenseAnalyticsCharts
            analytics={analytics}
            currency={currency}
            onSelectCategory={(catId) => handleFiltersChange({ categoryId: catId, page: 1 })}
            onSelectVendor={(vId) => handleFiltersChange({ vendorId: vId, page: 1 })}
            onSelectExpense={(exp) => setExpenseToView(exp)}
          />
        )}
      </div>

      {/* 3. Filter Controls */}
      <ExpenseFiltersView
        filters={filters}
        categories={categories}
        suppliers={suppliers}
        departments={departments}
        onFiltersChange={handleFiltersChange}
        onReset={handleResetFilters}
      />

      {/* 4. Financial Ledger Table & Cards */}
      <ExpenseLedgerTable
        data={ledgerData}
        filters={filters}
        currency={currency}
        isLoading={isLoadingLedger}
        onPageChange={handlePageChange}
        onSortChange={handleSortChange}
        onViewExpense={(exp) => setExpenseToView(exp)}
        onEditExpense={(exp) => {
          setExpenseToEdit(exp);
          setIsAddModalOpen(true);
        }}
        onVoidExpense={(exp) => setExpenseToVoid(exp)}
      />

      {/* Modals */}
      <AddEditExpenseModal
        propertyId={propertyId}
        isOpen={isAddModalOpen}
        expenseToEdit={expenseToEdit}
        categories={categories}
        suppliers={suppliers}
        departments={departments}
        onClose={() => {
          setIsAddModalOpen(false);
          setExpenseToEdit(null);
        }}
        onSuccess={() => {
          void loadLedger();
          void loadAnalytics();
        }}
        onCategoryCreated={(newCat) => {
          setCategories((prev) => [...prev, newCat]);
        }}
      />

      <ExpenseDetailModal
        propertyId={propertyId}
        expense={expenseToView}
        isOpen={Boolean(expenseToView)}
        currency={currency}
        onClose={() => setExpenseToView(null)}
        onEdit={(exp) => {
          setExpenseToView(null);
          setExpenseToEdit(exp);
          setIsAddModalOpen(true);
        }}
        onVoid={(exp) => {
          setExpenseToView(null);
          setExpenseToVoid(exp);
        }}
      />

      <VoidExpenseModal
        propertyId={propertyId}
        expense={expenseToVoid}
        isOpen={Boolean(expenseToVoid)}
        currency={currency}
        onClose={() => setExpenseToVoid(null)}
        onSuccess={() => {
          void loadLedger();
          void loadAnalytics();
        }}
      />
    </div>
  );
}
