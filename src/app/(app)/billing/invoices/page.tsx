import { Metadata } from 'next';
import Link from 'next/link';
import { getInvoices } from '@/lib/billing/queries';
import { FileText, ArrowLeft, ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export const metadata: Metadata = {
  title: 'Invoices | StayHub Billing',
  description: 'View and manage guest tax invoices, line item snapshots, and payment status.',
};

export default async function InvoicesPage() {
  const invoices = await getInvoices();

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/billing"
              className="text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Billing
            </Link>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Tax Invoices</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Authoritative financial invoices issued from finalized guest folios.
          </p>
        </div>
      </div>

      {/* Invoices List */}
      <Card className="border-slate-200/80 shadow-sm overflow-hidden bg-white">
        <CardHeader className="border-b border-slate-100 bg-slate-50/50 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="text-base font-semibold text-slate-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-600" />
                All Invoices ({invoices.length})
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Immutable invoice records with exact tax, discount, and itemized charge snapshots.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {invoices.length === 0 ? (
            <div className="text-center py-16 px-4">
              <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-3">
                <FileText className="w-6 h-6" />
              </div>
              <h3 className="text-base font-semibold text-slate-800 mb-1">No Invoices Issued Yet</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto mb-4">
                Invoices can be generated from settled or active guest folios when billing is finalized.
              </p>
              <Link
                href="/billing/folios"
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
              >
                Go to Guest Folios
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/60 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <th className="py-3 px-4">Invoice #</th>
                    <th className="py-3 px-4">Billed To</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Subtotal</th>
                    <th className="py-3 px-4 text-right">Tax</th>
                    <th className="py-3 px-4 text-right">Total</th>
                    <th className="py-3 px-4 text-right">Balance Due</th>
                    <th className="py-3 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {invoices.map((inv) => {
                    return (
                      <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors group">
                        <td className="py-3.5 px-4 font-mono font-semibold text-slate-900 text-xs">
                          <Link
                            href={`/billing/invoices/${inv.id}`}
                            className="hover:text-indigo-600 flex items-center gap-1.5"
                          >
                            <FileText className="w-3.5 h-3.5 text-indigo-500" />
                            {inv.invoice_number}
                          </Link>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-medium text-slate-900 text-xs">{inv.billing_name}</div>
                          {inv.billing_email && (
                            <div className="text-[11px] text-muted-foreground">{inv.billing_email}</div>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-xs text-slate-600">
                          {new Date(inv.invoice_date).toLocaleDateString(undefined, {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </td>
                        <td className="py-3.5 px-4">
                          <Badge variant={inv.invoice_status === "PAID" ? "success" : inv.invoice_status === "VOID" ? "danger" : "warning"} className="text-[10px] font-semibold uppercase">
                            {inv.invoice_status}
                          </Badge>
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono text-xs text-slate-600">
                          ₹{inv.subtotal.toFixed(2)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono text-xs text-slate-600">
                          ₹{inv.tax_amount.toFixed(2)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-xs text-slate-900">
                          ₹{inv.total_amount.toFixed(2)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-semibold text-xs">
                          <span className={inv.balance_due > 0 ? 'text-amber-600' : 'text-emerald-600'}>
                            ₹{inv.balance_due.toFixed(2)}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <Link
                            href={`/billing/invoices/${inv.id}`}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 p-1.5 rounded hover:bg-indigo-50 transition-colors"
                          >
                            View <ExternalLink className="w-3.5 h-3.5" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
