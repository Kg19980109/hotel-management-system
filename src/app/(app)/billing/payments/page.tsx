import { Metadata } from 'next';
import Link from 'next/link';
import { getPayments } from '@/lib/billing/queries';
import { CreditCard, ArrowLeft, ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export const metadata: Metadata = {
  title: 'Payments Ledger | StayHub Billing',
  description: 'View recorded payments, payment methods, transaction references, and refund statuses.',
};

export default async function PaymentsPage() {
  const payments = await getPayments();

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
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Payments Ledger</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Immutable log of all financial receipts, payment methods, and settlement references.
          </p>
        </div>
      </div>

      {/* Payments List */}
      <Card className="border-slate-200/80 shadow-sm overflow-hidden bg-white">
        <CardHeader className="border-b border-slate-100 bg-slate-50/50 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="text-base font-semibold text-slate-900 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-emerald-600" />
                All Payments ({payments.length})
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Recorded payments across Cash, Card, UPI, Bank Transfer, Online, and Wallet methods.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {payments.length === 0 ? (
            <div className="text-center py-16 px-4">
              <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
                <CreditCard className="w-6 h-6" />
              </div>
              <h3 className="text-base font-semibold text-slate-800 mb-1">No Payments Recorded Yet</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto mb-4">
                Record payments directly from guest folios during guest check-in, stay, or checkout settlement.
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
                    <th className="py-3 px-4">Payment Ref</th>
                    <th className="py-3 px-4">Date & Time</th>
                    <th className="py-3 px-4">Method</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Amount</th>
                    <th className="py-3 px-4">Notes</th>
                    <th className="py-3 px-4 text-center">Folio</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {payments.map((pay) => {
                    return (
                      <tr key={pay.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-semibold text-slate-900 text-xs">
                          {pay.payment_reference}
                        </td>
                        <td className="py-3.5 px-4 text-xs text-slate-600">
                          {new Date(pay.paid_at).toLocaleString(undefined, {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          })}
                        </td>
                        <td className="py-3.5 px-4">
                          <Badge variant="default" className="text-[10px] font-medium bg-slate-100/60 text-slate-800 border-slate-200">
                            {pay.payment_method.replace('_', ' ')}
                          </Badge>
                        </td>
                        <td className="py-3.5 px-4">
                          <Badge variant={pay.status === "COMPLETED" ? "success" : pay.status === "VOIDED" ? "danger" : "warning"} className="text-[10px] font-semibold uppercase">
                            {pay.status.replace('_', ' ')}
                          </Badge>
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-xs text-emerald-600">
                          ₹{pay.amount.toFixed(2)}
                        </td>
                        <td className="py-3.5 px-4 text-xs text-slate-500 max-w-xs truncate">
                          {pay.notes || '-'}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <Link
                            href={`/billing/folios/${pay.folio_id}`}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 p-1 rounded hover:bg-indigo-50 transition-colors"
                          >
                            View Folio <ExternalLink className="w-3 h-3" />
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
