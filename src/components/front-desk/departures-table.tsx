"use client";

import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { StayStatusBadge } from "./stay-status-badge";
import type { DepartureRecord } from "@/lib/front-desk/types";
import { LogOut, ExternalLink, BedDouble } from "lucide-react";

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
      <div className="stayhub-card p-10 text-center">
        <LogOut className="h-8 w-8 text-[var(--foreground-subtle)] mx-auto mb-2 opacity-50" />
        <h4 className="text-sm font-bold text-[var(--foreground)]">No expected departures</h4>
        <p className="text-xs text-[var(--foreground-muted)] mt-1">
          There are no in-house guests scheduled to depart today.
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
              <th className="py-3 px-4">Guest & Confirmation</th>
              <th className="py-3 px-4">Check-In Time</th>
              <th className="py-3 px-4">Expected Departure</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4 text-right">Actions</th>
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
                <tr key={dep.stayId} className="hover:bg-[var(--surface-hover)] transition-colors group">
                  {/* Room */}
                  <td className="py-3 px-4 whitespace-nowrap">
                    <div className="flex items-center gap-1.5 font-mono font-bold text-[var(--foreground)] text-sm">
                      <BedDouble className="h-4 w-4 text-[var(--primary)]" />
                      Room {dep.roomNumber}
                    </div>
                    <div className="text-[11px] text-[var(--foreground-muted)]">{dep.roomTypeName}</div>
                  </td>

                  {/* Guest */}
                  <td className="py-3 px-4 whitespace-nowrap">
                    <Link
                      href={`/guests/${dep.guestId}`}
                      className="font-bold text-[var(--foreground)] hover:text-[var(--primary)] hover:underline inline-block"
                      title="View Guest Profile"
                    >
                      {dep.guestName}
                    </Link>
                    <div className="mt-0.5">
                      <Link
                        href={`/bookings/${dep.reservationId}`}
                        className="inline-flex items-center gap-1 font-mono text-[10.5px] text-[var(--primary)] bg-[var(--primary-subtle)] px-1.5 py-0.2 rounded border border-[var(--primary)]/20 hover:underline"
                      >
                        {dep.confirmationNumber}
                        <ExternalLink className="h-2.5 w-2.5" />
                      </Link>
                    </div>
                  </td>

                  {/* Checked In At */}
                  <td className="py-3 px-4 whitespace-nowrap text-[var(--foreground)]">
                    <div>{checkInFormatted}</div>
                  </td>

                  {/* Expected Checkout */}
                  <td className="py-3 px-4 whitespace-nowrap">
                    <div className="font-semibold text-[var(--foreground)]">{dep.expectedCheckOutDate}</div>
                    <div className="text-[10px] text-[var(--warning-foreground)] font-medium">Standard 11:00 AM</div>
                  </td>

                  {/* Status */}
                  <td className="py-3 px-4 whitespace-nowrap">
                    <StayStatusBadge status={dep.status} />
                  </td>

                  {/* Actions */}
                  <td className="py-3 px-4 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => onCheckOut(dep)}
                        className="h-7 px-3 text-[11px] font-bold gap-1 shadow-xs bg-[var(--warning)] hover:opacity-95 text-white"
                      >
                        <LogOut className="h-3.5 w-3.5" />
                        Check Out
                      </Button>
                      <Link href={`/front-desk/stays/${dep.stayId}`}>
                        <Button variant="outline" size="sm" className="h-7 px-2 text-[11px]">
                          Folio / Stay
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
