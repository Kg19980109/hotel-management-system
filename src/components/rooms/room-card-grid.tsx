"use client";

import * as React from "react";
import Link from "next/link";
import type { Room } from "@/lib/rooms/types";
import { formatCurrency } from "@/lib/dashboard/formatters";
import { OperationalStatusBadge, HousekeepingStatusBadge } from "./room-status-badge";
import { Button } from "@/components/ui/button";
import { BedDouble, Users, MapPin, SlidersHorizontal, Edit, ArrowRight } from "lucide-react";

interface RoomCardGridProps {
  rooms: Room[];
  currency: string;
  onOpenStatusModal: (room: Room) => void;
}

const STATUS_CONFIG = {
  AVAILABLE: {
    gradient: "from-emerald-500 to-teal-500",
    lightBg: "bg-emerald-50",
    dot: "bg-emerald-500",
    text: "text-emerald-700",
    border: "border-emerald-200",
    label: "Available",
    pulse: true,
    cardClass: "room-card-available",
  },
  OCCUPIED: {
    gradient: "from-violet-600 to-purple-600",
    lightBg: "bg-violet-50",
    dot: "bg-violet-600",
    text: "text-violet-700",
    border: "border-violet-200",
    label: "Occupied",
    pulse: true,
    cardClass: "room-card-occupied",
  },
  DIRTY: {
    gradient: "from-amber-500 to-orange-500",
    lightBg: "bg-amber-50",
    dot: "bg-amber-500",
    text: "text-amber-700",
    border: "border-amber-200",
    label: "Needs Cleaning",
    pulse: false,
    cardClass: "room-card-dirty",
  },
  OUT_OF_ORDER: {
    gradient: "from-red-500 to-rose-600",
    lightBg: "bg-red-50",
    dot: "bg-red-500",
    text: "text-red-700",
    border: "border-red-200",
    label: "Out of Order",
    pulse: false,
    cardClass: "room-card-maintenance",
  },
  MAINTENANCE: {
    gradient: "from-red-500 to-rose-600",
    lightBg: "bg-red-50",
    dot: "bg-red-500",
    text: "text-red-700",
    border: "border-red-200",
    label: "Maintenance",
    pulse: false,
    cardClass: "room-card-maintenance",
  },
} as const;

type StatusKey = keyof typeof STATUS_CONFIG;

export function RoomCardGrid({
  rooms,
  currency,
  onOpenStatusModal,
}: RoomCardGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      {rooms.map((room) => {
        const statusKey = (room.status as StatusKey) in STATUS_CONFIG
          ? (room.status as StatusKey)
          : "AVAILABLE";
        const cfg = STATUS_CONFIG[statusKey];
        const typeName = room.room_type?.name || "Standard Room";
        const floorName = room.floor?.name || "Ground Floor";
        const rate = room.room_type?.base_rate || 0;
        const occupancy = room.max_occupancy || room.room_type?.max_occupancy || 2;

        return (
          <div
            key={room.id}
            className={`group relative flex flex-col overflow-hidden rounded-2xl bg-white border border-slate-200/80 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-250 ${cfg.cardClass} ${!room.is_active ? "opacity-55" : ""}`}
          >
            {/* Top color banner with room number */}
            <div className={`relative h-20 bg-gradient-to-br ${cfg.gradient} flex items-center justify-between px-4 overflow-hidden shrink-0`}>
              {/* Decorative circles */}
              <div className="absolute -top-4 -right-4 w-20 h-20 bg-white/10 rounded-full" />
              <div className="absolute top-6 right-8 w-10 h-10 bg-white/10 rounded-full" />

              {/* Room number */}
              <div>
                <span className="text-white/70 text-[10px] font-bold uppercase tracking-widest block">Room</span>
                <span className="text-white font-black text-2xl tracking-tight leading-none">{room.room_number}</span>
                {room.room_name && (
                  <span className="text-white/70 text-[10px] italic block mt-0.5 font-serif truncate max-w-[100px]">{room.room_name}</span>
                )}
              </div>

              {/* Live status dot */}
              <div className="flex flex-col items-end gap-1.5">
                <div className="flex items-center gap-1.5">
                  {cfg.pulse ? (
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-60" />
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white" />
                    </span>
                  ) : (
                    <span className="h-2.5 w-2.5 rounded-full bg-white/60" />
                  )}
                  <span className="text-white text-[10px] font-bold">{cfg.label}</span>
                </div>

                {!room.is_active && (
                  <span className="bg-black/30 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                    INACTIVE
                  </span>
                )}
              </div>
            </div>

            {/* Content area */}
            <div className="flex flex-col flex-1 p-3.5 gap-3">
              {/* Type & Floor */}
              <div className="space-y-1">
                <div className="flex items-center gap-1.5">
                  <BedDouble className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  <span className="text-xs font-bold text-slate-800 truncate">{typeName}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <MapPin className="h-3 w-3 text-slate-400 shrink-0" />
                  <span className="text-[11px] text-slate-500 truncate">{floorName}</span>
                </div>
              </div>

              {/* Housekeeping badge */}
              <div className="flex items-center justify-between">
                <HousekeepingStatusBadge status={room.housekeeping_status} />
                <div className="flex items-center gap-1 text-slate-500">
                  <Users className="h-3 w-3" />
                  <span className="text-[10px] font-semibold">{occupancy}</span>
                </div>
              </div>

              {/* Rate */}
              <div className="pt-2.5 border-t border-slate-100">
                <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider block mb-0.5">Nightly Rate</span>
                <span className="text-sm font-black text-slate-900 font-serif">{formatCurrency(rate, currency)}</span>
                <span className="text-[10px] text-slate-400 font-normal ml-1">/night</span>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1.5 mt-auto">
                <button
                  onClick={() => onOpenStatusModal(room)}
                  className="flex-1 flex items-center justify-center gap-1 h-8 text-[11px] font-semibold rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                >
                  <SlidersHorizontal className="h-3 w-3" />
                  Status
                </button>
                <Link href={`/rooms/${room.id}`} className="flex-1">
                  <button className={`w-full flex items-center justify-center gap-1 h-8 text-[11px] font-bold rounded-xl text-white transition-all bg-gradient-to-r ${cfg.gradient} hover:opacity-90 shadow-sm`}>
                    View
                    <ArrowRight className="h-3 w-3" />
                  </button>
                </Link>
                <Link href={`/rooms/${room.id}/edit`}>
                  <button
                    className="h-8 w-8 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
                    title="Edit Room"
                  >
                    <Edit className="h-3.5 w-3.5" />
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
