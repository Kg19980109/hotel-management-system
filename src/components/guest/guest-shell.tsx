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
    <div className="min-h-screen bg-[#F0EBE1] text-slate-900 flex flex-col font-sans selection:bg-[#D4AF37]/30">
      {/* Mobile Max-Width Container (390px - 480px, responsive on tablet/desktop) */}
      <div className="w-full max-w-md md:max-w-lg mx-auto flex-1 flex flex-col bg-[#FAF8F5] border-x border-[#EAE3D2] shadow-2xl relative min-h-screen">
        
        {/* Luxury Hospitality Global Header */}
        <header className="sticky top-0 z-40 bg-[#FAF8F5]/95 backdrop-blur-md border-b border-[#EAE3D2] px-4 py-3 flex items-center justify-between transition-colors">
          <div className="flex items-center space-x-3 min-w-0">
            {/* Property Luxury Monogram Mark */}
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#0B1526] to-[#111D31] border border-[#D4AF37]/30 flex items-center justify-center text-[#D4AF37] shadow-sm shrink-0">
              <Compass className="w-4 h-4 text-[#E4C980]" />
            </div>
            
            {/* Title & Verified In-House Guest Status */}
            <div className="min-w-0">
              <h1 className="text-sm font-semibold tracking-tight text-slate-900 line-clamp-1 font-serif">
                {session?.property_name || "StayHub Resort & Spa"}
              </h1>
              <p className="text-[10px] text-[#A67C1E] font-medium tracking-wide flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 inline text-[#B88E2F] shrink-0" />
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
                className="w-8 h-8 rounded-full bg-white border border-[#EAE3D2] text-[#A67C1E] hover:bg-[#F3EEE5] hover:text-[#8C6819] flex items-center justify-center shadow-2xs transition-all active:scale-95"
                title="Call Front Desk Concierge"
                aria-label="Call Front Desk Concierge"
              >
                <PhoneCall className="w-3.5 h-3.5" />
              </a>
            )}
            {session && (
              <button
                onClick={handleSignOut}
                className="w-8 h-8 rounded-full bg-white border border-[#EAE3D2] text-slate-400 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 flex items-center justify-center shadow-2xs transition-all active:scale-95"
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
              className="pointer-events-auto flex items-center justify-between p-3.5 rounded-2xl bg-[#0B1526] text-white border border-[#D4AF37]/35 shadow-xl shadow-black/20 active:scale-[0.98] transition group"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#D4AF37] text-[#0B1526] flex items-center justify-center font-bold text-xs shadow-xs">
                  <ShoppingBag className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-white tracking-wide">
                    View Dining Cart
                  </p>
                  <p className="text-[11px] font-medium text-[#E4C980]">
                    {totalItems} item{totalItems > 1 ? "s" : ""} · ₹{subtotal.toFixed(2)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1 text-xs font-semibold text-[#E4C980] group-hover:text-white transition-colors">
                <span>Review &amp; Order</span>
                <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </Link>
          </div>
        )}

        {/* Bottom Mobile Navigation Bar — Luxury Floating Glass Dock */}
        <nav className="fixed bottom-0 left-0 right-0 z-40 max-w-md md:max-w-lg mx-auto px-3 pb-2.5 pt-1.5 pointer-events-none">
          <div className="pointer-events-auto bg-[#0B1526]/95 backdrop-blur-2xl border border-[#D4AF37]/30 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.36)] px-2 py-1.5">
            <div className="grid grid-cols-5 items-center">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href || (item.href !== "/guest/home" && pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    prefetch={true}
                    className={`relative flex flex-col items-center justify-center py-1 rounded-xl transition-transform duration-75 active:scale-90 select-none group ${
                      isActive ? "text-[#E4C980]" : "text-slate-400 hover:text-slate-200"
                    }`}
                    aria-label={item.label}
                  >
                    <div
                      className={`p-1.5 rounded-xl transition-all duration-150 flex items-center justify-center ${
                        isActive
                          ? "bg-gradient-to-r from-[#D4AF37] to-[#E4C980] text-[#0B1526] shadow-md shadow-[#D4AF37]/30 scale-105"
                          : "group-hover:bg-white/5 text-slate-300"
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${isActive ? "stroke-[2.5]" : "stroke-[1.75]"}`} />
                    </div>
                    <span
                      className={`text-[10px] tracking-tight mt-0.5 transition-colors ${
                        isActive ? "font-bold text-[#E4C980]" : "font-medium text-slate-400"
                      }`}
                    >
                      {item.label}
                    </span>
                    {isActive && (
                      <span className="absolute -bottom-0.5 w-1 h-1 rounded-full bg-[#E4C980] shadow-[0_0_6px_#E4C980]" />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        </nav>
      </div>
    </div>
  );
}
