"use client";

import * as React from "react";
import { useAuth } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { EmptyState, LoadingState, ErrorState } from "@/components/ui/states";
import { Avatar } from "@/components/ui/avatar";
import {
  HousekeepingTask,
  HousekeepingPriority,
} from "@/lib/housekeeping/types";
import {
  MaintenanceWorkOrder,
  MaintenancePriority,
} from "@/lib/maintenance/types";
import { StaffGuestServiceRequest } from "@/lib/guest-services/types";
import {
  startHousekeepingTaskAction,
  completeHousekeepingTaskAction,
} from "@/lib/housekeeping/actions";
import {
  startWorkOrderAction,
  resolveWorkOrderAction,
} from "@/lib/maintenance/actions";
import {
  staffStartGuestRequestAction,
  staffCompleteGuestRequestAction,
} from "@/lib/guest-services/actions";
import {
  Sparkles,
  Wrench,
  Bell,
  Play,
  CheckCheck,
  RotateCcw,
  Clock,
  Layers,
  CheckCircle2,
  AlertCircle,
  Briefcase,
  User,
  ShieldCheck,
  Building,
  Loader2,
  Calendar,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ResolveWorkOrderModal } from "@/components/maintenance/resolve-work-order-modal";

interface StaffProfileInfo {
  employeeCode?: string;
  departmentName?: string;
  designation?: string;
}

export function MyWorkWorkspace() {
  const { user, profile, currentProperty, currentRole, loading: authLoading } = useAuth();
  const propertyId = currentProperty?.property_id;

  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [activeDomainTab, setActiveDomainTab] = React.useState<"ALL" | "HOUSEKEEPING" | "MAINTENANCE" | "GUEST_REQUESTS">("ALL");

  // Operational items assigned to current user
  const [housekeepingTasks, setHousekeepingTasks] = React.useState<HousekeepingTask[]>([]);
  const [maintenanceOrders, setMaintenanceOrders] = React.useState<MaintenanceWorkOrder[]>([]);
  const [guestRequests, setGuestRequests] = React.useState<StaffGuestServiceRequest[]>([]);
  const [staffInfo, setStaffInfo] = React.useState<StaffProfileInfo | null>(null);

  // Action states
  const [actionLoadingId, setActionLoadingId] = React.useState<string | null>(null);
  const [resolveModalWo, setResolveModalWo] = React.useState<MaintenanceWorkOrder | null>(null);

  const loadMyWork = React.useCallback(async (options?: { silent?: boolean }) => {
    if (!propertyId || !user) {
      setLoading(false);
      return;
    }

    try {
      if (!options?.silent) {
        setLoading(true);
      }
      setError(null);
      const supabase = createClient();
      const currentUserId = user.id;
      const userProfileId = profile?.id || currentUserId;

      // 1. Fetch Housekeeping Tasks assigned to current user (by auth id or profile id)
      const hkPromise = supabase
        .from("housekeeping_tasks")
        .select(`
          id,
          property_id,
          room_id,
          task_type,
          status,
          priority,
          assigned_to,
          scheduled_for,
          started_at,
          completed_at,
          notes,
          created_at,
          room:rooms!inner (
            id,
            room_number,
            status,
            housekeeping_status,
            floor:floors (
              id,
              floor_number,
              name
            ),
            room_type:room_types (
              id,
              name
            )
          ),
          assigned_profile:profiles!housekeeping_tasks_assigned_to_fkey (
            id,
            full_name,
            email,
            avatar_url
          )
        `)
        .eq("property_id", propertyId)
        .or(`assigned_to.eq.${currentUserId},assigned_to.eq.${userProfileId}`)
        .order("created_at", { ascending: false });

      // 2. Fetch Maintenance Work Orders assigned to current user
      const maintPromise = supabase
        .from("maintenance_work_orders")
        .select(`
          *,
          room:rooms (
            id,
            room_number,
            status,
            room_type:room_types(name),
            floor:floors(floor_number, name)
          ),
          asset:maintenance_assets (
            id,
            name,
            asset_type
          ),
          technician:profiles!assigned_to (
            id,
            full_name,
            email
          )
        `)
        .eq("property_id", propertyId)
        .or(`assigned_to.eq.${currentUserId},assigned_to.eq.${userProfileId}`)
        .order("created_at", { ascending: false });

      // 3. Fetch Guest Requests assigned to current user
      const guestReqPromise = supabase
        .from("guest_service_requests")
        .select(`
          id,
          property_id,
          guest_id,
          room_id,
          category,
          request_type,
          title,
          description,
          priority,
          status,
          requested_at,
          acknowledged_at,
          assigned_to,
          started_at,
          completed_at,
          guest_visible_notes,
          staff_notes,
          created_at,
          room:rooms(id, room_number),
          guest:guests(id, first_name, last_name, email, phone)
        `)
        .eq("property_id", propertyId)
        .or(`assigned_to.eq.${currentUserId},assigned_to.eq.${userProfileId}`)
        .order("created_at", { ascending: false });

      // 4. Fetch staff profile metadata (department, designation, employee code)
      const staffMemberPromise = supabase
        .from("staff_members")
        .select(`
          employee_code,
          designation,
          department:staff_departments(name)
        `)
        .eq("property_id", propertyId)
        .or(`profile_id.eq.${userProfileId},email.eq.${user.email}`)
        .maybeSingle();

      const [hkRes, maintRes, guestRes, staffMemberRes] = await Promise.all([
        hkPromise,
        maintPromise,
        guestReqPromise,
        staffMemberPromise,
      ]);

      if (hkRes.data) {
        setHousekeepingTasks(hkRes.data as unknown as HousekeepingTask[]);
      }
      if (maintRes.data) {
        setMaintenanceOrders(maintRes.data as unknown as MaintenanceWorkOrder[]);
      }
      if (guestRes.data) {
        setGuestRequests(guestRes.data as unknown as StaffGuestServiceRequest[]);
      }
      if (staffMemberRes.data) {
        const d = staffMemberRes.data as {
          employee_code?: string;
          designation?: string;
          department?: { name?: string } | null;
        };
        setStaffInfo({
          employeeCode: d.employee_code,
          designation: d.designation,
          departmentName: d.department?.name,
        });
      }
    } catch (err: unknown) {
      console.error("Error loading my work:", err);
      setError(err instanceof Error ? err.message : "Failed to load assigned work items");
    } finally {
      setLoading(false);
    }
  }, [propertyId, user, profile]);

  React.useEffect(() => {
    let isMounted = true;
    if (!authLoading) {
      if (propertyId && user) {
        void Promise.resolve().then(() => {
          if (!isMounted) return;
          loadMyWork();
        });
      } else {
        setLoading(false);
      }
    }
    return () => {
      isMounted = false;
    };
  }, [authLoading, propertyId, user, loadMyWork]);

  // Real-time synchronization on operational tables
  React.useEffect(() => {
    if (!propertyId) return;

    const supabase = createClient();
    const channelId = `stayhub:mywork:${propertyId}:${Math.random().toString(36).slice(2, 7)}`;
    const channel = supabase
      .channel(channelId)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "housekeeping_tasks" },
        () => void loadMyWork({ silent: true })
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "maintenance_work_orders" },
        () => void loadMyWork({ silent: true })
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "guest_service_requests" },
        () => void loadMyWork({ silent: true })
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [propertyId, loadMyWork]);

  // Status Filter Tab state
  const [activeStatusFilter, setActiveStatusFilter] = React.useState<"ALL" | "ACTIVE" | "IN_PROGRESS" | "COMPLETED">("ALL");

  // Operational metrics calculation
  const metrics = React.useMemo(() => {
    const todayStr = new Date().toISOString().split("T")[0];

    const activeHk = housekeepingTasks.filter((t) => ["PENDING", "ASSIGNED"].includes(t.status)).length;
    const inProgressHk = housekeepingTasks.filter((t) => t.status === "IN_PROGRESS").length;
    const completedHkToday = housekeepingTasks.filter(
      (t) => (t.status === "COMPLETED" || t.status === "INSPECTION_PENDING") && t.completed_at?.startsWith(todayStr)
    ).length;
    const completedHkAllTime = housekeepingTasks.filter(
      (t) => t.status === "COMPLETED" || t.status === "INSPECTION_PENDING"
    ).length;

    const activeMaint = maintenanceOrders.filter((w) => ["OPEN", "ASSIGNED"].includes(w.status)).length;
    const inProgressMaint = maintenanceOrders.filter((w) => w.status === "IN_PROGRESS" || w.status === "ON_HOLD").length;
    const resolvedMaintToday = maintenanceOrders.filter(
      (w) => (w.status === "RESOLVED" || w.status === "CLOSED") && w.resolved_at?.startsWith(todayStr)
    ).length;
    const resolvedMaintAllTime = maintenanceOrders.filter(
      (w) => w.status === "RESOLVED" || w.status === "CLOSED"
    ).length;

    const activeGuest = guestRequests.filter((g) => ["SUBMITTED", "ACKNOWLEDGED", "ASSIGNED"].includes(g.status)).length;
    const inProgressGuest = guestRequests.filter((g) => g.status === "IN_PROGRESS").length;
    const completedGuestToday = guestRequests.filter(
      (g) => g.status === "COMPLETED" && g.completed_at?.startsWith(todayStr)
    ).length;
    const completedGuestAllTime = guestRequests.filter(
      (g) => g.status === "COMPLETED"
    ).length;

    return {
      totalAssigned: activeHk + activeMaint + activeGuest,
      totalInProgress: inProgressHk + inProgressMaint + inProgressGuest,
      totalCompletedToday: completedHkToday + resolvedMaintToday + completedGuestToday,
      totalResolvedAllTime: completedHkAllTime + resolvedMaintAllTime + completedGuestAllTime,
      totalHousekeeping: housekeepingTasks.length,
      totalMaintenance: maintenanceOrders.length,
      totalGuestRequests: guestRequests.length,
    };
  }, [housekeepingTasks, maintenanceOrders, guestRequests]);

  // Action handlers with instant Optimistic UI updates
  const handleStartHousekeeping = async (task: HousekeepingTask) => {
    if (!propertyId) return;
    const previous = [...housekeepingTasks];
    setHousekeepingTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, status: "IN_PROGRESS", started_at: new Date().toISOString() } : t))
    );
    setActionLoadingId(`hk-${task.id}`);
    try {
      const res = await startHousekeepingTaskAction({ propertyId, taskId: task.id });
      if (!res.success) {
        setHousekeepingTasks(previous);
        alert(res.error || "Failed to start task");
      } else {
        await loadMyWork({ silent: true });
      }
    } catch {
      setHousekeepingTasks(previous);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleCompleteHousekeeping = async (task: HousekeepingTask) => {
    if (!propertyId) return;
    const previous = [...housekeepingTasks];
    setHousekeepingTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, status: "INSPECTION_PENDING", completed_at: new Date().toISOString() } : t))
    );
    setActionLoadingId(`hk-${task.id}`);
    try {
      const res = await completeHousekeepingTaskAction({ propertyId, taskId: task.id });
      if (!res.success) {
        setHousekeepingTasks(previous);
        alert(res.error || "Failed to complete task");
      } else {
        await loadMyWork({ silent: true });
      }
    } catch {
      setHousekeepingTasks(previous);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleStartMaintenance = async (order: MaintenanceWorkOrder) => {
    const previous = [...maintenanceOrders];
    setMaintenanceOrders((prev) =>
      prev.map((m) => (m.id === order.id ? { ...m, status: "IN_PROGRESS", started_at: new Date().toISOString() } : m))
    );
    setActionLoadingId(`maint-${order.id}`);
    try {
      const res = await startWorkOrderAction(order.id);
      if (!res.success) {
        setMaintenanceOrders(previous);
        alert(res.error || "Failed to start work order");
      } else {
        await loadMyWork({ silent: true });
      }
    } catch {
      setMaintenanceOrders(previous);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleStartGuestRequest = async (req: StaffGuestServiceRequest) => {
    if (!propertyId) return;
    const previous = [...guestRequests];
    // Optimistic instant status switch
    setGuestRequests((prev) =>
      prev.map((g) => (g.id === req.id ? { ...g, status: "IN_PROGRESS", started_at: new Date().toISOString() } : g))
    );
    setActionLoadingId(`guest-${req.id}`);
    try {
      const res = await staffStartGuestRequestAction(propertyId, req.id);
      if (!res.success) {
        setGuestRequests(previous);
        alert(res.error || "Failed to start request");
      } else {
        await loadMyWork({ silent: true });
      }
    } catch {
      setGuestRequests(previous);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleCompleteGuestRequest = async (req: StaffGuestServiceRequest) => {
    if (!propertyId) return;
    const previous = [...guestRequests];
    // Optimistic instant status switch
    setGuestRequests((prev) =>
      prev.map((g) => (g.id === req.id ? { ...g, status: "COMPLETED", completed_at: new Date().toISOString() } : g))
    );
    setActionLoadingId(`guest-${req.id}`);
    try {
      const res = await staffCompleteGuestRequestAction(propertyId, req.id, "Completed by staff", "Completed in operational workspace");
      if (!res.success) {
        setGuestRequests(previous);
        alert(res.error || "Failed to complete request");
      } else {
        await loadMyWork({ silent: true });
      }
    } catch {
      setGuestRequests(previous);
    } finally {
      setActionLoadingId(null);
    }
  };

  if (authLoading || (loading && !housekeepingTasks.length && !maintenanceOrders.length && !guestRequests.length)) {
    return <LoadingState message="Loading your operational workspace..." />;
  }

  if (error) {
    return <ErrorState title="Error Loading My Work" description={error} onRetry={() => loadMyWork()} />;
  }

  return (
    <div className="space-y-6">
      {/* ── WORKSPACE HERO BANNER ── */}
      <div
        className="relative overflow-hidden rounded-[var(--radius-2xl)] p-6 sm:p-7 border border-white/10"
        style={{
          background: "linear-gradient(135deg, #091224 0%, #0F1D3D 50%, #152654 100%)",
          boxShadow: "0 16px 40px rgba(10,20,45,0.25)",
        }}
      >
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <Avatar
              src={profile?.avatar_url || undefined}
              name={profile?.full_name || user?.email || "Staff"}
              size="lg"
              className="border-2 border-white/20 shadow-md ring-2 ring-indigo-500/30"
            />
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="text-xl sm:text-2xl font-black text-white tracking-tight font-heading">
                  {profile?.full_name || user?.email?.split("@")[0]}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
                  {currentRole || "Staff Member"}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300/80">
                {staffInfo?.employeeCode && (
                  <span className="flex items-center gap-1 font-mono text-amber-300 font-semibold">
                    <User className="h-3.5 w-3.5" /> ID: {staffInfo.employeeCode}
                  </span>
                )}
                {staffInfo?.departmentName && (
                  <span className="flex items-center gap-1">
                    <Building className="h-3.5 w-3.5" /> {staffInfo.departmentName}
                  </span>
                )}
                {staffInfo?.designation && (
                  <span className="flex items-center gap-1">
                    <Briefcase className="h-3.5 w-3.5" /> {staffInfo.designation}
                  </span>
                )}
                <span className="flex items-center gap-1 text-slate-400">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" /> {currentProperty?.property_name}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadMyWork()}
              className="bg-white/10 hover:bg-white/20 text-white border-white/20 h-9 px-3 gap-1.5"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Refresh</span>
            </Button>
          </div>
        </div>
      </div>

      {/* ── WORKLOAD SUMMARY KPIS ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="stayhub-card p-4 flex items-center gap-3.5 border-l-4 border-l-indigo-500">
          <div className="h-10 w-10 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center shrink-0">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10.5px] font-bold text-[var(--foreground-muted)] uppercase tracking-wider">
              Pending / Assigned
            </p>
            <p className="text-2xl font-black text-[var(--foreground)] font-mono">
              {metrics.totalAssigned}
            </p>
          </div>
        </div>

        <div className="stayhub-card p-4 flex items-center gap-3.5 border-l-4 border-l-amber-500">
          <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
            <Play className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10.5px] font-bold text-[var(--foreground-muted)] uppercase tracking-wider">
              In Progress
            </p>
            <p className="text-2xl font-black text-[var(--foreground)] font-mono">
              {metrics.totalInProgress}
            </p>
          </div>
        </div>

        <div className="stayhub-card p-4 flex items-center gap-3.5 border-l-4 border-l-emerald-500">
          <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10.5px] font-bold text-[var(--foreground-muted)] uppercase tracking-wider">
              Completed Today
            </p>
            <p className="text-2xl font-black text-[var(--foreground)] font-mono">
              {metrics.totalCompletedToday}
            </p>
          </div>
        </div>

        <div className="stayhub-card p-4 flex items-center gap-3.5 border-l-4 border-l-cyan-500">
          <div className="h-10 w-10 rounded-xl bg-cyan-500/10 text-cyan-600 flex items-center justify-center shrink-0">
            <CheckCheck className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10.5px] font-bold text-[var(--foreground-muted)] uppercase tracking-wider">
              Total Resolved
            </p>
            <p className="text-2xl font-black text-cyan-600 dark:text-cyan-400 font-mono">
              {metrics.totalResolvedAllTime}
            </p>
          </div>
        </div>
      </div>

      {/* ── DOMAIN & STATUS FILTER TABS ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 p-1.5 rounded-xl bg-card border border-border/80 shadow-xs">
          <button
            type="button"
            onClick={() => setActiveDomainTab("ALL")}
            className={cn(
              "px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer",
              activeDomainTab === "ALL"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
          >
            <span>All Tasks</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-white/20">
              {housekeepingTasks.length + maintenanceOrders.length + guestRequests.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveDomainTab("HOUSEKEEPING")}
            className={cn(
              "px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer",
              activeDomainTab === "HOUSEKEEPING"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
          >
            <Sparkles className="h-3.5 w-3.5 text-emerald-500" />
            <span>Housekeeping</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-muted text-foreground">
              {housekeepingTasks.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveDomainTab("MAINTENANCE")}
            className={cn(
              "px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer",
              activeDomainTab === "MAINTENANCE"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
          >
            <Wrench className="h-3.5 w-3.5 text-indigo-500" />
            <span>Maintenance</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-muted text-foreground">
              {maintenanceOrders.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveDomainTab("GUEST_REQUESTS")}
            className={cn(
              "px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer",
              activeDomainTab === "GUEST_REQUESTS"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
          >
            <Bell className="h-3.5 w-3.5 text-amber-500" />
            <span>Guest Requests</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-muted text-foreground">
              {guestRequests.length}
            </span>
          </button>
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-card border border-border/80 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveStatusFilter("ALL")}
            className={cn(
              "px-2.5 py-1 rounded-lg transition-all cursor-pointer",
              activeStatusFilter === "ALL" ? "bg-muted text-foreground font-bold" : "text-muted-foreground hover:text-foreground"
            )}
          >
            All Statuses
          </button>
          <button
            type="button"
            onClick={() => setActiveStatusFilter("ACTIVE")}
            className={cn(
              "px-2.5 py-1 rounded-lg transition-all cursor-pointer",
              activeStatusFilter === "ACTIVE" ? "bg-indigo-500/20 text-indigo-400 font-bold" : "text-muted-foreground hover:text-foreground"
            )}
          >
            Assigned ({metrics.totalAssigned})
          </button>
          <button
            type="button"
            onClick={() => setActiveStatusFilter("IN_PROGRESS")}
            className={cn(
              "px-2.5 py-1 rounded-lg transition-all cursor-pointer",
              activeStatusFilter === "IN_PROGRESS" ? "bg-amber-500/20 text-amber-400 font-bold" : "text-muted-foreground hover:text-foreground"
            )}
          >
            In Progress ({metrics.totalInProgress})
          </button>
          <button
            type="button"
            onClick={() => setActiveStatusFilter("COMPLETED")}
            className={cn(
              "px-2.5 py-1 rounded-lg transition-all cursor-pointer",
              activeStatusFilter === "COMPLETED" ? "bg-emerald-500/20 text-emerald-400 font-bold" : "text-muted-foreground hover:text-foreground"
            )}
          >
            Resolved ({metrics.totalResolvedAllTime})
          </button>
        </div>
      </div>

      {/* ── WORK ITEMS LIST ── */}
      {(() => {
        const filteredHk = housekeepingTasks.filter((t) => {
          if (activeStatusFilter === "ACTIVE") return ["PENDING", "ASSIGNED"].includes(t.status);
          if (activeStatusFilter === "IN_PROGRESS") return t.status === "IN_PROGRESS";
          if (activeStatusFilter === "COMPLETED") return ["COMPLETED", "INSPECTION_PENDING"].includes(t.status);
          return true;
        });

        const filteredMaint = maintenanceOrders.filter((w) => {
          if (activeStatusFilter === "ACTIVE") return ["OPEN", "ASSIGNED"].includes(w.status);
          if (activeStatusFilter === "IN_PROGRESS") return ["IN_PROGRESS", "ON_HOLD"].includes(w.status);
          if (activeStatusFilter === "COMPLETED") return ["RESOLVED", "CLOSED"].includes(w.status);
          return true;
        });

        const filteredGuest = guestRequests.filter((g) => {
          if (activeStatusFilter === "ACTIVE") return ["SUBMITTED", "ACKNOWLEDGED", "ASSIGNED"].includes(g.status);
          if (activeStatusFilter === "IN_PROGRESS") return g.status === "IN_PROGRESS";
          if (activeStatusFilter === "COMPLETED") return g.status === "COMPLETED";
          return true;
        });

        const hasAnyItems =
          (activeDomainTab === "ALL" && (filteredHk.length > 0 || filteredMaint.length > 0 || filteredGuest.length > 0)) ||
          (activeDomainTab === "HOUSEKEEPING" && filteredHk.length > 0) ||
          (activeDomainTab === "MAINTENANCE" && filteredMaint.length > 0) ||
          (activeDomainTab === "GUEST_REQUESTS" && filteredGuest.length > 0);

        return (
          <div className="space-y-4">
            {/* Housekeeping Section */}
            {(activeDomainTab === "ALL" || activeDomainTab === "HOUSEKEEPING") && filteredHk.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-emerald-500" />
                    <span>Housekeeping Tasks ({filteredHk.length})</span>
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {filteredHk.map((t) => {
                    const isLoading = actionLoadingId === `hk-${t.id}`;
                    const isUrgent = t.priority === "URGENT" || t.priority === "HIGH";

                    return (
                      <div
                        key={t.id}
                        className={cn(
                          "stayhub-card overflow-hidden flex flex-col justify-between transition-all",
                          isUrgent && "border-rose-400/50 ring-2 ring-rose-400/10"
                        )}
                      >
                        <div className="p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-base font-black font-mono text-[var(--foreground)]">
                                Room {t.room?.room_number}
                              </span>
                              <span
                                className={cn(
                                  "px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase",
                                  t.priority === "URGENT"
                                    ? "bg-rose-500/20 text-rose-600"
                                    : t.priority === "HIGH"
                                    ? "bg-amber-500/20 text-amber-700"
                                    : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                                )}
                              >
                                {t.priority}
                              </span>
                            </div>

                            <span
                              className={cn(
                                "px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider",
                                t.status === "IN_PROGRESS"
                                  ? "bg-amber-500 text-slate-950"
                                  : t.status === "INSPECTION_PENDING"
                                  ? "bg-purple-500/20 text-purple-700"
                                  : t.status === "COMPLETED"
                                  ? "bg-emerald-500/20 text-emerald-700"
                                  : "bg-blue-500/20 text-blue-700"
                              )}
                            >
                              {t.status.replace("_", " ")}
                            </span>
                          </div>

                          <p className="text-xs text-[var(--foreground-muted)] flex items-center gap-1.5">
                            <Layers className="h-3.5 w-3.5" />
                            <span>Floor {t.room?.floor?.floor_number || 1} • {t.task_type}</span>
                          </p>

                          {t.notes && (
                            <p className="text-xs bg-muted/60 p-2 rounded-lg italic text-[var(--foreground)]">
                              &quot;{t.notes}&quot;
                            </p>
                          )}
                        </div>

                        <div className="p-3 bg-muted/30 border-t border-border flex items-center gap-2">
                          {["PENDING", "ASSIGNED"].includes(t.status) ? (
                            <Button
                              size="sm"
                              variant="primary"
                              className="w-full font-bold h-9 text-xs"
                              disabled={isLoading}
                              onClick={() => handleStartHousekeeping(t)}
                            >
                              {isLoading ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Play className="h-4 w-4 mr-1.5" />}
                              Start Cleaning
                            </Button>
                          ) : t.status === "IN_PROGRESS" ? (
                            <Button
                              size="sm"
                              variant="primary"
                              className="w-full font-bold h-9 text-xs bg-amber-500 hover:bg-amber-600 text-slate-950"
                              disabled={isLoading}
                              onClick={() => handleCompleteHousekeeping(t)}
                            >
                              {isLoading ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <CheckCheck className="h-4 w-4 mr-1.5" />}
                              Submit for Inspection
                            </Button>
                          ) : (
                            <div className="w-full text-center text-xs font-semibold text-muted-foreground py-1">
                              Task {t.status.replace("_", " ")}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Maintenance Section */}
            {(activeDomainTab === "ALL" || activeDomainTab === "MAINTENANCE") && filteredMaint.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center gap-2">
                    <Wrench className="h-4 w-4 text-indigo-500" />
                    <span>Maintenance Work Orders ({filteredMaint.length})</span>
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {filteredMaint.map((w) => {
                    const isLoading = actionLoadingId === `maint-${w.id}`;
                    const isUrgent = w.priority === "URGENT" || w.priority === "HIGH";

                    return (
                      <div
                        key={w.id}
                        className={cn(
                          "stayhub-card overflow-hidden flex flex-col justify-between transition-all",
                          isUrgent && "border-rose-400/50 ring-2 ring-rose-400/10"
                        )}
                      >
                        <div className="p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-extrabold text-[var(--foreground)] truncate">
                              {w.title}
                            </span>
                            <span
                              className={cn(
                                "px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shrink-0",
                                w.status === "IN_PROGRESS"
                                  ? "bg-purple-500/20 text-purple-700"
                                  : w.status === "RESOLVED"
                                  ? "bg-emerald-500/20 text-emerald-700"
                                  : "bg-blue-500/20 text-blue-700"
                              )}
                            >
                              {w.status.replace("_", " ")}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 text-xs text-[var(--foreground-muted)]">
                            {w.room ? (
                              <span className="font-semibold text-[var(--foreground)] font-mono">
                                Room {w.room.room_number}
                              </span>
                            ) : (
                              <span className="font-semibold text-indigo-600">Facility / Common Area</span>
                            )}
                            <span>•</span>
                            <span className="uppercase text-[10px] font-bold text-slate-500">{w.category}</span>
                          </div>

                          {w.description && (
                            <p className="text-xs text-[var(--foreground-muted)] line-clamp-2">
                              {w.description}
                            </p>
                          )}
                        </div>

                        <div className="p-3 bg-muted/30 border-t border-border flex items-center gap-2">
                          {["OPEN", "ASSIGNED"].includes(w.status) ? (
                            <Button
                              size="sm"
                              variant="primary"
                              className="w-full font-bold h-9 text-xs"
                              disabled={isLoading}
                              onClick={() => handleStartMaintenance(w)}
                            >
                              {isLoading ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Play className="h-4 w-4 mr-1.5" />}
                              Start Work
                            </Button>
                          ) : w.status === "IN_PROGRESS" ? (
                            <Button
                              size="sm"
                              variant="primary"
                              className="w-full font-bold h-9 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                              disabled={isLoading}
                              onClick={() => setResolveModalWo(w)}
                            >
                              <CheckCheck className="h-4 w-4 mr-1.5" />
                              Mark Resolved
                            </Button>
                          ) : (
                            <div className="w-full text-center text-xs font-semibold text-muted-foreground py-1">
                              Status: {w.status}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Guest Requests Section */}
            {(activeDomainTab === "ALL" || activeDomainTab === "GUEST_REQUESTS") && filteredGuest.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center gap-2">
                    <Bell className="h-4 w-4 text-amber-500" />
                    <span>Guest Service Requests ({filteredGuest.length})</span>
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {filteredGuest.map((r) => {
                    const isLoading = actionLoadingId === `guest-${r.id}`;

                    return (
                      <div key={r.id} className="stayhub-card overflow-hidden flex flex-col justify-between">
                        <div className="p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-extrabold text-[var(--foreground)] truncate">
                              {r.title}
                            </span>
                            <span
                              className={cn(
                                "px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider",
                                r.status === "IN_PROGRESS"
                                  ? "bg-amber-500 text-slate-950"
                                  : r.status === "COMPLETED"
                                  ? "bg-emerald-500/20 text-emerald-700"
                                  : "bg-blue-500/20 text-blue-700"
                              )}
                            >
                              {r.status}
                            </span>
                          </div>

                          <div className="text-xs text-[var(--foreground-muted)] flex items-center gap-2">
                            {r.room ? (
                              <span className="font-bold text-[var(--foreground)] font-mono">
                                Room {r.room.room_number}
                              </span>
                            ) : null}
                            <span>•</span>
                            <span className="text-[10px] font-bold uppercase">{r.category}</span>
                          </div>

                          {r.description && (
                            <p className="text-xs text-[var(--foreground-muted)] line-clamp-2">
                              {r.description}
                            </p>
                          )}
                        </div>

                        <div className="p-3 bg-muted/30 border-t border-border flex items-center gap-2">
                          {["SUBMITTED", "ACKNOWLEDGED", "ASSIGNED"].includes(r.status) ? (
                            <Button
                              size="sm"
                              variant="primary"
                              className="w-full font-bold h-9 text-xs"
                              disabled={isLoading}
                              onClick={() => handleStartGuestRequest(r)}
                            >
                              {isLoading ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Play className="h-4 w-4 mr-1.5" />}
                              Start Request
                            </Button>
                          ) : r.status === "IN_PROGRESS" ? (
                            <Button
                              size="sm"
                              variant="primary"
                              className="w-full font-bold h-9 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                              disabled={isLoading}
                              onClick={() => handleCompleteGuestRequest(r)}
                            >
                              {isLoading ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <CheckCheck className="h-4 w-4 mr-1.5" />}
                              Mark Completed
                            </Button>
                          ) : (
                            <div className="w-full text-center text-xs font-semibold text-muted-foreground py-1">
                              Completed
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Empty State */}
            {!hasAnyItems && (
              <div className="stayhub-card p-12 text-center">
                <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto mb-3">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <h3 className="text-base font-bold text-[var(--foreground)] font-heading">
                  {activeStatusFilter === "COMPLETED" ? "No Resolved Tasks Yet" : "You Have No Tasks In This View"}
                </h3>
                <p className="text-xs text-[var(--foreground-muted)] max-w-sm mx-auto mt-1">
                  {activeStatusFilter === "COMPLETED"
                    ? "When you finish tasks and work orders, they will show up here as your resolved tickets history."
                    : "You are all caught up! When a task is assigned or updated, it will appear here in real time."}
                </p>
              </div>
            )}
          </div>
        );
      })()}

      {/* Resolve Work Order Modal */}
      {resolveModalWo && (
        <ResolveWorkOrderModal
          workOrder={resolveModalWo}
          isOpen={!!resolveModalWo}
          onClose={() => setResolveModalWo(null)}
          onSuccess={() => loadMyWork()}
        />
      )}
    </div>
  );
}
