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
    <div className="overflow-x-auto rounded-[var(--radius-lg)] border border-[var(--border)] bg-white shadow-xs">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-[var(--border)] bg-[var(--surface-elevated)] text-[12px] font-semibold text-[var(--foreground-muted)] uppercase tracking-wider">
          <tr>
            <th className="py-3 px-4">Room</th>
            <th className="py-3 px-4">Type</th>
            <th className="py-3 px-4">Floor</th>
            <th className="py-3 px-4">Operational Status</th>
            <th className="py-3 px-4">Housekeeping</th>
            <th className="py-3 px-4">Rate</th>
            <th className="py-3 px-4">Capacity</th>
            <th className="py-3 px-4 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--border)]">
          {rooms.map((room) => {
            const typeName = room.room_type?.name || "Standard";
            const floorName = room.floor?.name || "Unassigned";
            const rate = room.room_type?.base_rate || 0;
            const occupancy = room.max_occupancy || room.room_type?.max_occupancy || 2;

            return (
              <tr
                key={room.id}
                className={`hover:bg-[var(--secondary)]/40 transition-colors ${
                  !room.is_active ? "opacity-60 bg-slate-50/60" : ""
                }`}
              >
                {/* Room */}
                <td className="py-3.5 px-4">
                  <div className="flex items-center gap-2.5">
                    <span className="font-bold text-base font-mono text-[var(--foreground)]">
                      {room.room_number}
                    </span>
                    {room.room_name && (
                      <span className="text-xs text-[var(--foreground-muted)] truncate max-w-[140px]">
                        ({room.room_name})
                      </span>
                    )}
                    {!room.is_active && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-200 text-slate-600">
                        Deactivated
                      </span>
                    )}
                  </div>
                </td>

                {/* Type */}
                <td className="py-3.5 px-4 font-medium text-[var(--foreground)]">
                  {typeName}
                </td>

                {/* Floor */}
                <td className="py-3.5 px-4 text-[var(--foreground-muted)]">
                  {floorName}
                </td>

                {/* Status */}
                <td className="py-3.5 px-4">
                  <OperationalStatusBadge status={room.status} />
                </td>

                {/* Housekeeping */}
                <td className="py-3.5 px-4">
                  <HousekeepingStatusBadge status={room.housekeeping_status} />
                </td>

                {/* Rate */}
                <td className="py-3.5 px-4 font-semibold text-[var(--foreground)]">
                  {formatCurrency(rate, currency)}
                  <span className="text-[11px] font-normal text-[var(--foreground-subtle)]">/night</span>
                </td>

                {/* Capacity */}
                <td className="py-3.5 px-4 text-[var(--foreground-muted)] text-xs">
                  {occupancy} Guest{occupancy > 1 ? "s" : ""}
                </td>

                {/* Actions */}
                <td className="py-3.5 px-4 text-right">
                  <div className="flex items-center justify-end gap-1">
                    {/* Status change quick action */}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onOpenStatusModal(room)}
                      className="h-8 w-8 p-0 text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
                      title="Update status"
                    >
                      <SlidersHorizontal className="h-4 w-4" />
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
