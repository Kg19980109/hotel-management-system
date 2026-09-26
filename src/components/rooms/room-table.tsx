"use client";

import * as React from "react";
import Link from "next/link";
import type { Room } from "@/lib/rooms/types";
import { formatCurrency } from "@/lib/dashboard/formatters";
import { OperationalStatusBadge, HousekeepingStatusBadge } from "./room-status-badge";
import { Button } from "@/components/ui/button";
import { Eye, Edit, SlidersHorizontal, Ban, CheckCircle, BedDouble } from "lucide-react";

interface RoomTableProps {
  rooms: Room[];
  currency: string;
  onOpenStatusModal: (room: Room) => void;
  onDeactivateRoom: (room: Room) => void;
}

const STATUS_COLOR: Record<string, string> = {
  AVAILABLE: "bg-emerald-500",
  OCCUPIED: "bg-violet-600",
  DIRTY: "bg-amber-500",
  OUT_OF_ORDER: "bg-red-500",
  MAINTENANCE: "bg-red-500",
};

export function RoomTable({ rooms, currency, onOpenStatusModal, onDeactivateRoom }: RoomTableProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="premium-table">
          <thead>
            <tr>
              <th className="rounded-tl-2xl">Room</th>
              <th>Category</th>
              <th>Floor</th>
              <th>Status</th>
              <th>Housekeeping</th>
              <th>Rate / Night</th>
              <th>Capacity</th>
              <th className="text-right rounded-tr-2xl">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rooms.map((room) => {
              const typeName = room.room_type?.name || "Standard";
              const floorName = room.floor?.name || "Ground Floor";
              const rate = room.room_type?.base_rate || 0;
              const occupancy = room.max_occupancy || room.room_type?.max_occupancy || 2;
              const isOccupied = room.status === "OCCUPIED";
              const statusDot = STATUS_COLOR[room.status] || "bg-slate-400";

              return (
                <tr
                  key={room.id}
                  className={`group ${!room.is_active ? "opacity-50" : ""}`}
                >
                  {/* Room number */}
                  <td>
                    <div className="flex items-center gap-3">
                      {/* Status color dot */}
                      <div className={`h-8 w-8 rounded-xl ${statusDot} flex items-center justify-center shrink-0 shadow-xs`}>
                        <BedDouble className="h-3.5 w-3.5 text-white" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-slate-900 group-hover:text-indigo-600 transition-colors">
                            {room.room_number}
                          </span>
                          {isOccupied && (
                            <span className="relative flex h-1.5 w-1.5" title="Guest In-House">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75" />
                              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-violet-600" />
                            </span>
                          )}
                          {!room.is_active && (
                            <span className="text-[9.5px] font-bold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200">
                              Off
                            </span>
                          )}
                        </div>
                        {room.room_name && (
                          <span className="text-[11px] text-slate-400 italic font-serif truncate block max-w-[140px]">
                            {room.room_name}
                          </span>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Type */}
                  <td>
                    <span className="font-semibold text-slate-700 text-xs">{typeName}</span>
                  </td>

                  {/* Floor */}
                  <td>
                    <span className="text-slate-500 text-xs font-medium">{floorName}</span>
                  </td>

                  {/* Status */}
                  <td>
                    <OperationalStatusBadge status={room.status} />
                  </td>

                  {/* Housekeeping */}
                  <td>
                    <HousekeepingStatusBadge status={room.housekeeping_status} />
                  </td>

                  {/* Rate */}
                  <td>
                    <span className="font-bold text-slate-900 text-sm">
                      {formatCurrency(rate, currency)}
                    </span>
                    <span className="text-slate-400 text-[10px] ml-1">/night</span>
                  </td>

                  {/* Capacity */}
                  <td>
                    <span className="text-slate-600 text-xs font-medium">{occupancy} guests</span>
                  </td>

                  {/* Actions */}
                  <td>
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => onOpenStatusModal(room)}
                        className="h-8 px-2.5 flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-all"
                      >
                        <SlidersHorizontal className="h-3.5 w-3.5" />
                        <span>Status</span>
                      </button>

                      <Link href={`/rooms/${room.id}`}>
                        <button
                          className="h-8 w-8 flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                          title="View"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      </Link>

                      <Link href={`/rooms/${room.id}/edit`}>
                        <button
                          className="h-8 w-8 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-all"
                          title="Edit"
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </button>
                      </Link>

                      <button
                        onClick={() => onDeactivateRoom(room)}
                        className={`h-8 w-8 flex items-center justify-center rounded-lg transition-all ${
                          room.is_active
                            ? "text-slate-400 hover:text-red-600 hover:bg-red-50"
                            : "text-slate-400 hover:text-emerald-600 hover:bg-emerald-50"
                        }`}
                        title={room.is_active ? "Deactivate room" : "Reactivate room"}
                      >
                        {room.is_active ? <Ban className="h-3.5 w-3.5" /> : <CheckCircle className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
