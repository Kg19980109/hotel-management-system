"use client";

import * as React from "react";
import Link from "next/link";
import type { AttentionItem } from "@/lib/dashboard/types";
import { AlertCircle, AlertTriangle, Info, CheckCircle2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface OperationalAttentionProps {
  items: AttentionItem[];
  loading?: boolean;
}

export function OperationalAttention({ items, loading }: OperationalAttentionProps) {
  if (loading) {
    return (
      <div className="stayhub-card p-5">
        <div className="animate-pulse space-y-3">
          <div className="h-5 w-40 bg-slate-200 rounded" />
          <div className="h-20 bg-slate-100 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="stayhub-card p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h2 className="text-[15px] font-semibold text-[var(--foreground)]">
            Needs Attention
          </h2>
          {items.length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-[var(--danger-light)] text-[var(--danger)]">
              {items.length}
            </span>
          )}
        </div>
        <span className="text-[11px] text-[var(--foreground-subtle)] uppercase tracking-wider font-semibold">
          Operational Priority
        </span>
      </div>

      {items.length === 0 ? (
        <div className="flex items-center gap-3 p-4 rounded-[var(--radius-lg)] bg-[var(--success-light)]/50 border border-[var(--success)]/20">
          <div className="h-8 w-8 rounded-full bg-[var(--success-light)] text-[var(--success)] flex items-center justify-center shrink-0">
            <CheckCircle2 className="h-4 w-4" />
          </div>
          <div>
            <h4 className="text-[13.5px] font-medium text-[var(--foreground)]">
              All systems clear
            </h4>
            <p className="text-[12px] text-[var(--foreground-muted)]">
              Nothing requires immediate operational attention right now.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const isDanger = item.severity === "danger";
            const isWarning = item.severity === "warning";
            const iconBg = isDanger
              ? "bg-red-50 text-red-600 border-red-200"
              : isWarning
              ? "bg-amber-50 text-amber-600 border-amber-200"
              : "bg-blue-50 text-blue-600 border-blue-200";

            return (
              <div
                key={item.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--secondary)]/40 transition-colors gap-3"
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`h-8 w-8 rounded-[var(--radius-md)] border flex items-center justify-center shrink-0 mt-0.5 ${iconBg}`}
                  >
                    {isDanger ? (
                      <AlertCircle className="h-4 w-4" />
                    ) : isWarning ? (
                      <AlertTriangle className="h-4 w-4" />
                    ) : (
                      <Info className="h-4 w-4" />
                    )}
                  </div>
                  <div>
                    <h4 className="text-[13px] font-semibold text-[var(--foreground)]">
                      {item.title}
                    </h4>
                    <p className="text-[12px] text-[var(--foreground-muted)] mt-0.5 leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                </div>

                {item.actionLabel && item.actionHref && (
                  <Link href={item.actionHref} className="self-end sm:self-auto shrink-0">
                    <Button size="sm" variant="outline" className="h-7 text-xs">
                      {item.actionLabel}
                      <ArrowRight className="h-3 w-3 ml-1" />
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
