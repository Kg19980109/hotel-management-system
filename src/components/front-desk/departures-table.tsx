"use client";

import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { StayStatusBadge } from "./stay-status-badge";
import type { DepartureRecord } from "@/lib/front-desk/types";
import { LogOut, ExternalLink, BedDouble, User } from "lucide-react";

interface DeparturesTableProps {
  departures: DepartureRecord[];
  onCheckOut: (departure: DepartureRecord) => void;
}

export function DeparturesTable({
  departures,
  onCheckOut,
}: DeparturesTableProps) {
  if (departures.length === 0) {
    return (
      <div className="p-8 text-center bg-white border border-[var(--border)] rounded-[var(--radius-lg)]">
        <LogOut className="h-8 w-8 text-slate-300 mx-auto mb-2" />
        <h4 className="text-sm font-semibold text-slate-800">No expected departures</h4>
        <p className="text-xs text-slate-500 mt-1">There are no in-house guests scheduled to depart today.</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-[var(--border)] rounded-[var(--radius-lg)] overflow-hidden shadow-xs">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--surface-elevated)] text-[var(--foreground-muted)] uppercase tracking-wider text-[10px]">
              <th className="py-2.5 px-3">Room & Type</th>
              <th className="py-2.5 px-3">Guest & Confirmation</th>
              <th className="py-2.5 px-3">Check-In Time</th>
              <th className="py-2.5 px-3">Expected Departure</th>
              <th className="py-2.5 px-3">Status</th>
              <th className="py-2.5 px-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {departures.map((dep) => {
              const checkInFormatted = dep.actualCheckInAt
                ? new Date(dep.actualCheckInAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "—";

              return (
                <tr key={dep.stayId} className="hover:bg-slate-50 transition-colors">
                  {/* Room */}
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-1 font-mono font-bold text-slate-900 text-sm">
                      <BedDouble className="h-3.5 w-3.5 text-indigo-500" />
                      Room {dep.roomNumber}
                    </div>
                    <div className="text-[11px] text-slate-500">{dep.roomTypeName}</div>
                  </td>

                  {/* Guest */}
                  <td className="py-3 px-3">
                    <Link
                      href={`/guests/${dep.guestId}`}
                      className="font-semibold text-slate-900 hover:text-[var(--primary)] hover:underline inline-block"
                      title="View Guest Profile"
                    >
                      {dep.guestName}
                    </Link>
                    <Link
                      href={`/bookings/${dep.reservationId}`}
                      className="font-mono text-[11px] text-[var(--primary)] hover:underline flex items-center gap-0.5 mt-0.5"
                    >
                      {dep.confirmationNumber}
                      <ExternalLink className="h-2.5 w-2.5" />
                    </Link>
                  </td>

                  {/* Checked In At */}
                  <td className="py-3 px-3 text-slate-700">
                    <div>{checkInFormatted}</div>
                  </td>

                  {/* Expected Checkout */}
                  <td className="py-3 px-3">
                    <div className="font-medium text-slate-800">{dep.expectedCheckOutDate}</div>
                    <div className="text-[10px] text-amber-700 font-medium">Standard 11:00 AM</div>
                  </td>

                  {/* Status */}
                  <td className="py-3 px-3">
                    <StayStatusBadge status={dep.status} />
                  </td>

                  {/* Actions */}
                  <td className="py-3 px-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Link href={`/guests/${dep.guestId}`} title="View Guest CRM Profile">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-1.5 text-[11px] text-slate-600 hover:text-[var(--primary)]"
                        >
                          <User className="h-3 w-3" />
                        </Button>
                      </Link>
                      <Link href={`/front-desk/stays/${dep.stayId}`}>
                        <Button variant="outline" size="sm" className="h-7 px-2 text-[11px]">
                          Stay Profile
                        </Button>
                      </Link>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => onCheckOut(dep)}
                        className="h-7 px-2.5 text-[11px] gap-1 bg-amber-600 hover:bg-amber-700 text-white"
                      >
                        <LogOut className="h-3 w-3" />
                        Check Out
                      </Button>
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
