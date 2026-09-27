"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type {
  HotelExpense,
  ExpenseCategory,
  CreateExpenseInput,
  UpdateExpenseInput,
  ExpensePaymentMethod,
  ExpenseStatus,
} from "@/lib/expenses/types";
import {
  createExpenseAction,
  updateExpenseAction,
  createExpenseCategoryAction,
} from "@/lib/expenses/actions";
import {
  Receipt,
  Plus,
  Building2,
  Calendar,
  CreditCard,
  Tag,
  DollarSign,
  FileText,
  Truck,
  AlertCircle,
} from "lucide-react";

interface AddEditExpenseModalProps {
  propertyId: string;
  isOpen: boolean;
  expenseToEdit?: HotelExpense | null;
  categories: ExpenseCategory[];
  suppliers: Array<{ id: string; name: string }>;
  departments: Array<{ id: string; name: string }>;
  onClose: () => void;
  onSuccess: () => void;
  onCategoryCreated?: (category: ExpenseCategory) => void;
}

const PAYMENT_METHODS: Array<{ label: string; value: ExpensePaymentMethod }> = [
  { label: "Cash", value: "CASH" },
  { label: "Bank Transfer", value: "BANK_TRANSFER" },
  { label: "UPI", value: "UPI" },
  { label: "Credit Card", value: "CREDIT_CARD" },
  { label: "Debit Card", value: "DEBIT_CARD" },
  { label: "Cheque", value: "CHEQUE" },
  { label: "Other", value: "OTHER" },
];

const STATUS_OPTIONS: Array<{ label: string; value: ExpenseStatus }> = [
  { label: "Recorded", value: "RECORDED" },
  { label: "Paid", value: "PAID" },
  { label: "Pending", value: "PENDING" },
  { label: "Draft", value: "DRAFT" },
];

export function AddEditExpenseModal({
  propertyId,
  isOpen,
  expenseToEdit,
  categories,
  suppliers,
  departments,
  onClose,
  onSuccess,
  onCategoryCreated,
}: AddEditExpenseModalProps) {
  const isEditing = Boolean(expenseToEdit);

  // Form states
  const [title, setTitle] = React.useState("");
  const [amount, setAmount] = React.useState("");
  const [expenseDate, setExpenseDate] = React.useState(new Date().toISOString().split("T")[0]);
  const [categoryId, setCategoryId] = React.useState("");
  const [subcategory, setSubcategory] = React.useState("");
  const [paymentMethod, setPaymentMethod] = React.useState<ExpensePaymentMethod>("CASH");
  const [vendorId, setVendorId] = React.useState("");
  const [vendorName, setVendorName] = React.useState("");
  const [departmentId, setDepartmentId] = React.useState("");
  const [invoiceNumber, setInvoiceNumber] = React.useState("");
  const [referenceNumber, setReferenceNumber] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [status, setStatus] = React.useState<ExpenseStatus>("RECORDED");
  const [receiptUrl, setReceiptUrl] = React.useState("");
  const [receiptFileName, setReceiptFileName] = React.useState("");

  // Inline Category Creator
  const [isAddingCategory, setIsAddingCategory] = React.useState(false);
  const [newCatName, setNewCatName] = React.useState("");
  const [isSavingCategory, setIsSavingCategory] = React.useState(false);

  // Submit states
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  // Initialize or reset form
  React.useEffect(() => {
    if (isOpen) {
      if (expenseToEdit) {
        setTitle(expenseToEdit.title || "");
        setAmount(expenseToEdit.amount ? String(expenseToEdit.amount) : "");
        setExpenseDate(expenseToEdit.expense_date || new Date().toISOString().split("T")[0]);
        setCategoryId(expenseToEdit.category_id || (categories[0]?.id || ""));
        setSubcategory(expenseToEdit.subcategory || "");
        setPaymentMethod(expenseToEdit.payment_method || "CASH");
        setVendorId(expenseToEdit.vendor_id || "");
        setVendorName(expenseToEdit.vendor_name || "");
        setDepartmentId(expenseToEdit.department_id || "");
        setInvoiceNumber(expenseToEdit.invoice_number || "");
        setReferenceNumber(expenseToEdit.reference_number || "");
        setDescription(expenseToEdit.description || "");
        setNotes(expenseToEdit.notes || "");
        setStatus(expenseToEdit.status || "RECORDED");
        setReceiptUrl(expenseToEdit.receipt_url || "");
        setReceiptFileName(expenseToEdit.receipt_file_name || "");
      } else {
        setTitle("");
        setAmount("");
        setExpenseDate(new Date().toISOString().split("T")[0]);
        setCategoryId(categories[0]?.id || "");
        setSubcategory("");
        setPaymentMethod("CASH");
        setVendorId("");
        setVendorName("");
        setDepartmentId("");
        setInvoiceNumber("");
        setReferenceNumber("");
        setDescription("");
        setNotes("");
        setStatus("RECORDED");
        setReceiptUrl("");
        setReceiptFileName("");
      }
      setIsAddingCategory(false);
      setNewCatName("");
      setErrorMsg(null);
    }
  }, [isOpen, expenseToEdit, categories]);

  // Handle Create Category Inline
  const handleCreateCategory = async () => {
    if (!newCatName.trim()) return;
    setIsSavingCategory(true);
    try {
      const res = await createExpenseCategoryAction(propertyId, newCatName.trim());
      if (res.success && res.data) {
        onCategoryCreated?.({
          id: res.data.id,
          property_id: propertyId,
          name: res.data.name,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
        setCategoryId(res.data.id);
        setIsAddingCategory(false);
        setNewCatName("");
      } else {
        setErrorMsg(res.error || "Failed to create category");
      }
    } catch {
      setErrorMsg("Failed to create category");
    } finally {
      setIsSavingCategory(false);
    }
  };

  // Handle Form Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    // Validate
    if (!title.trim()) {
      setErrorMsg("Expense name / title is required.");
      return;
    }
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount < 0) {
      setErrorMsg("Please enter a valid expense amount.");
      return;
    }
    if (!categoryId) {
      setErrorMsg("Please select an expense category.");
      return;
    }
    if (!expenseDate) {
      setErrorMsg("Expense date is required.");
      return;
    }

    setIsSubmitting(true);
    try {
      if (isEditing && expenseToEdit) {
        const updateInput: UpdateExpenseInput = {
          id: expenseToEdit.id,
          title: title.trim(),
          amount: numAmount,
          expenseDate,
          categoryId,
          subcategory: subcategory.trim() || undefined,
          paymentMethod,
          vendorId: vendorId || undefined,
          vendorName: vendorName.trim() || undefined,
          departmentId: departmentId || undefined,
          invoiceNumber: invoiceNumber.trim() || undefined,
          referenceNumber: referenceNumber.trim() || undefined,
          description: description.trim() || undefined,
          notes: notes.trim() || undefined,
          status,
          receiptUrl: receiptUrl.trim() || undefined,
          receiptFileName: receiptFileName.trim() || undefined,
        };

        const res = await updateExpenseAction(propertyId, updateInput);
        if (!res.success) {
          setErrorMsg(res.error || "Failed to update expense.");
          return;
        }
      } else {
        const createInput: CreateExpenseInput = {
          title: title.trim(),
          amount: numAmount,
          expenseDate,
          categoryId,
          subcategory: subcategory.trim() || undefined,
          paymentMethod,
          vendorId: vendorId || undefined,
          vendorName: vendorName.trim() || undefined,
          departmentId: departmentId || undefined,
          invoiceNumber: invoiceNumber.trim() || undefined,
          referenceNumber: referenceNumber.trim() || undefined,
          description: description.trim() || undefined,
          notes: notes.trim() || undefined,
          status,
          receiptUrl: receiptUrl.trim() || undefined,
          receiptFileName: receiptFileName.trim() || undefined,
        };

        const res = await createExpenseAction(propertyId, createInput);
        if (!res.success) {
          setErrorMsg(res.error || "Failed to record expense.");
          return;
        }
      }

      onSuccess();
      onClose();
    } catch (err) {
      console.error("Expense submit error:", err);
      setErrorMsg(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="border-b border-border/60 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Receipt className="w-4 h-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-foreground">
                {isEditing ? "Edit Hotel Expense" : "Record Hotel Expense Voucher"}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                {isEditing
                  ? `Update financial details for voucher #${expenseToEdit?.expense_number}`
                  : "Enter operational expenditure details, vendor invoice, and category."}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2 text-xs">
          {errorMsg && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-600 dark:text-rose-400 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Row 1: Title & Amount */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="font-semibold text-foreground block mb-1">
                Expense Name / Title <span className="text-rose-500">*</span>
              </label>
              <Input
                placeholder="e.g., Monthly Electricity Bill, Kitchen Linen Laundry"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="h-9 text-xs"
              />
            </div>

            <div>
              <label className="font-semibold text-foreground block mb-1">
                Amount (₹) <span className="text-rose-500">*</span>
              </label>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                className="h-9 text-xs font-mono font-semibold"
              />
            </div>
          </div>

          {/* Row 2: Category & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <div className="flex items-center justify-between mb-1">
                <label className="font-semibold text-foreground">
                  Category <span className="text-rose-500">*</span>
                </label>
                {!isAddingCategory ? (
                  <button
                    type="button"
                    onClick={() => setIsAddingCategory(true)}
                    className="text-[11px] text-primary hover:underline flex items-center gap-0.5"
                  >
                    <Plus className="w-3 h-3" /> New Category
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsAddingCategory(false)}
                    className="text-[11px] text-muted-foreground hover:underline"
                  >
                    Cancel
                  </button>
                )}
              </div>

              {!isAddingCategory ? (
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full h-9 px-2.5 bg-muted/40 border border-border rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="flex items-center gap-1.5">
                  <Input
                    placeholder="New category name..."
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    className="h-9 text-xs"
                  />
                  <Button
                    type="button"
                    size="sm"
                    disabled={isSavingCategory || !newCatName.trim()}
                    onClick={handleCreateCategory}
                    className="h-9 text-xs"
                  >
                    Save
                  </Button>
                </div>
              )}
            </div>

            <div>
              <label className="font-semibold text-foreground block mb-1">
                Expense Date <span className="text-rose-500">*</span>
              </label>
              <Input
                type="date"
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
                required
                className="h-9 text-xs"
              />
            </div>
          </div>

          {/* Row 3: Subcategory, Payment Method & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="font-semibold text-foreground block mb-1">Subcategory</label>
              <Input
                placeholder="e.g., Diesel, Cleaning Detergent"
                value={subcategory}
                onChange={(e) => setSubcategory(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            <div>
              <label className="font-semibold text-foreground block mb-1">
                Payment Method <span className="text-rose-500">*</span>
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as ExpensePaymentMethod)}
                className="w-full h-9 px-2.5 bg-muted/40 border border-border rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
              >
                {PAYMENT_METHODS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-semibold text-foreground block mb-1">Payment Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as ExpenseStatus)}
                className="w-full h-9 px-2.5 bg-muted/40 border border-border rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 4: Vendor & Department */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-foreground block mb-1">
                Vendor / Supplier
              </label>
              <div className="space-y-1.5">
                <select
                  value={vendorId}
                  onChange={(e) => {
                    setVendorId(e.target.value);
                    if (e.target.value) {
                      const found = suppliers.find((s) => s.id === e.target.value);
                      if (found) setVendorName(found.name);
                    }
                  }}
                  className="w-full h-9 px-2.5 bg-muted/40 border border-border rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
                >
                  <option value="">Select Existing Supplier (or type below)</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
                {!vendorId && (
                  <Input
                    placeholder="Or enter vendor / merchant name..."
                    value={vendorName}
                    onChange={(e) => setVendorName(e.target.value)}
                    className="h-8 text-xs"
                  />
                )}
              </div>
            </div>

            <div>
              <label className="font-semibold text-foreground block mb-1">
                Allocated Department
              </label>
              <select
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                className="w-full h-9 px-2.5 bg-muted/40 border border-border rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
              >
                <option value="">Hotel General / All Departments</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 5: Invoice Number, Reference Number & Receipt URL */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="font-semibold text-foreground block mb-1">Invoice Number</label>
              <Input
                placeholder="e.g., INV-98421"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                className="h-9 text-xs font-mono"
              />
            </div>

            <div>
              <label className="font-semibold text-foreground block mb-1">Reference / UTR / Cheque #</label>
              <Input
                placeholder="e.g., UTR-2026092801"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                className="h-9 text-xs font-mono"
              />
            </div>

            <div>
              <label className="font-semibold text-foreground block mb-1">Receipt URL / Attachment</label>
              <Input
                placeholder="https://... or doc link"
                value={receiptUrl}
                onChange={(e) => {
                  setReceiptUrl(e.target.value);
                  if (e.target.value && !receiptFileName) {
                    setReceiptFileName("Invoice Receipt");
                  }
                }}
                className="h-9 text-xs"
              />
            </div>
          </div>

          {/* Row 6: Description & Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-foreground block mb-1">Description / Line Items</label>
              <textarea
                rows={2}
                placeholder="Details about items purchased or services rendered..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full p-2.5 bg-muted/40 border border-border rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-primary text-foreground resize-none"
              />
            </div>

            <div>
              <label className="font-semibold text-foreground block mb-1">Internal Notes</label>
              <textarea
                rows={2}
                placeholder="Private remarks or approval remarks..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full p-2.5 bg-muted/40 border border-border rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-primary text-foreground resize-none"
              />
            </div>
          </div>

          <DialogFooter className="border-t border-border/60 pt-3 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isSubmitting}
              onClick={onClose}
              className="h-8 text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting}
              className="h-8 text-xs gap-1.5 font-semibold"
            >
              {isSubmitting ? (
                <>
                  <div className="w-3.5 h-3.5 rounded-full border-2 border-primary-foreground border-t-transparent animate-spin" />
                  <span>Saving...</span>
                </>
              ) : isEditing ? (
                "Update Expense"
              ) : (
                "Record Expense Voucher"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
