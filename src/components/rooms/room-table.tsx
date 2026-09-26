"use client";

import * as React from "react";
import Link from "next/link";
import type { Room } from "@/lib/rooms/types";
import { formatCurrency } from "@/lib/dashboard/formatters";
import { OperationalStatusBadge, HousekeepingStatusBadge } from "./room-status-badge";
import { Button } from "@/components/ui/button";
import { Eye, Edit, SlidersHorizontal, Ban, CheckCircle } from "lucide-react";

interface RoomTableProps {
  rooms: Room[];
  currency: string;
  onOpenStatusModal: (room: Room) => void;
  onDeactivateRoom: (room: Room) => void;
}

export function RoomTable({
  rooms,
  currency,
  onOpenStatusModal,
  onDeactivateRoom,
}: RoomTableProps) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200/90 bg-white/95 backdrop-blur-md shadow-sm">
      <table className="w-full text-left text-xs text-slate-900 border-collapse">
        <thead className="border-b border-slate-200/80 bg-slate-50/90 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
          <tr>
            <th className="py-3.5 px-4">Room & Suite</th>
            <th className="py-3.5 px-4">Category</th>
            <th className="py-3.5 px-4">Floor</th>
            <th className="py-3.5 px-4">Operational Status</th>
            <th className="py-3.5 px-4">Housekeeping</th>
            <th className="py-3.5 px-4">Nightly Rate</th>
            <th className="py-3.5 px-4">Capacity</th>
            <th className="py-3.5 px-4 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rooms.map((room) => {
            const typeName = room.room_type?.name || "Standard";
            const floorName = room.floor?.name || "Ground Floor";
            const rate = room.room_type?.base_rate || 0;
            const occupancy = room.max_occupancy || room.room_type?.max_occupancy || 2;
            const isOccupied = room.status === "OCCUPIED";

            return (
              <tr
                key={room.id}
                className={`hover:bg-indigo-50/30 transition-all duration-150 group ${
                  !room.is_active ? "opacity-60 bg-slate-50/60" : ""
                }`}
              >
                {/* Room */}
                <td className="py-3.5 px-4 whitespace-nowrap">
                  <div className="flex items-center gap-2.5">
                    <span className="font-serif font-black text-lg text-slate-900 group-hover:text-indigo-600 transition-colors">
                      {room.room_number}
                    </span>
                    {isOccupied && (
                      <span className="relative flex h-2 w-2" title="Guest In-House">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-600" />
                      </span>
                    )}
                    {room.room_name && (
                      <span className="text-xs text-slate-500 italic font-serif truncate max-w-[140px]">
                        ({room.room_name})
                      </span>
                    )}
                    {!room.is_active && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                        Deactivated
                      </span>
                    )}
                  </div>
                </td>

                {/* Type */}
                <td className="py-3.5 px-4 font-semibold text-slate-800 whitespace-nowrap">
                  {typeName}
                </td>

                {/* Floor */}
                <td className="py-3.5 px-4 text-slate-600 font-medium whitespace-nowrap">
                  {floorName}
                </td>

                {/* Status */}
                <td className="py-3.5 px-4 whitespace-nowrap">
                  <OperationalStatusBadge status={room.status} />
                </td>

                {/* Housekeeping */}
                <td className="py-3.5 px-4 whitespace-nowrap">
                  <HousekeepingStatusBadge status={room.housekeeping_status} />
                </td>

                {/* Rate */}
                <td className="py-3.5 px-4 font-serif font-bold text-slate-900 whitespace-nowrap">
                  {formatCurrency(rate, currency)}
                  <span className="text-[10px] font-sans font-normal text-slate-400 ml-1">/night</span>
                </td>

                {/* Capacity */}
                <td className="py-3.5 px-4 text-slate-600 text-xs whitespace-nowrap">
                  {occupancy} Guests
                </td>

                {/* Actions */}
                <td className="py-3.5 px-4 text-right whitespace-nowrap">
                  <div className="flex items-center justify-end gap-1.5">
                    {/* Status change quick action */}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onOpenStatusModal(room)}
                      className="h-8 px-2 text-xs font-semibold text-slate-600 hover:text-amber-700 hover:border-amber-300 rounded-lg gap-1"
                    >
                      <SlidersHorizontal className="h-3.5 w-3.5" />
                      <span>Status</span>
                    </Button>

                    {/* View Details */}
                    <Link href={`/rooms/${room.id}`}>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-[var(--foreground-muted)] hover:text-[var(--primary)]"
                        title="View room details"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </Link>

                    {/* Edit */}
                    <Link href={`/rooms/${room.id}/edit`}>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
                        title="Edit room"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </Link>

                    {/* Deactivate / Reactivate */}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onDeactivateRoom(room)}
                      className={`h-8 w-8 p-0 ${
                        room.is_active
                          ? "text-slate-400 hover:text-red-600"
                          : "text-slate-400 hover:text-emerald-600"
                      }`}
                      title={room.is_active ? "Deactivate room" : "Reactivate room"}
                    >
                      {room.is_active ? (
                        <Ban className="h-4 w-4" />
                      ) : (
                        <CheckCircle className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
