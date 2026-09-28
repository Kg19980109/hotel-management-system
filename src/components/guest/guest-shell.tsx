"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { 
  Building2, 
  Home, 
  UtensilsCrossed,
  ShoppingBag, 
  Sparkles, 
  LogOut, 
  PhoneCall, 
  ShieldCheck, 
  BedDouble,
  ChevronRight,
  Compass,
} from "lucide-react";
import { GuestVerifiedSessionContext } from "@/lib/guest-portal/types";
import { clearGuestSessionAction } from "@/lib/guest-portal/actions";
import { useCart } from "./cart-context";

interface GuestShellProps {
  children: React.ReactNode;
  session?: GuestVerifiedSessionContext | null;
}

export function GuestShell({ children, session }: GuestShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { totalItems, subtotal } = useCart();
  const isVerifiedStay = session?.session_type === "VERIFIED_STAY";

  const handleSignOut = async () => {
    await clearGuestSessionAction();
    router.push("/guest/home");
    router.refresh();
  };

  const navItems = [
    { label: "Home", href: "/guest/home", icon: Home },
    { label: "Dining", href: "/guest/dining", icon: UtensilsCrossed },
    { 
      label: "Orders", 
      href: "/guest/orders", 
      icon: ShoppingBag,
    },
    { label: "Services", href: "/guest/services", icon: Sparkles },
    ...(isVerifiedStay
      ? [{ label: "My Stay", href: "/guest/stay", icon: BedDouble }]
      : [{ label: "Hotel", href: "/guest/hotel", icon: Building2 }]),
  ];

  const showFloatingCart = totalItems > 0 && !pathname.startsWith("/guest/cart");

  return (
    <div className="min-h-screen bg-[#060B14] text-slate-100 flex flex-col font-sans selection:bg-violet-600/30">
      {/* Mobile Max-Width Container (390px - 480px, responsive on tablet/desktop) */}
      <div className="w-full max-w-md md:max-w-lg mx-auto flex-1 flex flex-col bg-[#0B132B] border-x border-violet-950/60 shadow-[0_0_50px_rgba(81,70,229,0.12)] relative min-h-screen">
        
        {/* Luxury Hospitality Global Header */}
        <header className="sticky top-0 z-40 bg-[#08111F]/90 backdrop-blur-xl border-b border-violet-500/15 px-4 py-3 flex items-center justify-between transition-colors shadow-sm">
          <div className="flex items-center space-x-3 min-w-0">
            {/* Property Luxury Monogram Mark */}
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 via-indigo-600 to-purple-700 border border-violet-400/30 flex items-center justify-center text-white shadow-md shadow-violet-600/25 shrink-0">
              <Compass className="w-4 h-4 text-white" />
            </div>
            
            {/* Title & Verified In-House Guest Status */}
            <div className="min-w-0">
              <h1 className="text-sm font-bold tracking-tight text-white line-clamp-1 font-serif">
                {session?.property_name || "StayHub Resort & Spa"}
              </h1>
              <p className="text-[10.5px] text-violet-300 font-semibold tracking-wide flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 inline text-violet-400 shrink-0" />
                <span className="truncate">
                  {isVerifiedStay ? `Room ${session?.room_number} · In-House Guest` : "Digital Concierge"}
                </span>
              </p>
            </div>
          </div>

          {/* Quick Hospitality Actions */}
          <div className="flex items-center space-x-2 shrink-0">
            {session?.front_desk_phone && (
              <a
                href={`tel:${session.front_desk_phone}`}
                className="w-8 h-8 rounded-full bg-violet-500/10 border border-violet-500/25 text-violet-300 hover:bg-violet-600 hover:text-white flex items-center justify-center shadow-xs transition-all active:scale-95"
                title="Call Front Desk Concierge"
                aria-label="Call Front Desk Concierge"
              >
                <PhoneCall className="w-3.5 h-3.5" />
              </a>
            )}
            {session && (
              <button
                onClick={handleSignOut}
                className="w-8 h-8 rounded-full bg-white/5 border border-white/10 text-slate-400 hover:text-rose-400 hover:border-rose-500/30 hover:bg-rose-500/10 flex items-center justify-center shadow-xs transition-all active:scale-95"
                title="Exit Guest Session"
                aria-label="Exit Guest Session"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </header>

        {/* Main Content Area */}
        <main className={`flex-1 overflow-y-auto ${showFloatingCart ? "pb-36" : "pb-24"}`}>
          {children}
        </main>

        {/* Floating Cart Bar (Sticky above bottom nav when cart has items) */}
        {showFloatingCart && (
          <div className="fixed bottom-20 left-0 right-0 z-40 max-w-md md:max-w-lg mx-auto px-4 pointer-events-none animate-in fade-in slide-in-from-bottom-3 duration-300">
            <Link
              href="/guest/cart"
              className="pointer-events-auto flex items-center justify-between p-3.5 rounded-2xl bg-gradient-to-r from-[#0E1B38] via-[#141F45] to-[#1E1B4B] text-white border border-violet-500/40 shadow-2xl shadow-violet-900/40 active:scale-[0.98] transition group"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-md shadow-violet-600/30">
                  <ShoppingBag className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-white tracking-wide">
                    View Dining Cart
                  </p>
                  <p className="text-[11px] font-semibold text-violet-300">
                    {totalItems} item{totalItems > 1 ? "s" : ""} · ₹{subtotal.toFixed(2)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1 text-xs font-bold text-violet-300 group-hover:text-white transition-colors">
                <span>Review &amp; Order</span>
                <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </Link>
          </div>
        )}

        {/* Bottom Mobile Navigation Bar */}
        <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#08111F]/95 backdrop-blur-xl border-t border-violet-500/20 max-w-md md:max-w-lg mx-auto shadow-[0_-8px_30px_rgba(81,70,229,0.15)]">
          <div className="grid grid-cols-5 items-center h-16 px-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || (item.href !== "/guest/home" && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex flex-col items-center justify-center h-full min-h-[48px] space-y-1 transition-all select-none ${
                    isActive
                      ? "text-violet-300 font-bold"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                  aria-label={item.label}
                >
                  <div className={`p-1.5 rounded-xl transition-all duration-200 ${
                    isActive 
                      ? "bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-md shadow-violet-600/30 scale-105" 
                      : ""
                  }`}>
                    <Icon className={`w-4 h-4 ${isActive ? "stroke-[2.5]" : "stroke-[1.75]"}`} />
                  </div>
                  <span className="text-[10.5px] tracking-tight">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}
