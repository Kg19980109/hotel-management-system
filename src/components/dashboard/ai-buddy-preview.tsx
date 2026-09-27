"use client";

import * as React from "react";
import Link from "next/link";
import { Sparkles, ArrowRight, Bot, LineChart, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

export function AIBuddyPreview() {
  return (
    <div
      className="rounded-2xl p-4 sm:p-4.5 text-white relative overflow-hidden border transition-all duration-300 shadow-lg"
      style={{
        background: "linear-gradient(135deg, #0B102B 0%, #111942 50%, #182255 100%)",
        borderColor: "rgba(99, 102, 241, 0.25)",
        boxShadow: "0 10px 25px -10px rgba(11, 16, 43, 0.5), 0 0 0 1px rgba(165, 180, 252, 0.15)",
      }}
    >
      {/* Top glowing line */}
      <div
        className="absolute top-0 left-0 right-0 h-[1.5px]"
        style={{
          background: "linear-gradient(90deg, transparent 0%, rgba(165, 180, 252, 0.5) 50%, transparent 100%)",
        }}
      />

      {/* Ambient glow blobs */}
      <div
        className="absolute -top-12 -right-12 h-36 w-36 rounded-full pointer-events-none blur-2xl opacity-25"
        style={{ background: "radial-gradient(circle, #6366F1 0%, transparent 70%)" }}
      />
      <div
        className="absolute -bottom-12 -left-12 h-36 w-36 rounded-full pointer-events-none blur-2xl opacity-15"
        style={{ background: "radial-gradient(circle, #D4AF37 0%, transparent 70%)" }}
      />

      {/* Header */}
      <div className="flex items-center justify-between mb-2.5 relative z-10">
        <div className="flex items-center gap-2.5">
          <div
            className="h-8 w-8 rounded-lg flex items-center justify-center border shadow-md backdrop-blur-md"
            style={{
              background: "rgba(99, 102, 241, 0.20)",
              borderColor: "rgba(165, 180, 252, 0.35)",
              color: "#C7D2FE",
            }}
          >
            <Sparkles className="h-4 w-4 text-indigo-300" />
          </div>
          <div>
            <h3 className="text-[13.5px] font-black text-white tracking-tight flex items-center gap-1.5">
              StayHub AI Suite
              <span
                className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.2 rounded-full border"
                style={{
                  background: "rgba(99, 102, 241, 0.25)",
                  borderColor: "rgba(165, 180, 252, 0.40)",
                  color: "#E0E7FF",
                }}
              >
                PRO
              </span>
            </h3>
          </div>
        </div>
        <span className="text-[10px] font-mono font-bold text-indigo-300/60 bg-white/5 px-1.5 py-0.2 rounded border border-white/10">
          v2.4
        </span>
      </div>

      <p className="text-[11px] leading-relaxed mb-3 text-indigo-100/70 relative z-10 font-normal line-clamp-2">
        AI-driven occupancy forecasting, dynamic rate recommendations, and automated concierge workflows.
      </p>

      {/* Feature chips */}
      <div className="grid grid-cols-3 gap-1.5 mb-3 relative z-10">
        {[
          { icon: LineChart, label: "Demand Forecasting", color: "#A5B4FC" },
          { icon: Zap, label: "Dynamic Rates", color: "#FDE047" },
          { icon: Bot, label: "Staff Routing", color: "#6EE7B7" },
        ].map(({ icon: Icon, label, color }) => (
          <div
            key={label}
            className="flex flex-col items-center justify-center text-center p-1.5 rounded-lg text-[10px] font-bold border backdrop-blur-md transition-all hover:bg-white/10"
            style={{
              background: "rgba(255, 255, 255, 0.05)",
              borderColor: "rgba(255, 255, 255, 0.10)",
              color: "rgba(255, 255, 255, 0.85)",
            }}
          >
            <Icon className="h-3.5 w-3.5 mb-0.5" style={{ color }} />
            <span className="truncate w-full">{label}</span>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div
        className="flex items-center justify-between pt-2.5 relative z-10 border-t"
        style={{ borderColor: "rgba(255, 255, 255, 0.10)" }}
      >
        <span className="text-[10.5px] text-indigo-200/60 font-medium">
          Autonomous Hospitality AI
        </span>
        <Link href="/ai">
          <Button
            size="sm"
            variant="ghost"
            className="text-[11px] font-bold gap-1 h-7 px-2.5 rounded-lg text-indigo-200 hover:text-white bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-400/30 shadow-2xs"
          >
            <span>Explore Suite</span>
            <ArrowRight className="h-3 w-3" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
