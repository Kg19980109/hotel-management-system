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
  X,
  ChevronRight,
  ShieldCheck,
  Layers,
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
  staffMembers: {
    id: string;
    full_name: string;
    email: string;
    department_code?: string;
    department_name?: string;
    designation?: string;
  }[];
  onRefresh: () => void;
  hideTopKpiGrid?: boolean;
}

function getRelativeTime(dateStr: string): string {
  try {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  } catch {
    return "";
  }
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
  const [selectedStatusTab, setSelectedStatusTab] = React.useState<"ALL" | "SUBMITTED" | "IN_PROGRESS" | "COMPLETED" | "MY_WORK">("ALL");
  const [selectedPriority, setSelectedPriority] = React.useState("ALL");
  const [selectedAssignee, setSelectedAssignee] = React.useState("ALL");
  const [viewMode, setViewMode] = React.useState<"table" | "grid">("table");
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  // Modal States
  const [assignTarget, setAssignTarget] =
    React.useState<StaffGuestServiceRequest | null>(null);
  const [actionTarget, setActionTarget] = React.useState<{
    request: StaffGuestServiceRequest;
    type: StatusActionType;
  } | null>(null);

  const handleRefreshClick = () => {
    setIsRefreshing(true);
    onRefresh();
    setTimeout(() => setIsRefreshing(false), 600);
  };

  // Quick KPI counts
  const totalCount = requests.length;
  const submittedCount = requests.filter((r) => r.status === "SUBMITTED").length;
  const inProgressCount = requests.filter(
    (r) =>
      r.status === "IN_PROGRESS" ||
      r.status === "ASSIGNED" ||
      r.status === "ACKNOWLEDGED"
  ).length;
  const completedCount = requests.filter((r) => r.status === "COMPLETED").length;
  const myWorkCount = requests.filter(
    (r) =>
      (currentUserId && r.assigned_to === currentUserId) ||
      (currentProfileId && r.assigned_to === currentProfileId)
  ).length;

  // Filtered requests
  const filtered = React.useMemo(() => {
    return requests.filter((r) => {
      // 1. Status / Segment Tab
      if (selectedStatusTab === "SUBMITTED") {
        if (r.status !== "SUBMITTED") return false;
      } else if (selectedStatusTab === "IN_PROGRESS") {
        if (
          r.status !== "IN_PROGRESS" &&
          r.status !== "ASSIGNED" &&
          r.status !== "ACKNOWLEDGED"
        )
          return false;
      } else if (selectedStatusTab === "COMPLETED") {
        if (r.status !== "COMPLETED") return false;
      } else if (selectedStatusTab === "MY_WORK") {
        if (
          r.assigned_to !== currentUserId &&
          r.assigned_to !== currentProfileId
        )
          return false;
      }

      // 2. Category Filter
      if (selectedCategory !== "ALL" && r.category !== selectedCategory)
        return false;

      // 3. Priority Filter
      if (selectedPriority !== "ALL" && r.priority !== selectedPriority)
        return false;

      // 4. Assignee Filter
      if (selectedAssignee === "UNASSIGNED") {
        if (r.assigned_to) return false;
      } else if (selectedAssignee === "MY_WORK") {
        if (
          r.assigned_to !== currentUserId &&
          r.assigned_to !== currentProfileId
        )
          return false;
      } else if (selectedAssignee !== "ALL") {
        if (r.assigned_to !== selectedAssignee) return false;
      }

      // 5. Text Search
      if (search.trim().length > 0) {
        const s = search.toLowerCase().trim();
        const room = (r.room?.room_number || "").toLowerCase();
        const guest = `${r.guest?.first_name || ""} ${r.guest?.last_name || ""}`.toLowerCase();
        const title = (r.title || "").toLowerCase();
        const desc = (r.description || "").toLowerCase();
        const id = (r.id || "").toLowerCase();
        const staff = (r.assigned_staff?.full_name || "").toLowerCase();
        if (
          !room.includes(s) &&
          !guest.includes(s) &&
          !title.includes(s) &&
          !desc.includes(s) &&
          !id.includes(s) &&
          !staff.includes(s)
        ) {
          return false;
        }
      }

      return true;
    });
  }, [
    requests,
    selectedStatusTab,
    selectedCategory,
    selectedPriority,
    selectedAssignee,
    search,
    currentUserId,
    currentProfileId,
  ]);

  const hasActiveFilters =
    search.trim().length > 0 ||
    selectedCategory !== "ALL" ||
    selectedPriority !== "ALL" ||
    selectedAssignee !== "ALL" ||
    selectedStatusTab !== "ALL";

  const handleResetFilters = () => {
    setSearch("");
    setSelectedCategory("ALL");
    setSelectedPriority("ALL");
    setSelectedAssignee("ALL");
    setSelectedStatusTab("ALL");
  };

  const getPriorityBadge = (p: string) => {
    switch (p?.toUpperCase()) {
      case "URGENT":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-black uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200/80 shadow-2xs animate-pulse">
            <Flame className="w-3 h-3 text-rose-600 fill-rose-500" />
            URGENT
          </span>
        );
      case "HIGH":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-bold uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-200/80">
            HIGH
          </span>
        );
      case "LOW":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold text-slate-500 bg-slate-100 border border-slate-200">
            LOW
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-semibold bg-blue-50 text-blue-700 border border-blue-200/60">
            NORMAL
          </span>
        );
    }
  };

  const getStatusBadge = (s: ServiceRequestStatus) => {
    switch (s) {
      case "COMPLETED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Completed
          </span>
        );
      case "IN_PROGRESS":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/80">
            <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-ping" />
            In Progress
          </span>
        );
      case "ASSIGNED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-sky-50 text-sky-700 border border-sky-200/80">
            <span className="h-1.5 w-1.5 rounded-full bg-sky-500" />
            Assigned
          </span>
        );
      case "ACKNOWLEDGED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200/80">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
            Acknowledged
          </span>
        );
      case "CANCELLED":
      case "REJECTED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10.5px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
            {s}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-black bg-amber-500 text-white shadow-2xs animate-pulse">
            <span className="h-1.5 w-1.5 rounded-full bg-white" />
            New Submission
          </span>
        );
    }
  };

  const getCategoryInfo = (cat: string) => {
    switch (cat?.toUpperCase()) {
      case "HOUSEKEEPING":
        return {
          label: "Housekeeping",
          icon: Sparkles,
          color: "text-emerald-700 bg-emerald-50 border-emerald-200/70",
        };
      case "MAINTENANCE":
        return {
          label: "Maintenance",
          icon: Wrench,
          color: "text-sky-700 bg-sky-50 border-sky-200/70",
        };
      case "ROOM_SERVICE":
      case "FOOD":
      case "DINING":
        return {
          label: "In-Room Dining",
          icon: Utensils,
          color: "text-amber-700 bg-amber-50 border-amber-200/70",
        };
      case "LAUNDRY":
        return {
          label: "Laundry",
          icon: Shirt,
          color: "text-indigo-700 bg-indigo-50 border-indigo-200/70",
        };
      case "SPA":
        return {
          label: "Spa & Wellness",
          icon: Flower2,
          color: "text-pink-700 bg-pink-50 border-pink-200/70",
        };
      case "TRANSPORT":
        return {
          label: "Transport",
          icon: Car,
          color: "text-teal-700 bg-teal-50 border-teal-200/70",
        };
      case "FRONT_DESK":
        return {
          label: "Front Desk",
          icon: BedDouble,
          color: "text-blue-700 bg-blue-50 border-blue-200/70",
        };
      case "CONCIERGE":
        return {
          label: "Concierge",
          icon: Compass,
          color: "text-purple-700 bg-purple-50 border-purple-200/70",
        };
      default:
        return {
          label: cat || "Service",
          icon: BellRing,
          color: "text-slate-700 bg-slate-50 border-slate-200/70",
        };
    }
  };

  return (
    <div className="space-y-3.5">
      {/* ── 1. FAST OPERATIONAL SEGMENT TABS ── */}
      {!hideTopKpiGrid && (
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
          {[
            {
              id: "ALL" as const,
              label: "All Requests",
              count: totalCount,
              icon: Inbox,
              badgeStyle: "bg-slate-100 text-slate-700 border-slate-200",
            },
            {
              id: "SUBMITTED" as const,
              label: "Needs Triage",
              count: submittedCount,
              icon: AlertTriangle,
              highlight: submittedCount > 0,
              badgeStyle: submittedCount > 0 ? "bg-amber-500 text-white animate-pulse font-black" : "bg-slate-100 text-slate-600",
            },
            {
              id: "IN_PROGRESS" as const,
              label: "In Dispatch",
              count: inProgressCount,
              icon: Clock,
              badgeStyle: "bg-indigo-50 text-indigo-700 border-indigo-200 font-bold",
            },
            {
              id: "COMPLETED" as const,
              label: "Completed",
              count: completedCount,
              icon: CheckCircle2,
              badgeStyle: "bg-emerald-50 text-emerald-700 border-emerald-200 font-bold",
            },
            {
              id: "MY_WORK" as const,
              label: "My Assigned",
              count: myWorkCount,
              icon: UserCheck,
              badgeStyle: "bg-blue-50 text-blue-700 border-blue-200 font-bold",
            },
          ].map((tab) => {
            const Icon = tab.icon;
            const isSelected = selectedStatusTab === tab.id;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSelectedStatusTab(tab.id)}
                className={cn(
                  "flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border shrink-0 cursor-pointer",
                  isSelected
                    ? "bg-slate-900 text-white border-slate-900 shadow-sm font-bold"
                    : "bg-card text-foreground/80 border-border/70 hover:bg-muted/60 hover:text-foreground"
                )}
              >
                <Icon
                  className={cn(
                    "w-3.5 h-3.5",
                    isSelected
                      ? "text-amber-400"
                      : tab.highlight
                      ? "text-amber-500"
                      : "text-muted-foreground"
                  )}
                />
                <span>{tab.label}</span>
                <span
                  className={cn(
                    "px-1.5 py-0.2 rounded-md text-[11px] tabular-nums",
                    isSelected
                      ? "bg-white/20 text-white font-bold"
                      : tab.badgeStyle
                  )}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* ── 2. STREAMLINED SEARCH & FILTER CONTROL BAR ── */}
      <div className="bg-card border border-border/80 rounded-2xl p-3 shadow-2xs space-y-2.5">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-2.5">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search room, guest name, ticket title, or notes..."
              className="pl-9 pr-8 bg-muted/40 border-border/80 h-9.5 rounded-xl text-xs focus-visible:ring-1"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filter Dropdowns & View Actions */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Category Dropdown */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="h-9 px-3 rounded-xl border border-border/80 bg-card text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary shadow-2xs cursor-pointer"
            >
              <option value="ALL">All Departments</option>
              <option value="HOUSEKEEPING">✨ Housekeeping</option>
              <option value="MAINTENANCE">🔧 Maintenance</option>
              <option value="FRONT_DESK">🛎️ Front Desk</option>
              <option value="ROOM_SERVICE">🍽️ In-Room Dining</option>
              <option value="CONCIERGE">🧭 Concierge</option>
              <option value="LAUNDRY">🧺 Laundry</option>
              <option value="SPA">🌸 Spa & Wellness</option>
              <option value="TRANSPORT">🚗 Transport</option>
              <option value="OTHER">📦 Other Services</option>
            </select>

            {/* Priority Dropdown */}
            <select
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
              className="h-9 px-3 rounded-xl border border-border/80 bg-card text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary shadow-2xs cursor-pointer"
            >
              <option value="ALL">All Priorities</option>
              <option value="URGENT">🔥 Urgent</option>
              <option value="HIGH">⚡ High</option>
              <option value="NORMAL">Normal</option>
              <option value="LOW">Low</option>
            </select>

            {/* Assignee Dropdown */}
            <select
              value={selectedAssignee}
              onChange={(e) => setSelectedAssignee(e.target.value)}
              className="h-9 px-3 rounded-xl border border-border/80 bg-card text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary shadow-2xs cursor-pointer max-w-[160px] truncate"
            >
              <option value="ALL">All Staff</option>
              <option value="UNASSIGNED">⚠️ Unassigned Only</option>
              <option value="MY_WORK">👤 My Assigned</option>
              {staffMembers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.full_name}
                </option>
              ))}
            </select>

            {/* Reset Filters Shortcut */}
            {hasActiveFilters && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleResetFilters}
                className="h-9 px-2 text-xs font-semibold text-muted-foreground hover:text-foreground"
              >
                <X className="w-3.5 h-3.5 mr-1" />
                Reset
              </Button>
            )}

            {/* View Mode Switcher */}
            <div className="flex items-center border border-border/80 rounded-xl p-0.5 bg-muted/40 shadow-2xs">
              <button
                type="button"
                onClick={() => setViewMode("table")}
                className={cn(
                  "p-1.5 rounded-lg transition-all cursor-pointer",
                  viewMode === "table"
                    ? "bg-card text-foreground shadow-2xs font-bold"
                    : "text-muted-foreground hover:text-foreground"
                )}
                title="Table List View"
              >
                <List className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                className={cn(
                  "p-1.5 rounded-lg transition-all cursor-pointer",
                  viewMode === "grid"
                    ? "bg-card text-foreground shadow-2xs font-bold"
                    : "text-muted-foreground hover:text-foreground"
                )}
                title="Card Grid View"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>

            {/* Refresh Button */}
            <Button
              variant="outline"
              size="icon"
              onClick={handleRefreshClick}
              title="Refresh Requests"
              className="h-9 w-9 rounded-xl bg-card border-border/80 shrink-0"
            >
              <RotateCcw
                className={cn(
                  "w-3.5 h-3.5 text-foreground/80 transition-transform duration-500",
                  isRefreshing && "rotate-180 animate-spin"
                )}
              />
            </Button>
          </div>
        </div>

        {/* Quick Result Indicator */}
        <div className="flex items-center justify-between text-[11.5px] text-muted-foreground px-0.5 pt-0.5">
          <span>
            Showing <strong className="text-foreground">{filtered.length}</strong> of{" "}
            {requests.length} requests
            {selectedStatusTab !== "ALL" && (
              <span> in <strong className="text-foreground capitalize">{selectedStatusTab.toLowerCase().replace("_", " ")}</strong></span>
            )}
          </span>
          {hasActiveFilters && (
            <span className="text-[11px] text-amber-600 font-medium">
              Filters Active
            </span>
          )}
        </div>
      </div>

      {/* ── 3. EMPTY STATE ── */}
      {filtered.length === 0 ? (
        <div className="bg-card border border-dashed border-border/80 rounded-2xl p-10 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-muted/60 border border-border/60 flex items-center justify-center mx-auto text-muted-foreground">
            <Inbox className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">
              No service requests match your criteria
            </h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
              Try adjusting your search query, clearing department/priority filters, or selecting a different status tab.
            </p>
          </div>
          {hasActiveFilters && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleResetFilters}
              className="text-xs font-semibold h-8 rounded-xl"
            >
              Clear All Filters
            </Button>
          )}
        </div>
      ) : viewMode === "grid" ? (
        /* ── 4. MODERN GRID / CARD VIEW ── */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
          {filtered.map((r) => {
            const cat = getCategoryInfo(r.category);
            const CatIcon = cat.icon;
            const guestName = r.guest
              ? `${r.guest.first_name || ""} ${r.guest.last_name || ""}`.trim()
              : "In-House Guest";
            const relativeTime = getRelativeTime(r.requested_at);

            return (
              <div
                key={r.id}
                className="group relative flex flex-col rounded-2xl bg-card border border-border/80 p-4 shadow-2xs hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 space-y-3"
              >
                {/* Header: Room Pill + Priority + Category */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-900 text-white text-xs font-bold shadow-2xs">
                      <BedDouble className="w-3.5 h-3.5 text-amber-400" />
                      Room {r.room?.room_number || "—"}
                    </span>
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10.5px] font-bold border",
                        cat.color
                      )}
                    >
                      <CatIcon className="w-3 h-3" />
                      <span>{cat.label}</span>
                    </span>
                  </div>

                  {getPriorityBadge(r.priority)}
                </div>

                {/* Content */}
                <div className="space-y-1">
                  <Link
                    href={`/guest-requests/${r.id}`}
                    className="text-[13.5px] font-bold text-foreground hover:text-primary leading-snug line-clamp-2 block transition-colors"
                  >
                    {r.title}
                  </Link>
                  {r.description && (
                    <p className="text-[11.5px] text-muted-foreground line-clamp-2 leading-relaxed">
                      {r.description}
                    </p>
                  )}
                </div>

                {/* Guest & Timing Strip */}
                <div className="p-2.5 rounded-xl bg-muted/40 border border-border/60 flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center font-bold text-[10px] shrink-0">
                      {guestName.slice(0, 2).toUpperCase()}
                    </div>
                    <span className="font-semibold text-foreground truncate">
                      {guestName}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-muted-foreground font-mono text-[10.5px] shrink-0">
                    <Clock className="w-3 h-3" />
                    <span>{relativeTime || new Date(r.requested_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                  </div>
                </div>

                {/* Status Row */}
                <div className="flex items-center justify-between text-xs pt-0.5">
                  <span className="text-muted-foreground text-[11px] font-medium">Current Status:</span>
                  {getStatusBadge(r.status)}
                </div>

                {/* Assigned Staff Preview */}
                <div className="flex items-center justify-between text-xs pt-1 border-t border-border/50">
                  <span className="text-muted-foreground text-[11px]">Assigned Staff:</span>
                  {r.assigned_staff ? (
                    <span className="font-semibold text-foreground text-xs flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                      {r.assigned_staff.full_name}
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setAssignTarget(r)}
                      className="text-amber-600 hover:text-amber-700 text-xs font-bold hover:underline"
                    >
                      + Assign Staff
                    </button>
                  )}
                </div>

                {/* Bottom Action Footer */}
                <div className="flex items-center gap-1.5 pt-2 border-t border-border/60 mt-auto">
                  {r.status === "SUBMITTED" && (
                    <Button
                      size="sm"
                      className="flex-1 h-8 text-[11.5px] font-bold rounded-xl bg-amber-500 hover:bg-amber-600 text-white gap-1 shadow-2xs"
                      onClick={() =>
                        setActionTarget({ request: r, type: "ACKNOWLEDGE" })
                      }
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Accept</span>
                    </Button>
                  )}

                  {r.status === "ASSIGNED" && (
                    <Button
                      size="sm"
                      className="flex-1 h-8 text-[11.5px] font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white gap-1 shadow-2xs"
                      onClick={() =>
                        setActionTarget({ request: r, type: "START" })
                      }
                    >
                      <Play className="w-3.5 h-3.5" />
                      <span>Start Work</span>
                    </Button>
                  )}

                  {r.status === "IN_PROGRESS" && (
                    <Button
                      size="sm"
                      className="flex-1 h-8 text-[11.5px] font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white gap-1 shadow-2xs"
                      onClick={() =>
                        setActionTarget({ request: r, type: "COMPLETE" })
                      }
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Complete</span>
                    </Button>
                  )}

                  {r.status !== "COMPLETED" &&
                    r.status !== "CANCELLED" &&
                    r.status !== "REJECTED" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 px-2.5 text-[11px] font-semibold rounded-xl border-border/80 text-foreground hover:bg-muted"
                        onClick={() => setAssignTarget(r)}
                      >
                        <UserCheck className="w-3 h-3 mr-1" />
                        {r.assigned_staff ? "Reassign" : "Assign"}
                      </Button>
                    )}

                  <Link href={`/guest-requests/${r.id}`}>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 w-8 p-0 rounded-xl border-border/80 text-muted-foreground hover:text-foreground hover:bg-muted"
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
        /* ── 5. EXECUTIVE SUPERADMIN TABLE VIEW ── */
        <div className="bg-card border border-border/80 rounded-2xl overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-muted/50 border-b border-border/80 text-muted-foreground uppercase font-bold tracking-wider text-[10.5px]">
                <tr>
                  <th className="py-3 px-3.5">Room</th>
                  <th className="py-3 px-3.5">Guest</th>
                  <th className="py-3 px-3.5">Department</th>
                  <th className="py-3 px-3.5 min-w-[200px]">Ticket Details</th>
                  <th className="py-3 px-3.5">Priority</th>
                  <th className="py-3 px-3.5">Status</th>
                  <th className="py-3 px-3.5">Assigned Staff</th>
                  <th className="py-3 px-3.5">Time</th>
                  <th className="py-3 px-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filtered.map((r) => {
                  const cat = getCategoryInfo(r.category);
                  const CatIcon = cat.icon;
                  const guestName = r.guest
                    ? `${r.guest.first_name || ""} ${r.guest.last_name || ""}`.trim()
                    : "In-House Guest";
                  const relativeTime = getRelativeTime(r.requested_at);
                  const formattedExactTime = new Date(r.requested_at).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  });

                  return (
                    <tr
                      key={r.id}
                      className="hover:bg-muted/40 transition-colors group"
                    >
                      {/* Room */}
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-900 text-white font-bold text-[11.5px] shadow-2xs">
                          <BedDouble className="w-3.5 h-3.5 text-amber-400" />
                          Room {r.room?.room_number || "—"}
                        </span>
                      </td>

                      {/* Guest */}
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-6.5 h-6.5 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center font-bold text-[10px] shadow-2xs shrink-0">
                            {guestName.slice(0, 2).toUpperCase()}
                          </div>
                          <span className="font-semibold text-foreground text-xs">
                            {guestName}
                          </span>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <div
                            className={cn(
                              "p-1 rounded-lg border flex items-center justify-center",
                              cat.color
                            )}
                          >
                            <CatIcon className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <span className="font-bold text-foreground block text-xs">
                              {cat.label}
                            </span>
                            {r.request_type && (
                              <span className="text-[10px] text-muted-foreground block font-medium">
                                {r.request_type}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Ticket Details */}
                      <td className="py-3 px-3.5 max-w-xs">
                        <Link
                          href={`/guest-requests/${r.id}`}
                          className="font-bold text-foreground text-xs hover:text-primary hover:underline line-clamp-1 block transition-colors"
                        >
                          {r.title}
                        </Link>
                        {r.description && (
                          <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                            {r.description}
                          </p>
                        )}
                      </td>

                      {/* Priority */}
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        {getPriorityBadge(r.priority)}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        {getStatusBadge(r.status)}
                      </td>

                      {/* Assigned Staff */}
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        {r.assigned_staff ? (
                          <div className="flex items-center gap-1.5">
                            <div className="w-5 h-5 rounded-full bg-muted text-foreground flex items-center justify-center text-[9.5px] font-bold border border-border/80">
                              {r.assigned_staff.full_name.slice(0, 1)}
                            </div>
                            <span className="font-medium text-foreground text-xs">
                              {r.assigned_staff.full_name}
                            </span>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setAssignTarget(r)}
                            className="text-amber-600 hover:text-amber-700 text-xs font-semibold hover:underline flex items-center gap-1"
                          >
                            <User className="w-3 h-3" />
                            <span>Assign</span>
                          </button>
                        )}
                      </td>

                      {/* Time */}
                      <td className="py-3 px-3.5 whitespace-nowrap text-muted-foreground font-mono text-[11px]">
                        <div>{formattedExactTime}</div>
                        {relativeTime && (
                          <div className="text-[10px] text-muted-foreground/70">{relativeTime}</div>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-3.5 text-right whitespace-nowrap space-x-1.5">
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

                        {r.status !== "COMPLETED" &&
                          r.status !== "CANCELLED" &&
                          r.status !== "REJECTED" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 px-2 text-[11px] font-medium rounded-lg border-border/80 text-foreground hover:bg-muted"
                              onClick={() => setAssignTarget(r)}
                            >
                              {r.assigned_staff ? "Reassign" : "Assign"}
                            </Button>
                          )}

                        <Link href={`/guest-requests/${r.id}`}>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
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
