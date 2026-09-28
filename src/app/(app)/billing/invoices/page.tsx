import { Metadata } from 'next';
import Link from 'next/link';
import { getInvoices } from '@/lib/billing/queries';
import { FileText, ArrowLeft, ExternalLink, Printer, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Tax Invoices | StayHub Billing',
  description: 'View and manage guest tax invoices, line item snapshots, and payment status.',
};

export default async function InvoicesPage() {
  const invoices = await getInvoices();
  const paidCount = invoices.filter((i) => i.invoice_status === "PAID").length;
  const totalBilled = invoices.reduce((acc, i) => acc + (i.invoice_status !== "VOID" ? i.total_amount : 0), 0);

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
                <FileText className="h-3.5 w-3.5" />
                GST & TAX INVOICE ARCHIVE
              </div>
            </div>

            <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight leading-tight">
              Official Tax Invoices
              <span className="block text-white/60 text-sm font-normal mt-1">
                Authoritative financial tax invoices issued from finalized guest folios and direct billing
              </span>
            </h1>

            {/* Quick stats in banner */}
            <div className="flex items-center gap-4 mt-4 flex-wrap text-xs text-white/80">
              <span className="flex items-center gap-1.5 font-medium">
                <span className="font-bold text-white text-sm">{invoices.length}</span> invoices issued
              </span>
              <span className="text-white/30">•</span>
              <span className="flex items-center gap-1.5 font-medium text-emerald-300">
                <span className="h-2 w-2 rounded-full bg-emerald-400"></span>
                <span className="font-bold">{paidCount}</span> fully settled
              </span>
              <span className="text-white/30">•</span>
              <span className="flex items-center gap-1.5 font-medium text-amber-300">
                <span className="h-2 w-2 rounded-full bg-amber-400"></span>
                Total: <span className="font-bold">₹{totalBilled.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</span>
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
          <span className="text-[10.5px] font-bold text-muted-foreground uppercase">Total Invoices</span>
          <p className="text-xl font-black text-foreground">{invoices.length}</p>
        </div>
        <div className="p-4 rounded-2xl bg-card border border-emerald-500/30 shadow-xs space-y-1 border-l-4 border-l-emerald-500">
          <span className="text-[10.5px] font-bold text-emerald-600 uppercase">Paid Invoices</span>
          <p className="text-xl font-black text-emerald-600">{paidCount}</p>
        </div>
        <div className="p-4 rounded-2xl bg-card border shadow-xs space-y-1">
          <span className="text-[10.5px] font-bold text-muted-foreground uppercase">Invoiced Value</span>
          <p className="text-xl font-black text-foreground">₹{totalBilled.toFixed(2)}</p>
        </div>
        <div className="p-4 rounded-2xl bg-card border shadow-xs space-y-1">
          <span className="text-[10.5px] font-bold text-muted-foreground uppercase">Tax Standard</span>
          <p className="text-xl font-black text-foreground">GST Standard</p>
        </div>
      </div>

      {/* Invoices List */}
      <div className="rounded-2xl border bg-card shadow-xs overflow-hidden">
        <div className="p-4 border-b bg-muted/30 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-sm text-foreground">
            <FileText className="w-4 h-4 text-indigo-500" />
            <span>All Issued Invoices ({invoices.length})</span>
          </div>
        </div>

        {invoices.length === 0 ? (
          <div className="text-center py-16 px-4 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center mx-auto">
              <FileText className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-foreground">No Invoices Issued Yet</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Invoices can be generated from settled or active guest folios when billing is finalized.
            </p>
            <Link
              href="/billing/folios"
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition"
            >
              Go to Guest Folios
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b bg-muted/50 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  <th className="py-3 px-4">Invoice #</th>
                  <th className="py-3 px-4">Billed To</th>
                  <th className="py-3 px-4">Invoice Date</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Subtotal</th>
                  <th className="py-3 px-4 text-right">Tax (GST)</th>
                  <th className="py-3 px-4 text-right">Total (₹)</th>
                  <th className="py-3 px-4 text-right">Balance Due</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {invoices.map((inv) => {
                  return (
                    <tr key={inv.id} className="hover:bg-muted/20 transition-colors group">
                      <td className="py-3.5 px-4 font-mono font-black text-foreground text-xs">
                        <Link
                          href={`/billing/invoices/${inv.id}`}
                          className="hover:text-indigo-600 flex items-center gap-1.5"
                        >
                          <FileText className="w-3.5 h-3.5 text-indigo-500" />
                          <span>{inv.invoice_number}</span>
                        </Link>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-foreground text-xs">{inv.billing_name}</div>
                        {inv.billing_email && (
                          <div className="text-[10.5px] text-muted-foreground">{inv.billing_email}</div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-muted-foreground">
                        {new Date(inv.invoice_date).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border",
                            inv.invoice_status === "PAID"
                              ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                              : inv.invoice_status === "VOID"
                              ? "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30"
                              : "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30"
                          )}
                        >
                          {inv.invoice_status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-xs text-muted-foreground">
                        ₹{inv.subtotal.toFixed(2)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-xs text-muted-foreground">
                        ₹{inv.tax_amount.toFixed(2)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-black text-xs text-foreground">
                        ₹{inv.total_amount.toFixed(2)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-xs">
                        <span className={inv.balance_due > 0 ? 'text-amber-600' : 'text-emerald-600'}>
                          ₹{inv.balance_due.toFixed(2)}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <Link
                          href={`/billing/invoices/${inv.id}`}
                          className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-700 p-1.5 rounded-lg hover:bg-indigo-500/10 transition"
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
      </div>
    </div>
  );
}
