"use client";

import * as React from "react";
import { useAuth } from "@/lib/auth/context";
import { ReportHeader } from "@/components/reports/report-header";
import { ReportNav } from "@/components/reports/report-nav";
import { KpiCard } from "@/components/reports/kpi-card";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  fetchStaffReportAction,
  exportReportCsvAction,
} from "@/lib/reports/actions";
import { formatPercentage } from "@/lib/reports/formatters";
import type {
  StaffReportData,
  DateRangePreset,
  ComparisonPreset,
  StaffWorkloadRow,
} from "@/lib/reports/types";
import { StaffIndividualDrawer } from "@/components/reports/staff-individual-drawer";
import {
  UserCheck,
  Users,
  Clock,
  CalendarDays,
  Briefcase,
  CheckCircle2,
  Sparkles,
  Wrench,
  Bell,
  ChefHat,
  Search,
  Filter,
  Eye,
  Timer,
  Activity,
  Layers,
  HelpCircle,
} from "lucide-react";

export default function StaffReportPage() {
  const { currentProperty } = useAuth();
  const propertyId = currentProperty?.property_id || "demo-property";
  const propertyName = currentProperty?.property_name || "StayHub Grand";

  const [preset, setPreset] = React.useState<DateRangePreset>("LAST_30_DAYS");
  const [comparison, setComparison] = React.useState<ComparisonPreset>("NONE");
  const [startDate, setStartDate] = React.useState<string>("2026-08-27");
  const [endDate, setEndDate] = React.useState<string>("2026-09-26");
  const [isLoading, setIsLoading] = React.useState(true);
  const [isExporting, setIsExporting] = React.useState(false);
  const [report, setReport] = React.useState<StaffReportData | null>(null);

  // Search & Filter State for Workload Table
  const [searchQuery, setSearchQuery] = React.useState("");
  const [departmentFilter, setDepartmentFilter] = React.useState<string>("ALL");
  const [attendanceFilter, setAttendanceFilter] = React.useState<string>("ALL");

  // Selected Staff for Drawer
  const [selectedStaffId, setSelectedStaffId] = React.useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = React.useState(false);

  const loadData = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetchStaffReportAction(propertyId, {
        preset,
        comparison,
        startDate,
        endDate,
      });
      if (res.data) setReport(res.data);
    } catch (err) {
      console.error("Failed to load staff report:", err);
    } finally {
      setIsLoading(false);
    }
  }, [propertyId, preset, comparison, startDate, endDate]);

  React.useEffect(() => {
    let isMounted = true;
    async function load() {
      try {
        const res = await fetchStaffReportAction(propertyId, {
          preset,
          comparison,
          startDate,
          endDate,
        });
        if (isMounted && res.data) setReport(res.data);
      } catch (err) {
        console.error("Failed to load staff report:", err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    void load();
    return () => {
      isMounted = false;
    };
  }, [propertyId, preset, comparison, startDate, endDate]);

  const handleExportCsv = async () => {
    if (!report) return;
    setIsExporting(true);
    try {
      const headers = [
        "Employee Code",
        "Staff Name",
        "Department",
        "Role",
        "Account Status",
        "Today Attendance",
        "Currently Assigned",
        "In Progress",
        "Completed in Period",
        "Pending / On Hold",
        "Avg Handling Duration (Mins)",
      ];
      const rows = (report.workloadRows || []).map((s) => [
        s.employeeCode,
        s.fullName,
        s.department,
        s.role,
        s.status,
        s.attendanceToday,
        s.assignedCount,
        s.inProgressCount,
        s.completedPeriodCount,
        s.openPendingCount,
        s.avgDurationMinutes !== null && s.avgDurationMinutes !== undefined ? s.avgDurationMinutes : "N/A",
      ]);
      const res = await exportReportCsvAction(
        propertyId,
        "staff",
        headers,
        rows,
        `Staff Operations & Workload Report (${startDate} to ${endDate})`
      );
      if (res.csv) {
        const blob = new Blob([res.csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `stayhub_staff_workload_${startDate}_${endDate}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (err) {
      console.error("Failed to export CSV:", err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleOpenStaffDetail = (staffId: string) => {
    setSelectedStaffId(staffId);
    setIsDrawerOpen(true);
  };

  // Distinct Departments for filter dropdown
  const departmentOptions = React.useMemo(() => {
    if (!report?.workloadRows) return [];
    const depts = new Set<string>();
    for (const r of report.workloadRows) {
      if (r.department) depts.add(r.department);
    }
    return Array.from(depts);
  }, [report]);

  // Filtered Staff Rows
  const filteredWorkload = React.useMemo(() => {
    if (!report?.workloadRows) return [];
    return report.workloadRows.filter((r) => {
      if (departmentFilter !== "ALL" && r.department !== departmentFilter) {
        return false;
      }
      if (attendanceFilter !== "ALL" && r.attendanceToday !== attendanceFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = r.fullName.toLowerCase().includes(q);
        const matchCode = r.employeeCode.toLowerCase().includes(q);
        const matchRole = r.role.toLowerCase().includes(q);
        if (!matchName && !matchCode && !matchRole) return false;
      }
      return true;
    });
  }, [report, departmentFilter, attendanceFilter, searchQuery]);

  const getAttendanceBadge = (status: string) => {
    switch (status) {
      case "PRESENT":
        return <Badge showDot={false} className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 text-[10px]">Present</Badge>;
      case "LATE":
        return <Badge showDot={false} className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/30 text-[10px]">Late</Badge>;
      case "ABSENT":
        return <Badge showDot={false} className="bg-red-500/10 text-red-700 dark:text-red-400 border border-red-500/30 text-[10px]">Absent</Badge>;
      case "ON_LEAVE":
      case "LEAVE":
        return <Badge showDot={false} className="bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/30 text-[10px]">On Leave</Badge>;
      default:
        return <Badge showDot={false} className="text-muted-foreground text-[10px] border">Not Logged</Badge>;
    }
  };

  return (
    <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto w-full">
      <ReportHeader
        title="Staff Operations, Workload & History Analytics"
        description="Factual overview of active work assignments, completed tasks, department operational load, and employee history."
        activePreset={preset}
        onPresetChange={setPreset}
        startDate={startDate}
        endDate={endDate}
        onCustomDateChange={(s, e) => {
          setStartDate(s);
          setEndDate(e);
          setPreset("CUSTOM");
        }}
        comparison={comparison}
        onComparisonChange={setComparison}
        onExportCsv={handleExportCsv}
        isExporting={isExporting}
        onRefresh={loadData}
        isLoading={isLoading}
        propertyName={propertyName}
      />

      <ReportNav />

      {/* Overview KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-4 rounded-xl border border-border/70 bg-card shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-xs font-medium">Total Staff</span>
            <Users className="w-4 h-4 text-primary" />
          </div>
          <p className="text-2xl font-bold font-mono text-foreground">
            {report?.summary.totalStaffCount || 0}
          </p>
          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
            {report?.summary.activeStaffCount || 0} Active
          </span>
        </div>

        <div className="p-4 rounded-xl border border-border/70 bg-card shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-xs font-medium">Assigned Work</span>
            <Briefcase className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-2xl font-bold font-mono text-blue-600 dark:text-blue-400">
            {report?.summary.currentlyAssignedCount || 0}
          </p>
          <span className="text-[11px] text-muted-foreground">Queued tasks</span>
        </div>

        <div className="p-4 rounded-xl border border-border/70 bg-card shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-xs font-medium">In Progress</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-bold font-mono text-amber-600 dark:text-amber-400">
            {report?.summary.currentlyInProgressCount || 0}
          </p>
          <span className="text-[11px] text-muted-foreground">Actively handled</span>
        </div>

        <div className="p-4 rounded-xl border border-border/70 bg-card shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-xs font-medium">Completed (Period)</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
            {report?.summary.completedPeriodCount || 0}
          </p>
          <span className="text-[11px] text-muted-foreground">Across all domains</span>
        </div>

        <div className="p-4 rounded-xl border border-border/70 bg-card shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-xs font-medium">Open / Pending</span>
            <Activity className="w-4 h-4 text-purple-500" />
          </div>
          <p className="text-2xl font-bold font-mono text-purple-600 dark:text-purple-400">
            {report?.summary.openPendingCount || 0}
          </p>
          <span className="text-[11px] text-muted-foreground">Unassigned/Inspections</span>
        </div>

        <div className="p-4 rounded-xl border border-border/70 bg-card shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-xs font-medium">Attendance Rate</span>
            <UserCheck className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold font-mono text-foreground">
            {formatPercentage(report?.summary.overallAttendanceRate.current)}
          </p>
          <span className="text-[11px] text-muted-foreground">
            {report?.summary.onLeaveCount || 0} on leave
          </span>
        </div>
      </div>

      {/* Department Operational Breakdown */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-base font-bold tracking-tight text-foreground flex items-center gap-2">
              <Layers className="w-4 h-4 text-primary" />
              Department Operational Breakdown
            </h3>
            <p className="text-xs text-muted-foreground">
              Factual status breakdown aggregated directly from live domain tables
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Housekeeping */}
          <Card className="shadow-xs border-border/70">
            <CardHeader className="p-4 pb-2 border-b border-border/50 bg-muted/20">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-500" />
                  Housekeeping
                </CardTitle>
                <Badge showDot={false} className="text-[10px] uppercase font-mono border border-border">
                  Room Ops
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-2.5 text-xs">
              {(() => {
                const hk = report?.operationalDepartments?.find((d) => d.department === "HOUSEKEEPING");
                return (
                  <>
                    <div className="flex justify-between items-center py-1 border-b border-border/40">
                      <span className="text-muted-foreground">Assigned Cleaning Tasks:</span>
                      <span className="font-mono font-bold text-foreground">{hk?.assigned ?? 0}</span>
                    </div>
                    <div className="flex justify-between items-center py-1 border-b border-border/40">
                      <span className="text-muted-foreground">Cleaning In Progress:</span>
                      <span className="font-mono font-bold text-amber-600 dark:text-amber-400">{hk?.inProgress ?? 0}</span>
                    </div>
                    <div className="flex justify-between items-center py-1 border-b border-border/40">
                      <span className="text-muted-foreground">Pending Inspection:</span>
                      <span className="font-mono font-bold text-purple-600 dark:text-purple-400">
                        {hk?.details?.inspectionPending ?? 0}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-1 border-b border-border/40">
                      <span className="text-muted-foreground">Completed in Period:</span>
                      <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{hk?.completedPeriod ?? 0}</span>
                    </div>
                    <div className="flex justify-between items-center pt-1 text-[11px]">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Timer className="w-3 h-3 text-muted-foreground" />
                        Avg Cleaning Duration:
                      </span>
                      <span className="font-mono font-semibold text-foreground">
                        {hk?.avgDurationMinutes !== null && hk?.avgDurationMinutes !== undefined
                          ? `${hk.avgDurationMinutes} mins`
                          : "—"}
                      </span>
                    </div>
                  </>
                );
              })()}
            </CardContent>
          </Card>

          {/* Maintenance */}
          <Card className="shadow-xs border-border/70">
            <CardHeader className="p-4 pb-2 border-b border-border/50 bg-muted/20">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-amber-500" />
                  Engineering & Maintenance
                </CardTitle>
                <Badge showDot={false} className="text-[10px] uppercase font-mono border border-border">
                  Assets
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-2.5 text-xs">
              {(() => {
                const maint = report?.operationalDepartments?.find((d) => d.department === "MAINTENANCE");
                return (
                  <>
                    <div className="flex justify-between items-center py-1 border-b border-border/40">
                      <span className="text-muted-foreground">Work Orders Assigned:</span>
                      <span className="font-mono font-bold text-foreground">{maint?.assigned ?? 0}</span>
                    </div>
                    <div className="flex justify-between items-center py-1 border-b border-border/40">
                      <span className="text-muted-foreground">Repairs In Progress:</span>
                      <span className="font-mono font-bold text-amber-600 dark:text-amber-400">{maint?.inProgress ?? 0}</span>
                    </div>
                    <div className="flex justify-between items-center py-1 border-b border-border/40">
                      <span className="text-muted-foreground">Work Orders On Hold:</span>
                      <span className="font-mono font-bold text-muted-foreground">{maint?.details?.onHold ?? 0}</span>
                    </div>
                    <div className="flex justify-between items-center py-1 border-b border-border/40">
                      <span className="text-muted-foreground">Resolved in Period:</span>
                      <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{maint?.completedPeriod ?? 0}</span>
                    </div>
                    <div className="flex justify-between items-center pt-1 text-[11px]">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Timer className="w-3 h-3 text-muted-foreground" />
                        Avg Repair Duration:
                      </span>
                      <span className="font-mono font-semibold text-foreground">
                        {maint?.avgDurationMinutes !== null && maint?.avgDurationMinutes !== undefined
                          ? `${maint.avgDurationMinutes} mins`
                          : "—"}
                      </span>
                    </div>
                  </>
                );
              })()}
            </CardContent>
          </Card>

          {/* Guest Requests */}
          <Card className="shadow-xs border-border/70">
            <CardHeader className="p-4 pb-2 border-b border-border/50 bg-muted/20">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Bell className="w-4 h-4 text-blue-500" />
                  Guest Services
                </CardTitle>
                <Badge showDot={false} className="text-[10px] uppercase font-mono border border-border">
                  Concierge
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-2.5 text-xs">
              {(() => {
                const gr = report?.operationalDepartments?.find((d) => d.department === "GUEST_REQUESTS");
                return (
                  <>
                    <div className="flex justify-between items-center py-1 border-b border-border/40">
                      <span className="text-muted-foreground">Assigned Requests:</span>
                      <span className="font-mono font-bold text-foreground">{gr?.assigned ?? 0}</span>
                    </div>
                    <div className="flex justify-between items-center py-1 border-b border-border/40">
                      <span className="text-muted-foreground">In Fulfillment:</span>
                      <span className="font-mono font-bold text-amber-600 dark:text-amber-400">{gr?.inProgress ?? 0}</span>
                    </div>
                    <div className="flex justify-between items-center py-1 border-b border-border/40">
                      <span className="text-muted-foreground">Pending Dispatch:</span>
                      <span className="font-mono font-bold text-purple-600 dark:text-purple-400">{gr?.pendingOrOpen ?? 0}</span>
                    </div>
                    <div className="flex justify-between items-center py-1 border-b border-border/40">
                      <span className="text-muted-foreground">Fulfilled in Period:</span>
                      <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{gr?.completedPeriod ?? 0}</span>
                    </div>
                    <div className="flex justify-between items-center pt-1 text-[11px]">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Timer className="w-3 h-3 text-muted-foreground" />
                        Avg Fulfillment Time:
                      </span>
                      <span className="font-mono font-semibold text-foreground">
                        {gr?.avgDurationMinutes !== null && gr?.avgDurationMinutes !== undefined
                          ? `${gr.avgDurationMinutes} mins`
                          : "—"}
                      </span>
                    </div>
                  </>
                );
              })()}
            </CardContent>
          </Card>

          {/* Kitchen / KDS */}
          <Card className="shadow-xs border-border/70">
            <CardHeader className="p-4 pb-2 border-b border-border/50 bg-muted/20">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <ChefHat className="w-4 h-4 text-orange-500" />
                  Kitchen & KDS
                </CardTitle>
                <Badge showDot={false} className="text-[10px] uppercase font-mono border border-border">
                  Stations
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-2.5 text-xs">
              {(() => {
                const k = report?.operationalDepartments?.find((d) => d.department === "KITCHEN");
                return (
                  <>
                    <div className="flex justify-between items-center py-1 border-b border-border/40">
                      <span className="text-muted-foreground">Active Kitchen Tickets:</span>
                      <span className="font-mono font-bold text-foreground">
                        {k?.details?.activeTickets ?? 0}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-1 border-b border-border/40">
                      <span className="text-muted-foreground">Tickets Preparing:</span>
                      <span className="font-mono font-bold text-amber-600 dark:text-amber-400">{k?.inProgress ?? 0}</span>
                    </div>
                    <div className="flex justify-between items-center py-1 border-b border-border/40">
                      <span className="text-muted-foreground">Ready for Service:</span>
                      <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {k?.details?.readyForPickup ?? 0}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-1 border-b border-border/40">
                      <span className="text-muted-foreground">Served in Period:</span>
                      <span className="font-mono font-bold text-foreground">{k?.completedPeriod ?? 0}</span>
                    </div>
                    <div className="flex justify-between items-center pt-1 text-[11px]">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Timer className="w-3 h-3 text-muted-foreground" />
                        Avg Prep Duration:
                      </span>
                      <span className="font-mono font-semibold text-foreground">
                        {k?.avgDurationMinutes !== null && k?.avgDurationMinutes !== undefined
                          ? `${k.avgDurationMinutes} mins`
                          : "—"}
                      </span>
                    </div>
                  </>
                );
              })()}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Kitchen Station Operations Breakdown */}
      {report?.kitchenStations && report.kitchenStations.length > 0 && (
        <Card className="shadow-xs border-border/70">
          <CardHeader className="p-4 pb-3 border-b border-border/60 bg-muted/10">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <ChefHat className="w-4 h-4 text-orange-500" />
                  Kitchen Station Operational Distribution
                </CardTitle>
                <CardDescription className="text-xs">
                  Station-based pipeline activity (Hot Kitchen, Cold Kitchen, Bar, Dessert, Bakery)
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/40 text-muted-foreground font-semibold border-b border-border/60">
                <tr>
                  <th className="py-2.5 px-4">Station</th>
                  <th className="py-2.5 px-3">Active Tickets</th>
                  <th className="py-2.5 px-3">Preparing</th>
                  <th className="py-2.5 px-3">Ready for Pickup</th>
                  <th className="py-2.5 px-3">Served (Period)</th>
                  <th className="py-2.5 px-4 text-right">Avg Prep Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {report.kitchenStations.map((st, idx) => (
                  <tr key={idx} className="hover:bg-muted/20">
                    <td className="py-2.5 px-4 font-semibold text-foreground">{st.station}</td>
                    <td className="py-2.5 px-3 font-mono">{st.activeTickets}</td>
                    <td className="py-2.5 px-3 font-mono text-amber-600 dark:text-amber-400 font-medium">
                      {st.preparingCount}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-emerald-600 dark:text-emerald-400 font-medium">
                      {st.readyCount}
                    </td>
                    <td className="py-2.5 px-3 font-mono">{st.completedPeriodCount}</td>
                    <td className="py-2.5 px-4 text-right font-mono font-medium">
                      {st.avgPrepDurationMinutes !== null && st.avgPrepDurationMinutes !== undefined
                        ? `${st.avgPrepDurationMinutes} mins`
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Staff Workload & Activity Ledger Table */}
      <Card className="shadow-xs border-border/70">
        <CardHeader className="p-4 pb-3 border-b border-border/60">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-primary" />
                Staff Workload & Operational Ledger
              </CardTitle>
              <CardDescription className="text-xs">
                Individual operational assignments, in-progress tasks, completed work, and attendance status
              </CardDescription>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative w-48 sm:w-56">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
                <Input
                  placeholder="Search staff or code..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 h-8 text-xs bg-background"
                />
              </div>

              {departmentOptions.length > 0 && (
                <select
                  value={departmentFilter}
                  onChange={(e) => setDepartmentFilter(e.target.value)}
                  className="h-8 px-2.5 text-xs bg-background border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="ALL">All Departments</option>
                  {departmentOptions.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
              )}

              <select
                value={attendanceFilter}
                onChange={(e) => setAttendanceFilter(e.target.value)}
                className="h-8 px-2.5 text-xs bg-background border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="ALL">All Attendance</option>
                <option value="PRESENT">Present Today</option>
                <option value="LATE">Late Today</option>
                <option value="ABSENT">Absent Today</option>
                <option value="ON_LEAVE">On Leave</option>
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-muted/50 text-muted-foreground font-semibold border-b border-border/60">
              <tr>
                <th className="py-2.5 px-4">Employee</th>
                <th className="py-2.5 px-3">Department</th>
                <th className="py-2.5 px-3">Role</th>
                <th className="py-2.5 px-3">Today Attendance</th>
                <th className="py-2.5 px-3 text-center">Assigned</th>
                <th className="py-2.5 px-3 text-center">In Progress</th>
                <th className="py-2.5 px-3 text-center">Completed ({preset.replace("_", " ")})</th>
                <th className="py-2.5 px-3 text-center">Pending/Hold</th>
                <th className="py-2.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {filteredWorkload.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-muted-foreground">
                    {searchQuery || departmentFilter !== "ALL" || attendanceFilter !== "ALL"
                      ? "No staff members match the selected filters."
                      : "No staff records found for this property."}
                  </td>
                </tr>
              ) : (
                filteredWorkload.map((staff) => (
                  <tr key={staff.staffId} className="hover:bg-muted/30 transition-colors">
                    <td className="py-2.5 px-4">
                      <div className="flex flex-col">
                        <span className="font-semibold text-foreground">{staff.fullName}</span>
                        <span className="text-[10px] font-mono text-muted-foreground">{staff.employeeCode}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-muted-foreground">{staff.department}</td>
                    <td className="py-2.5 px-3">
                      <Badge showDot={false} className="font-normal text-[10px] border border-border">
                        {staff.role}
                      </Badge>
                    </td>
                    <td className="py-2.5 px-3">{getAttendanceBadge(staff.attendanceToday)}</td>
                    <td className="py-2.5 px-3 text-center font-mono font-semibold text-blue-600 dark:text-blue-400">
                      {staff.assignedCount}
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono font-semibold text-amber-600 dark:text-amber-400">
                      {staff.inProgressCount}
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                      {staff.completedPeriodCount}
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono text-muted-foreground">
                      {staff.openPendingCount}
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenStaffDetail(staff.staffId)}
                        className="h-7 px-2.5 text-xs text-primary hover:text-primary hover:bg-primary/10"
                      >
                        <Eye className="w-3.5 h-3.5 mr-1" />
                        View History
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Staff Individual Operational Drawer */}
      <StaffIndividualDrawer
        propertyId={propertyId}
        staffMemberId={selectedStaffId}
        isOpen={isDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false);
          setSelectedStaffId(null);
        }}
        preset={preset}
        startDate={startDate}
        endDate={endDate}
      />
    </div>
  );
}
