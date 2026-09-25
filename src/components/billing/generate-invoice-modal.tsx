"use client";

import * as React from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { generateInvoiceAction } from "@/lib/billing/actions";
import { FileText, Loader2 } from "lucide-react";

interface GenerateInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  propertyId: string;
  folioId: string;
  defaultGuestName?: string;
  defaultEmail?: string;
  onSuccess: (invoiceId: string) => void;
}

function GenerateInvoiceForm({
  onClose,
  propertyId,
  folioId,
  defaultGuestName = "",
  defaultEmail = "",
  onSuccess,
}: Omit<GenerateInvoiceModalProps, "isOpen">) {
  const [billingName, setBillingName] = React.useState(defaultGuestName);
  const [billingEmail, setBillingEmail] = React.useState(defaultEmail);
  const [billingAddress, setBillingAddress] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!billingName.trim()) {
      setError("Billing recipient name is required.");
      return;
    }

    setLoading(true);
    setError(null);

    const res = await generateInvoiceAction({
      propertyId,
      folioId,
      billingName: billingName.trim(),
      billingEmail: billingEmail.trim() || undefined,
      billingAddress: billingAddress.trim() || undefined,
    });

    setLoading(false);

    if (!res.success || !res.invoice) {
      setError(res.error || "Failed to generate invoice.");
      return;
    }

    onSuccess(res.invoice.id);
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pt-2">
      <div>
        <label className="block text-xs font-semibold text-[var(--foreground)] uppercase tracking-wider mb-1">
          Billed To / Full Name <span className="text-rose-500">*</span>
        </label>
        <input
          type="text"
          value={billingName}
          onChange={(e) => setBillingName(e.target.value)}
          placeholder="Guest or Company Name"
          className="w-full h-10 px-3 rounded-lg border border-[var(--border)] bg-white dark:bg-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 text-[var(--foreground)]"
          required
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-[var(--foreground)] uppercase tracking-wider mb-1">
          Billing Email
        </label>
        <input
          type="email"
          value={billingEmail}
          onChange={(e) => setBillingEmail(e.target.value)}
          placeholder="billing@example.com"
          className="w-full h-10 px-3 rounded-lg border border-[var(--border)] bg-white dark:bg-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 text-[var(--foreground)]"
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-[var(--foreground)] uppercase tracking-wider mb-1">
          Billing Address / Tax GSTIN (Optional)
        </label>
        <textarea
          rows={2}
          value={billingAddress}
          onChange={(e) => setBillingAddress(e.target.value)}
          placeholder="Billing address, company GSTIN/VAT number..."
          className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-white dark:bg-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 text-[var(--foreground)] resize-none"
        />
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
          {loading ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <FileText className="w-4 h-4 mr-1.5" />}
          Generate Invoice
        </Button>
      </div>
    </form>
  );
}

export function GenerateInvoiceModal(props: GenerateInvoiceModalProps) {
  return (
    <Modal
      open={props.isOpen}
      onClose={props.onClose}
      title="Generate Final Invoice"
      description="Create a snapshot tax invoice from active charges and payments on this folio."
      size="md"
    >
      {props.isOpen && (
        <GenerateInvoiceForm
          onClose={props.onClose}
          propertyId={props.propertyId}
          folioId={props.folioId}
          defaultGuestName={props.defaultGuestName}
          defaultEmail={props.defaultEmail}
          onSuccess={props.onSuccess}
        />
      )}
    </Modal>
  );
}
