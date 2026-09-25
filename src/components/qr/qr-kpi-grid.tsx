import * as React from "react";
import { QrCode, BedDouble, Building2, Users } from "lucide-react";
import { GuestQrCode, GuestSession } from "@/lib/guest-portal/types";

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
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
      description: "Configured access points",
    },
    {
      title: "Active Room QRs",
      value: activeRoomQrs,
      icon: BedDouble,
      color: "text-amber-500",
      bgColor: "bg-amber-500/10",
      description: "Assigned in-room codes",
    },
    {
      title: "General Hotel QRs",
      value: activeGeneralQrs,
      icon: Building2,
      color: "text-emerald-500",
      bgColor: "bg-emerald-500/10",
      description: "Public lobby & amenities",
    },
    {
      title: "Active Guest Sessions",
      value: activeGuestSessions,
      icon: Users,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
      description: "Current verified sessions",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {kpis.map((kpi, idx) => {
        const Icon = kpi.icon;
        return (
          <div
            key={idx}
            className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex items-center justify-between"
          >
            <div className="space-y-1">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                {kpi.title}
              </span>
              <div className="text-2xl font-bold text-slate-900 dark:text-white">
                {kpi.value}
              </div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                {kpi.description}
              </span>
            </div>

            <div className={`w-12 h-12 rounded-xl ${kpi.bgColor} ${kpi.color} flex items-center justify-center`}>
              <Icon className="w-6 h-6" />
            </div>
          </div>
        );
      })}
    </div>
  );
}
