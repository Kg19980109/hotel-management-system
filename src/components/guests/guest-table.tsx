"use client";

import * as React from "react";
import Link from "next/link";
import { GuestCRM } from "@/lib/guests/types";
import { GuestStatusBadge } from "./guest-status-badge";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Eye, Edit2, ChevronLeft, ChevronRight, BedDouble, Calendar, Sparkles, Phone, Mail, Globe } from "lucide-react";

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

  if (guests.length === 0) {
    return (
      <div className="stayhub-card p-16 text-center">
        <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
          <Sparkles className="h-8 w-8 text-slate-400" />
        </div>
        <p className="font-bold text-slate-800 text-base">No guest records found</p>
        <p className="text-slate-400 text-sm mt-1">Try adjusting your search or add a new guest profile.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Table header row - visible on larger screens */}
      <div className="hidden lg:grid grid-cols-[2fr_1.5fr_1fr_80px_1fr_1fr_1fr_100px] gap-4 px-5 py-2.5 bg-white rounded-xl border border-slate-200/80 text-[10.5px] font-bold uppercase tracking-wider text-slate-400 shadow-xs">
        <span>Guest Profile</span>
        <span>Contact</span>
        <span>Nationality</span>
        <span className="text-center">Stays</span>
        <span>Last Visit</span>
        <span>Current Room</span>
        <span>Status</span>
        <span className="text-right">Actions</span>
      </div>

      {/* Guest rows */}
      <div className="space-y-2">
        {guests.map((guest) => {
          const fullName = `${guest.title ? `${guest.title} ` : ""}${guest.first_name} ${guest.last_name}`;
          const isVip = Boolean(guest.stats?.isReturning || (guest.stats?.totalStays && guest.stats.totalStays > 1));
          const isInHouse = Boolean(guest.current_stay);

          return (
            <div
              key={guest.id}
              className={`group relative flex flex-col lg:grid lg:grid-cols-[2fr_1.5fr_1fr_80px_1fr_1fr_1fr_100px] gap-4 items-center px-5 py-4 bg-white rounded-2xl border transition-all duration-180 hover:shadow-md hover:border-indigo-200/60 hover:-translate-y-px ${
                isInHouse
                  ? "border-violet-200/70 bg-gradient-to-r from-violet-50/40 via-white to-white"
                  : "border-slate-200/80"
              }`}
            >
              {/* Guest avatar + name */}
              <div className="flex items-center gap-3 w-full lg:w-auto">
                <div className="relative shrink-0">
                  <Avatar
                    name={`${guest.first_name} ${guest.last_name}`}
                    size="md"
                    className={isVip ? "ring-2 ring-amber-400 ring-offset-1" : ""}
                  />
                  {isVip && (
                    <span className="absolute -bottom-1 -right-1 h-5 w-5 bg-gradient-to-br from-amber-400 to-amber-600 rounded-full flex items-center justify-center shadow-sm">
                      <Sparkles className="h-2.5 w-2.5 text-white" />
                    </span>
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Link
                      href={`/guests/${guest.id}`}
                      className="font-bold text-sm text-slate-900 group-hover:text-indigo-600 transition-colors truncate max-w-[180px]"
                    >
                      {fullName}
                    </Link>
                    {isVip && (
                      <span className="shrink-0 text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-300">
                        VIP
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-slate-400 truncate block">
                    {guest.company_name || "Leisure Guest"}
                  </span>
                </div>
              </div>

              {/* Contact */}
              <div className="hidden lg:block">
                {guest.email ? (
                  <div className="flex items-center gap-1.5 text-[11.5px] text-slate-600">
                    <Mail className="h-3 w-3 text-slate-400 shrink-0" />
                    <span className="truncate max-w-[180px]">{guest.email}</span>
                  </div>
                ) : (
                  <span className="text-slate-300 italic text-xs">No email</span>
                )}
                {guest.phone && (
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-0.5">
                    <Phone className="h-3 w-3 text-slate-400 shrink-0" />
                    <span className="font-mono">{guest.phone}</span>
                  </div>
                )}
              </div>

              {/* Nationality */}
              <div className="hidden lg:block">
                <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                  <Globe className="h-3 w-3 text-slate-400" />
                  {guest.nationality || "International"}
                </span>
              </div>

              {/* Stays */}
              <div className="hidden lg:flex flex-col items-center">
                <span className="text-base font-black text-slate-900">
                  {guest.stats?.totalStays || 0}
                </span>
                <span className="text-[10px] text-slate-400 font-medium leading-none">
                  {guest.stats?.totalNights ? `${guest.stats.totalNights}n` : "stays"}
                </span>
              </div>

              {/* Last Visit */}
              <div className="hidden lg:block">
                {guest.stats?.lastVisitDate ? (
                  <div className="flex items-center gap-1.5 text-xs text-slate-600">
                    <Calendar className="h-3.5 w-3.5 text-slate-400" />
                    <span className="font-medium">
                      {new Date(guest.stats.lastVisitDate).toLocaleDateString("en-IN", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                ) : (
                  <span className="text-slate-300 italic text-[11px]">First visit</span>
                )}
              </div>

              {/* Current Room */}
              <div className="hidden lg:block">
                {guest.current_stay ? (
                  <Link
                    href={`/front-desk/stays/${guest.current_stay.id}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold bg-violet-600 text-white hover:bg-violet-700 transition-colors shadow-sm shadow-violet-200"
                  >
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-70" />
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-white" />
                    </span>
                    <BedDouble className="h-3 w-3" />
                    Room {guest.current_stay.room_number}
                  </Link>
                ) : (
                  <span className="text-slate-300 text-sm">—</span>
                )}
              </div>

              {/* Status */}
              <div className="hidden lg:block">
                <GuestStatusBadge status={guest.status} isReturning={guest.stats?.isReturning} />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-1.5 lg:ml-auto w-full lg:w-auto mt-2 lg:mt-0">
                <Link href={`/guests/${guest.id}`}>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 px-3 text-[11px] font-semibold text-slate-700 hover:text-indigo-600 hover:border-indigo-300 hover:bg-indigo-50 gap-1.5 rounded-xl transition-all"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Profile</span>
                  </Button>
                </Link>

                <Link href={`/guests/${guest.id}/edit`}>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-xl"
                    title="Edit Guest Profile"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </Button>
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-1 pt-1">
        <span className="text-xs text-slate-500">
          Showing{" "}
          <span className="font-semibold text-slate-700">
            {total === 0 ? 0 : (page - 1) * pageSize + 1}
          </span>{" "}
          to{" "}
          <span className="font-semibold text-slate-700">
            {Math.min(page * pageSize, total)}
          </span>{" "}
          of <span className="font-semibold text-slate-700">{total}</span> guests
        </span>

        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            className="h-8 px-2.5 text-xs gap-1 rounded-xl"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Previous</span>
          </Button>
          <span className="text-xs font-bold text-slate-700 px-2">
            {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            className="h-8 px-2.5 text-xs gap-1 rounded-xl"
          >
            <span className="hidden sm:inline">Next</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
