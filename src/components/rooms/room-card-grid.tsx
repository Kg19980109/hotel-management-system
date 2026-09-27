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
  Sparkles,
  AlertTriangle,
  Wrench,
  Clock,
  Crown,
  Eye,
  CheckCircle2,
  BellRing,
  ShieldCheck,
  CreditCard,
  Layers,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface RoomCardGridProps {
  rooms: Room[];
  currency: string;
  onOpenStatusModal: (room: Room) => void;
  onSelectRoom?: (room: Room) => void;
}

interface StatusTheme {
  label: string;
  subLabel: string;
  accentGradient: string;
  headerBg: string;
  glowBorder: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  pulseDot: string;
  iconBg: string;
  iconText: string;
  icon: React.ComponentType<{ className?: string }>;
}

const STATUS_THEMES: Record<RoomOperationalStatus, StatusTheme> = {
  AVAILABLE: {
    label: "Available",
    subLabel: "Vacant & Clean",
    accentGradient: "from-emerald-400 via-teal-400 to-emerald-500",
    headerBg: "bg-gradient-to-r from-emerald-950 via-teal-900 to-slate-900",
    glowBorder: "group-hover:border-emerald-400/60 group-hover:shadow-[0_12px_30px_-6px_rgba(16,185,129,0.2)]",
    badgeBg: "bg-emerald-500/20",
    badgeText: "text-emerald-300",
    badgeBorder: "border-emerald-400/40",
    pulseDot: "bg-emerald-400",
    iconBg: "bg-emerald-50 text-emerald-600 border-emerald-100",
    iconText: "text-emerald-600",
    icon: ShieldCheck,
  },
  OCCUPIED: {
    label: "Occupied",
    subLabel: "In-House Guest",
    accentGradient: "from-indigo-400 via-purple-400 to-violet-500",
    headerBg: "bg-gradient-to-r from-indigo-950 via-purple-950 to-slate-900",
    glowBorder: "group-hover:border-purple-400/60 group-hover:shadow-[0_12px_30px_-6px_rgba(147,51,234,0.2)]",
    badgeBg: "bg-purple-500/20",
    badgeText: "text-purple-200",
    badgeBorder: "border-purple-400/40",
    pulseDot: "bg-purple-400",
    iconBg: "bg-purple-50 text-purple-600 border-purple-100",
    iconText: "text-purple-600",
    icon: BedDouble,
  },
  DIRTY: {
    label: "Needs Cleaning",
    subLabel: "Housekeeping Due",
    accentGradient: "from-amber-400 via-orange-400 to-amber-500",
    headerBg: "bg-gradient-to-r from-amber-950 via-orange-950 to-slate-900",
    glowBorder: "group-hover:border-amber-400/60 group-hover:shadow-[0_12px_30px_-6px_rgba(245,158,11,0.2)]",
    badgeBg: "bg-amber-500/20",
    badgeText: "text-amber-300",
    badgeBorder: "border-amber-400/40",
    pulseDot: "bg-amber-400",
    iconBg: "bg-amber-50 text-amber-600 border-amber-100",
    iconText: "text-amber-600",
    icon: Sparkles,
  },
  CLEANING: {
    label: "Cleaning",
    subLabel: "Housekeeping Active",
    accentGradient: "from-sky-400 via-cyan-400 to-blue-500",
    headerBg: "bg-gradient-to-r from-sky-950 via-cyan-950 to-slate-900",
    glowBorder: "group-hover:border-sky-400/60 group-hover:shadow-[0_12px_30px_-6px_rgba(14,165,233,0.2)]",
    badgeBg: "bg-sky-500/20",
    badgeText: "text-sky-300",
    badgeBorder: "border-sky-400/40",
    pulseDot: "bg-sky-400",
    iconBg: "bg-sky-50 text-sky-600 border-sky-100",
    iconText: "text-sky-600",
    icon: Sparkles,
  },
  INSPECTED: {
    label: "Inspected",
    subLabel: "Verified Ready",
    accentGradient: "from-teal-400 via-emerald-400 to-teal-500",
    headerBg: "bg-gradient-to-r from-teal-950 via-emerald-950 to-slate-900",
    glowBorder: "group-hover:border-teal-400/60 group-hover:shadow-[0_12px_30px_-6px_rgba(20,184,166,0.2)]",
    badgeBg: "bg-teal-500/20",
    badgeText: "text-teal-300",
    badgeBorder: "border-teal-400/40",
    pulseDot: "bg-teal-400",
    iconBg: "bg-teal-50 text-teal-600 border-teal-100",
    iconText: "text-teal-600",
    icon: CheckCircle2,
  },
  OUT_OF_ORDER: {
    label: "Out of Order",
    subLabel: "Maintenance Block",
    accentGradient: "from-rose-400 via-red-400 to-rose-500",
    headerBg: "bg-gradient-to-r from-rose-950 via-red-950 to-slate-900",
    glowBorder: "group-hover:border-rose-400/60 group-hover:shadow-[0_12px_30px_-6px_rgba(244,63,94,0.2)]",
    badgeBg: "bg-rose-500/20",
    badgeText: "text-rose-300",
    badgeBorder: "border-rose-400/40",
    pulseDot: "bg-rose-400",
    iconBg: "bg-rose-50 text-rose-600 border-rose-100",
    iconText: "text-rose-600",
    icon: AlertTriangle,
  },
  OUT_OF_SERVICE: {
    label: "Out of Service",
    subLabel: "Temporarily Off",
    accentGradient: "from-slate-400 via-zinc-400 to-slate-500",
    headerBg: "bg-gradient-to-r from-slate-900 via-zinc-900 to-slate-950",
    glowBorder: "group-hover:border-slate-400/60 group-hover:shadow-[0_12px_30px_-6px_rgba(100,116,139,0.2)]",
    badgeBg: "bg-slate-500/20",
    badgeText: "text-slate-300",
    badgeBorder: "border-slate-400/40",
    pulseDot: "bg-slate-400",
    iconBg: "bg-slate-50 text-slate-600 border-slate-100",
    iconText: "text-slate-600",
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
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-5 gap-4.5">
      {rooms.map((room) => {
        const statusKey = (room.status as RoomOperationalStatus) in STATUS_THEMES
          ? (room.status as RoomOperationalStatus)
          : "AVAILABLE";
        const theme = STATUS_THEMES[statusKey];
        const typeName = room.room_type?.name || "Standard Room";
        const floorName = room.floor?.name || room.floor_label || "Main Floor";
        const rate = room.room_type?.base_rate || 0;
        const occupancy = room.max_occupancy || room.room_type?.max_occupancy || 2;
        const liveStay = room.liveStay;
        const activeRequests = room.activeRequests || [];
        const isOccupied = statusKey === "OCCUPIED" || Boolean(liveStay);
        const hasPendingRequests = activeRequests.length > 0;

        return (
          <div
            key={room.id}
            className={cn(
              "group relative flex flex-col rounded-2xl overflow-hidden bg-white border border-slate-200/90 shadow-[0_2px_12px_rgba(15,23,42,0.05)] transition-all duration-300 hover:-translate-y-1.5 cursor-pointer",
              theme.glowBorder,
              !room.is_active && "opacity-60"
            )}
            onClick={() => onSelectRoom?.(room)}
          >
            {/* Top Accent Gradient Bar */}
            <div
              className={cn(
                "absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r z-20 transition-all duration-300",
                theme.accentGradient
              )}
            />

            {/* ── CARD HEADER (Luxury Status Themed Bar) ── */}
            <div className={cn("relative p-4 overflow-hidden text-white shrink-0", theme.headerBg)}>
              {/* Subtle ambient light gradient blob */}
              <div
                className={cn(
                  "absolute -top-10 -right-10 w-28 h-28 rounded-full blur-2xl opacity-35 pointer-events-none bg-gradient-to-br",
                  theme.accentGradient
                )}
              />

              <div className="relative z-10 flex items-start justify-between gap-2">
                {/* Room Identifier */}
                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="px-1.5 py-0.2 rounded-md bg-white/15 text-[9.5px] font-black tracking-widest uppercase text-white/90 backdrop-blur-xs">
                      ROOM
                    </span>
                    {room.room_name && (
                      <span className="text-[11px] font-semibold text-white/70 truncate max-w-[110px]">
                        {room.room_name}
                      </span>
                    )}
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-3xl font-black text-white tracking-tight leading-none">
                      {room.room_number}
                    </span>
                  </div>
                  <p className="text-[11.5px] font-bold text-white/80 truncate mt-1 max-w-[150px]">
                    {typeName}
                  </p>
                </div>

                {/* Status Badges on Right */}
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10.5px] font-black border backdrop-blur-md shadow-xs",
                      theme.badgeBg,
                      theme.badgeText,
                      theme.badgeBorder
                    )}
                  >
                    <span className="relative flex h-2 w-2">
                      <span
                        className={cn(
                          "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
                          theme.pulseDot
                        )}
                      />
                      <span
                        className={cn(
                          "relative inline-flex rounded-full h-2 w-2",
                          theme.pulseDot
                        )}
                      />
                    </span>
                    <span>{theme.label}</span>
                  </span>

                  {/* Pending QR Requests Pill */}
                  {hasPendingRequests && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-500 text-white shadow-xs animate-bounce">
                      <BellRing className="w-2.5 h-2.5" />
                      <span>{activeRequests.length} Req Pending</span>
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* ── CARD BODY (Rich Operational Details) ── */}
            <div className="flex flex-col flex-1 p-3.5 gap-2.5 bg-slate-50/40">
              {/* Floor & Specs Sub-bar */}
              <div className="flex items-center justify-between text-[11px] text-slate-600 pb-2 border-b border-slate-100">
                <span className="flex items-center gap-1 font-semibold truncate max-w-[130px]" title={floorName}>
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">{floorName}</span>
                </span>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="flex items-center gap-1 font-bold text-slate-700">
                    <Users className="w-3.5 h-3.5 text-slate-400" />
                    {occupancy}
                  </span>
                  {room.view_type && (
                    <span className="px-1.5 py-0.2 rounded-md bg-slate-200/70 text-slate-700 text-[9.5px] font-bold">
                      {room.view_type}
                    </span>
                  )}
                </div>
              </div>

              {/* ── STATUS CONTEXT HUB ── */}
              {isOccupied && liveStay ? (
                /* ── OCCUPIED GUEST CARD ── */
                <div className="p-2.5 rounded-xl border border-purple-100/90 bg-gradient-to-br from-purple-50/70 via-indigo-50/30 to-white shadow-2xs space-y-2">
                  <div className="flex items-center justify-between gap-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-600 to-indigo-700 flex items-center justify-center text-white font-black text-[11px] shadow-2xs shrink-0">
                        {liveStay.guestName.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1">
                          <p className="text-[12px] font-black text-slate-900 truncate leading-tight">
                            {liveStay.guestName}
                          </p>
                          {liveStay.guestVip && (
                            <Crown className="w-3 h-3 text-amber-500 fill-amber-400 shrink-0" />
                          )}
                        </div>
                        <p className="text-[10px] font-semibold text-purple-700 flex items-center gap-1 leading-tight mt-0.5">
                          <Clock className="w-2.5 h-2.5" />
                          Out: {new Date(liveStay.expectedCheckOutDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Folio Balance / Payment Chip */}
                  <div className="flex items-center justify-between pt-1.5 border-t border-purple-100 text-[11px]">
                    <span className="font-bold text-slate-500 flex items-center gap-1">
                      <CreditCard className="w-3 h-3 text-slate-400" />
                      Folio Balance
                    </span>
                    <span
                      className={cn(
                        "font-black tabular-nums px-1.5 py-0.2 rounded-md",
                        liveStay.balanceDue > 0
                          ? "bg-amber-100/80 text-amber-800 border border-amber-200"
                          : "bg-emerald-100/80 text-emerald-800 border border-emerald-200"
                      )}
                    >
                      {liveStay.balanceDue > 0
                        ? formatCurrency(liveStay.balanceDue, currency)
                        : "Settled"}
                    </span>
                  </div>
                </div>
              ) : statusKey === "DIRTY" ? (
                /* ── DIRTY / NEEDS CLEANING CARD ── */
                <div className="p-2.5 rounded-xl border border-amber-200/80 bg-gradient-to-br from-amber-50/80 via-orange-50/40 to-white shadow-2xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1 text-[11px] font-black text-amber-800">
                      <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                      Housekeeping Due
                    </span>
                    <span className="text-[12px] font-black text-slate-900 tabular-nums">
                      {formatCurrency(rate, currency)}<span className="text-[9.5px] font-normal text-slate-400">/n</span>
                    </span>
                  </div>
                  <p className="text-[10px] font-medium text-amber-700/90 leading-tight">
                    Room is marked dirty. Ready for cleaning dispatch.
                  </p>
                </div>
              ) : statusKey === "OUT_OF_ORDER" ? (
                /* ── OUT OF ORDER CARD ── */
                <div className="p-2.5 rounded-xl border border-rose-200/80 bg-gradient-to-br from-rose-50/80 via-red-50/40 to-white shadow-2xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1 text-[11px] font-black text-rose-800">
                      <Wrench className="w-3.5 h-3.5 text-rose-600" />
                      Maintenance Hold
                    </span>
                    <span className="text-[10px] font-bold text-rose-700 bg-rose-100 px-1.5 py-0.2 rounded">
                      Blocked
                    </span>
                  </div>
                  <p className="text-[10px] font-medium text-rose-700/90 leading-tight truncate">
                    {room.notes || "Room undergoing maintenance inspection."}
                  </p>
                </div>
              ) : (
                /* ── AVAILABLE / READY CARD ── */
                <div className="p-2.5 rounded-xl border border-emerald-100 bg-gradient-to-br from-emerald-50/60 via-teal-50/30 to-white shadow-2xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-[11px] font-black text-emerald-800">
                        Ready for Check-In
                      </span>
                    </div>
                    <span className="text-[13px] font-black text-slate-900 tabular-nums">
                      {formatCurrency(rate, currency)}<span className="text-[9.5px] font-semibold text-slate-400">/nt</span>
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] pt-1 border-t border-emerald-100/70">
                    <span className="font-bold text-slate-500">Housekeeping</span>
                    <span className="font-black text-emerald-700">
                      {room.housekeeping_status}
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
                  className="flex-1 flex items-center justify-center gap-1.5 h-8 text-[11px] font-bold rounded-xl text-white bg-slate-900 hover:bg-slate-800 transition-all duration-200 shadow-xs hover:shadow-sm"
                  title="Inspect live guest details, folio bill & service requests"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Inspect</span>
                </button>

                {/* 2. Status Modal Trigger */}
                <button
                  type="button"
                  onClick={() => onOpenStatusModal(room)}
                  className="flex items-center justify-center gap-1 h-8 px-2.5 text-[11px] font-bold rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200/90 shadow-2xs transition-colors"
                  title="Adjust room operational or housekeeping status"
                >
                  <SlidersHorizontal className="w-3 h-3 text-slate-500" />
                  <span>Status</span>
                </button>

                {/* 3. Edit Room Trigger */}
                <Link href={`/rooms/${room.id}/edit`}>
                  <button
                    type="button"
                    className="h-8 w-8 flex items-center justify-center rounded-xl bg-white hover:bg-slate-100 text-slate-500 hover:text-slate-900 border border-slate-200/90 shadow-2xs transition-colors"
                    title="Edit room category and specifications"
                  >
                    <Edit className="w-3.5 h-3.5" />
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
