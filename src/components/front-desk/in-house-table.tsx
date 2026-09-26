"use client";

import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { StayStatusBadge } from "./stay-status-badge";
import type { InHouseRecord } from "@/lib/front-desk/types";
import {
  Users,
  LogOut,
  ArrowRightLeft,
  ExternalLink,
  BedDouble,
  Phone,
} from "lucide-react";

interface InHouseTableProps {
  stays: InHouseRecord[];
  onCheckOut: (stay: InHouseRecord) => void;
  onReassignRoom: (stay: InHouseRecord) => void;
}

export function InHouseTable({
  stays,
  onCheckOut,
  onReassignRoom,
}: InHouseTableProps) {
  if (stays.length === 0) {
    return (
      <div className="stayhub-card p-10 text-center">
        <Users className="h-8 w-8 text-[var(--foreground-subtle)] mx-auto mb-2 opacity-50" />
        <h4 className="text-sm font-bold text-[var(--foreground)]">No in-house guests</h4>
        <p className="text-xs text-[var(--foreground-muted)] mt-1">
          There are currently no active checked-in stays on premises.
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
              <th className="py-3 px-4">Room & Type</th>
              <th className="py-3 px-4">Guest & Contact</th>
              <th className="py-3 px-4">Confirmation</th>
              <th className="py-3 px-4">Checked In</th>
              <th className="py-3 px-4">Expected Departure</th>
              <th className="py-3 px-4">Party</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {stays.map((stay) => {
              const checkInFormatted = stay.actualCheckInAt
                ? new Date(stay.actualCheckInAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "—";

              return (
                <tr key={stay.stayId} className="hover:bg-[var(--surface-hover)] transition-colors group">
                  {/* Room */}
                  <td className="py-3 px-4 whitespace-nowrap">
                    <div className="flex items-center gap-1.5 font-mono font-bold text-[var(--foreground)] text-sm">
                      <BedDouble className="h-4 w-4 text-[var(--primary)]" />
                      Room {stay.roomNumber}
                    </div>
                    <div className="text-[11px] text-[var(--foreground-muted)]">{stay.roomTypeName}</div>
                  </td>

                  {/* Guest */}
                  <td className="py-3 px-4 whitespace-nowrap">
                    <Link
                      href={`/guests/${stay.guestId}`}
                      className="font-bold text-[var(--foreground)] hover:text-[var(--primary)] hover:underline inline-block"
                      title="View Guest Profile"
                    >
                      {stay.guestName}
                    </Link>
                    {stay.guestPhone && (
                      <div className="text-[11px] text-[var(--foreground-muted)] flex items-center gap-1 mt-0.5">
                        <Phone className="h-3 w-3" />
                        {stay.guestPhone}
                      </div>
                    )}
                  </td>

                  {/* Confirmation */}
                  <td className="py-3 px-4 whitespace-nowrap font-mono">
                    <Link
                      href={`/bookings/${stay.reservationId}`}
                      className="inline-flex items-center gap-1 font-mono text-[10.5px] text-[var(--primary)] bg-[var(--primary-subtle)] px-1.5 py-0.2 rounded border border-[var(--primary)]/20 hover:underline"
                    >
                      {stay.confirmationNumber}
                      <ExternalLink className="h-2.5 w-2.5" />
                    </Link>
                  </td>

                  {/* Checked In */}
                  <td className="py-3 px-4 whitespace-nowrap text-[var(--foreground)]">
                    <div>{checkInFormatted}</div>
                  </td>

                  {/* Departure */}
                  <td className="py-3 px-4 whitespace-nowrap">
                    <div className="font-semibold text-[var(--foreground)]">{stay.expectedCheckOutDate}</div>
                  </td>

                  {/* Party */}
                  <td className="py-3 px-4 whitespace-nowrap text-[var(--foreground)]">
                    <div className="font-medium">{stay.adults} adult{stay.adults > 1 ? "s" : ""}</div>
                    {stay.children > 0 && (
                      <div className="text-[10px] text-[var(--foreground-muted)]">{stay.children} child</div>
                    )}
                  </td>

                  {/* Status */}
                  <td className="py-3 px-4 whitespace-nowrap">
                    <StayStatusBadge status={stay.status} />
                  </td>

                  {/* Actions */}
                  <td className="py-3 px-4 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onReassignRoom(stay)}
                        className="h-7 px-2 text-[11px] gap-1"
                        title="Reassign Guest Room"
                      >
                        <ArrowRightLeft className="h-3 w-3" />
                        Move Room
                      </Button>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => onCheckOut(stay)}
                        className="h-7 px-3 text-[11px] font-bold gap-1 shadow-xs bg-[var(--warning)] hover:opacity-95 text-white"
                      >
                        <LogOut className="h-3.5 w-3.5" />
                        Check Out
                      </Button>
                      <Link href={`/front-desk/stays/${stay.stayId}`}>
                        <Button variant="ghost" size="sm" className="h-7 px-2 text-[11px]">
                          Stay
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
