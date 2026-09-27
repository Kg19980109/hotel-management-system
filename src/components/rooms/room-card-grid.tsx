"use client";

import * as React from "react";
import Link from "next/link";
import type { Room, RoomOperationalStatus } from "@/lib/rooms/types";
import { formatCurrency } from "@/lib/dashboard/formatters";
import {
  BedDouble,
  Users,
  MapPin,
  SlidersHorizontal,
  Edit,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  AlertTriangle,
  Wrench,
  User,
  CreditCard,
  BellRing,
  Clock,
  Crown,
  Eye,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface RoomCardGridProps {
  rooms: Room[];
  currency: string;
  onOpenStatusModal: (room: Room) => void;
  onSelectRoom?: (room: Room) => void;
}

const STATUS_CARD_THEMES: Record<
  RoomOperationalStatus,
  {
    headerBg: string;
    glowColor: string;
    borderTop: string;
    badgeBg: string;
    badgeText: string;
    badgeBorder: string;
    label: string;
    subLabel: string;
    pulseDot: string;
    accentHex: string;
    icon: React.ComponentType<{ className?: string }>;
  }
> = {
  AVAILABLE: {
    headerBg: "linear-gradient(145deg, #06261B 0%, #0B3B2B 50%, #0F4C38 100%)",
    glowColor: "rgba(16, 185, 129, 0.25)",
    borderTop: "from-emerald-400 via-teal-300 to-emerald-500",
    badgeBg: "bg-emerald-500/20",
    badgeText: "text-emerald-300",
    badgeBorder: "border-emerald-400/40",
    label: "Available",
    subLabel: "Vacant & Clean",
    pulseDot: "bg-emerald-400",
    accentHex: "#10B981",
    icon: ShieldCheck,
  },
  OCCUPIED: {
    headerBg: "linear-gradient(145deg, #120E30 0%, #1E164D 50%, #2A1D6B 100%)",
    glowColor: "rgba(139, 92, 246, 0.30)",
    borderTop: "from-purple-400 via-indigo-300 to-violet-500",
    badgeBg: "bg-purple-500/20",
    badgeText: "text-purple-200",
    badgeBorder: "border-purple-400/40",
    label: "Occupied",
    subLabel: "In-House Guest",
    pulseDot: "bg-purple-400",
    accentHex: "#8B5CF6",
    icon: BedDouble,
  },
  DIRTY: {
    headerBg: "linear-gradient(145deg, #2D1A04 0%, #452605 50%, #5E3406 100%)",
    glowColor: "rgba(245, 158, 11, 0.25)",
    borderTop: "from-amber-400 via-orange-300 to-amber-500",
    badgeBg: "bg-amber-500/20",
    badgeText: "text-amber-300",
    badgeBorder: "border-amber-400/40",
    label: "Needs Cleaning",
    subLabel: "Housekeeping Due",
    pulseDot: "bg-amber-400",
    accentHex: "#F59E0B",
    icon: Sparkles,
  },
  CLEANING: {
    headerBg: "linear-gradient(145deg, #052233 0%, #0A354E 50%, #0F496B 100%)",
    glowColor: "rgba(14, 165, 233, 0.25)",
    borderTop: "from-sky-400 via-cyan-300 to-sky-500",
    badgeBg: "bg-sky-500/20",
    badgeText: "text-sky-300",
    badgeBorder: "border-sky-400/40",
    label: "Cleaning",
    subLabel: "Staff In Room",
    pulseDot: "bg-sky-400",
    accentHex: "#0EA5E9",
    icon: Sparkles,
  },
  INSPECTED: {
    headerBg: "linear-gradient(145deg, #062828 0%, #0B4040 50%, #0F5656 100%)",
    glowColor: "rgba(20, 184, 166, 0.25)",
    borderTop: "from-teal-400 via-emerald-300 to-teal-500",
    badgeBg: "bg-teal-500/20",
    badgeText: "text-teal-300",
    badgeBorder: "border-teal-400/40",
    label: "Inspected",
    subLabel: "Approved by HK",
    pulseDot: "bg-teal-400",
    accentHex: "#14B8A6",
    icon: CheckCircle2,
  },
  OUT_OF_ORDER: {
    headerBg: "linear-gradient(145deg, #300A10 0%, #4D0E19 50%, #691424 100%)",
    glowColor: "rgba(244, 63, 94, 0.25)",
    borderTop: "from-rose-400 via-red-300 to-pink-500",
    badgeBg: "bg-rose-500/20",
    badgeText: "text-rose-300",
    badgeBorder: "border-rose-400/40",
    label: "Out of Order",
    subLabel: "Maintenance Block",
    pulseDot: "bg-rose-400",
    accentHex: "#F43F5E",
    icon: AlertTriangle,
  },
  OUT_OF_SERVICE: {
    headerBg: "linear-gradient(145deg, #181920 0%, #252833 50%, #323645 100%)",
    glowColor: "rgba(148, 163, 184, 0.20)",
    borderTop: "from-slate-400 via-zinc-300 to-slate-500",
    badgeBg: "bg-slate-500/20",
    badgeText: "text-slate-300",
    badgeBorder: "border-slate-400/40",
    label: "Out of Service",
    subLabel: "Temporarily Off",
    pulseDot: "bg-slate-400",
    accentHex: "#94A3B8",
    icon: Wrench,
  },
};

export function RoomCardGrid({
  rooms,
  currency,
  onOpenStatusModal,
  onSelectRoom,
}: RoomCardGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
      {rooms.map((room) => {
        const statusKey = (room.status as RoomOperationalStatus) in STATUS_CARD_THEMES
          ? (room.status as RoomOperationalStatus)
          : "AVAILABLE";
        const theme = STATUS_CARD_THEMES[statusKey];
        const StatusIcon = theme.icon;
        const typeName = room.room_type?.name || "Standard Room";
        const floorName = room.floor?.name || "Main Floor";
        const rate = room.room_type?.base_rate || 0;
        const occupancy = room.max_occupancy || room.room_type?.max_occupancy || 2;
        const liveStay = room.liveStay;
        const activeRequests = room.activeRequests || [];
        const isOccupied = statusKey === "OCCUPIED" || Boolean(liveStay);

        return (
          <div
            key={room.id}
            className={cn(
              "group relative flex flex-col rounded-2xl overflow-hidden bg-white border border-slate-200/80 shadow-[0_2px_10px_rgba(15,23,42,0.04)] hover:shadow-[0_12px_32px_-8px_rgba(15,23,42,0.12)] transition-all duration-300 hover:-translate-y-1 cursor-pointer",
              !room.is_active && "opacity-60"
            )}
            onClick={() => onSelectRoom?.(room)}
          >
            {/* Top accent radiant bar */}
            <div
              className={cn("absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r z-20", theme.borderTop)}
            />

            {/* ── CARD HEADER BANNER (Vibrant & Status Themed) ── */}
            <div
              className="relative p-3.5 overflow-hidden text-white shrink-0 border-b border-white/10 select-none"
              style={{ background: theme.headerBg }}
            >
              {/* Decorative radial blur blob */}
              <div
                className="absolute -top-8 -right-8 w-24 h-24 rounded-full pointer-events-none blur-xl opacity-40"
                style={{ background: theme.accentHex }}
              />

              <div className="relative z-10 flex items-start justify-between gap-2">
                {/* Room Number & Category */}
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-black uppercase tracking-widest text-[#E8CD8A]/80">
                      ROOM
                    </span>
                    {room.room_name && (
                      <span className="text-[10.5px] font-semibold text-white/60 truncate max-w-[90px]">
                        · {room.room_name}
                      </span>
                    )}
                  </div>
                  <span className="text-2xl font-black text-white tracking-tight leading-none">
                    {room.room_number}
                  </span>
                  <p className="text-[11px] font-semibold text-white/70 truncate mt-0.5 max-w-[130px]">
                    {typeName}
                  </p>
                </div>

                {/* Status Pill Badge with live pulse */}
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10.5px] font-black border backdrop-blur-md shadow-xs",
                      theme.badgeBg,
                      theme.badgeText,
                      theme.badgeBorder
                    )}
                  >
                    <span className="relative flex h-2 w-2">
                      <span
                        className={cn("animate-ping absolute inline-flex h-full w-full rounded-full opacity-75", theme.pulseDot)}
                      />
                      <span
                        className={cn("relative inline-flex rounded-full h-2 w-2", theme.pulseDot)}
                      />
                    </span>
                    <span>{theme.label}</span>
                  </span>

                  {/* Pending QR Requests Pill if active */}
                  {activeRequests.length > 0 && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.2 rounded-full text-[10px] font-black bg-rose-500 text-white shadow-xs animate-pulse">
                      <BellRing className="w-2.5 h-2.5" />
                      <span>{activeRequests.length} Req</span>
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* ── CARD BODY (Rich Operational Context) ── */}
            <div className="flex flex-col flex-1 p-3.5 gap-2.5 bg-white">
              {/* Floor & Capacity Strip */}
              <div className="flex items-center justify-between text-[11px] text-slate-500 pb-2 border-b border-slate-100">
                <span className="flex items-center gap-1 font-medium truncate max-w-[110px]">
                  <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                  {floorName}
                </span>
                <span className="flex items-center gap-1 font-semibold text-slate-700 shrink-0">
                  <Users className="w-3 h-3 text-slate-400" />
                  {occupancy} Guests
                </span>
              </div>

              {/* ── OCCUPIED GUEST DETAIL CAPSULE ── */}
              {isOccupied && liveStay ? (
                <div className="p-2.5 rounded-xl border border-purple-100 bg-purple-50/50 space-y-1.5">
                  <div className="flex items-center justify-between gap-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-6.5 h-6.5 rounded-lg bg-gradient-to-br from-purple-600 to-indigo-700 flex items-center justify-center text-white font-black text-[10px] shadow-2xs shrink-0">
                        {liveStay.guestName.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[12px] font-extrabold text-slate-900 truncate leading-tight">
                          {liveStay.guestName}
                        </p>
                        <p className="text-[10px] font-medium text-purple-700 flex items-center gap-1 leading-tight">
                          <Clock className="w-2.5 h-2.5" />
                          Out: {new Date(liveStay.expectedCheckOutDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                        </p>
                      </div>
                    </div>

                    {liveStay.guestVip && (
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-amber-100 text-amber-800 border border-amber-300 shrink-0">
                        VIP
                      </span>
                    )}
                  </div>

                  {/* Folio Balance Strip */}
                  <div className="flex items-center justify-between pt-1 border-t border-purple-100/80 text-[10.5px]">
                    <span className="font-bold text-slate-500">Folio Balance</span>
                    <span className={cn(
                      "font-black tabular-nums",
                      liveStay.balanceDue > 0 ? "text-amber-700" : "text-emerald-700"
                    )}>
                      {formatCurrency(liveStay.balanceDue, currency)}
                    </span>
                  </div>
                </div>
              ) : (
                /* ── VACANT / AVAILABLE METRICS ── */
                <div className="p-2.5 rounded-xl border border-slate-100 bg-slate-50/70 flex items-center justify-between">
                  <div>
                    <span className="text-[9.5px] font-black uppercase tracking-wider text-slate-400 block">
                      Housekeeping
                    </span>
                    <span className={cn(
                      "text-[11px] font-black",
                      room.housekeeping_status === "CLEAN" ? "text-emerald-700" : "text-amber-700"
                    )}>
                      {room.housekeeping_status}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[9.5px] font-black uppercase tracking-wider text-slate-400 block">
                      Nightly Rate
                    </span>
                    <span className="text-[12.5px] font-black text-slate-900 tabular-nums">
                      {formatCurrency(rate, currency)}
                    </span>
                  </div>
                </div>
              )}

              {/* ── CARD BOTTOM ACTION TOOLBAR ── */}
              <div
                className="flex items-center gap-1.5 mt-auto pt-2 border-t border-slate-100"
                onClick={(e) => e.stopPropagation()}
              >
                {/* 1. Quick Inspector Dialog */}
                <button
                  type="button"
                  onClick={() => onSelectRoom?.(room)}
                  className="flex-1 flex items-center justify-center gap-1 h-7.5 text-[11px] font-bold rounded-lg text-white bg-slate-900 hover:bg-slate-800 transition-colors shadow-2xs"
                  title="Open live guest, bill & request inspection modal"
                >
                  <Eye className="w-3 h-3" />
                  <span>Inspect</span>
                </button>

                {/* 2. Status Quick Modal */}
                <button
                  type="button"
                  onClick={() => onOpenStatusModal(room)}
                  className="flex items-center justify-center gap-1 h-7.5 px-2.5 text-[11px] font-bold rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 transition-colors"
                  title="Change room status"
                >
                  <SlidersHorizontal className="w-3 h-3 text-slate-500" />
                  <span>Status</span>
                </button>

                {/* 3. Edit Room */}
                <Link href={`/rooms/${room.id}/edit`}>
                  <button
                    type="button"
                    className="h-7.5 w-7.5 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 border border-slate-200 transition-colors"
                    title="Edit Room Specifications"
                  >
                    <Edit className="w-3 h-3" />
                  </button>
                </Link>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
