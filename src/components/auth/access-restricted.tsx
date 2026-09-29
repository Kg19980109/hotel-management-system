"use client";

// ============================================================
// STAYHUB ACCESS RESTRICTED VIEW
// High-end, secure unauthorized access state for staff role boundaries
// ============================================================

import * as React from "react";
import Link from "next/link";
import { ShieldAlert, ArrowLeft, LayoutDashboard, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AccessRestrictedProps {
  moduleName?: string;
  description?: string;
  returnHref?: string;
}

export function AccessRestricted({
  moduleName = "Protected Module",
  description,
  returnHref = "/dashboard",
}: AccessRestrictedProps) {
  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <div
        className="max-w-md w-full p-8 rounded-3xl border border-white/10 text-center space-y-6 shadow-2xl relative overflow-hidden"
        style={{
          background: "linear-gradient(155deg, #0A1428 0%, #0F1D38 60%, #141B3B 100%)",
        }}
      >
        {/* Ambient glow */}
        <div
          className="absolute -top-16 -right-16 h-40 w-40 rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(239,68,68,0.18) 0%, transparent 70%)" }}
        />
        <div
          className="absolute bottom-0 left-0 h-32 w-32 rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(214,168,90,0.12) 0%, transparent 70%)" }}
        />

        {/* Lock / Shield Icon */}
        <div className="relative z-10 w-16 h-16 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto shadow-inner">
          <ShieldAlert className="w-8 h-8" />
        </div>

        {/* Message */}
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10.5px] font-bold uppercase tracking-wider bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <Lock className="w-3 h-3" />
            <span>Access Restricted</span>
          </div>

          <h2 className="text-2xl font-black text-white tracking-tight">
            {moduleName}
          </h2>

          <p className="text-xs text-slate-400 leading-relaxed max-w-sm mx-auto">
            {description ||
              "Your current staff role does not have authorization to view or manage this module. If you require access for your daily duties, please contact your Hotel Manager or Super Admin."}
          </p>
        </div>

        {/* Actions */}
        <div className="relative z-10 pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link href={returnHref} className="w-full sm:w-auto">
            <Button
              className="w-full sm:w-auto bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs h-10 px-5 shadow-lg shadow-amber-500/20 gap-2"
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Return to Dashboard</span>
            </Button>
          </Link>
          <button
            type="button"
            onClick={() => window.history.back()}
            className="inline-flex items-center justify-center gap-1.5 text-xs text-slate-400 hover:text-white transition py-2 px-3 font-semibold"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Go Back</span>
          </button>
        </div>
      </div>
    </div>
  );
}
