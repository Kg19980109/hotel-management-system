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
            {/* Back link & Pill Badge */}
            <div className="flex items-center gap-3 mb-3">
              <Link
                href="/billing"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-white/70 hover:text-white transition"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Billing Hub
              </Link>
              <span className="text-white/30">•</span>
              <div
                className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] px-2.5 py-1 rounded-full border"
                style={{
                  color: "var(--brand-gold)",
                  borderColor: "rgba(214,168,90,0.30)",
                  background: "rgba(214,168,90,0.10)",
                }}
              >
                <CreditCard className="h-3.5 w-3.5" />
                PAYMENT GATEWAY & CASH DESK
              </div>
            </div>

            <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight leading-tight">
              Payments & Collections Ledger
              <span className="block text-white/60 text-sm font-normal mt-1">
                Immutable log of all financial receipts, UPI, card, cash desk transactions & settlements
              </span>
            </h1>

            {/* Quick stats in banner */}
            <div className="flex items-center gap-4 mt-4 flex-wrap text-xs text-white/80">
              <span className="flex items-center gap-1.5 font-medium">
                <span className="font-bold text-white text-sm">{payments.length}</span> payments logged
              </span>
              <span className="text-white/30">•</span>
              <span className="flex items-center gap-1.5 font-medium text-emerald-300">
                <span className="h-2 w-2 rounded-full bg-emerald-400"></span>
                <span className="font-bold">{completedCount}</span> completed
              </span>
              <span className="text-white/30">•</span>
              <span className="flex items-center gap-1.5 font-medium text-amber-300">
                <span className="h-2 w-2 rounded-full bg-amber-400"></span>
                Total Collected: <span className="font-bold">₹{totalReceived.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</span>
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2.5 flex-wrap shrink-0">
            <Link href="/billing/folios">
              <Button
                variant="outline"
                size="sm"
                className="h-10 text-xs font-semibold px-4 border-white/20 bg-white/5 text-white hover:bg-white/15 hover:text-white backdrop-blur-xs"
              >
                Guest Folios
              </Button>
            </Link>
            <Link href="/billing">
              <Button
                size="sm"
                className="h-10 text-xs px-4 gap-2 font-bold shadow-lg"
                style={{
                  background: "linear-gradient(135deg, #D4AF37 0%, #F59E0B 100%)",
                  color: "#08111F",
                }}
              >
                All Bills Feed
              </Button>
            </Link>
          </div>
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
