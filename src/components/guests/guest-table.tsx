"use client";

import * as React from "react";
import Link from "next/link";
import { GuestCRM } from "@/lib/guests/types";
import { GuestStatusBadge } from "./guest-status-badge";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Eye, Edit2, ChevronLeft, ChevronRight, BedDouble, Calendar } from "lucide-react";

interface GuestTableProps {
  guests: GuestCRM[];
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (newPage: number) => void;
}

export function GuestTable({
  guests,
  total,
  page,
  pageSize,
  onPageChange,
}: GuestTableProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-4">
      <div className="stayhub-card overflow-hidden border border-[var(--border)] rounded-[var(--radius-xl)] bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[var(--foreground)] border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-[var(--border)] text-[var(--foreground-muted)] uppercase tracking-wider text-[11px] font-semibold">
                <th className="py-3 px-4">Guest</th>
                <th className="py-3 px-4">Contact Details</th>
                <th className="py-3 px-4">Nationality</th>
                <th className="py-3 px-4 text-center">Visits</th>
                <th className="py-3 px-4">Last Visit</th>
                <th className="py-3 px-4">Current Stay</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {guests.length > 0 ? (
                guests.map((guest) => {
                  const fullName = `${guest.title ? `${guest.title} ` : ""}${guest.first_name} ${guest.last_name}`;

                  return (
                    <tr
                      key={guest.id}
                      className="hover:bg-slate-50/50 transition-colors duration-150"
                    >
                      {/* Guest Info */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <Avatar name={`${guest.first_name} ${guest.last_name}`} size="md" />
                          <div>
                            <Link
                              href={`/guests/${guest.id}`}
                              className="font-semibold text-slate-800 hover:text-[var(--primary)] transition-colors hover:underline block"
                            >
                              {fullName}
                            </Link>
                            {guest.company_name && (
                              <div className="text-[11px] text-[var(--foreground-muted)]">
                                {guest.company_name}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Contact */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="text-[var(--foreground)] font-medium">
                          {guest.email || "No email"}
                        </div>
                        <div className="text-[11px] text-[var(--foreground-muted)]">
                          {guest.phone || "No phone"}
                        </div>
                      </td>

                      {/* Nationality */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="font-medium text-slate-700">
                          {guest.nationality || "—"}
                        </span>
                      </td>

                      {/* Visits */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <span className="font-semibold text-slate-800 text-xs">
                          {guest.stats?.totalStays || 0}
                        </span>
                        {guest.stats?.totalNights ? (
                          <div className="text-[10px] text-[var(--foreground-muted)]">
                            {guest.stats.totalNights}N
                          </div>
                        ) : null}
                      </td>

                      {/* Last Visit */}
                      <td className="py-3 px-4 whitespace-nowrap text-slate-600">
                        {guest.stats?.lastVisitDate ? (
                          <div className="flex items-center gap-1 text-[11px]">
                            <Calendar className="h-3 w-3 text-slate-400" />
                            <span>{new Date(guest.stats.lastVisitDate).toLocaleDateString()}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      {/* Current Stay */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {guest.current_stay ? (
                          <Link
                            href={`/front-desk/stays/${guest.current_stay.id}`}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100"
                          >
                            <BedDouble className="h-3 w-3 text-emerald-600" />
                            <span>Room {guest.current_stay.room_number}</span>
                          </Link>
                        ) : (
                          <span className="text-slate-400 text-[11px]">Not in-house</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <GuestStatusBadge
                          status={guest.status}
                          isReturning={guest.stats?.isReturning}
                        />
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link href={`/guests/${guest.id}`}>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 px-2 text-xs text-slate-600 hover:text-slate-900 gap-1"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              <span className="hidden sm:inline">Profile</span>
                            </Button>
                          </Link>

                          <Link href={`/guests/${guest.id}/edit`}>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-slate-500 hover:text-slate-900"
                              title="Edit Guest"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </Button>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-500 text-xs">
                    No guest profiles found matching your search criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-3 border-t border-[var(--border)] flex items-center justify-between text-xs text-[var(--foreground-muted)]">
          <div>
            Showing{" "}
            <span className="font-semibold text-[var(--foreground)]">
              {total === 0 ? 0 : (page - 1) * pageSize + 1}
            </span>{" "}
            to{" "}
            <span className="font-semibold text-[var(--foreground)]">
              {Math.min(page * pageSize, total)}
            </span>{" "}
            of <span className="font-semibold text-[var(--foreground)]">{total}</span> guests
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
              className="h-7 px-2 text-xs gap-1"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              <span>Previous</span>
            </Button>
            <span className="text-xs font-medium text-slate-700">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
              className="h-7 px-2 text-xs gap-1"
            >
              <span>Next</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
