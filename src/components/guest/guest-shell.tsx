"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { 
  Building2, 
  Home, 
  CalendarDays, 
  Grid2X2, 
  LogOut, 
  PhoneCall, 
  ShieldCheck, 
  Sparkles
} from "lucide-react";
import { GuestVerifiedSessionContext } from "@/lib/guest-portal/types";
import { clearGuestSessionAction } from "@/lib/guest-portal/actions";

interface GuestShellProps {
  children: React.ReactNode;
  session?: GuestVerifiedSessionContext | null;
}

export function GuestShell({ children, session }: GuestShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const isVerifiedStay = session?.session_type === "VERIFIED_STAY";

  const handleSignOut = async () => {
    await clearGuestSessionAction();
    router.push("/guest/home");
    router.refresh();
  };

  const navItems = [
    { label: "Home", href: "/guest/home", icon: Home },
    { label: "Hotel", href: "/guest/hotel", icon: Building2 },
    ...(isVerifiedStay
      ? [{ label: "My Stay", href: "/guest/stay", icon: CalendarDays }]
      : []),
    { label: "Services", href: "/guest/services", icon: Grid2X2 },
  ];

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans selection:bg-amber-500/30">
      {/* Mobile Max-Width Container */}
      <div className="w-full max-w-md mx-auto flex-1 flex flex-col bg-slate-950 border-x border-slate-800/80 shadow-2xl relative">
        
        {/* Top Hospitality Header */}
        <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-slate-950 shadow-md">
              <Sparkles className="w-4 h-4 fill-slate-950" />
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight text-white line-clamp-1">
                {session?.property_name || "StayHub Guest Portal"}
              </h1>
              <p className="text-[10px] text-amber-400 font-medium uppercase tracking-wider flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 inline" />
                {isVerifiedStay ? `Room ${session?.room_number} • In-House` : "Guest Experience"}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {session?.front_desk_phone && (
              <a
                href={`tel:${session.front_desk_phone}`}
                className="p-2 rounded-full bg-slate-800 text-amber-400 hover:bg-slate-700 transition"
                title="Call Front Desk"
              >
                <PhoneCall className="w-4 h-4" />
              </a>
            )}
            {session && (
              <button
                onClick={handleSignOut}
                className="p-2 rounded-full bg-slate-800 text-slate-400 hover:text-rose-400 hover:bg-slate-700 transition"
                title="Exit Guest Session"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 pb-20 overflow-y-auto">
          {children}
        </main>

        {/* Bottom Mobile Navigation Bar */}
        <nav className="fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 max-w-md mx-auto">
          <div className="grid grid-cols-4 items-center h-16 px-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex flex-col items-center justify-center h-full space-y-1 transition-all ${
                    isActive
                      ? "text-amber-400 font-semibold"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <div className={`p-1 rounded-xl transition ${isActive ? "bg-amber-400/10" : ""}`}>
                    <Icon className={`w-5 h-5 ${isActive ? "stroke-[2.5]" : "stroke-[1.75]"}`} />
                  </div>
                  <span className="text-[11px] tracking-tight">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}
