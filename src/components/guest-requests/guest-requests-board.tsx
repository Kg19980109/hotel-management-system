"use client";

import * as React from "react";
import Link from "next/link";
import {
  Search,
  RotateCcw,
  Clock,
  Eye,
  Sparkles,
  Wrench,
  Utensils,
  BedDouble,
  Car,
  Shirt,
  Flower2,
  Compass,
  BellRing,
  Inbox,
  CheckCircle2,
  AlertTriangle,
  UserCheck,
  User,
  LayoutGrid,
  List,
  Flame,
  Check,
  Play,
  Filter,
} from "lucide-react";
import {
  StaffGuestServiceRequest,
  ServiceRequestStatus,
} from "@/lib/guest-services/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AssignRequestModal } from "./assign-request-modal";
import { StatusActionModal, StatusActionType } from "./status-action-modal";
import { cn } from "@/lib/utils";

import { useAuth } from "@/lib/auth/context";

interface GuestRequestsBoardProps {
  propertyId: string;
  requests: StaffGuestServiceRequest[];
  staffMembers: { id: string; full_name: string; email: string }[];
  onRefresh: () => void;
  hideTopKpiGrid?: boolean;
}

export function GuestRequestsBoard({
  propertyId,
  requests,
  staffMembers,
  onRefresh,
  hideTopKpiGrid = false,
}: GuestRequestsBoardProps) {
  const { user, profile } = useAuth();
  const currentUserId = user?.id;
  const currentProfileId = profile?.id;

  const [search, setSearch] = React.useState("");
  const [selectedCategory, setSelectedCategory] = React.useState("ALL");
  const [selectedStatus, setSelectedStatus] = React.useState("ALL");
  const [selectedPriority, setSelectedPriority] = React.useState("ALL");
  const [selectedAssignee, setSelectedAssignee] = React.useState("ALL");
  const [viewMode, setViewMode] = React.useState<"table" | "grid">("table");

  // Modal States
  const [assignTarget, setAssignTarget] =
    React.useState<StaffGuestServiceRequest | null>(null);
  const [actionTarget, setActionTarget] = React.useState<{
    request: StaffGuestServiceRequest;
    type: StatusActionType;
  } | null>(null);

  // Filtered requests
  const filtered = React.useMemo(() => {
    return requests.filter((r) => {
      if (selectedCategory !== "ALL" && r.category !== selectedCategory)
        return false;
      if (selectedStatus !== "ALL" && r.status !== selectedStatus) return false;
      if (selectedPriority !== "ALL" && r.priority !== selectedPriority)
        return false;
      if (selectedAssignee === "MY_WORK") {
        if (r.assigned_to !== currentUserId && r.assigned_to !== currentProfileId) return false;
      } else if (selectedAssignee !== "ALL") {
        if (r.assigned_to !== selectedAssignee) return false;
      }

      if (search.trim().length > 0) {
        const s = search.toLowerCase().trim();
        const room = (r.room?.room_number || "").toLowerCase();
        const guest =
          `${r.guest?.first_name || ""} ${r.guest?.last_name || ""}`.toLowerCase();
        const title = (r.title || "").toLowerCase();
        const id = (r.id || "").toLowerCase();
        if (
          !room.includes(s) &&
          !guest.includes(s) &&
          !title.includes(s) &&
          !id.includes(s)
        ) {
          return false;
        }
      }

      return true;
    });
  }, [requests, selectedCategory, selectedStatus, selectedPriority, selectedAssignee, search, currentUserId, currentProfileId]);

  // KPI calculations
  const total = requests.length;
  const submitted = requests.filter((r) => r.status === "SUBMITTED").length;
  const inProgress = requests.filter(
    (r) =>
      r.status === "IN_PROGRESS" ||
      r.status === "ASSIGNED" ||
      r.status === "ACKNOWLEDGED"
  ).length;
  const completed = requests.filter((r) => r.status === "COMPLETED").length;

  const getPriorityBadge = (p: string) => {
    switch (p) {
      case "URGENT":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200 shadow-2xs animate-pulse">
            <Flame className="w-2.5 h-2.5 text-rose-600 fill-rose-500" />
            URGENT
          </span>
        );
      case "HIGH":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200 shadow-2xs">
            HIGH
          </span>
        );
      case "LOW":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold text-slate-500 bg-slate-100 border border-slate-200">
            LOW
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200/80">
            NORMAL
          </span>
        );
    }
  };

  const getStatusBadge = (s: ServiceRequestStatus) => {
    switch (s) {
      case "COMPLETED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10.5px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
            COMPLETED
          </span>
        );
      case "IN_PROGRESS":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10.5px] font-black bg-indigo-50 text-indigo-700 border border-indigo-200">
            <span className="h-1.5 w-1.5 rounded-full bg-indigo-600 animate-pulse" />
            IN PROGRESS
          </span>
        );
      case "ASSIGNED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-sky-50 text-sky-700 border border-sky-200">
            <span className="h-1.5 w-1.5 rounded-full bg-sky-600" />
            ASSIGNED
          </span>
        );
      case "ACKNOWLEDGED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-600" />
            ACKNOWLEDGED
          </span>
        );
      case "CANCELLED":
      case "REJECTED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
            {s}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10.5px] font-black bg-amber-500 text-white shadow-2xs animate-pulse">
            <span className="h-1.5 w-1.5 rounded-full bg-white" />
            NEW SUBMISSION
          </span>
        );
    }
  };

  const getCategoryInfo = (cat: string) => {
    switch (cat?.toUpperCase()) {
      case "HOUSEKEEPING":
        return {
          icon: Sparkles,
          bg: "bg-emerald-50 border-emerald-200 text-emerald-700",
        };
      case "MAINTENANCE":
        return {
          icon: Wrench,
          bg: "bg-blue-50 border-blue-200 text-blue-700",
        };
      case "ROOM_SERVICE":
      case "FOOD":
      case "DINING":
        return {
          icon: Utensils,
          bg: "bg-amber-50 border-amber-200 text-amber-700",
        };
      case "LAUNDRY":
        return {
          icon: Shirt,
          bg: "bg-indigo-50 border-indigo-200 text-indigo-700",
        };
      case "SPA":
        return {
          icon: Flower2,
          bg: "bg-pink-50 border-pink-200 text-pink-700",
        };
      case "TRANSPORT":
        return {
          icon: Car,
          bg: "bg-teal-50 border-teal-200 text-teal-700",
        };
      case "FRONT_DESK":
        return {
          icon: BedDouble,
          bg: "bg-amber-50 border-amber-200 text-amber-700",
        };
      case "CONCIERGE":
        return {
          icon: Compass,
          bg: "bg-purple-50 border-purple-200 text-purple-700",
        };
      default:
        return {
          icon: BellRing,
          bg: "bg-slate-100 border-slate-200 text-slate-700",
        };
    }
  };

  return (
    <div className="space-y-4">
      {/* 1. Sleek Interactive Status Filters Strip */}
      {!hideTopKpiGrid && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            {
              id: "ALL",
              title: "Total Requests",
              value: total,
              sub: "All Tickets",
              icon: Inbox,
              iconColor: "text-blue-500",
              iconBg: "bg-blue-500/10 border-blue-500/20",
              activeStyle: "ring-2 ring-blue-500/80 border-blue-500/40 bg-blue-500/5",
            },
            {
              id: "SUBMITTED",
              title: "New / Submitted",
              value: submitted,
              sub: submitted > 0 ? "Requires Triage" : "All clear",
              icon: AlertTriangle,
              iconColor: "text-amber-500",
              iconBg: "bg-amber-500/10 border-amber-500/20",
              activeStyle: "ring-2 ring-amber-500/80 border-amber-500/40 bg-amber-500/5",
            },
            {
              id: "IN_PROGRESS",
              title: "Active / In-Progress",
              value: inProgress,
              sub: "In Dispatch",
              icon: Clock,
              iconColor: "text-indigo-500",
              iconBg: "bg-indigo-500/10 border-indigo-500/20",
              activeStyle: "ring-2 ring-indigo-500/80 border-indigo-500/40 bg-indigo-500/5",
            },
            {
              id: "COMPLETED",
              title: "Completed Today",
              value: completed,
              sub: "Resolved",
              icon: CheckCircle2,
              iconColor: "text-emerald-500",
              iconBg: "bg-emerald-500/10 border-emerald-500/20",
              activeStyle: "ring-2 ring-emerald-500/80 border-emerald-500/40 bg-emerald-500/5",
            },
          ].map((item) => {
            const Icon = item.icon;
            const isSelected = selectedStatus === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() =>
                  setSelectedStatus(isSelected && item.id !== "ALL" ? "ALL" : item.id)
                }
                className={cn(
                  "group relative flex items-center justify-between p-3.5 rounded-xl bg-card border border-border/70 text-left transition-all duration-200 select-none hover:-translate-y-0.5 hover:shadow-md hover:border-border cursor-pointer",
                  isSelected
                    ? cn(item.activeStyle, "shadow-sm")
                    : "shadow-2xs"
                )}
              >
                <div>
                  <span className="text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground block">
                    {item.title}
                  </span>
                  <span className="text-2xl font-black text-foreground mt-0.5 block tabular-nums">
                    {item.value}
                  </span>
                  <span className="text-[11px] font-medium text-muted-foreground/80 block mt-0.5">
                    {item.sub}
                  </span>
                </div>
                <div
                  className={cn(
                    "w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-105",
                    item.iconBg,
                    item.iconColor
                  )}
                >
                  <Icon className="w-4 h-4" />
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* 2. Controls & Search Filter Bar */}
      <div className="stayhub-card p-3.5">
        <div className="flex flex-col md:flex-row gap-2.5 items-center justify-between">
          {/* Search Box */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search room, guest name, ticket title..."
              className="pl-9 bg-slate-50 border-slate-200 h-9.5 rounded-xl text-xs"
            />
          </div>

          {/* Filters & View Toggle */}
          <div className="flex flex-wrap gap-2 w-full md:w-auto items-center justify-end">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="h-9.5 px-3 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 focus:outline-none focus:border-indigo-500 shadow-2xs cursor-pointer"
            >
              <option value="ALL">All Categories</option>
              <option value="HOUSEKEEPING">Housekeeping</option>
              <option value="MAINTENANCE">Maintenance</option>
              <option value="FRONT_DESK">Front Desk</option>
              <option value="CONCIERGE">Concierge</option>
              <option value="LAUNDRY">Laundry</option>
              <option value="SPA">Spa</option>
              <option value="TRANSPORT">Transport</option>
              <option value="ROOM_SERVICE">In-Room Dining</option>
              <option value="OTHER">Other</option>
            </select>

            <select
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
              className="h-9.5 px-3 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 focus:outline-none focus:border-indigo-500 shadow-2xs cursor-pointer"
            >
              <option value="ALL">All Priorities</option>
              <option value="URGENT">Urgent</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>

            <select
              value={selectedAssignee}
              onChange={(e) => setSelectedAssignee(e.target.value)}
              className="h-9.5 px-3 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 focus:outline-none focus:border-indigo-500 shadow-2xs cursor-pointer"
            >
              <option value="ALL">All Assignees</option>
              <option value="MY_WORK">My Assigned Requests</option>
              {staffMembers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.full_name}
                </option>
              ))}
            </select>

            <Button
              type="button"
              variant={selectedAssignee === "MY_WORK" ? "primary" : "outline"}
              size="sm"
              onClick={() => setSelectedAssignee((prev) => (prev === "MY_WORK" ? "ALL" : "MY_WORK"))}
              className="h-9.5 text-xs font-semibold"
            >
              <BellRing className="h-3.5 w-3.5 mr-1" />
              My Requests
            </Button>

            {/* View Mode Switcher */}
            <div className="flex items-center border border-slate-200 rounded-xl p-0.5 bg-slate-100 shadow-2xs">
              <button
                type="button"
                onClick={() => setViewMode("table")}
                className={cn(
                  "p-1.5 rounded-lg transition-all",
                  viewMode === "table"
                    ? "bg-white text-slate-900 shadow-xs font-bold"
                    : "text-slate-500 hover:text-slate-800"
                )}
                title="Table View"
              >
                <List className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                className={cn(
                  "p-1.5 rounded-lg transition-all",
                  viewMode === "grid"
                    ? "bg-white text-slate-900 shadow-xs font-bold"
                    : "text-slate-500 hover:text-slate-800"
                )}
                title="Card View"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>

            <Button
              variant="outline"
              size="icon"
              onClick={onRefresh}
              title="Refresh Requests"
              className="h-9.5 w-9.5 rounded-xl bg-white border-slate-200"
            >
              <RotateCcw className="w-4 h-4 text-slate-600" />
            </Button>
          </div>
        </div>
      </div>

      {/* 3. Empty State */}
      {filtered.length === 0 ? (
        <div className="stayhub-card p-12 text-center border-dashed space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
            <Clock className="w-6 h-6" />
          </div>
          <h3 className="text-base font-extrabold text-slate-900">
            No guest requests match your filters
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Try adjusting your search query or reset status filters to view active hotel tickets.
          </p>
          {(search || selectedCategory !== "ALL" || selectedStatus !== "ALL" || selectedPriority !== "ALL") && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setSearch("");
                setSelectedCategory("ALL");
                setSelectedStatus("ALL");
                setSelectedPriority("ALL");
              }}
              className="text-xs font-bold h-8"
            >
              Reset Filters
            </Button>
          )}
        </div>
      ) : viewMode === "grid" ? (
        /* ── GRID CARD VIEW ── */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((r) => {
            const cat = getCategoryInfo(r.category);
            const CatIcon = cat.icon;
            const guestName =
              r.guest ? `${r.guest.first_name || ""} ${r.guest.last_name || ""}`.trim() : "In-House Guest";

            return (
              <div
                key={r.id}
                className="group relative flex flex-col rounded-2xl bg-white border border-slate-200/90 p-4 shadow-2xs hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 space-y-3"
              >
                {/* Header Row: Room Pill + Priority + Category */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-900 text-white text-xs font-black shadow-2xs">
                      <BedDouble className="w-3.5 h-3.5 text-amber-400" />
                      Room {r.room?.room_number || "—"}
                    </span>
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold border",
                        cat.bg
                      )}
                    >
                      <CatIcon className="w-3 h-3" />
                      <span>{r.category}</span>
                    </span>
                  </div>

                  {getPriorityBadge(r.priority)}
                </div>

                {/* Request Content */}
                <div className="space-y-1">
                  <h4 className="text-[13.5px] font-black text-slate-900 leading-snug">
                    {r.title}
                  </h4>
                  {r.description && (
                    <p className="text-[11.5px] text-slate-500 line-clamp-2 leading-relaxed">
                      {r.description}
                    </p>
                  )}
                </div>

                {/* Guest & Timing Strip */}
                <div className="p-2.5 rounded-xl bg-slate-50/80 border border-slate-100 flex items-center justify-between text-[11px] text-slate-600">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-[10px] shrink-0">
                      {guestName.slice(0, 2).toUpperCase()}
                    </div>
                    <span className="font-bold text-slate-800 truncate">
                      {guestName}
                    </span>
                  </div>
                  <span className="font-mono text-[10.5px] text-slate-400 shrink-0 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(r.requested_at).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>

                {/* Status & Assigned Staff Row */}
                <div className="flex items-center justify-between text-[11.5px] pt-1">
                  <span className="font-bold text-slate-500">Status:</span>
                  {getStatusBadge(r.status)}
                </div>

                {/* Bottom Action Footer */}
                <div className="flex items-center gap-1.5 pt-2 border-t border-slate-100 mt-auto">
                  {r.status === "SUBMITTED" && (
                    <Button
                      size="sm"
                      className="flex-1 h-8 text-[11px] font-bold rounded-xl bg-amber-500 hover:bg-amber-600 text-white gap-1 shadow-2xs"
                      onClick={() =>
                        setActionTarget({ request: r, type: "ACKNOWLEDGE" })
                      }
                    >
                      <Check className="w-3 h-3" />
                      <span>Accept Ticket</span>
                    </Button>
                  )}

                  {r.status !== "COMPLETED" &&
                    r.status !== "CANCELLED" &&
                    r.status !== "REJECTED" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 px-2.5 text-[11px] font-bold rounded-xl border-slate-200 text-slate-700 hover:bg-slate-100"
                        onClick={() => setAssignTarget(r)}
                      >
                        <UserCheck className="w-3 h-3 mr-1" />
                        {r.assigned_staff
                          ? r.assigned_staff.full_name.split(" ")[0]
                          : "Assign"}
                      </Button>
                    )}

                  {r.status === "ASSIGNED" && (
                    <Button
                      size="sm"
                      className="flex-1 h-8 text-[11px] font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white gap-1 shadow-2xs"
                      onClick={() =>
                        setActionTarget({ request: r, type: "START" })
                      }
                    >
                      <Play className="w-3 h-3" />
                      <span>Start Work</span>
                    </Button>
                  )}

                  {r.status === "IN_PROGRESS" && (
                    <Button
                      size="sm"
                      className="flex-1 h-8 text-[11px] font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white gap-1 shadow-2xs"
                      onClick={() =>
                        setActionTarget({ request: r, type: "COMPLETE" })
                      }
                    >
                      <Check className="w-3 h-3" />
                      <span>Mark Complete</span>
                    </Button>
                  )}

                  <Link href={`/guest-requests/${r.id}`}>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 w-8 p-0 rounded-xl border-slate-200 text-slate-600 hover:text-slate-900"
                      title="View Dossier"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </Button>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ── LUXURY COMMAND TABLE VIEW ── */
        <div className="stayhub-card p-0 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50/90 border-b border-slate-200 text-slate-500 uppercase font-extrabold tracking-wider text-[10.5px]">
                <tr>
                  <th className="py-3 px-4">Room</th>
                  <th className="py-3 px-4">Guest</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Ticket Details</th>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Assigned Staff</th>
                  <th className="py-3 px-4">Time</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((r) => {
                  const cat = getCategoryInfo(r.category);
                  const CatIcon = cat.icon;
                  const guestName =
                    r.guest
                      ? `${r.guest.first_name || ""} ${r.guest.last_name || ""}`.trim()
                      : "In-House Guest";

                  return (
                    <tr
                      key={r.id}
                      className="hover:bg-slate-50/70 transition-colors group"
                    >
                      <td className="py-3 px-4 font-black whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-900 text-white font-extrabold text-[11.5px] shadow-2xs">
                          <BedDouble className="w-3.5 h-3.5 text-amber-400" />
                          Room {r.room?.room_number || "—"}
                        </span>
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-6.5 h-6.5 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center font-bold text-[10px] shadow-2xs shrink-0">
                            {guestName.slice(0, 2).toUpperCase()}
                          </div>
                          <span className="font-bold text-slate-900 text-xs">
                            {guestName}
                          </span>
                        </div>
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <div
                            className={cn(
                              "p-1 rounded-lg border flex items-center justify-center",
                              cat.bg
                            )}
                          >
                            <CatIcon className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <span className="font-bold text-slate-800 block text-xs">
                              {r.category}
                            </span>
                            {r.request_type && (
                              <span className="text-[10px] text-slate-400 block font-medium">
                                {r.request_type}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4 max-w-xs">
                        <p className="font-extrabold text-slate-900 text-xs line-clamp-1">
                          {r.title}
                        </p>
                        {r.description && (
                          <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                            {r.description}
                          </p>
                        )}
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        {getPriorityBadge(r.priority)}
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        {getStatusBadge(r.status)}
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        {r.assigned_staff ? (
                          <div className="flex items-center gap-1.5">
                            <div className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-[9.5px] font-bold">
                              {r.assigned_staff.full_name.slice(0, 1)}
                            </div>
                            <span className="font-semibold text-slate-800 text-xs">
                              {r.assigned_staff.full_name}
                            </span>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setAssignTarget(r)}
                            className="text-indigo-600 hover:text-indigo-800 text-xs font-semibold hover:underline flex items-center gap-1"
                          >
                            <User className="w-3 h-3" />
                            <span>Assign Staff</span>
                          </button>
                        )}
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap text-slate-400 font-mono text-[11px]">
                        {new Date(r.requested_at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>

                      <td className="py-3 px-4 text-right whitespace-nowrap space-x-1.5">
                        {r.status === "SUBMITTED" && (
                          <Button
                            size="sm"
                            className="h-7 px-2.5 text-[11px] bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-lg shadow-2xs"
                            onClick={() =>
                              setActionTarget({
                                request: r,
                                type: "ACKNOWLEDGE",
                              })
                            }
                          >
                            Accept
                          </Button>
                        )}

                        {r.status !== "COMPLETED" &&
                          r.status !== "CANCELLED" &&
                          r.status !== "REJECTED" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 px-2.5 text-[11px] font-bold rounded-lg border-slate-200 text-slate-700"
                              onClick={() => setAssignTarget(r)}
                            >
                              Assign
                            </Button>
                          )}

                        {r.status === "ASSIGNED" && (
                          <Button
                            size="sm"
                            className="h-7 px-2.5 text-[11px] bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-2xs"
                            onClick={() =>
                              setActionTarget({ request: r, type: "START" })
                            }
                          >
                            Start
                          </Button>
                        )}

                        {r.status === "IN_PROGRESS" && (
                          <Button
                            size="sm"
                            className="h-7 px-2.5 text-[11px] bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-2xs"
                            onClick={() =>
                              setActionTarget({
                                request: r,
                                type: "COMPLETE",
                              })
                            }
                          >
                            Complete
                          </Button>
                        )}

                        <Link href={`/guest-requests/${r.id}`}>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0 text-slate-400 hover:text-slate-800"
                            title="View Dossier"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Assignment Modal */}
      {assignTarget && (
        <AssignRequestModal
          isOpen={!!assignTarget}
          onClose={() => setAssignTarget(null)}
          request={assignTarget}
          propertyId={propertyId}
          staffMembers={staffMembers}
          onAssigned={onRefresh}
        />
      )}

      {/* Status Transition Action Modal */}
      {actionTarget && (
        <StatusActionModal
          isOpen={!!actionTarget}
          onClose={() => setActionTarget(null)}
          request={actionTarget.request}
          propertyId={propertyId}
          actionType={actionTarget.type}
          onSuccess={onRefresh}
        />
      )}
    </div>
  );
}
