"use client";

import * as React from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { ChargeType } from "@/lib/billing/types";
import { postManualFolioChargeAction } from "@/lib/billing/actions";
import { calculateFinancialTotals, DEFAULT_TAX_RATES } from "@/lib/billing/tax";
import { PlusCircle, Loader2 } from "lucide-react";

interface PostChargeModalProps {
  isOpen: boolean;
  onClose: () => void;
  propertyId: string;
  folioId: string;
  currency: string;
  onSuccess: () => void;
}

export function PostChargeModal({
  isOpen,
  onClose,
  propertyId,
  folioId,
  currency,
  onSuccess,
}: PostChargeModalProps) {
  const [chargeType, setChargeType] = React.useState<ChargeType>("SERVICE");
  const [description, setDescription] = React.useState("");
  const [quantity, setQuantity] = React.useState("1");
  const [unitPrice, setUnitPrice] = React.useState("");
  const [discountType, setDiscountType] = React.useState<"PERCENTAGE" | "FIXED">("FIXED");
  const [discountValue, setDiscountValue] = React.useState("");
  const [includeTax, setIncludeTax] = React.useState(true);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const parsedQty = parseFloat(quantity) || 1;
  const parsedPrice = parseFloat(unitPrice) || 0;
  const parsedDiscount = parseFloat(discountValue) || 0;
  const taxRate = includeTax
    ? chargeType === "RESTAURANT" || chargeType === "ROOM_SERVICE"
      ? DEFAULT_TAX_RATES.RESTAURANT
      : DEFAULT_TAX_RATES.ROOM
    : 0;

  const calculated = calculateFinancialTotals({
    quantity: parsedQty,
    unitPrice: parsedPrice,
    discountType,
    discountValue: parsedDiscount,
    taxRate,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      setError("Please provide a charge description.");
      return;
    }
    if (parsedPrice <= 0) {
      setError("Unit price must be greater than zero.");
      return;
    }

    setLoading(true);
    setError(null);

    const res = await postManualFolioChargeAction({
      propertyId,
      folioId,
      chargeType,
      description: description.trim(),
      quantity: parsedQty,
      unitPrice: parsedPrice,
      taxAmount: calculated.totalTax,
      discountAmount: calculated.discountAmount,
    });

    setLoading(false);

    if (!res.success) {
      setError(res.error || "Failed to post charge.");
      return;
    }

    onSuccess();
    onClose();
  };

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title="Post Folio Charge"
      description="Post a service, room amenity, or custom adjustment to this guest folio."
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-2">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-[var(--foreground)] uppercase tracking-wider mb-1">
              Charge Type
            </label>
            <select
              value={chargeType}
              onChange={(e) => setChargeType(e.target.value as ChargeType)}
              className="w-full h-10 px-3 rounded-lg border border-[var(--border)] bg-white dark:bg-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 text-[var(--foreground)]"
            >
              <option value="SERVICE">Service</option>
              <option value="ROOM">Room</option>
              <option value="RESTAURANT">Restaurant</option>
              <option value="ROOM_SERVICE">Room Service</option>
              <option value="ADJUSTMENT">Adjustment</option>
              <option value="OTHER">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--foreground)] uppercase tracking-wider mb-1">
              Quantity
            </label>
            <input
              type="number"
              min="1"
              step="1"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-[var(--border)] bg-white dark:bg-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 text-[var(--foreground)]"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[var(--foreground)] uppercase tracking-wider mb-1">
            Description
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="E.g., Airport Luxury Transfer, Spa Massage, Laundry"
            className="w-full h-10 px-3 rounded-lg border border-[var(--border)] bg-white dark:bg-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 text-[var(--foreground)]"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-[var(--foreground)] uppercase tracking-wider mb-1">
              Unit Price ({currency})
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={unitPrice}
              onChange={(e) => setUnitPrice(e.target.value)}
              placeholder="0.00"
              className="w-full h-10 px-3 rounded-lg border border-[var(--border)] bg-white dark:bg-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 text-[var(--foreground)]"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--foreground)] uppercase tracking-wider mb-1">
              Discount ({discountType === "PERCENTAGE" ? "%" : currency})
            </label>
            <div className="flex gap-1">
              <input
                type="number"
                min="0"
                step="0.01"
                value={discountValue}
                onChange={(e) => setDiscountValue(e.target.value)}
                placeholder="0"
                className="w-full h-10 px-3 rounded-lg border border-[var(--border)] bg-white dark:bg-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 text-[var(--foreground)]"
              />
              <button
                type="button"
                onClick={() =>
                  setDiscountType(discountType === "FIXED" ? "PERCENTAGE" : "FIXED")
                }
                className="px-2.5 h-10 rounded-lg border border-[var(--border)] bg-slate-100 dark:bg-slate-900 text-xs font-bold"
              >
                {discountType === "FIXED" ? currency : "%"}
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 pt-1">
          <input
            type="checkbox"
            id="includeTaxCheck"
            checked={includeTax}
            onChange={(e) => setIncludeTax(e.target.checked)}
            className="w-4 h-4 rounded border-slate-300 text-amber-500 focus:ring-amber-400"
          />
          <label htmlFor="includeTaxCheck" className="text-xs text-[var(--foreground)]">
            Apply standard GST / Tax ({Math.round(taxRate * 100)}%)
          </label>
        </div>

        {/* Calculation Preview */}
        <div className="p-3 bg-slate-50 dark:bg-slate-900 border border-[var(--border)] rounded-lg space-y-1 text-xs">
          <div className="flex justify-between text-[var(--foreground-muted)]">
            <span>Subtotal</span>
            <span>{currency} {calculated.subtotal.toFixed(2)}</span>
          </div>
          {calculated.discountAmount > 0 && (
            <div className="flex justify-between text-emerald-600">
              <span>Discount</span>
              <span>- {currency} {calculated.discountAmount.toFixed(2)}</span>
            </div>
          )}
          {calculated.totalTax > 0 && (
            <div className="flex justify-between text-[var(--foreground-muted)]">
              <span>Tax (GST)</span>
              <span>+ {currency} {calculated.totalTax.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-sm text-[var(--foreground)] pt-1 border-t border-[var(--border)]">
            <span>Total Charge</span>
            <span className="text-amber-600">{currency} {calculated.totalAmount.toFixed(2)}</span>
          </div>
        </div>

        {error && <p className="text-xs text-rose-500 font-medium">{error}</p>}

        <div className="flex items-center justify-end gap-2 pt-2">
          <Button variant="outline" size="sm" type="button" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            type="submit"
            disabled={loading}
            className="bg-amber-600 hover:bg-amber-500 text-white"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <PlusCircle className="w-4 h-4 mr-1.5" />}
            Post Charge
          </Button>
        </div>
      </form>
    </Modal>
  );
}
