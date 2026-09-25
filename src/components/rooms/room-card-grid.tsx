"use client";

import * as React from "react";
import Link from "next/link";
import type { Room } from "@/lib/rooms/types";
import { formatCurrency } from "@/lib/dashboard/formatters";
import { OperationalStatusBadge, HousekeepingStatusBadge } from "./room-status-badge";
import { Button } from "@/components/ui/button";
import { BedDouble, Users, MapPin, SlidersHorizontal, Eye, Edit } from "lucide-react";

interface RoomCardGridProps {
  rooms: Room[];
  currency: string;
  onOpenStatusModal: (room: Room) => void;
}

export function RoomCardGrid({
  rooms,
  currency,
  onOpenStatusModal,
}: RoomCardGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {rooms.map((room) => {
        const typeName = room.room_type?.name || "Standard";
        const floorName = room.floor?.name || "Unassigned Floor";
        const rate = room.room_type?.base_rate || 0;
        const occupancy = room.max_occupancy || room.room_type?.max_occupancy || 2;

        return (
          <div
            key={room.id}
            className={`stayhub-card p-4 flex flex-col justify-between hover:shadow-md transition-all group ${
              !room.is_active ? "opacity-60 bg-slate-50" : ""
            }`}
          >
            <div>
              {/* Top Row: Room number & Operational Badge */}
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-xl font-bold font-mono text-[var(--foreground)] tracking-tight">
                    {room.room_number}
                  </span>
                  {room.room_name && (
                    <span className="text-xs text-[var(--foreground-muted)] truncate max-w-[90px]">
                      {room.room_name}
                    </span>
                  )}
                </div>
                <OperationalStatusBadge status={room.status} />
              </div>

              {/* Subtitle: Type & Floor */}
              <div className="space-y-1 mb-3">
                <p className="text-xs font-semibold text-[var(--foreground)] truncate flex items-center gap-1">
                  <BedDouble className="h-3.5 w-3.5 text-[var(--primary)] shrink-0" />
                  {typeName}
                </p>
                <p className="text-[11px] text-[var(--foreground-muted)] flex items-center gap-1">
                  <MapPin className="h-3 w-3 text-[var(--foreground-subtle)] shrink-0" />
                  {floorName}
                </p>
              </div>

              {/* Badges: Housekeeping & Active */}
              <div className="flex items-center gap-1.5 flex-wrap mb-3">
                <HousekeepingStatusBadge status={room.housekeeping_status} />
                {!room.is_active && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-200 text-slate-600">
                    Inactive
                  </span>
                )}
              </div>
            </div>

            {/* Bottom: Rate, Capacity & Quick Actions */}
            <div className="pt-3 border-t border-[var(--border)] mt-2">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <span className="text-[11px] text-[var(--foreground-muted)] block">Rate</span>
                  <span className="text-sm font-bold text-[var(--foreground)]">
                    {formatCurrency(rate, currency)}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[11px] text-[var(--foreground-muted)] block">Capacity</span>
                  <span className="text-xs text-[var(--foreground)] font-medium flex items-center gap-0.5 justify-end">
                    <Users className="h-3 w-3 text-[var(--foreground-subtle)]" />
                    {occupancy}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onOpenStatusModal(room)}
                  className="flex-1 text-xs h-7.5"
                >
                  <SlidersHorizontal className="h-3.5 w-3.5 mr-1" />
                  Status
                </Button>
                <Link href={`/rooms/${room.id}`} className="flex-1">
                  <Button size="sm" variant="primary" className="w-full text-xs h-7.5">
                    <Eye className="h-3.5 w-3.5 mr-1" />
                    View
                  </Button>
                </Link>
                <Link href={`/rooms/${room.id}/edit`}>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7.5 w-7.5 p-0 text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
                    title="Edit"
                  >
                    <Edit className="h-3.5 w-3.5" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
