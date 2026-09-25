"use client";

import * as React from "react";
import Link from "next/link";
import { Reservation, ReservationRoom } from "@/lib/bookings/types";
import { BookingStatusBadge, BookingSourceBadge } from "./booking-status-badge";
import { StayStatusBadge } from "@/components/front-desk/stay-status-badge";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/dashboard/formatters";
import {
  Eye,
  Edit2,
  XCircle,
  RefreshCw,
  BedDouble,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

interface BookingTableProps {
  reservations: Reservation[];
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (newPage: number) => void;
  currency: string;
  onCancelClick: (res: Reservation) => void;
  onStatusClick: (res: Reservation) => void;
  onAssignRoomClick: (res: Reservation, roomItem: ReservationRoom) => void;
}

export function BookingTable({
  reservations,
  total,
  page,
  pageSize,
  onPageChange,
  currency,
  onCancelClick,
  onStatusClick,
  onAssignRoomClick,
}: BookingTableProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-3">
      <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-white overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--surface-elevated)] text-[var(--foreground-muted)] font-semibold">
                <th className="py-3 px-4">Confirmation</th>
                <th className="py-3 px-4">Primary Guest</th>
                <th className="py-3 px-4">Stay Dates</th>
                <th className="py-3 px-4">Rooms / Category</th>
                <th className="py-3 px-4">Guests</th>
                <th className="py-3 px-4">Source</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Amount</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {reservations.map((res) => {
                const guestName = res.primary_guest
                  ? `${res.primary_guest.first_name} ${res.primary_guest.last_name}`.trim()
                  : "Guest";

                const firstRoom = res.rooms?.[0];
                const roomCount = res.rooms?.length || 1;

                return (
                  <tr
                    key={res.id}
                    className="hover:bg-[var(--surface-elevated)] transition-colors group"
                  >
                    {/* Confirmation */}
                    <td className="py-3 px-4 font-mono font-semibold text-[var(--primary)] whitespace-nowrap">
                      <Link
                        href={`/bookings/${res.id}`}
                        className="hover:underline flex items-center gap-1.5"
                      >
                        {res.confirmation_number}
                      </Link>
                    </td>

                    {/* Guest */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="font-medium text-[var(--foreground)]">{guestName}</div>
                      {res.primary_guest?.phone && (
                        <div className="text-[11px] text-[var(--foreground-subtle)]">
                          {res.primary_guest.phone}
                        </div>
                      )}
                    </td>

                    {/* Dates */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="font-medium text-[var(--foreground)]">
                        {res.check_in_date}
                      </div>
                      <div className="text-[11px] text-[var(--foreground-muted)]">
                        to {res.check_out_date} ({res.nights || 1}N)
                      </div>
                    </td>

                    {/* Rooms / Category */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      {firstRoom ? (
                        <div>
                          <div className="font-medium text-[var(--foreground)] flex items-center gap-1.5">
                            {firstRoom.room_number ? (
                              <span className="font-bold text-slate-800">
                                Room {firstRoom.room_number}
                              </span>
                            ) : (
                              <span className="text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded text-[10px] font-semibold border border-amber-200">
                                Unassigned
                              </span>
                            )}
                            {roomCount > 1 && (
                              <span className="text-[10px] text-slate-500 font-normal">
                                +{roomCount - 1} more
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-[var(--foreground-muted)]">
                            {firstRoom.room_type_name || "Room"} ({firstRoom.room_type_code})
                          </div>
                        </div>
                      ) : (
                        <span className="text-[var(--foreground-muted)]">No rooms attached</span>
                      )}
                    </td>

                    {/* Guests */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="font-medium text-[var(--foreground)]">
                        {res.adults} Adults
                      </div>
                      {res.children > 0 && (
                        <div className="text-[11px] text-[var(--foreground-muted)]">
                          {res.children} Children
                        </div>
                      )}
                    </td>

                    {/* Source */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <BookingSourceBadge source={res.booking_source} />
                    </td>

                    {/* Status: Reservation + Operational Stay Status */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="flex flex-col gap-1 items-start">
                        <BookingStatusBadge status={res.status} />
                        {(() => {
                          const activeStays = (res.rooms || []).map((r) => r.stay).filter(Boolean);
                          if (activeStays.length === 0) {
                            if (res.status === "CONFIRMED") {
                              return (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                                  Not In-House
                                </span>
                              );
                            }
                            return null;
                          }
                          const hasCheckedIn = activeStays.some((s) => s?.status === "CHECKED_IN");
                          const allCheckedOut = activeStays.every((s) => s?.status === "CHECKED_OUT");
                          if (hasCheckedIn) {
                            return <StayStatusBadge status="CHECKED_IN" className="text-[10px] px-1.5 py-0.5" />;
                          }
                          if (allCheckedOut) {
                            return <StayStatusBadge status="CHECKED_OUT" className="text-[10px] px-1.5 py-0.5" />;
                          }
                          return <StayStatusBadge status={activeStays[0]!.status} className="text-[10px] px-1.5 py-0.5" />;
                        })()}
                      </div>
                    </td>

                    {/* Amount */}
                    <td className="py-3 px-4 text-right font-medium whitespace-nowrap">
                      <div className="text-[var(--foreground)] font-semibold">
                        {formatCurrency(res.total_amount, currency)}
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <Link href={`/bookings/${res.id}`}>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            title="View Booking Details"
                            aria-label="View Booking Details"
                          >
                            <Eye className="h-3.5 w-3.5 text-slate-600" />
                          </Button>
                        </Link>

                        <Link href={`/bookings/${res.id}/edit`}>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            title="Edit Reservation"
                            aria-label="Edit Reservation"
                          >
                            <Edit2 className="h-3.5 w-3.5 text-slate-600" />
                          </Button>
                        </Link>

                        {firstRoom && firstRoom.room_id === null && res.status !== "CANCELLED" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-amber-700 hover:text-amber-800 hover:bg-amber-50"
                            onClick={() => onAssignRoomClick(res, firstRoom)}
                            title="Assign Physical Room"
                            aria-label="Assign Physical Room"
                          >
                            <BedDouble className="h-3.5 w-3.5" />
                          </Button>
                        )}

                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => onStatusClick(res)}
                          title="Update Status"
                          aria-label="Update Status"
                        >
                          <RefreshCw className="h-3.5 w-3.5 text-slate-600" />
                        </Button>

                        {res.status !== "CANCELLED" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                            onClick={() => onCancelClick(res)}
                            title="Cancel Booking"
                            aria-label="Cancel Booking"
                          >
                            <XCircle className="h-3.5 w-3.5" />
                          </Button>
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

      {/* Pagination Footer */}
      {total > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-2 py-1 text-xs text-[var(--foreground-muted)]">
          <div>
            Showing <span className="font-semibold text-[var(--foreground)]">{(page - 1) * pageSize + 1}</span> to{" "}
            <span className="font-semibold text-[var(--foreground)]">
              {Math.min(page * pageSize, total)}
            </span>{" "}
            of <span className="font-semibold text-[var(--foreground)]">{total}</span> reservations
          </div>

          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
              className="h-8 px-2"
            >
              <ChevronLeft className="h-4 w-4 mr-0.5" />
              Previous
            </Button>
            <span className="px-2 font-medium">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
              className="h-8 px-2"
            >
              Next
              <ChevronRight className="h-4 w-4 ml-0.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
