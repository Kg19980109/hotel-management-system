"use client";

import * as React from "react";
import Link from "next/link";
import type { AttentionItem } from "@/lib/dashboard/types";
import { AlertCircle, AlertTriangle, Info, CheckCircle2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface OperationalAttentionProps {
  items: AttentionItem[];
  loading?: boolean;
}

const severityConfig = {
  danger: {
    iconBg: "var(--danger-light)",
    iconColor: "var(--danger)",
    borderColor: "var(--danger)",
    rowBg: "rgba(224,82,82,0.04)",
    rowHoverBg: "rgba(224,82,82,0.08)",
    rowBorder: "rgba(224,82,82,0.15)",
    icon: AlertCircle,
  },
  warning: {
    iconBg: "var(--warning-light)",
    iconColor: "var(--warning)",
    borderColor: "var(--warning)",
    rowBg: "rgba(231,165,26,0.04)",
    rowHoverBg: "rgba(231,165,26,0.08)",
    rowBorder: "rgba(231,165,26,0.15)",
    icon: AlertTriangle,
  },
  info: {
    iconBg: "var(--info-light)",
    iconColor: "var(--info)",
    borderColor: "var(--info)",
    rowBg: "rgba(59,130,246,0.04)",
    rowHoverBg: "rgba(59,130,246,0.08)",
    rowBorder: "rgba(59,130,246,0.15)",
    icon: Info,
  },
};

export function OperationalAttention({ items, loading }: OperationalAttentionProps) {
  if (loading) {
    return (
      <div className="stayhub-card p-5">
        <div className="animate-pulse space-y-3">
          <div className="h-4 w-40 bg-[var(--border)] rounded" />
          <div className="h-20 bg-[var(--secondary)] rounded-[var(--radius-lg)]" />
          <div className="h-20 bg-[var(--secondary)] rounded-[var(--radius-lg)]" />
        </div>
      </div>
    );
  }

  return (
    <div className="stayhub-card p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <h2 className="text-[14.5px] font-semibold text-[var(--foreground)]">
            Needs Attention
          </h2>
          {items.length > 0 && (
            <span
              className="px-2 py-0.5 rounded-full text-[10.5px] font-bold"
              style={{
                background: "var(--danger-light)",
                color: "var(--danger)",
              }}
            >
              {items.length}
            </span>
          )}
        </div>
        <span
          className="text-[9.5px] font-bold uppercase tracking-[0.12em] px-2 py-1 rounded-full"
          style={{
            background: "var(--secondary)",
            color: "var(--foreground-subtle)",
          }}
        >
          Operational
        </span>
      </div>

      {items.length === 0 ? (
        /* All clear */
        <div
          className="flex items-center gap-3 p-4 rounded-[var(--radius-lg)] border"
          style={{
            background: "rgba(22,163,106,0.05)",
            borderColor: "rgba(22,163,106,0.15)",
          }}
        >
          <div
            className="h-9 w-9 rounded-[var(--radius-md)] flex items-center justify-center shrink-0"
            style={{ background: "var(--success-light)", color: "var(--success)" }}
          >
            <CheckCircle2 className="h-4.5 w-4.5" style={{ width: 18, height: 18 }} />
          </div>
          <div>
            <h4 className="text-[13.5px] font-semibold text-[var(--foreground)]">
              All systems clear
            </h4>
            <p className="text-[11.5px] text-[var(--foreground-muted)] mt-0.5 leading-relaxed">
              Nothing requires immediate operational attention right now.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-2.5">
          {items.map((item) => {
            const sev = item.severity as keyof typeof severityConfig;
            const cfg = severityConfig[sev] || severityConfig.info;
            const Icon = cfg.icon;

            return (
              <div
                key={item.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between rounded-[var(--radius-lg)] border-l-[3px] p-3.5 gap-3 transition-colors"
                style={{
                  background: cfg.rowBg,
                  border: `1px solid ${cfg.rowBorder}`,
                  borderLeft: `3px solid ${cfg.borderColor}`,
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = cfg.rowHoverBg)}
                onMouseLeave={(e) => (e.currentTarget.style.background = cfg.rowBg)}
              >
                <div className="flex items-start gap-3">
                  <div
                    className="h-8 w-8 rounded-[var(--radius-md)] flex items-center justify-center shrink-0 mt-0.5"
                    style={{ background: cfg.iconBg }}
                  >
                    <Icon className="h-4 w-4" style={{ color: cfg.iconColor }} />
                  </div>
                  <div>
                    <h4 className="text-[13px] font-semibold text-[var(--foreground)] leading-tight">
                      {item.title}
                    </h4>
                    <p className="text-[11.5px] text-[var(--foreground-muted)] mt-0.5 leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                </div>

                {item.actionLabel && item.actionHref && (
                  <Link href={item.actionHref} className="self-end sm:self-auto shrink-0">
                    <Button
                      size="sm"
                      variant="secondary"
                      className="h-7 text-[11.5px] font-semibold gap-1"
                    >
                      {item.actionLabel}
                      <ArrowRight className="h-3 w-3" />
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
