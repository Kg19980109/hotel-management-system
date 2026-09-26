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
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
      {rooms.map((room) => {
        const typeName = room.room_type?.name || "Standard Room";
        const floorName = room.floor?.name || "Ground Floor";
        const rate = room.room_type?.base_rate || 0;
        const occupancy = room.max_occupancy || room.room_type?.max_occupancy || 2;
        const isOccupied = room.status === "OCCUPIED";
        const isAvailable = room.status === "AVAILABLE";

        return (
          <div
            key={room.id}
            className={`p-5 relative overflow-hidden rounded-2xl bg-white border border-slate-200/80 shadow-sm hover:shadow-xl hover:-translate-y-1.5 hover:border-indigo-300 transition-all duration-300 group flex flex-col justify-between ${
              !room.is_active ? "opacity-60 bg-slate-50/80" : ""
            }`}
          >
            {/* Ambient decorative gradient corner */}
            <div className={`absolute top-0 right-0 w-28 h-28 rounded-bl-full pointer-events-none opacity-30 transition-opacity group-hover:opacity-60 ${
              isOccupied ? "bg-gradient-to-bl from-indigo-200 to-transparent" :
              isAvailable ? "bg-gradient-to-bl from-emerald-200 to-transparent" :
              "bg-gradient-to-bl from-amber-200 to-transparent"
            }`} />

            <div>
              {/* Top Row: Room number & Operational Badge */}
              <div className="flex items-start justify-between gap-2 mb-2 relative z-10">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-2xl font-serif font-black text-slate-900 tracking-tight group-hover:text-indigo-600 transition-colors">
                      {room.room_number}
                    </span>
                    {isOccupied && (
                      <span className="relative flex h-2.5 w-2.5 ml-1" title="In-House Stay">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-indigo-600" />
                      </span>
                    )}
                    {isAvailable && (
                      <span className="relative flex h-2.5 w-2.5 ml-1" title="Ready for Check-In">
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                      </span>
                    )}
                  </div>
                  {room.room_name && (
                    <span className="text-xs text-slate-500 italic block font-serif">
                      {room.room_name}
                    </span>
                  )}
                </div>

                <OperationalStatusBadge status={room.status} />
              </div>

              {/* Subtitle: Type & Floor */}
              <div className="space-y-1.5 mb-3.5 relative z-10">
                <p className="text-xs font-bold text-slate-800 truncate flex items-center gap-1.5">
                  <BedDouble className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                  {typeName}
                </p>
                <p className="text-[11px] text-slate-500 font-medium flex items-center gap-1.5">
                  <MapPin className="h-3 w-3 text-slate-400 shrink-0" />
                  {floorName}
                </p>
              </div>

              {/* Badges: Housekeeping & Active */}
              <div className="flex items-center gap-1.5 flex-wrap mb-4 relative z-10">
                <HousekeepingStatusBadge status={room.housekeeping_status} />
                {!room.is_active && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                    Deactivated
                  </span>
                )}
              </div>
            </div>

            {/* Bottom: Rate, Capacity & Quick Actions */}
            <div className="pt-3.5 border-t border-slate-100 mt-2 relative z-10">
              <div className="flex items-center justify-between mb-3.5">
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Nightly Rate</span>
                  <span className="text-base font-black text-slate-900 tracking-tight font-serif">
                    {formatCurrency(rate, currency)}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Max Guests</span>
                  <span className="text-xs text-slate-700 font-bold flex items-center gap-1 justify-end mt-0.5">
                    <Users className="h-3.5 w-3.5 text-slate-400" />
                    {occupancy} guests
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onOpenStatusModal(room)}
                  className="flex-1 text-xs h-8 font-semibold rounded-xl border-slate-200 hover:border-amber-300 hover:bg-amber-50/50 hover:text-amber-800 transition-all"
                >
                  <SlidersHorizontal className="h-3.5 w-3.5 mr-1 text-slate-500" />
                  Status
                </Button>
                <Link href={`/rooms/${room.id}`} className="flex-1">
                  <Button size="sm" className="w-full text-xs h-8 font-semibold rounded-xl bg-slate-900 hover:bg-indigo-600 text-white transition-all shadow-xs">
                    <Eye className="h-3.5 w-3.5 mr-1" />
                    View
                  </Button>
                </Link>
                <Link href={`/rooms/${room.id}/edit`}>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-xl"
                    title="Edit Room Specifications"
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
