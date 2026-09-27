"use client";

import * as React from "react";
import Link from "next/link";
import type { AttentionItem } from "@/lib/dashboard/types";
import { AlertCircle, AlertTriangle, Info, CheckCircle2, ArrowRight, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface OperationalAttentionProps {
  items: AttentionItem[];
  loading?: boolean;
}

const severityConfig = {
  danger: {
    iconBg: "bg-rose-100 text-rose-600 border-rose-200",
    iconColor: "#E11D48",
    borderColor: "#E11D48",
    rowBg: "bg-rose-50/60 hover:bg-rose-50 border-rose-200/80",
    badgeBg: "bg-rose-100 text-rose-800 border-rose-200",
    icon: AlertCircle,
  },
  warning: {
    iconBg: "bg-amber-100 text-amber-700 border-amber-200",
    iconColor: "#D97706",
    borderColor: "#F59E0B",
    rowBg: "bg-amber-50/60 hover:bg-amber-50 border-amber-200/80",
    badgeBg: "bg-amber-100 text-amber-800 border-amber-200",
    icon: AlertTriangle,
  },
  info: {
    iconBg: "bg-sky-100 text-sky-700 border-sky-200",
    iconColor: "#0284C7",
    borderColor: "#0EA5E9",
    rowBg: "bg-sky-50/60 hover:bg-sky-50 border-sky-200/80",
    badgeBg: "bg-sky-100 text-sky-800 border-sky-200",
    icon: Info,
  },
};

export function OperationalAttention({ items, loading }: OperationalAttentionProps) {
  if (loading) {
    return (
      <div className="rounded-2xl bg-white border border-slate-200/80 p-6 shadow-sm">
        <div className="animate-pulse space-y-3">
          <div className="h-4 w-40 bg-slate-200 rounded-md" />
          <div className="h-16 bg-slate-100 rounded-xl" />
          <div className="h-16 bg-slate-100 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="group relative overflow-hidden rounded-2xl bg-white border border-slate-200/80 p-6 shadow-[0_2px_12px_rgba(15,23,42,0.04)] hover:shadow-[0_8px_24px_rgba(15,23,42,0.08)] transition-all duration-300">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <h2 className="text-[15px] font-extrabold text-slate-900 tracking-tight">
            Needs Attention
          </h2>
          {items.length > 0 ? (
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-rose-100 text-rose-700 border border-rose-200 animate-pulse">
              {items.length}
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">
              0
            </span>
          )}
        </div>
        <span className="text-[10px] font-extrabold uppercase tracking-[0.14em] px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
          Operational
        </span>
      </div>

      {items.length === 0 ? (
        /* All clear */
        <div className="flex items-center gap-3.5 p-4 rounded-xl border border-emerald-200/80 bg-emerald-50/60">
          <div className="h-10 w-10 rounded-xl bg-emerald-100 border border-emerald-200 flex items-center justify-center shrink-0 shadow-xs">
            <ShieldCheck className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <h4 className="text-[13.5px] font-bold text-emerald-950 leading-tight">
              All Systems Operational
            </h4>
            <p className="text-[12px] text-emerald-700 mt-0.5 leading-relaxed">
              No pending room inspections, overdue work orders, or service bottlenecks.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const sev = item.severity as keyof typeof severityConfig;
            const cfg = severityConfig[sev] || severityConfig.info;
            const Icon = cfg.icon;

            return (
              <div
                key={item.id}
                className={cn(
                  "flex flex-col sm:flex-row sm:items-center justify-between rounded-xl border p-3.5 gap-3.5 transition-all duration-200 shadow-xs",
                  cfg.rowBg
                )}
                style={{
                  borderLeftWidth: "4px",
                  borderLeftColor: cfg.borderColor,
                }}
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div
                    className={cn(
                      "h-8.5 w-8.5 rounded-lg flex items-center justify-center shrink-0 mt-0.5 border shadow-xs",
                      cfg.iconBg
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-[13.5px] font-bold text-slate-900 leading-tight">
                      {item.title}
                    </h4>
                    <p className="text-[12px] font-medium text-slate-600 mt-0.5 leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                </div>

                {item.actionLabel && item.actionHref && (
                  <Link href={item.actionHref} className="self-end sm:self-auto shrink-0">
                    <Button
                      size="sm"
                      variant="secondary"
                      className="h-8 px-3 text-[11.5px] font-bold rounded-lg gap-1.5 bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 shadow-xs"
                    >
                      <span>{item.actionLabel}</span>
                      <ArrowRight className="h-3 w-3 text-slate-500" />
                    </Button>
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
