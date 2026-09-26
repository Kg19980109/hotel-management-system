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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-[var(--brand-gold)]/30">
      {/* Mobile Max-Width Container (390px - 480px, responsive on tablet/desktop) */}
      <div className="w-full max-w-md md:max-w-lg mx-auto flex-1 flex flex-col bg-[#090D1A] border-x border-white/10 shadow-2xl relative min-h-screen">
        
        {/* Top Hospitality Header */}
        <header className="sticky top-0 z-40 bg-[#08111F]/95 backdrop-blur-md border-b border-white/10 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--brand-gold)] to-amber-600 flex items-center justify-center text-slate-950 shadow-md">
              <Sparkles className="w-4 h-4 fill-slate-950 text-slate-950" />
            </div>
            <div>
              <h1 className="text-sm font-black tracking-tight text-white line-clamp-1 font-heading">
                {session?.property_name || "StayHub Resort"}
              </h1>
              <p className="text-[10px] text-[var(--brand-gold)] font-bold uppercase tracking-wider flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 inline text-[var(--brand-gold)]" />
                {isVerifiedStay ? `Room ${session?.room_number} • In-House Guest` : "Digital Concierge"}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {session?.front_desk_phone && (
              <a
                href={`tel:${session.front_desk_phone}`}
                className="p-2 rounded-full bg-white/5 border border-white/10 text-[var(--brand-gold)] hover:bg-white/10 transition"
                title="Call Front Desk"
              >
                <PhoneCall className="w-3.5 h-3.5" />
              </a>
            )}
            {session && (
              <button
                onClick={handleSignOut}
                className="p-2 rounded-full bg-white/5 border border-white/10 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
                title="Exit Guest Session"
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
          <div className="fixed bottom-16 left-0 right-0 z-40 max-w-md md:max-w-lg mx-auto px-3 py-2 pointer-events-none">
            <Link
              href="/guest/cart"
              className="pointer-events-auto flex items-center justify-between p-3 rounded-2xl bg-gradient-to-r from-[var(--brand-gold)] via-amber-400 to-[var(--brand-gold)] text-slate-950 shadow-xl shadow-amber-500/25 active:scale-[0.98] transition group"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-slate-950/15 flex items-center justify-center font-bold text-xs">
                  {totalItems}
                </div>
                <div>
                  <p className="text-xs font-black tracking-tight uppercase">View Your Cart</p>
                  <p className="text-[11px] font-bold text-slate-900">
                    {totalItems} item{totalItems > 1 ? "s" : ""} • ₹{subtotal.toFixed(2)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1 text-xs font-black">
                <span>Checkout</span>
                <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </Link>
          </div>
        )}

        {/* Bottom Mobile Navigation Bar */}
        <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#08111F]/95 backdrop-blur-md border-t border-white/10 max-w-md md:max-w-lg mx-auto">
          <div className="grid grid-cols-5 items-center h-16 px-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || (item.href !== "/guest/home" && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex flex-col items-center justify-center h-full space-y-1 transition-all ${
                    isActive
                      ? "text-[var(--brand-gold)] font-bold"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <div className={`p-1.5 rounded-xl transition ${isActive ? "bg-[var(--brand-gold)]/10 shadow-xs" : ""}`}>
                    <Icon className={`w-4 h-4 ${isActive ? "stroke-[2.5]" : "stroke-[1.75]"}`} />
                  </div>
                  <span className="text-[10px] tracking-tight">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}
