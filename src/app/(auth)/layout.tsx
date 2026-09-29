import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Sparkles,
  ShieldCheck,
  Building2,
  QrCode,
  CheckCircle2,
  Lock,
} from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen w-full bg-[#080E1E] flex flex-col lg:grid lg:grid-cols-12 selection:bg-indigo-500 selection:text-white relative overflow-hidden font-sans">
      {/* ─── LEFT PANEL: BRAND HERO & HOSPITALITY SHOWCASE (Desktop ≥ lg) ─── */}
      <div className="hidden lg:flex lg:col-span-6 xl:col-span-7 relative flex-col justify-between p-8 xl:p-14 bg-gradient-to-br from-[#060B18] via-[#0A1124] to-[#121B35] border-r border-white/[0.08] overflow-hidden">
        {/* Glowing Aurora Ambient Lighting */}
        <div className="absolute top-0 -left-20 w-[500px] h-[500px] bg-indigo-600/20 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-[450px] h-[450px] bg-cyan-500/15 rounded-full blur-[130px] pointer-events-none" />
        <div className="absolute top-1/2 left-1/3 w-[350px] h-[350px] bg-purple-600/15 rounded-full blur-[100px] pointer-events-none" />

        {/* Subtle Geometric Background Grid */}
        <div 
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
            backgroundSize: "28px 28px",
          }}
        />

        {/* Top Header / Logo */}
        <div className="relative z-10 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group focus:outline-none">
            <div className="relative">
              <Image
                src="/images/logo-white.png"
                alt="StayHub Hospitality OS"
                width={160}
                height={42}
                className="h-9 xl:h-10 w-auto object-contain filter drop-shadow-[0_4px_12px_rgba(81,70,229,0.3)] transition-transform duration-200 group-hover:scale-[1.02]"
                priority
              />
            </div>
          </Link>

          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.06] border border-white/[0.12] backdrop-blur-md shadow-inner text-xs font-semibold text-cyan-300">
            <Sparkles className="h-3.5 w-3.5 text-cyan-400 animate-pulse" />
            <span>Hospitality OS 2.0</span>
          </div>
        </div>

        {/* Center Hero Showcase */}
        <div className="relative z-10 my-auto py-10 max-w-xl space-y-8">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-indigo-500/15 border border-indigo-400/30 text-[11.5px] font-bold text-indigo-300 uppercase tracking-widest">
              Enterprise Property Management System
            </div>
            
            <h1 className="text-3xl xl:text-4xl 2xl:text-5xl font-black text-white tracking-tight leading-[1.15]">
              Powering Modern <br />
              <span className="bg-gradient-to-r from-cyan-300 via-indigo-300 to-purple-300 bg-clip-text text-transparent">
                Luxury Hospitality
              </span>
            </h1>

            <p className="text-sm xl:text-base text-slate-300/80 leading-relaxed max-w-lg">
              The unified operating system engineered for front desk velocity, dynamic folios, contactless QR dining, smart housekeeping, and real-time property intelligence.
            </p>
          </div>

          {/* Interactive Feature Glass Cards */}
          <div className="grid grid-cols-1 gap-3.5 pt-2">
            <div className="flex items-start gap-3.5 p-3.5 xl:p-4 rounded-2xl bg-white/[0.04] border border-white/[0.08] backdrop-blur-md hover:bg-white/[0.07] hover:border-white/[0.15] transition-all duration-200 group">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300 group-hover:scale-105 transition-transform shrink-0">
                <Building2 className="h-5 w-5" />
              </div>
              <div className="space-y-0.5">
                <p className="text-xs xl:text-sm font-bold text-white flex items-center gap-1.5">
                  Full-Stack Front Desk & PMS
                  <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/15 px-1.5 py-0.2 rounded">Live</span>
                </p>
                <p className="text-xs text-slate-400 leading-snug">
                  Visual room assignment, instant check-in/out, and auto-balancing guest folios.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5 p-3.5 xl:p-4 rounded-2xl bg-white/[0.04] border border-white/[0.08] backdrop-blur-md hover:bg-white/[0.07] hover:border-white/[0.15] transition-all duration-200 group">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-400/30 flex items-center justify-center text-cyan-300 group-hover:scale-105 transition-transform shrink-0">
                <QrCode className="h-5 w-5" />
              </div>
              <div className="space-y-0.5">
                <p className="text-xs xl:text-sm font-bold text-white">
                  Contactless QR Guest Ecosystem
                </p>
                <p className="text-xs text-slate-400 leading-snug">
                  Direct in-room dining, real-time service requests, and live kitchen KDS routing.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5 p-3.5 xl:p-4 rounded-2xl bg-white/[0.04] border border-white/[0.08] backdrop-blur-md hover:bg-white/[0.07] hover:border-white/[0.15] transition-all duration-200 group">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300 group-hover:scale-105 transition-transform shrink-0">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div className="space-y-0.5">
                <p className="text-xs xl:text-sm font-bold text-white">
                  Enterprise Security & Granular RBAC
                </p>
                <p className="text-xs text-slate-400 leading-snug">
                  Multi-tenant PostgreSQL Row-Level Security with zero cross-property data leakage.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Metrics Bar */}
        <div className="relative z-10 pt-6 border-t border-white/[0.08] flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-6">
            <div className="space-y-0.5">
              <p className="text-base font-extrabold text-white font-mono">99.98%</p>
              <p className="text-[11px] text-slate-400">Platform SLA</p>
            </div>
            <div className="h-6 w-px bg-white/[0.1]" />
            <div className="space-y-0.5">
              <p className="text-base font-extrabold text-white font-mono">&lt; 150ms</p>
              <p className="text-[11px] text-slate-400">Realtime Sync</p>
            </div>
            <div className="h-6 w-px bg-white/[0.1]" />
            <div className="space-y-0.5">
              <p className="text-base font-extrabold text-white font-mono">ISO 27001</p>
              <p className="text-[11px] text-slate-400">Grade Security</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-slate-400 text-[11.5px]">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
            <span>Multi-Property Active</span>
          </div>
        </div>
      </div>

      {/* ─── RIGHT PANEL: AUTH PORTAL CONTAINER ─── */}
      <div className="flex-1 lg:col-span-6 xl:col-span-5 flex flex-col justify-between p-6 sm:p-10 xl:p-12 relative bg-[#0B1326] lg:bg-transparent overflow-y-auto">
        {/* Mobile Header (Hidden on Desktop) */}
        <div className="lg:hidden flex items-center justify-between pb-6 mb-4 border-b border-white/[0.08]">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/images/logo-white.png"
              alt="StayHub Logo"
              width={130}
              height={34}
              className="h-8 w-auto object-contain"
              priority
            />
          </Link>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-[11px] font-semibold text-indigo-300">
            <Sparkles className="h-3 w-3 text-cyan-400" />
            <span>Hotel OS</span>
          </div>
        </div>

        {/* Ambient Glow for Right Panel */}
        <div className="absolute top-1/3 right-1/4 w-80 h-80 bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none" />

        {/* Form Slot */}
        <div className="my-auto w-full max-w-[420px] mx-auto relative z-10 py-6">
          {children}
        </div>

        {/* Footer */}
        <div className="pt-6 border-t border-white/[0.08] text-center text-xs text-slate-400 space-y-1 relative z-10">
          <p className="flex items-center justify-center gap-1.5 text-[11.5px]">
            <Lock className="h-3 w-3 text-indigo-400" />
            <span>256-Bit SSL Encrypted • PostgreSQL RLS Isolation</span>
          </p>
          <p className="text-[10.5px] text-slate-500">
            © {new Date().getFullYear()} StayHub Technologies. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
