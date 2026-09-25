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
      <div className="p-8 text-center bg-white border border-[var(--border)] rounded-[var(--radius-lg)]">
        <LogIn className="h-8 w-8 text-slate-300 mx-auto mb-2" />
        <h4 className="text-sm font-semibold text-slate-800">No expected arrivals</h4>
        <p className="text-xs text-slate-500 mt-1">There are no reservations scheduled to arrive on this date.</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-[var(--border)] rounded-[var(--radius-lg)] overflow-hidden shadow-xs">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--surface-elevated)] text-[var(--foreground-muted)] uppercase tracking-wider text-[10px]">
              <th className="py-2.5 px-3">Guest & Confirmation</th>
              <th className="py-2.5 px-3">Room / Category</th>
              <th className="py-2.5 px-3">Dates & Nights</th>
              <th className="py-2.5 px-3">Party</th>
              <th className="py-2.5 px-3">Status</th>
              <th className="py-2.5 px-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {arrivals.map((arr) => {
              const hasStay = arr.stayStatus === "CHECKED_IN";

              return (
                <tr key={arr.reservationRoomId} className="hover:bg-slate-50 transition-colors">
                  {/* Guest & Conf */}
                  <td className="py-3 px-3">
                    <Link
                      href={`/guests/${arr.guestId}`}
                      className="font-semibold text-slate-900 hover:text-[var(--primary)] hover:underline inline-block"
                      title="View Guest Profile"
                    >
                      {arr.guestName}
                    </Link>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <Link
                        href={`/bookings/${arr.reservationId}`}
                        className="font-mono text-[11px] text-[var(--primary)] hover:underline flex items-center gap-0.5"
                      >
                        {arr.confirmationNumber}
                        <ExternalLink className="h-2.5 w-2.5" />
                      </Link>
                      {arr.specialRequests && (
                        <span className="text-[10px] px-1 py-0.2 rounded bg-amber-50 text-amber-700 border border-amber-200">
                          Notes
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Room / Category */}
                  <td className="py-3 px-3">
                    {arr.roomNumber ? (
                      <div className="flex items-center gap-1 font-mono font-bold text-slate-800">
                        <BedDouble className="h-3.5 w-3.5 text-indigo-500" />
                        Room {arr.roomNumber}
                      </div>
                    ) : (
                      <span className="inline-flex items-center text-amber-700 font-medium bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded text-[10px]">
                        Unallocated
                      </span>
                    )}
                    <div className="text-[11px] text-slate-500">{arr.roomTypeName}</div>
                  </td>

                  {/* Stay Dates */}
                  <td className="py-3 px-3">
                    <div className="text-slate-800 font-medium">
                      {arr.checkInDate} → {arr.checkOutDate}
                    </div>
                    <div className="text-[10px] text-slate-500">{arr.nights} night{arr.nights > 1 ? "s" : ""}</div>
                  </td>

                  {/* Party */}
                  <td className="py-3 px-3 text-slate-700">
                    <div>{arr.adults} adult{arr.adults > 1 ? "s" : ""}</div>
                    {arr.children > 0 && <div className="text-[10px] text-slate-500">{arr.children} child</div>}
                  </td>

                  {/* Stay / Booking Status */}
                  <td className="py-3 px-3">
                    {arr.stayStatus ? (
                      <StayStatusBadge status={arr.stayStatus} />
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">
                        Confirmed Booking
                      </span>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="py-3 px-3 text-right">
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
                            className="h-7 px-2.5 text-[11px] gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                          >
                            <LogIn className="h-3 w-3" />
                            Check In
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onNoShow(arr)}
                            className="h-7 px-1.5 text-[11px] text-slate-500 hover:text-purple-700 hover:bg-purple-50"
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
                          className="h-7 px-1.5 text-[11px] text-slate-600 hover:text-[var(--primary)]"
                        >
                          <User className="h-3 w-3" />
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
