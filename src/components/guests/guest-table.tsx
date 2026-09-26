"use client";

import * as React from "react";
import Link from "next/link";
import { GuestCRM } from "@/lib/guests/types";
import { GuestStatusBadge } from "./guest-status-badge";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Eye, Edit2, ChevronLeft, ChevronRight, BedDouble, Calendar, Sparkles } from "lucide-react";

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
      <div className="overflow-hidden border border-slate-200/90 rounded-2xl bg-white/95 backdrop-blur-md shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-900 border-collapse">
            <thead>
              <tr className="bg-slate-50/90 border-b border-slate-200/80 text-slate-500 uppercase tracking-wider text-[11px] font-bold">
                <th className="py-3.5 px-4">Guest & Portfolio</th>
                <th className="py-3.5 px-4">Contact Details</th>
                <th className="py-3.5 px-4">Nationality</th>
                <th className="py-3.5 px-4 text-center">Stays & Nights</th>
                <th className="py-3.5 px-4">Last Stay</th>
                <th className="py-3.5 px-4">Current Room</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {guests.length > 0 ? (
                guests.map((guest) => {
                  const fullName = `${guest.title ? `${guest.title} ` : ""}${guest.first_name} ${guest.last_name}`;
                  const isVipReturning = Boolean(guest.stats?.isReturning || (guest.stats?.totalStays && guest.stats.totalStays > 1));

                  return (
                    <tr
                      key={guest.id}
                      className="hover:bg-indigo-50/30 transition-all duration-150 group"
                    >
                      {/* Guest Info */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <Avatar 
                              name={`${guest.first_name} ${guest.last_name}`} 
                              size="md" 
                              className={isVipReturning ? "ring-2 ring-amber-400 ring-offset-1" : ""}
                            />
                            {isVipReturning && (
                              <span className="absolute -bottom-1 -right-1 bg-amber-500 text-white rounded-full p-0.5 shadow-xs" title="VIP Returning Guest">
                                <Sparkles className="w-2.5 h-2.5" />
                              </span>
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <Link
                                href={`/guests/${guest.id}`}
                                className="font-bold text-sm text-slate-900 group-hover:text-indigo-600 transition-colors block"
                              >
                                {fullName}
                              </Link>
                              {isVipReturning && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold uppercase tracking-wider bg-amber-500/15 text-amber-800 border border-amber-500/30">
                                  VIP
                                </span>
                              )}
                            </div>
                            {guest.company_name ? (
                              <div className="text-[11px] text-slate-500 font-medium truncate max-w-[160px]">
                                {guest.company_name}
                              </div>
                            ) : (
                              <div className="text-[11px] text-slate-400">
                                Leisure Guest
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Contact */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="text-slate-900 font-medium">
                          {guest.email || <span className="text-slate-400 italic">No email</span>}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          {guest.phone || <span className="text-slate-400">No phone</span>}
                        </div>
                      </td>

                      {/* Nationality */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-slate-100 text-slate-700">
                          {guest.nationality || "International"}
                        </span>
                      </td>

                      {/* Visits */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <div className="inline-flex flex-col items-center">
                          <span className="font-extrabold text-slate-900 text-xs px-2 py-0.5 rounded-full bg-slate-100 group-hover:bg-white group-hover:shadow-xs transition-all">
                            {guest.stats?.totalStays || 0} stays
                          </span>
                          {guest.stats?.totalNights ? (
                            <span className="text-[10px] text-slate-500 font-medium mt-0.5">
                              {guest.stats.totalNights} nights total
                            </span>
                          ) : null}
                        </div>
                      </td>

                      {/* Last Visit */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-slate-600">
                        {guest.stats?.lastVisitDate ? (
                          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-700">
                            <Calendar className="h-3.5 w-3.5 text-slate-400" />
                            <span>{new Date(guest.stats.lastVisitDate).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">First stay</span>
                        )}
                      </td>

                      {/* Current Stay */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {guest.current_stay ? (
                          <Link
                            href={`/front-desk/stays/${guest.current_stay.id}`}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200/80 hover:bg-emerald-100 transition-all shadow-xs group/room"
                          >
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                            </span>
                            <BedDouble className="h-3.5 w-3.5 text-emerald-700" />
                            <span>Room {guest.current_stay.room_number}</span>
                          </Link>
                        ) : (
                          <span className="text-slate-400 text-xs">—</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <GuestStatusBadge
                          status={guest.status}
                          isReturning={guest.stats?.isReturning}
                        />
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link href={`/guests/${guest.id}`}>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 px-2.5 text-xs font-semibold text-slate-700 hover:text-indigo-600 hover:border-indigo-300 gap-1 rounded-lg transition-all"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              <span>Profile</span>
                            </Button>
                          </Link>

                          <Link href={`/guests/${guest.id}/edit`}>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg"
                              title="Edit Guest Profile"
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
                  <td colSpan={8} className="py-12 text-center text-slate-500 text-xs">
                    <p className="font-semibold text-slate-700 text-sm">No guest records found</p>
                    <p className="text-slate-400 mt-1">Try adjusting your search criteria or add a new guest profile.</p>
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
