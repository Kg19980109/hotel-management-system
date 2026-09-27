"use client";

import * as React from "react";
import Link from "next/link";
import type { Room } from "@/lib/rooms/types";
import { formatCurrency } from "@/lib/dashboard/formatters";
import { OperationalStatusBadge, HousekeepingStatusBadge } from "./room-status-badge";
import { Eye, Edit, SlidersHorizontal, Ban, CheckCircle, BedDouble, Users } from "lucide-react";
import { cn } from "@/lib/utils";

interface RoomTableProps {
  rooms: Room[];
  currency: string;
  onOpenStatusModal: (room: Room) => void;
  onDeactivateRoom: (room: Room) => void;
  onSelectRoom?: (room: Room) => void;
}

const STATUS_BORDER_COLOR: Record<string, string> = {
  AVAILABLE: "var(--success)",
  OCCUPIED: "var(--purple)",
  DIRTY: "var(--warning)",
  OUT_OF_ORDER: "var(--danger)",
  MAINTENANCE: "var(--danger)",
};

export function RoomTable({ rooms, currency, onOpenStatusModal, onDeactivateRoom, onSelectRoom }: RoomTableProps) {
  return (
    <div className="stayhub-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--surface-elevated)] text-[var(--foreground-muted)] uppercase tracking-wider text-[10.5px] font-semibold">
              <th className="py-3 px-4">Room</th>
              <th className="py-3 px-4">Category</th>
              <th className="py-3 px-4">Floor</th>
              <th className="py-3 px-4">Operational State</th>
              <th className="py-3 px-4">Housekeeping</th>
              <th className="py-3 px-4">Rate / Night</th>
              <th className="py-3 px-4">Capacity</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {rooms.map((room) => {
              const typeName = room.room_type?.name || "Standard";
              const floorName = room.floor?.name || "Ground Floor";
              const rate = room.room_type?.base_rate || 0;
              const occupancy = room.max_occupancy || room.room_type?.max_occupancy || 2;
              const isOccupied = room.status === "OCCUPIED";
              const accentColor = STATUS_BORDER_COLOR[room.status] || "var(--foreground-subtle)";

              return (
                <tr
                  key={room.id}
                  className={cn(
                    "hover:bg-[var(--surface-hover)] transition-colors group",
                    !room.is_active && "opacity-55"
                  )}
                >
                  {/* Room number */}
                  <td className="py-3 px-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div
                        className="h-9 w-9 rounded-[var(--radius-md)] flex items-center justify-center shrink-0 border"
                        style={{
                          backgroundColor: "rgba(13,24,48,0.04)",
                          borderColor: accentColor,
                        }}
                      >
                        <BedDouble className="h-4 w-4" style={{ color: accentColor }} />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <Link
                            href={`/rooms/${room.id}`}
                            className="font-bold text-sm text-[var(--foreground)] group-hover:text-[var(--primary)] transition-colors"
                          >
                            Room {room.room_number}
                          </Link>
                          {isOccupied && (
                            <span className="relative flex h-2 w-2" title="Guest In-House">
                              <span
                                className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                                style={{ backgroundColor: "var(--purple)" }}
                              />
                              <span
                                className="relative inline-flex rounded-full h-2 w-2"
                                style={{ backgroundColor: "var(--purple)" }}
                              />
                            </span>
                          )}
                          {!room.is_active && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[var(--secondary)] text-[var(--foreground-muted)] border border-[var(--border)]">
                              Inactive
                            </span>
                          )}
                        </div>
                        {room.room_name && (
                          <span className="text-[11px] text-[var(--foreground-muted)] italic block truncate max-w-[150px]">
                            {room.room_name}
                          </span>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Category */}
                  <td className="py-3 px-4 whitespace-nowrap">
                    <span className="font-semibold text-[var(--foreground)] text-xs">{typeName}</span>
                  </td>

                  {/* Floor */}
                  <td className="py-3 px-4 whitespace-nowrap">
                    <span className="text-[var(--foreground-muted)] text-xs font-medium">{floorName}</span>
                  </td>

                  {/* Operational Status */}
                  <td className="py-3 px-4 whitespace-nowrap">
                    <OperationalStatusBadge status={room.status} />
                  </td>

                  {/* Housekeeping */}
                  <td className="py-3 px-4 whitespace-nowrap">
                    <HousekeepingStatusBadge status={room.housekeeping_status} />
                  </td>

                  {/* Rate */}
                  <td className="py-3 px-4 whitespace-nowrap font-medium text-[var(--foreground)]">
                    <span className="font-bold">{formatCurrency(rate, currency)}</span>
                    <span className="text-[10px] text-[var(--foreground-muted)] ml-1">/night</span>
                  </td>

                  {/* Capacity */}
                  <td className="py-3 px-4 whitespace-nowrap">
                    <div className="flex items-center gap-1 text-[var(--foreground-muted)]">
                      <Users className="h-3 w-3 text-[var(--foreground-subtle)]" />
                      <span>{occupancy} guests</span>
                    </div>
                  </td>

                  {/* Actions */}
                  <td className="py-3 px-4 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => onOpenStatusModal(room)}
                        className="h-7 px-2 flex items-center gap-1 rounded-[var(--radius-md)] text-[11px] font-semibold text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:bg-[var(--secondary)] transition-colors"
                        title="Adjust Room Status"
                      >
                        <SlidersHorizontal className="h-3 w-3" />
                        Status
                      </button>

                      <button
                        type="button"
                        onClick={() => onSelectRoom?.(room)}
                        className="h-7 w-7 flex items-center justify-center text-[var(--foreground-muted)] hover:text-indigo-600 hover:bg-indigo-50 rounded-[var(--radius-md)] transition-colors"
                        title="Inspect Live Guest, Bill & Requests"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </button>

                      <Link href={`/rooms/${room.id}/edit`}>
                        <button
                          type="button"
                          className="h-7 w-7 flex items-center justify-center text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:bg-[var(--secondary)] rounded-[var(--radius-md)] transition-colors"
                          title="Edit Room"
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </button>
                      </Link>

                      <button
                        type="button"
                        onClick={() => onDeactivateRoom(room)}
                        className={cn(
                          "h-7 w-7 flex items-center justify-center rounded-[var(--radius-md)] transition-colors",
                          room.is_active
                            ? "text-[var(--danger)] hover:bg-[var(--danger-light)]"
                            : "text-[var(--success)] hover:bg-[var(--success-light)]"
                        )}
                        title={room.is_active ? "Deactivate from Inventory" : "Reactivate Room"}
                      >
                        {room.is_active ? (
                          <Ban className="h-3.5 w-3.5" />
                        ) : (
                          <CheckCircle className="h-3.5 w-3.5" />
                        )}
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
