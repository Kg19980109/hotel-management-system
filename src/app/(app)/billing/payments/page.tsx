import { Metadata } from 'next';
import Link from 'next/link';
import { getPayments } from '@/lib/billing/queries';
import { CreditCard, ArrowLeft, ExternalLink, Banknote, QrCode, Building, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Payments Ledger | StayHub Billing',
  description: 'View recorded payments, payment methods, transaction references, and refund statuses.',
};

export default async function PaymentsPage() {
  const payments = await getPayments();
  const completedCount = payments.filter((p) => p.status === "COMPLETED").length;
  const totalReceived = payments.reduce((acc, p) => acc + (p.status === "COMPLETED" ? p.amount : 0), 0);

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case "CASH":
        return <Banknote className="w-3.5 h-3.5 text-emerald-500" />;
      case "UPI":
        return <QrCode className="w-3.5 h-3.5 text-amber-500" />;
      case "CARD":
        return <CreditCard className="w-3.5 h-3.5 text-blue-500" />;
      case "BANK_TRANSFER":
        return <Building className="w-3.5 h-3.5 text-purple-500" />;
      default:
        return <CreditCard className="w-3.5 h-3.5 text-slate-500" />;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/billing"
              className="text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground flex items-center gap-1 transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Billing Hub
            </Link>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2.5">
            <CreditCard className="w-6 h-6 text-emerald-500" />
            <span>Payments & Collections Ledger</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Immutable log of all financial receipts, cashless UPI, credit cards, cash desk transactions, and settlements.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/billing">
            <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs shadow-xs">
              All Bills Feed
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-card border shadow-xs space-y-1">
          <span className="text-[10.5px] font-bold text-muted-foreground uppercase">Total Transactions</span>
          <p className="text-xl font-black text-foreground">{payments.length}</p>
        </div>
        <div className="p-4 rounded-2xl bg-card border border-emerald-500/30 shadow-xs space-y-1 border-l-4 border-l-emerald-500">
          <span className="text-[10.5px] font-bold text-emerald-600 uppercase">Completed Receipts</span>
          <p className="text-xl font-black text-emerald-600">{completedCount}</p>
        </div>
        <div className="p-4 rounded-2xl bg-card border shadow-xs space-y-1">
          <span className="text-[10.5px] font-bold text-muted-foreground uppercase">Total Collected</span>
          <p className="text-xl font-black text-emerald-600">₹{totalReceived.toFixed(2)}</p>
        </div>
        <div className="p-4 rounded-2xl bg-card border shadow-xs space-y-1">
          <span className="text-[10.5px] font-bold text-muted-foreground uppercase">Settlement Currency</span>
          <p className="text-xl font-black text-foreground">INR (₹)</p>
        </div>
      </div>

      {/* Payments List */}
      <div className="rounded-2xl border bg-card shadow-xs overflow-hidden">
        <div className="p-4 border-b bg-muted/30 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-sm text-foreground">
            <CreditCard className="w-4 h-4 text-emerald-500" />
            <span>All Payment Transactions ({payments.length})</span>
          </div>
        </div>

        {payments.length === 0 ? (
          <div className="text-center py-16 px-4 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center mx-auto">
              <CreditCard className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-foreground">No Payments Recorded Yet</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Record payments directly from guest folios, POS counters, or during guest check-out.
            </p>
            <Link
              href="/billing/folios"
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition"
            >
              Go to Guest Folios
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b bg-muted/50 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  <th className="py-3 px-4">Payment Ref</th>
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-4">Method</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Amount (₹)</th>
                  <th className="py-3 px-4">Notes</th>
                  <th className="py-3 px-4 text-right">Folio Link</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {payments.map((pay) => {
                  return (
                    <tr key={pay.id} className="hover:bg-muted/20 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-black text-foreground text-xs">
                        {pay.payment_reference}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-muted-foreground">
                        {new Date(pay.paid_at).toLocaleString(undefined, {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10.5px] font-bold bg-muted text-foreground border">
                          {getPaymentMethodIcon(pay.payment_method)}
                          <span>{pay.payment_method.replace('_', ' ')}</span>
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border",
                            pay.status === "COMPLETED"
                              ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                              : pay.status === "VOIDED"
                              ? "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30"
                              : "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30"
                          )}
                        >
                          {pay.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-black text-sm text-emerald-600 dark:text-emerald-400">
                        ₹{pay.amount.toFixed(2)}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-muted-foreground max-w-xs truncate">
                        {pay.notes || '-'}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <Link
                          href={`/billing/folios/${pay.folio_id}`}
                          className="inline-flex items-center gap-1 text-xs font-bold text-amber-600 hover:text-amber-700 p-1.5 rounded-lg hover:bg-amber-500/10 transition"
                        >
                          View Folio <ExternalLink className="w-3.5 h-3.5" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
