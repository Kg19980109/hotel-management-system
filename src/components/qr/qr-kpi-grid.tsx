import * as React from "react";
import { QrCode, BedDouble, Building2, Users, Sparkles } from "lucide-react";
import { GuestQrCode, GuestSession } from "@/lib/guest-portal/types";
import { Card } from "@/components/ui/card";

interface QrKpiGridProps {
  qrCodes: GuestQrCode[];
  sessions: GuestSession[];
}

export function QrKpiGrid({ qrCodes, sessions }: QrKpiGridProps) {
  const totalQrs = qrCodes.length;
  const activeRoomQrs = qrCodes.filter((q) => q.qr_type === "ROOM" && q.is_active).length;
  const activeGeneralQrs = qrCodes.filter((q) => q.qr_type === "HOTEL_GENERAL" && q.is_active).length;
  const activeGuestSessions = sessions.filter(
    (s) => !s.revoked_at && new Date(s.expires_at) > new Date()
  ).length;

  const kpis = [
    {
      title: "Total QR Access Points",
      value: totalQrs,
      icon: QrCode,
      color: "text-indigo-600 dark:text-indigo-400",
      bgColor: "bg-indigo-500/10 border-indigo-500/20",
      accent: "from-indigo-500/10 via-purple-500/5 to-transparent",
      description: "Active digital access touchpoints",
      badge: "Configured",
    },
    {
      title: "Active Room QRs",
      value: activeRoomQrs,
      icon: BedDouble,
      color: "text-amber-600 dark:text-amber-400",
      bgColor: "bg-amber-500/10 border-amber-500/20",
      accent: "from-amber-500/10 via-yellow-500/5 to-transparent",
      description: "In-room guest bedside cards",
      badge: "In-Room Service",
    },
    {
      title: "General Hotel QRs",
      value: activeGeneralQrs,
      icon: Building2,
      color: "text-emerald-600 dark:text-emerald-400",
      bgColor: "bg-emerald-500/10 border-emerald-500/20",
      accent: "from-emerald-500/10 via-teal-500/5 to-transparent",
      description: "Lobby, amenities & public portals",
      badge: "Public & Dining",
    },
    {
      title: "Live Guest Sessions",
      value: activeGuestSessions,
      icon: Users,
      color: "text-purple-600 dark:text-purple-400",
      bgColor: "bg-purple-500/10 border-purple-500/20",
      accent: "from-purple-500/10 via-pink-500/5 to-transparent",
      description: "Current authenticated phones",
      badge: "Live Active",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
      {kpis.map((kpi, idx) => {
        const Icon = kpi.icon;
        return (
          <Card
            key={idx}
            className={`relative overflow-hidden p-4 rounded-2xl border border-border/80 bg-gradient-to-br ${kpi.accent} bg-card shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between group`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                {kpi.title}
              </span>
              <div
                className={`w-9 h-9 rounded-xl ${kpi.bgColor} ${kpi.color} border flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform duration-150`}
              >
                <Icon className="w-4.5 h-4.5" />
              </div>
            </div>

            <div className="mt-3">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-3xl font-extrabold text-foreground tracking-tight">
                  {kpi.value}
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-secondary/80 text-foreground-muted border border-border/60">
                  {idx === 3 && activeGuestSessions > 0 ? (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  ) : (
                    <Sparkles className="w-2.5 h-2.5 text-amber-500" />
                  )}
                  {kpi.badge}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1 font-medium">
                {kpi.description}
              </p>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
