"use client";

import * as React from "react";
import Link from "next/link";
import type { Room } from "@/lib/rooms/types";
import { formatCurrency } from "@/lib/dashboard/formatters";
import { HousekeepingStatusBadge } from "./room-status-badge";
import { BedDouble, Users, MapPin, SlidersHorizontal, Edit, ArrowRight, ShieldCheck, Sparkles, AlertTriangle, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";

interface RoomCardGridProps {
  rooms: Room[];
  currency: string;
  onOpenStatusModal: (room: Room) => void;
}

const STATUS_CONFIG = {
  AVAILABLE: {
    accent: "var(--success)",
    bg: "var(--success-light)",
    fg: "var(--success-foreground)",
    label: "Available",
    pulse: true,
    icon: ShieldCheck,
  },
  OCCUPIED: {
    accent: "var(--purple)",
    bg: "var(--purple-light)",
    fg: "var(--purple-foreground)",
    label: "Occupied",
    pulse: true,
    icon: BedDouble,
  },
  DIRTY: {
    accent: "var(--warning)",
    bg: "var(--warning-light)",
    fg: "var(--warning-foreground)",
    label: "Cleaning",
    pulse: false,
    icon: Sparkles,
  },
  OUT_OF_ORDER: {
    accent: "var(--danger)",
    bg: "var(--danger-light)",
    fg: "var(--danger-foreground)",
    label: "Out of Order",
    pulse: false,
    icon: AlertTriangle,
  },
  MAINTENANCE: {
    accent: "var(--danger)",
    bg: "var(--danger-light)",
    fg: "var(--danger-foreground)",
    label: "Maintenance",
    pulse: false,
    icon: Wrench,
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
        const StatusIcon = cfg.icon;
        const typeName = room.room_type?.name || "Standard Room";
        const floorName = room.floor?.name || "Ground Floor";
        const rate = room.room_type?.base_rate || 0;
        const occupancy = room.max_occupancy || room.room_type?.max_occupancy || 2;

        return (
          <div
            key={room.id}
            className={cn(
              "stayhub-card hover-lift group relative flex flex-col overflow-hidden",
              !room.is_active && "opacity-60"
            )}
          >
            {/* Top accent line */}
            <div
              className="absolute top-0 left-0 right-0 h-[3px]"
              style={{ background: cfg.accent }}
            />

            {/* Room Header Banner with Midnight Surface */}
            <div
              className="relative p-4 flex items-center justify-between overflow-hidden shrink-0 border-b border-[var(--border)]"
              style={{
                background: "linear-gradient(145deg, #08111F 0%, #0D1830 100%)",
              }}
            >
              {/* Decorative subtle ambient circle */}
              <div
                className="absolute -top-6 -right-6 w-20 h-20 rounded-full pointer-events-none opacity-20"
                style={{ background: cfg.accent }}
              />

              {/* Room Identifier */}
              <div className="relative z-10">
                <span className="text-white/50 text-[10px] font-bold uppercase tracking-[0.14em] block">
                  Room
                </span>
                <span className="text-white font-bold text-2xl tracking-tight leading-none">
                  {room.room_number}
                </span>
                {room.room_name && (
                  <span className="text-[var(--brand-gold)] text-[11px] font-medium italic block mt-0.5 truncate max-w-[120px]">
                    {room.room_name}
                  </span>
                )}
              </div>

              {/* Status Pill Badge */}
              <div className="relative z-10 flex flex-col items-end gap-1">
                <span
                  className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10.5px] font-bold"
                  style={{
                    backgroundColor: cfg.bg,
                    color: cfg.fg,
                  }}
                >
                  {cfg.pulse ? (
                    <span className="relative flex h-2 w-2">
                      <span
                        className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                        style={{ backgroundColor: cfg.accent }}
                      />
                      <span
                        className="relative inline-flex rounded-full h-2 w-2"
                        style={{ backgroundColor: cfg.accent }}
                      />
                    </span>
                  ) : (
                    <StatusIcon className="h-2.5 w-2.5" />
                  )}
                  {cfg.label}
                </span>

                {!room.is_active && (
                  <span className="bg-white/10 text-white/70 text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                    INACTIVE
                  </span>
                )}
              </div>
            </div>

            {/* Room Card Body */}
            <div className="flex flex-col flex-1 p-4 gap-3 bg-white">
              {/* Type & Floor Meta */}
              <div className="space-y-1">
                <div className="flex items-center gap-1.5">
                  <BedDouble className="h-3.5 w-3.5 text-[var(--foreground-muted)] shrink-0" />
                  <span className="text-xs font-bold text-[var(--foreground)] truncate">
                    {typeName}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <MapPin className="h-3 w-3 text-[var(--foreground-subtle)] shrink-0" />
                  <span className="text-[11px] text-[var(--foreground-muted)] truncate">
                    {floorName}
                  </span>
                </div>
              </div>

              {/* Housekeeping & Capacity */}
              <div className="flex items-center justify-between pt-1">
                <HousekeepingStatusBadge status={room.housekeeping_status} />
                <div className="flex items-center gap-1 text-[var(--foreground-muted)] text-[11px] font-medium">
                  <Users className="h-3 w-3 text-[var(--foreground-subtle)]" />
                  <span>{occupancy} guests</span>
                </div>
              </div>

              {/* Nightly Rate Strip */}
              <div className="pt-2.5 border-t border-[var(--border)] flex items-baseline justify-between">
                <span className="text-[10px] uppercase font-bold text-[var(--foreground-subtle)] tracking-wider">
                  Nightly Rate
                </span>
                <div>
                  <span className="text-sm font-bold text-[var(--foreground)]">
                    {formatCurrency(rate, currency)}
                  </span>
                  <span className="text-[10px] text-[var(--foreground-muted)] ml-0.5">/night</span>
                </div>
              </div>

              {/* Operational Action Toolbar */}
              <div className="flex items-center gap-1.5 mt-auto pt-2 border-t border-[var(--border)]">
                <button
                  type="button"
                  onClick={() => onOpenStatusModal(room)}
                  className="flex-1 flex items-center justify-center gap-1 h-7 text-[11px] font-semibold rounded-[var(--radius-md)] bg-[var(--secondary)] text-[var(--secondary-foreground)] hover:bg-[var(--secondary-hover)] transition-colors"
                  title="Adjust room operational state"
                >
                  <SlidersHorizontal className="h-3 w-3 text-[var(--foreground-muted)]" />
                  Status
                </button>
                <Link href={`/rooms/${room.id}`} className="flex-1">
                  <button
                    type="button"
                    className="w-full flex items-center justify-center gap-1 h-7 text-[11px] font-bold rounded-[var(--radius-md)] text-white bg-[var(--primary)] hover:bg-[var(--primary-hover)] transition-colors shadow-xs"
                  >
                    View
                    <ArrowRight className="h-3 w-3" />
                  </button>
                </Link>
                <Link href={`/rooms/${room.id}/edit`}>
                  <button
                    type="button"
                    className="h-7 w-7 flex items-center justify-center text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:bg-[var(--secondary)] rounded-[var(--radius-md)] transition-colors"
                    title="Edit Room Specifications"
                  >
                    <Edit className="h-3 w-3" />
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
