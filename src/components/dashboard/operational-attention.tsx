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
    <div className="group relative overflow-hidden rounded-2xl bg-white border border-slate-200/80 p-4 sm:p-4.5 shadow-[0_1px_4px_rgba(15,23,42,0.03)] hover:shadow-[0_6px_20px_rgba(15,23,42,0.06)] transition-all duration-200">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h2 className="text-[14px] font-black text-slate-900 tracking-tight">
            Needs Attention
          </h2>
          {items.length > 0 ? (
            <span className="px-2 py-0.2 rounded-full text-[10.5px] font-black bg-rose-100 text-rose-700 border border-rose-200 animate-pulse">
              {items.length}
            </span>
          ) : (
            <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">
              0
            </span>
          )}
        </div>
        <span className="text-[9.5px] font-black uppercase tracking-[0.12em] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
          Operational
        </span>
      </div>

      {items.length === 0 ? (
        /* All clear */
        <div className="flex items-center gap-2.5 p-3 rounded-xl border border-emerald-200/80 bg-emerald-50/60">
          <div className="h-8 w-8 rounded-lg bg-emerald-100 border border-emerald-200 flex items-center justify-center shrink-0 shadow-2xs">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
          </div>
          <div>
            <h4 className="text-[12.5px] font-bold text-emerald-950 leading-tight">
              All Systems Operational
            </h4>
            <p className="text-[11px] text-emerald-700 mt-0.5 leading-tight">
              No pending room inspections or overdue work orders.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item) => {
            const sev = item.severity as keyof typeof severityConfig;
            const cfg = severityConfig[sev] || severityConfig.info;
            const Icon = cfg.icon;

            return (
              <div
                key={item.id}
                className={cn(
                  "flex flex-col sm:flex-row sm:items-center justify-between rounded-xl border p-2.5 sm:p-3 gap-2.5 transition-all duration-150 shadow-2xs",
                  cfg.rowBg
                )}
                style={{
                  borderLeftWidth: "3.5px",
                  borderLeftColor: cfg.borderColor,
                }}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={cn(
                      "h-7.5 w-7.5 rounded-lg flex items-center justify-center shrink-0 border shadow-2xs",
                      cfg.iconBg
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-[12.5px] font-bold text-slate-900 leading-tight">
                      {item.title}
                    </h4>
                    <p className="text-[11px] font-medium text-slate-600 mt-0.5 leading-snug line-clamp-1">
                      {item.description}
                    </p>
                  </div>
                </div>

                {item.actionLabel && item.actionHref && (
                  <Link href={item.actionHref} className="self-end sm:self-auto shrink-0">
                    <Button
                      size="sm"
                      variant="secondary"
                      className="h-7 px-2.5 text-[11px] font-bold rounded-lg gap-1 bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 shadow-2xs"
                    >
                      <span>{item.actionLabel}</span>
                      <ArrowRight className="h-2.5 w-2.5 text-slate-500" />
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
