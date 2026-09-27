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
      {/* Header */}
      <PageHeader
        title="Hotel Expense Management"
        description={`Record operational expenditures, vendor invoices, utility receipts, and departmental costs for ${propertyName}.`}
        breadcrumbs={[{ label: "Business", href: "/expenses" }, { label: "Expenses" }]}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={isExporting}
              onClick={handleExportCsv}
              className="h-9 text-xs gap-1.5"
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
              className="h-9 text-xs gap-1.5 font-semibold bg-primary text-primary-foreground shadow-xs"
            >
              <Plus className="w-4 h-4" />
              Record Expense
            </Button>
          </div>
        }
      />

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
