"use client";

import * as React from "react";
import Link from "next/link";
import { Sparkles, ArrowRight, Bot, LineChart, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

export function AIBuddyPreview() {
  return (
    <div
      className="rounded-[var(--radius-xl)] p-5 text-white relative overflow-hidden border"
      style={{
        background: "linear-gradient(155deg, #0D1433 0%, #111A3C 50%, #0F1630 100%)",
        borderColor: "rgba(81,70,229,0.20)",
        boxShadow: "0 4px 20px rgba(81,70,229,0.10)",
      }}
    >
      {/* Ambient glow */}
      <div
        className="absolute -top-12 -right-12 h-40 w-40 rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(81,70,229,0.18) 0%, transparent 70%)" }}
      />

      {/* Header */}
      <div className="flex items-center justify-between mb-3 relative z-10">
        <div className="flex items-center gap-2.5">
          <div
            className="h-8 w-8 rounded-[var(--radius-md)] flex items-center justify-center border"
            style={{
              background: "rgba(81,70,229,0.20)",
              borderColor: "rgba(81,70,229,0.30)",
              color: "#A5B4FC",
            }}
          >
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-[13.5px] font-bold text-white tracking-tight flex items-center gap-1.5">
              AI Business Buddy
              <span
                className="text-[9.5px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border"
                style={{
                  background: "rgba(81,70,229,0.22)",
                  borderColor: "rgba(81,70,229,0.30)",
                  color: "#A5B4FC",
                }}
              >
                Preview
              </span>
            </h3>
          </div>
        </div>
        <span className="text-[10px] font-mono" style={{ color: "rgba(255,255,255,0.25)" }}>
          Phase 18
        </span>
      </div>

      <p className="text-[11.5px] leading-relaxed mb-4 relative z-10" style={{ color: "rgba(255,255,255,0.45)" }}>
        AI-driven occupancy forecasting, dynamic rate recommendations, and operational bottleneck alerts
        will automatically unlock as live booking and front-desk activity accumulates.
      </p>

      {/* Feature chips */}
      <div className="grid grid-cols-3 gap-1.5 mb-4 relative z-10">
        {[
          { icon: LineChart, label: "Demand Forecasting", color: "#A5B4FC" },
          { icon: Zap, label: "Dynamic Pricing", color: "var(--brand-gold)" },
          { icon: Bot, label: "Staffing Optimization", color: "var(--success)" },
        ].map(({ icon: Icon, label, color }) => (
          <div
            key={label}
            className="flex items-center gap-1.5 px-2 py-1.5 rounded-[var(--radius-sm)] text-[10.5px] border"
            style={{
              background: "rgba(255,255,255,0.05)",
              borderColor: "rgba(255,255,255,0.08)",
              color: "rgba(255,255,255,0.45)",
            }}
          >
            <Icon className="h-3.5 w-3.5 shrink-0" style={{ color }} />
            <span className="truncate">{label}</span>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div
        className="flex items-center justify-between pt-3 relative z-10 border-t"
        style={{ borderColor: "rgba(255,255,255,0.08)" }}
      >
        <span className="text-[10.5px]" style={{ color: "rgba(255,255,255,0.25)" }}>
          No live AI queries executed
        </span>
        <Link href="/ai">
          <Button
            size="sm"
            variant="ghost"
            className="text-[11px] gap-1 h-7 px-2.5 font-semibold"
            style={{ color: "#A5B4FC" }}
          >
            Explore AI Vision
            <ArrowRight className="h-3 w-3" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
