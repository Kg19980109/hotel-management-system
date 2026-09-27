"use client";

import * as React from "react";
import Link from "next/link";
import { Sparkles, ArrowRight, Bot, LineChart, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

export function AIBuddyPreview() {
  return (
    <div
      className="rounded-[24px] p-6 text-white relative overflow-hidden border transition-all duration-300 shadow-xl"
      style={{
        background: "linear-gradient(135deg, #0B102B 0%, #111942 50%, #182255 100%)",
        borderColor: "rgba(99, 102, 241, 0.25)",
        boxShadow: "0 20px 40px -15px rgba(11, 16, 43, 0.6), 0 0 0 1px rgba(165, 180, 252, 0.15)",
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
        className="absolute -top-16 -right-16 h-48 w-48 rounded-full pointer-events-none blur-3xl opacity-30"
        style={{ background: "radial-gradient(circle, #6366F1 0%, transparent 70%)" }}
      />
      <div
        className="absolute -bottom-16 -left-16 h-48 w-48 rounded-full pointer-events-none blur-3xl opacity-20"
        style={{ background: "radial-gradient(circle, #D4AF37 0%, transparent 70%)" }}
      />

      {/* Header */}
      <div className="flex items-center justify-between mb-3.5 relative z-10">
        <div className="flex items-center gap-3">
          <div
            className="h-10 w-10 rounded-xl flex items-center justify-center border shadow-lg backdrop-blur-md"
            style={{
              background: "rgba(99, 102, 241, 0.20)",
              borderColor: "rgba(165, 180, 252, 0.35)",
              color: "#C7D2FE",
            }}
          >
            <Sparkles className="h-5 w-5 text-indigo-300" />
          </div>
          <div>
            <h3 className="text-[15px] font-extrabold text-white tracking-tight flex items-center gap-2">
              StayHub AI Intelligence
              <span
                className="text-[9.5px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border"
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
        <span className="text-[11px] font-mono font-bold text-indigo-300/60 bg-white/5 px-2 py-0.5 rounded-md border border-white/10">
          v2.4
        </span>
      </div>

      <p className="text-[12px] leading-relaxed mb-4 text-indigo-100/70 relative z-10 font-normal">
        AI-driven occupancy forecasting, dynamic rate recommendations, and automated concierge workflows
        continuously optimize your resort operations.
      </p>

      {/* Feature chips */}
      <div className="grid grid-cols-3 gap-2 mb-4 relative z-10">
        {[
          { icon: LineChart, label: "Demand Forecasting", color: "#A5B4FC" },
          { icon: Zap, label: "Dynamic Pricing", color: "#FDE047" },
          { icon: Bot, label: "Staff Scheduling", color: "#6EE7B7" },
        ].map(({ icon: Icon, label, color }) => (
          <div
            key={label}
            className="flex flex-col items-center justify-center text-center p-2 rounded-xl text-[11px] font-semibold border backdrop-blur-md transition-all hover:bg-white/10"
            style={{
              background: "rgba(255, 255, 255, 0.05)",
              borderColor: "rgba(255, 255, 255, 0.10)",
              color: "rgba(255, 255, 255, 0.80)",
            }}
          >
            <Icon className="h-4 w-4 mb-1" style={{ color }} />
            <span className="truncate w-full">{label}</span>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div
        className="flex items-center justify-between pt-3 relative z-10 border-t"
        style={{ borderColor: "rgba(255, 255, 255, 0.10)" }}
      >
        <span className="text-[11px] text-indigo-200/60 font-medium">
          Autonomous Hospitality AI
        </span>
        <Link href="/ai">
          <Button
            size="sm"
            variant="ghost"
            className="text-[11.5px] font-bold gap-1.5 h-8 px-3 rounded-xl text-indigo-200 hover:text-white bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-400/30 shadow-xs"
          >
            <span>Explore AI Suite</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
