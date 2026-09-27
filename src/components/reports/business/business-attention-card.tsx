"use client";

import * as React from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { BusinessAttentionItem } from "@/lib/reports/business-types";
import {
  AlertTriangle,
  AlertCircle,
  Info,
  ArrowRight,
  ShieldAlert,
  CheckCircle2,
} from "lucide-react";

interface BusinessAttentionCardProps {
  items: BusinessAttentionItem[];
}

export function BusinessAttentionCard({ items }: BusinessAttentionCardProps) {
  if (items.length === 0) {
    return (
      <Card className="border-emerald-500/30 bg-emerald-500/5 shadow-xs p-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-foreground">
              All Operational & Financial Benchmarks Normal
            </h4>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              No outstanding risks, critical maintenance issues, or unusual expense surges detected for this reporting period.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="border-border/80 shadow-xs">
      <CardHeader className="py-3 px-4 border-b border-border/50 bg-muted/20 flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          <CardTitle className="text-xs font-bold uppercase tracking-wider text-foreground">
            Business Attention Required ({items.length})
          </CardTitle>
        </div>
        <span className="text-[11px] text-muted-foreground">
          Actionable alerts calculated from real-time operational data
        </span>
      </CardHeader>

      <CardContent className="p-3.5 space-y-2.5">
        {items.map((item) => {
          const isCritical = item.severity === "CRITICAL";
          const isWarning = item.severity === "WARNING";

          return (
            <div
              key={item.id}
              className={`p-3 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-colors ${
                isCritical
                  ? "bg-rose-500/5 border-rose-500/20 text-rose-950 dark:text-rose-200"
                  : isWarning
                  ? "bg-amber-500/5 border-amber-500/20 text-amber-950 dark:text-amber-200"
                  : "bg-blue-500/5 border-blue-500/20 text-blue-950 dark:text-blue-200"
              }`}
            >
              <div className="flex items-start gap-2.5 min-w-0">
                <div
                  className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 mt-0.5 ${
                    isCritical
                      ? "bg-rose-500/20 text-rose-600"
                      : isWarning
                      ? "bg-amber-500/20 text-amber-600"
                      : "bg-blue-500/20 text-blue-600"
                  }`}
                >
                  {isCritical ? (
                    <AlertTriangle className="w-3.5 h-3.5" />
                  ) : (
                    <AlertCircle className="w-3.5 h-3.5" />
                  )}
                </div>

                <div className="min-w-0">
                  <div className="text-xs font-bold text-foreground flex items-center gap-2">
                    <span>{item.title}</span>
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.2 rounded uppercase ${
                        isCritical
                          ? "bg-rose-500/20 text-rose-600"
                          : "bg-amber-500/20 text-amber-600"
                      }`}
                    >
                      {item.severity}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </div>

              {item.actionHref && (
                <div className="shrink-0 self-end sm:self-center">
                  <Link href={item.actionHref}>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs font-semibold gap-1 bg-background hover:bg-muted"
                    >
                      {item.actionLabel || "Review"}
                      <ArrowRight className="w-3 h-3" />
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
