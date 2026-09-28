"use client";

import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { ArrivalRecord } from "@/lib/front-desk/types";
import {
  LogIn,
  KeyRound,
  UserX,
  ExternalLink,
  BedDouble,
  User,
  Clock,
} from "lucide-react";

interface ArrivalsTableProps {
  arrivals: ArrivalRecord[];
  onCheckIn: (arrival: ArrivalRecord) => void;
  onAssignRoom: (arrival: ArrivalRecord) => void;
  onNoShow: (arrival: ArrivalRecord) => void;
}

export function ArrivalsTable({
  arrivals,
  onCheckIn,
  onAssignRoom,
  onNoShow,
}: ArrivalsTableProps) {
  if (arrivals.length === 0) {
    return (
      <div className="bg-card border border-border/80 rounded-xl p-10 text-center shadow-xs">
        <LogIn className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-50" />
        <h4 className="text-sm font-bold text-foreground">No pending expected arrivals today</h4>
        <p className="text-xs text-muted-foreground mt-1">
          All guests scheduled for today have either been checked in or no further arrivals are pending.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border/80 rounded-xl overflow-hidden shadow-xs">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-muted-foreground uppercase tracking-wider text-[10.5px] font-semibold">
              <th className="py-3 px-4">Guest & Confirmation</th>
              <th className="py-3 px-4">Allocated Room</th>
              <th className="py-3 px-4">Dates & Duration</th>
              <th className="py-3 px-4">Party</th>
              <th className="py-3 px-4">Arrival Status</th>
              <th className="py-3 px-4 text-right">Desk Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {arrivals.map((arr) => {
              const initials = arr.guestName
                .split(" ")
                .map((n) => n[0])
                .join("")
                .slice(0, 2)
                .toUpperCase() || "G";

              return (
                <tr key={arr.reservationRoomId} className="hover:bg-muted/30 transition-colors group">
                  {/* Guest & Conf */}
                  <td className="py-3 px-4 whitespace-nowrap">
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[11px] font-bold flex items-center justify-center shrink-0 border border-blue-500/20">
                        {initials}
                      </div>
                      <div>
                        <Link
                          href={`/guests/${arr.guestId}`}
                          className="font-bold text-foreground hover:text-primary hover:underline inline-block"
                          title="View Guest Profile"
                        >
                          {arr.guestName}
                        </Link>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <Link
                            href={`/bookings/${arr.reservationId}`}
                            className="inline-flex items-center gap-1 font-mono text-[10.5px] text-primary bg-primary/10 px-1.5 py-0.2 rounded border border-primary/20 hover:underline"
                          >
                            {arr.confirmationNumber}
                            <ExternalLink className="h-2.5 w-2.5" />
                          </Link>
                          {arr.specialRequests && (
                            <span className="text-[9.5px] px-1.5 py-0.2 rounded font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                              Notes
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Room / Category */}
                  <td className="py-3 px-4 whitespace-nowrap">
                    {arr.roomNumber ? (
                      <div className="flex items-center gap-1 font-mono font-bold text-foreground">
                        <BedDouble className="h-3.5 w-3.5 text-primary" />
                        Room {arr.roomNumber}
                      </div>
                    ) : (
                      <span className="inline-flex items-center text-amber-600 dark:text-amber-400 font-semibold bg-amber-500/10 border border-amber-500/30 px-1.5 py-0.5 rounded text-[10px]">
                        Room Unassigned
                      </span>
                    )}
                    <div className="text-[11px] text-muted-foreground">{arr.roomTypeName}</div>
                  </td>

                  {/* Stay Dates */}
                  <td className="py-3 px-4 whitespace-nowrap">
                    <div className="text-foreground font-medium">
                      {arr.checkInDate} → {arr.checkOutDate}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      {arr.nights} night{arr.nights > 1 ? "s" : ""}
                    </div>
                  </td>

                  {/* Party */}
                  <td className="py-3 px-4 whitespace-nowrap text-foreground">
                    <div className="font-medium">{arr.adults} adult{arr.adults > 1 ? "s" : ""}</div>
                    {arr.children > 0 && (
                      <div className="text-[10px] text-muted-foreground">{arr.children} child</div>
                    )}
                  </td>

                  {/* Status */}
                  <td className="py-3 px-4 whitespace-nowrap">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                      <Clock className="w-3 h-3" />
                      Pending Check-In
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="py-3 px-4 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1.5">
                      {!arr.roomId && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onAssignRoom(arr)}
                          className="h-7 px-2 text-[11px] gap-1 cursor-pointer"
                        >
                          <KeyRound className="h-3 w-3" />
                          Assign Room
                        </Button>
                      )}
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => onCheckIn(arr)}
                        className="h-7 px-3 text-[11px] font-bold gap-1 shadow-xs bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer"
                      >
                        <LogIn className="h-3.5 w-3.5" />
                        Check In
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onNoShow(arr)}
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-rose-600 cursor-pointer"
                        title="Mark as No-Show"
                      >
                        <UserX className="h-3.5 w-3.5" />
                      </Button>
                      <Link href={`/guests/${arr.guestId}`} title="View Guest CRM Profile">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-primary cursor-pointer"
                        >
                          <User className="h-3.5 w-3.5" />
                        </Button>
                      </Link>
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
