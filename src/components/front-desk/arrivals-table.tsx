"use client";

import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { StayStatusBadge } from "./stay-status-badge";
import type { ArrivalRecord } from "@/lib/front-desk/types";
import {
  LogIn,
  KeyRound,
  UserX,
  ExternalLink,
  BedDouble,
  User,
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
      <div className="stayhub-card p-10 text-center">
        <LogIn className="h-8 w-8 text-[var(--foreground-subtle)] mx-auto mb-2 opacity-50" />
        <h4 className="text-sm font-bold text-[var(--foreground)]">No expected arrivals</h4>
        <p className="text-xs text-[var(--foreground-muted)] mt-1">
          There are no reservations scheduled to arrive on this date.
        </p>
      </div>
    );
  }

  return (
    <div className="stayhub-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--surface-elevated)] text-[var(--foreground-muted)] uppercase tracking-wider text-[10.5px] font-semibold">
              <th className="py-3 px-4">Guest & Confirmation</th>
              <th className="py-3 px-4">Room / Category</th>
              <th className="py-3 px-4">Dates & Nights</th>
              <th className="py-3 px-4">Party</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {arrivals.map((arr) => {
              const hasStay = arr.stayStatus === "CHECKED_IN";
              const initials = arr.guestName
                .split(" ")
                .map((n) => n[0])
                .join("")
                .slice(0, 2)
                .toUpperCase() || "G";

              return (
                <tr key={arr.reservationRoomId} className="hover:bg-[var(--surface-hover)] transition-colors group">
                  {/* Guest & Conf */}
                  <td className="py-3 px-4 whitespace-nowrap">
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-full bg-[var(--primary-light)] text-[var(--primary)] text-[11px] font-bold flex items-center justify-center shrink-0 border border-[var(--primary)]/20">
                        {initials}
                      </div>
                      <div>
                        <Link
                          href={`/guests/${arr.guestId}`}
                          className="font-bold text-[var(--foreground)] hover:text-[var(--primary)] hover:underline inline-block"
                          title="View Guest Profile"
                        >
                          {arr.guestName}
                        </Link>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <Link
                            href={`/bookings/${arr.reservationId}`}
                            className="inline-flex items-center gap-1 font-mono text-[10.5px] text-[var(--primary)] bg-[var(--primary-subtle)] px-1.5 py-0.2 rounded border border-[var(--primary)]/20 hover:underline"
                          >
                            {arr.confirmationNumber}
                            <ExternalLink className="h-2.5 w-2.5" />
                          </Link>
                          {arr.specialRequests && (
                            <span className="text-[9.5px] px-1.5 py-0.2 rounded font-semibold bg-[var(--warning-light)] text-[var(--warning-foreground)] border border-[var(--warning)]/30">
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
                      <div className="flex items-center gap-1 font-mono font-bold text-[var(--foreground)]">
                        <BedDouble className="h-3.5 w-3.5 text-[var(--primary)]" />
                        Room {arr.roomNumber}
                      </div>
                    ) : (
                      <span className="inline-flex items-center text-[var(--warning-foreground)] font-semibold bg-[var(--warning-light)] border border-[var(--warning)]/30 px-1.5 py-0.5 rounded text-[10px]">
                        Unallocated
                      </span>
                    )}
                    <div className="text-[11px] text-[var(--foreground-muted)]">{arr.roomTypeName}</div>
                  </td>

                  {/* Stay Dates */}
                  <td className="py-3 px-4 whitespace-nowrap">
                    <div className="text-[var(--foreground)] font-medium">
                      {arr.checkInDate} → {arr.checkOutDate}
                    </div>
                    <div className="text-[10px] text-[var(--foreground-muted)]">
                      {arr.nights} night{arr.nights > 1 ? "s" : ""}
                    </div>
                  </td>

                  {/* Party */}
                  <td className="py-3 px-4 whitespace-nowrap text-[var(--foreground)]">
                    <div className="font-medium">{arr.adults} adult{arr.adults > 1 ? "s" : ""}</div>
                    {arr.children > 0 && (
                      <div className="text-[10px] text-[var(--foreground-muted)]">{arr.children} child</div>
                    )}
                  </td>

                  {/* Stay / Booking Status */}
                  <td className="py-3 px-4 whitespace-nowrap">
                    {arr.stayStatus ? (
                      <StayStatusBadge status={arr.stayStatus} />
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-[var(--primary-subtle)] text-[var(--primary)] border border-[var(--primary)]/20">
                        Confirmed Booking
                      </span>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="py-3 px-4 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1.5">
                      {!hasStay && (
                        <>
                          {!arr.roomId && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => onAssignRoom(arr)}
                              className="h-7 px-2 text-[11px] gap-1"
                            >
                              <KeyRound className="h-3 w-3" />
                              Assign
                            </Button>
                          )}
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => onCheckIn(arr)}
                            className="h-7 px-3 text-[11px] font-bold gap-1 shadow-xs"
                          >
                            <LogIn className="h-3.5 w-3.5" />
                            Check In
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onNoShow(arr)}
                            className="h-7 w-7 p-0 text-[var(--foreground-muted)] hover:text-[var(--purple)] hover:bg-[var(--secondary)]"
                            title="Mark as No-Show"
                          >
                            <UserX className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      )}
                      <Link href={`/guests/${arr.guestId}`} title="View Guest CRM Profile">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-[var(--foreground-muted)] hover:text-[var(--primary)]"
                        >
                          <User className="h-3.5 w-3.5" />
                        </Button>
                      </Link>
                      {hasStay && arr.stayId && (
                        <Link href={`/front-desk/stays/${arr.stayId}`}>
                          <Button variant="outline" size="sm" className="h-7 px-2 text-[11px] gap-1">
                            View Stay
                          </Button>
                        </Link>
                      )}
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
