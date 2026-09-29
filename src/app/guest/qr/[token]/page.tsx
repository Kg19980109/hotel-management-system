import * as React from "react";
import { Sparkles, QrCode } from "lucide-react";
import { resolveGuestQrAccess } from "@/lib/guest-portal/queries";
import { StayVerificationCard } from "@/components/guest/stay-verification-card";

interface PageProps {
  params: Promise<{
    token: string;
  }>;
}

export default async function GuestQrResolverPage({ params }: PageProps) {
  const { token } = await params;
  const resolution = await resolveGuestQrAccess(token);

  return (
    <div className="space-y-5 pb-24">
      {/* ── 1. LUXURY TOP HEADER BANNER (MATCHING ALL GUEST PAGES) ── */}
      <div className="relative overflow-hidden bg-gradient-to-b from-[#070D18] via-[#0D1829] to-[#0A1322] text-white rounded-b-[2rem] shadow-xl border-b border-[#D4AF37]/25 pb-7 pt-5 px-5">
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-[#D4AF37]/15 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full bg-amber-500/10 blur-2xl pointer-events-none" />
        <div className="absolute inset-0 opacity-[0.03] bg-[radial-gradient(#D4AF37_1px,transparent_1px)] [background-size:20px_20px]" />

        <div className="relative z-10 space-y-3.5">
          {/* Top Row: Digital QR Badge + Room/Property Tag */}
          <div className="flex items-center justify-between">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-[#D4AF37]/35 text-[#E4C980] text-[10.5px] font-medium tracking-wide shadow-xs">
              <QrCode className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span>Digital Key &amp; Concierge QR</span>
            </div>

            {resolution.valid && resolution.room_number && (
              <span className="text-xs px-3 py-1 rounded-full bg-white/10 text-[#E4C980] font-semibold border border-[#D4AF37]/35 backdrop-blur-xs">
                Suite {resolution.room_number}
              </span>
            )}
          </div>

          <div className="space-y-1 pt-1">
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-white tracking-tight leading-tight">
              {resolution.property_name || "StayHub Luxury Resort & Spa"}
            </h1>
            <p className="text-xs text-slate-300/85 leading-relaxed max-w-md">
              {resolution.valid && resolution.qr_type === "ROOM"
                ? `Welcome to Suite ${resolution.room_number}. Instant access to in-room dining, bespoke housekeeping, and 24/7 concierge.`
                : "Welcome to our 5-star hotel portal. Explore fine dining, services, and guest amenities."}
            </p>
          </div>

          <div className="flex items-center gap-2 pt-1 flex-wrap">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-400 bg-emerald-950/60 px-2.5 py-1 rounded-full border border-emerald-500/25 backdrop-blur-xs">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              {resolution.valid ? "Encrypted QR Verified · Instant Access" : "QR Code Authentication"}
            </span>

            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#E4C980] bg-white/10 px-2.5 py-1 rounded-full border border-[#D4AF37]/30">
              <Sparkles className="w-3 h-3 text-[#D4AF37]" />
              <span>In-Suite Service Desk</span>
            </span>
          </div>
        </div>
      </div>

      {/* ── 2. STAY VERIFICATION CARD & ACTIONS ── */}
      <div className="px-4">
        <StayVerificationCard rawToken={token} resolution={resolution} />
      </div>
    </div>
  );
}
