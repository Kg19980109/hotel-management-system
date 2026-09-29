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
  Zap,
  ShoppingBag,
  SlidersHorizontal,
  ArrowUpRight,
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
  const [selectedStatusTab, setSelectedStatusTab] = React.useState<
    "ALL" | "SUBMITTED" | "IN_PROGRESS" | "COMPLETED" | "MY_WORK"
  >("ALL");
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

  // Department counts for graphical quick filter chips
  const housekeepingCount = requests.filter((r) => r.category === "HOUSEKEEPING").length;
  const diningCount = requests.filter((r) => {
    const cat = String(r.category);
    return cat === "ROOM_SERVICE" || cat === "FOOD" || cat === "DINING";
  }).length;
  const maintenanceCount = requests.filter((r) => r.category === "MAINTENANCE").length;
  const spaCount = requests.filter((r) => r.category === "SPA").length;
  const frontDeskCount = requests.filter((r) => r.category === "FRONT_DESK").length;
  const laundryCount = requests.filter((r) => r.category === "LAUNDRY").length;

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
      if (selectedCategory !== "ALL") {
        const cat = String(r.category);
        if (selectedCategory === "ROOM_SERVICE") {
          if (cat !== "ROOM_SERVICE" && cat !== "FOOD" && cat !== "DINING") return false;
        } else if (r.category !== selectedCategory) {
          return false;
        }
      }

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
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10.5px] font-black uppercase tracking-wider bg-rose-500/15 text-rose-600 border border-rose-500/30 shadow-xs animate-pulse">
            <Flame className="w-3 h-3 text-rose-600 fill-rose-500" />
            URGENT
          </span>
        );
      case "HIGH":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold uppercase tracking-wider bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 shadow-2xs">
            <Zap className="w-3 h-3 text-amber-600 dark:text-amber-400" />
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
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-semibold bg-sky-500/10 text-sky-700 dark:text-sky-300 border border-sky-500/20">
            NORMAL
          </span>
        );
    }
  };

  const getStatusBadge = (s: ServiceRequestStatus) => {
    switch (s) {
      case "COMPLETED":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 shadow-2xs">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-xs" />
            Completed
          </span>
        );
      case "IN_PROGRESS":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30 shadow-2xs">
            <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-ping" />
            In Progress
          </span>
        );
      case "ASSIGNED":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-sky-500/15 text-sky-700 dark:text-sky-300 border border-sky-500/30 shadow-2xs">
            <span className="h-1.5 w-1.5 rounded-full bg-sky-500" />
            Assigned
          </span>
        );
      case "ACKNOWLEDGED":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 shadow-2xs">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
            Acknowledged
          </span>
        );
      case "CANCELLED":
      case "REJECTED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10.5px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
            {s}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md animate-pulse">
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
          color: "text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 border-emerald-500/30",
          iconBg: "bg-emerald-500/15 text-emerald-600",
        };
      case "MAINTENANCE":
        return {
          label: "Maintenance",
          icon: Wrench,
          color: "text-sky-700 dark:text-sky-300 bg-sky-500/10 border-sky-500/30",
          iconBg: "bg-sky-500/15 text-sky-600",
        };
      case "ROOM_SERVICE":
      case "FOOD":
      case "DINING":
        return {
          label: "In-Room Dining",
          icon: Utensils,
          color: "text-amber-700 dark:text-amber-300 bg-amber-500/10 border-amber-500/30",
          iconBg: "bg-amber-500/15 text-amber-600",
        };
      case "LAUNDRY":
        return {
          label: "Laundry",
          icon: Shirt,
          color: "text-indigo-700 dark:text-indigo-300 bg-indigo-500/10 border-indigo-500/30",
          iconBg: "bg-indigo-500/15 text-indigo-600",
        };
      case "SPA":
        return {
          label: "Spa & Wellness",
          icon: Flower2,
          color: "text-pink-700 dark:text-pink-300 bg-pink-500/10 border-pink-500/30",
          iconBg: "bg-pink-500/15 text-pink-600",
        };
      case "TRANSPORT":
        return {
          label: "Transport",
          icon: Car,
          color: "text-teal-700 dark:text-teal-300 bg-teal-500/10 border-teal-500/30",
          iconBg: "bg-teal-500/15 text-teal-600",
        };
      case "FRONT_DESK":
        return {
          label: "Front Desk",
          icon: BedDouble,
          color: "text-blue-700 dark:text-blue-300 bg-blue-500/10 border-blue-500/30",
          iconBg: "bg-blue-500/15 text-blue-600",
        };
      case "CONCIERGE":
        return {
          label: "Concierge",
          icon: Compass,
          color: "text-purple-700 dark:text-purple-300 bg-purple-500/10 border-purple-500/30",
          iconBg: "bg-purple-500/15 text-purple-600",
        };
      default:
        return {
          label: cat || "Service",
          icon: BellRing,
          color: "text-slate-700 dark:text-slate-300 bg-slate-500/10 border-slate-500/30",
          iconBg: "bg-slate-500/15 text-slate-600",
        };
    }
  };

  return (
    <div className="space-y-4">
      {/* ── 1. LUXURY GRAPHICAL KPI COMMAND CAPSULES ── */}
      {!hideTopKpiGrid && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2.5">
          {[
            {
              id: "ALL" as const,
              label: "All Requests",
              count: totalCount,
              sub: "Total Volume",
              icon: Inbox,
              accent: "from-blue-600 to-indigo-600",
              ring: "border-blue-500/40 bg-blue-500/5 shadow-blue-500/10",
              iconBg: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
            },
            {
              id: "SUBMITTED" as const,
              label: "Needs Triage",
              count: submittedCount,
              sub: submittedCount > 0 ? "Requires Staff" : "All Handled",
              icon: AlertTriangle,
              highlight: submittedCount > 0,
              accent: "from-amber-500 to-orange-500",
              ring: "border-amber-500/50 bg-amber-500/10 shadow-amber-500/15",
              iconBg: "bg-amber-500/20 text-amber-600 dark:text-amber-400",
            },
            {
              id: "IN_PROGRESS" as const,
              label: "In Dispatch",
              count: inProgressCount,
              sub: "Active Fulfillment",
              icon: Clock,
              accent: "from-indigo-600 to-purple-600",
              ring: "border-indigo-500/40 bg-indigo-500/5 shadow-indigo-500/10",
              iconBg: "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400",
            },
            {
              id: "COMPLETED" as const,
              label: "Completed",
              count: completedCount,
              sub: "Successfully Served",
              icon: CheckCircle2,
              accent: "from-emerald-500 to-teal-600",
              ring: "border-emerald-500/40 bg-emerald-500/5 shadow-emerald-500/10",
              iconBg: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
            },
            {
              id: "MY_WORK" as const,
              label: "My Assigned",
              count: myWorkCount,
              sub: "Direct Tasks",
              icon: UserCheck,
              accent: "from-sky-500 to-blue-600",
              ring: "border-sky-500/40 bg-sky-500/5 shadow-sky-500/10",
              iconBg: "bg-sky-500/15 text-sky-600 dark:text-sky-400",
            },
          ].map((item) => {
            const Icon = item.icon;
            const isSelected = selectedStatusTab === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() =>
                  setSelectedStatusTab(isSelected && item.id !== "ALL" ? "ALL" : item.id)
                }
                className={cn(
                  "relative flex items-center justify-between p-3 rounded-2xl border text-left transition-all duration-200 select-none cursor-pointer group",
                  isSelected
                    ? cn(item.ring, "ring-2 ring-primary/40 shadow-md bg-card")
                    : "bg-card/90 border-border/70 hover:border-border hover:shadow-sm"
                )}
              >
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                    {item.label}
                  </span>
                  <div className="flex items-baseline gap-1.5 mt-0.5">
                    <span className="text-2xl font-black text-foreground tabular-nums tracking-tight">
                      {item.count}
                    </span>
                    {item.highlight && (
                      <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                    )}
                  </div>
                  <span className="text-[10.5px] font-medium text-muted-foreground block mt-0.5">
                    {item.sub}
                  </span>
                </div>

                <div
                  className={cn(
                    "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border border-current/20 transition-transform duration-200 group-hover:scale-105",
                    item.iconBg
                  )}
                >
                  <Icon className="w-4.5 h-4.5" />
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* ── 2. GRAPHICAL DEPARTMENT NAVIGATION CHIPS ── */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
        <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mr-1 flex items-center gap-1 shrink-0">
          <Layers className="w-3.5 h-3.5 text-primary" />
          Department:
        </span>
        {[
          { id: "ALL", label: "All Departments", count: totalCount, icon: Inbox },
          { id: "HOUSEKEEPING", label: "Housekeeping", count: housekeepingCount, icon: Sparkles, color: "text-emerald-500" },
          { id: "ROOM_SERVICE", label: "In-Room Dining", count: diningCount, icon: Utensils, color: "text-amber-500" },
          { id: "MAINTENANCE", label: "Maintenance", count: maintenanceCount, icon: Wrench, color: "text-sky-500" },
          { id: "SPA", label: "Spa & Wellness", count: spaCount, icon: Flower2, color: "text-pink-500" },
          { id: "FRONT_DESK", label: "Front Desk", count: frontDeskCount, icon: BedDouble, color: "text-blue-500" },
          { id: "LAUNDRY", label: "Laundry", count: laundryCount, icon: Shirt, color: "text-indigo-500" },
        ]
          .filter((dept) => dept.id === "ALL" || dept.count > 0)
          .map((dept) => {
            const Icon = dept.icon;
            const isSelected = selectedCategory === dept.id;

            return (
              <button
                key={dept.id}
                type="button"
                onClick={() => setSelectedCategory(dept.id)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border shrink-0 cursor-pointer",
                  isSelected
                    ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                    : "bg-card text-foreground/80 border-border/70 hover:bg-muted/60 hover:text-foreground"
                )}
              >
                <Icon
                  className={cn(
                    "w-3.5 h-3.5",
                    isSelected ? "text-amber-400" : dept.color || "text-muted-foreground"
                  )}
                />
                <span>{dept.label}</span>
                <span
                  className={cn(
                    "px-1.5 py-0.2 rounded-md text-[10.5px] tabular-nums font-mono font-bold",
                    isSelected ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
                  )}
                >
                  {dept.count}
                </span>
              </button>
            );
          })}
      </div>

      {/* ── 3. REFINED SEARCH & FILTER TOOLBAR ── */}
      <div className="bg-card border border-border/80 rounded-2xl p-3 shadow-2xs space-y-2.5">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-2.5">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[260px]">
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
            {/* Priority Dropdown */}
            <select
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
              className="h-9 px-3 rounded-xl border border-border/80 bg-card text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary shadow-2xs cursor-pointer"
            >
              <option value="ALL">All Priorities</option>
              <option value="URGENT">🔥 Urgent Priority</option>
              <option value="HIGH">⚡ High Priority</option>
              <option value="NORMAL">Normal Priority</option>
              <option value="LOW">Low Priority</option>
            </select>

            {/* Assignee Dropdown */}
            <select
              value={selectedAssignee}
              onChange={(e) => setSelectedAssignee(e.target.value)}
              className="h-9 px-3 rounded-xl border border-border/80 bg-card text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary shadow-2xs cursor-pointer max-w-[170px] truncate"
            >
              <option value="ALL">All Staff Members</option>
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
                className="h-9 px-2.5 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl"
              >
                <X className="w-3.5 h-3.5 mr-1" />
                Reset Filters
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
                title="Executive Table View"
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
                title="Visual Card Grid View"
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

        {/* Status Indicator */}
        <div className="flex items-center justify-between text-[11.5px] text-muted-foreground px-0.5 pt-0.5">
          <span>
            Displaying <strong className="text-foreground font-bold">{filtered.length}</strong> of{" "}
            {requests.length} requests
            {selectedCategory !== "ALL" && (
              <span> in <strong className="text-foreground capitalize">{selectedCategory.toLowerCase().replace("_", " ")}</strong></span>
            )}
            {selectedStatusTab !== "ALL" && (
              <span> ({selectedStatusTab.toLowerCase().replace("_", " ")})</span>
            )}
          </span>
          {hasActiveFilters && (
            <span className="text-[11px] font-bold text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
              Active Filters Applied
            </span>
          )}
        </div>
      </div>

      {/* ── 4. EMPTY STATE ── */}
      {filtered.length === 0 ? (
        <div className="bg-card border border-dashed border-border/80 rounded-2xl p-12 text-center space-y-3 shadow-2xs">
          <div className="w-14 h-14 rounded-2xl bg-muted/60 border border-border/60 flex items-center justify-center mx-auto text-muted-foreground">
            <Inbox className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-base font-bold text-foreground">
              No matching guest requests found
            </h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto leading-relaxed">
              Try selecting a different status tab, clearing department filters, or resetting your search term.
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
        /* ── 5. GRAPHICAL LUXURY CARD VIEW ── */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
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
              <div
                key={r.id}
                className="group relative flex flex-col rounded-2xl bg-card border border-border/80 p-4 shadow-2xs hover:shadow-lg hover:border-border transition-all duration-200 hover:-translate-y-0.5 space-y-3.5"
              >
                {/* Header: Room Capsule + Priority + Department */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-gradient-to-r from-slate-900 to-slate-800 text-amber-300 font-extrabold text-xs shadow-sm border border-slate-700">
                      <BedDouble className="w-3.5 h-3.5 text-amber-400" />
                      Room {r.room?.room_number || "—"}
                    </span>
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[10.5px] font-bold border",
                        cat.color
                      )}
                    >
                      <CatIcon className="w-3 h-3" />
                      <span>{cat.label}</span>
                    </span>
                  </div>

                  {getPriorityBadge(r.priority)}
                </div>

                {/* Request Content */}
                <div className="space-y-1">
                  <Link
                    href={`/guest-requests/${r.id}`}
                    className="text-[14px] font-black text-foreground hover:text-primary leading-snug line-clamp-2 block transition-colors"
                  >
                    {r.title}
                  </Link>
                  {r.description && (
                    <p className="text-[11.5px] text-muted-foreground line-clamp-2 leading-relaxed bg-muted/30 p-2 rounded-xl border border-border/40">
                      {r.description}
                    </p>
                  )}
                </div>

                {/* Guest Profile & Timing Strip */}
                <div className="p-2.5 rounded-xl bg-muted/40 border border-border/60 flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-6.5 h-6.5 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center font-black text-[10px] shadow-2xs shrink-0">
                      {guestName.slice(0, 2).toUpperCase()}
                    </div>
                    <span className="font-bold text-foreground truncate text-xs">
                      {guestName}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-muted-foreground font-mono text-[10.5px] shrink-0">
                    <Clock className="w-3 h-3 text-muted-foreground/70" />
                    <span>{relativeTime || formattedExactTime}</span>
                  </div>
                </div>

                {/* Status & Staff Row */}
                <div className="flex items-center justify-between text-xs pt-0.5">
                  <div className="flex items-center gap-1">
                    <span className="text-muted-foreground text-[11px]">Status:</span>
                    {getStatusBadge(r.status)}
                  </div>
                  <div>
                    {r.assigned_staff ? (
                      <span className="font-semibold text-foreground text-[11.5px] flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                        {r.assigned_staff.full_name}
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setAssignTarget(r)}
                        className="text-amber-600 dark:text-amber-400 text-[11.5px] font-bold hover:underline"
                      >
                        + Assign Staff
                      </button>
                    )}
                  </div>
                </div>

                {/* Bottom Action Footer */}
                <div className="flex items-center gap-1.5 pt-2.5 border-t border-border/60 mt-auto">
                  {r.status === "SUBMITTED" && (
                    <Button
                      size="sm"
                      className="flex-1 h-8 text-[11.5px] font-bold rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white gap-1 shadow-sm"
                      onClick={() =>
                        setActionTarget({ request: r, type: "ACKNOWLEDGE" })
                      }
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Accept Ticket</span>
                    </Button>
                  )}

                  {r.status === "ASSIGNED" && (
                    <Button
                      size="sm"
                      className="flex-1 h-8 text-[11.5px] font-bold rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white gap-1 shadow-sm"
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
                      className="flex-1 h-8 text-[11.5px] font-bold rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white gap-1 shadow-sm"
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
                        className="h-8 px-2.5 text-[11px] font-bold rounded-xl border-border/80 text-foreground hover:bg-muted"
                        onClick={() => setAssignTarget(r)}
                      >
                        <UserCheck className="w-3.5 h-3.5 mr-1 text-primary" />
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
        /* ── 6. EXECUTIVE GRAPHICAL TABLE VIEW ── */
        <div className="bg-card border border-border/80 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-muted/60 border-b border-border/80 text-muted-foreground uppercase font-black tracking-wider text-[10.5px]">
                <tr>
                  <th className="py-3.5 px-4">Room & Unit</th>
                  <th className="py-3.5 px-4">Guest Profile</th>
                  <th className="py-3.5 px-4">Department</th>
                  <th className="py-3.5 px-4 min-w-[220px]">Ticket Details & Service</th>
                  <th className="py-3.5 px-4">Priority</th>
                  <th className="py-3.5 px-4">Live Status</th>
                  <th className="py-3.5 px-4">Assigned Staff</th>
                  <th className="py-3.5 px-4">Elapsed</th>
                  <th className="py-3.5 px-4 text-right">Quick Actions</th>
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
                      {/* Room & Unit */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-gradient-to-r from-slate-900 to-slate-800 text-amber-300 font-extrabold text-[11.5px] shadow-2xs border border-slate-700/80">
                          <BedDouble className="w-3.5 h-3.5 text-amber-400" />
                          Room {r.room?.room_number || "—"}
                        </span>
                      </td>

                      {/* Guest Profile */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center font-bold text-[10.5px] shadow-2xs shrink-0">
                            {guestName.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <span className="font-bold text-foreground text-xs block">
                              {guestName}
                            </span>
                            <span className="text-[10px] text-muted-foreground block">
                              In-House Stay
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Department */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div
                            className={cn(
                              "p-1.5 rounded-xl border flex items-center justify-center shadow-2xs",
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

                      {/* Ticket Details & Service */}
                      <td className="py-3.5 px-4 max-w-xs">
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
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {getPriorityBadge(r.priority)}
                      </td>

                      {/* Live Status */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {getStatusBadge(r.status)}
                      </td>

                      {/* Assigned Staff */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {r.assigned_staff ? (
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-black border border-primary/20">
                              {r.assigned_staff.full_name.slice(0, 1)}
                            </div>
                            <span className="font-semibold text-foreground text-xs">
                              {r.assigned_staff.full_name}
                            </span>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setAssignTarget(r)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 transition-colors cursor-pointer"
                          >
                            <User className="w-3 h-3" />
                            <span>+ Assign</span>
                          </button>
                        )}
                      </td>

                      {/* Elapsed */}
                      <td className="py-3.5 px-4 whitespace-nowrap font-mono text-[11px] text-muted-foreground">
                        <div className="font-semibold text-foreground/90">{formattedExactTime}</div>
                        {relativeTime && (
                          <div className="text-[10px] text-muted-foreground">{relativeTime}</div>
                        )}
                      </td>

                      {/* Quick Actions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap space-x-1.5">
                        {r.status === "SUBMITTED" && (
                          <Button
                            size="sm"
                            className="h-7.5 px-3 text-[11px] bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold rounded-lg shadow-xs"
                            onClick={() =>
                              setActionTarget({
                                request: r,
                                type: "ACKNOWLEDGE",
                              })
                            }
                          >
                            <Check className="w-3 h-3 mr-1" />
                            Accept
                          </Button>
                        )}

                        {r.status === "ASSIGNED" && (
                          <Button
                            size="sm"
                            className="h-7.5 px-3 text-[11px] bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-lg shadow-xs"
                            onClick={() =>
                              setActionTarget({ request: r, type: "START" })
                            }
                          >
                            <Play className="w-3 h-3 mr-1" />
                            Start
                          </Button>
                        )}

                        {r.status === "IN_PROGRESS" && (
                          <Button
                            size="sm"
                            className="h-7.5 px-3 text-[11px] bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold rounded-lg shadow-xs"
                            onClick={() =>
                              setActionTarget({
                                request: r,
                                type: "COMPLETE",
                              })
                            }
                          >
                            <Check className="w-3 h-3 mr-1" />
                            Done
                          </Button>
                        )}

                        {r.status !== "COMPLETED" &&
                          r.status !== "CANCELLED" &&
                          r.status !== "REJECTED" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7.5 px-2.5 text-[11px] font-semibold rounded-lg border-border/80 text-foreground hover:bg-muted"
                              onClick={() => setAssignTarget(r)}
                            >
                              <UserCheck className="w-3 h-3 mr-1 text-primary" />
                              {r.assigned_staff ? "Reassign" : "Assign"}
                            </Button>
                          )}

                        <Link href={`/guest-requests/${r.id}`}>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7.5 w-7.5 p-0 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg"
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
