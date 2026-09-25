"use client";

import * as React from "react";
import Link from "next/link";
import { Sparkles, ArrowRight, Bot, LineChart, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

export function AIBuddyPreview() {
  return (
    <div className="rounded-[var(--radius-xl)] bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-5 text-white shadow-lg border border-indigo-900/40 relative overflow-hidden">
      {/* Background ambient glow */}
      <div className="absolute -top-12 -right-12 h-36 w-36 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white tracking-wide flex items-center gap-1.5">
              AI Business Buddy
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-indigo-500/30 text-indigo-300 border border-indigo-500/30">
                Preview
              </span>
            </h3>
          </div>
        </div>

        <span className="text-[11px] text-slate-400 font-mono">
          Phase 18 Integration
        </span>
      </div>

      <p className="text-[12.5px] text-slate-300 leading-relaxed font-normal mb-4">
        AI-driven occupancy forecasting, dynamic rate recommendations, and operational bottleneck alerts will automatically unlock as live booking and front-desk activity accumulate.
      </p>

      {/* Feature capabilities preview chips */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-4">
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-white/5 border border-white/10 text-[11px] text-slate-300">
          <LineChart className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
          <span className="truncate">Demand Forecasting</span>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-white/5 border border-white/10 text-[11px] text-slate-300">
          <Zap className="h-3.5 w-3.5 text-amber-400 shrink-0" />
          <span className="truncate">Dynamic Pricing</span>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-white/5 border border-white/10 text-[11px] text-slate-300">
          <Bot className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
          <span className="truncate">Staffing Optimization</span>
        </div>
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-white/10">
        <span className="text-[11px] text-slate-400">
          No live AI queries executed in Phase 5
        </span>
        <Link href="/ai">
          <Button
            size="sm"
            variant="ghost"
            className="text-xs text-indigo-300 hover:text-white hover:bg-white/10 h-7 px-2.5 font-medium"
          >
            Explore AI Vision
            <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
