"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth/context";
import { getAccessibleReportRoutes } from "@/lib/reports/permissions";
import {
  LayoutDashboard,
  BedDouble,
  DoorOpen,
  CalendarCheck,
  Luggage,
  Users,
  DollarSign,
  Receipt,
  UtensilsCrossed,
  ChefHat,
  Sparkles,
  Wrench,
  Boxes,
  Truck,
  UserCheck,
  CreditCard,
  BellRing,
} from "lucide-react";

const ICON_MAP: Record<string, React.ReactNode> = {
  "/reports": <LayoutDashboard className="w-3.5 h-3.5" />,
  "/reports/occupancy": <BedDouble className="w-3.5 h-3.5" />,
  "/reports/rooms": <DoorOpen className="w-3.5 h-3.5" />,
  "/reports/reservations": <CalendarCheck className="w-3.5 h-3.5" />,
  "/reports/front-desk": <Luggage className="w-3.5 h-3.5" />,
  "/reports/guests": <Users className="w-3.5 h-3.5" />,
  "/reports/revenue": <DollarSign className="w-3.5 h-3.5" />,
  "/reports/financials": <Receipt className="w-3.5 h-3.5" />,
  "/reports/restaurant": <UtensilsCrossed className="w-3.5 h-3.5" />,
  "/reports/kitchen": <ChefHat className="w-3.5 h-3.5" />,
  "/reports/housekeeping": <Sparkles className="w-3.5 h-3.5" />,
  "/reports/maintenance": <Wrench className="w-3.5 h-3.5" />,
  "/reports/inventory": <Boxes className="w-3.5 h-3.5" />,
  "/reports/inventory/consumption": <Boxes className="w-3.5 h-3.5" />,
  "/reports/suppliers": <Truck className="w-3.5 h-3.5" />,
  "/reports/staff": <UserCheck className="w-3.5 h-3.5" />,
  "/reports/expenses": <CreditCard className="w-3.5 h-3.5" />,
  "/reports/guest-services": <BellRing className="w-3.5 h-3.5" />,
};

export function ReportNav() {
  const pathname = usePathname();
  const { currentRole } = useAuth();
  const accessibleRoutes = getAccessibleReportRoutes(currentRole || "GENERAL_MANAGER");

  return (
    <div className="w-full overflow-x-auto scrollbar-none py-1 border-b border-border/50">
      <div className="flex items-center gap-1.5 min-w-max pb-1">
        {accessibleRoutes.map((route) => {
          const isActive = pathname === route.href;
          const icon = ICON_MAP[route.href] || <LayoutDashboard className="w-3.5 h-3.5" />;

          return (
            <Link
              key={route.href}
              href={route.href}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                isActive
                  ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/80"
              }`}
            >
              {icon}
              {route.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
