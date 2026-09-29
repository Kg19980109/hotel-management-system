"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { fetchIndividualStaffAnalyticsAction } from "@/lib/reports/actions";
import type {
  IndividualStaffAnalytics,
  DateRangePreset,
} from "@/lib/reports/types";
import {
  User,
  Briefcase,
  Building2,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Wrench,
  Bell,
  Phone,
  Mail,
  RotateCcw,
  Timer,
  CalendarDays,
  X,
  FileSpreadsheet,
} from "lucide-react";
import { formatPercentage } from "@/lib/reports/formatters";

interface StaffIndividualDrawerProps {
  propertyId: string;
  staffMemberId: string | null;
  isOpen: boolean;
  onClose: () => void;
  preset: DateRangePreset;
  startDate: string;
  endDate: string;
}

export function StaffIndividualDrawer({
  propertyId,
  staffMemberId,
  isOpen,
  onClose,
  preset,
  startDate,
  endDate,
}: StaffIndividualDrawerProps) {
  const [data, setData] = React.useState<IndividualStaffAnalytics | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<"history" | "attendance">("history");

  const loadStaffData = React.useCallback(async () => {
    if (!staffMemberId) return;
    setIsLoading(true);
    try {
      const res = await fetchIndividualStaffAnalyticsAction(propertyId, staffMemberId, {
        preset,
        startDate,
        endDate,
      });
      if (res.data) {
        setData(res.data);
      }
    } catch (err) {
      console.error("Failed to load staff individual analytics:", err);
    } finally {
      setIsLoading(false);
    }
  }, [propertyId, staffMemberId, preset, startDate, endDate]);

  React.useEffect(() => {
    if (isOpen && staffMemberId) {
      void loadStaffData();
    } else {
      setData(null);
    }
  }, [isOpen, staffMemberId, loadStaffData]);

  const getDomainIcon = (domain: string) => {
    switch (domain) {
      case "HOUSEKEEPING":
        return <Sparkles className="w-4 h-4 text-emerald-500" />;
      case "MAINTENANCE":
        return <Wrench className="w-4 h-4 text-amber-500" />;
      case "GUEST_REQUEST":
        return <Bell className="w-4 h-4 text-blue-500" />;
      default:
        return <Briefcase className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "COMPLETED":
      case "RESOLVED":
      case "CLOSED":
        return (
          <Badge showDot={false} className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 text-[10px]">
            {status}
          </Badge>
        );
      case "IN_PROGRESS":
        return (
          <Badge showDot={false} className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/30 text-[10px]">
            IN PROGRESS
          </Badge>
        );
      case "PENDING":
      case "ASSIGNED":
      case "OPEN":
      case "SUBMITTED":
      case "ACKNOWLEDGED":
        return (
          <Badge showDot={false} className="bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/30 text-[10px]">
            {status}
          </Badge>
        );
      case "INSPECTION_PENDING":
        return (
          <Badge showDot={false} className="bg-purple-500/10 text-purple-700 dark:text-purple-400 border border-purple-500/30 text-[10px]">
            INSPECTION
          </Badge>
        );
      default:
        return (
          <Badge showDot={false} className="text-[10px] border">
            {status}
          </Badge>
        );
    }
  };

  const getAttendanceBadge = (status: string) => {
    switch (status) {
      case "PRESENT":
        return <Badge showDot={false} className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/30 text-[10px]">Present</Badge>;
      case "LATE":
        return <Badge showDot={false} className="bg-amber-500/10 text-amber-600 border border-amber-500/30 text-[10px]">Late</Badge>;
      case "ABSENT":
        return <Badge showDot={false} className="bg-red-500/10 text-red-600 border border-red-500/30 text-[10px]">Absent</Badge>;
      case "ON_LEAVE":
      case "LEAVE":
        return <Badge showDot={false} className="bg-blue-500/10 text-blue-600 border border-blue-500/30 text-[10px]">On Leave</Badge>;
      default:
        return <Badge showDot={false} className="text-[10px] border">{status}</Badge>;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[88vh] overflow-y-auto p-0 gap-0 border-border/70 shadow-2xl">
        <DialogHeader className="p-6 pb-4 border-b border-border/60 bg-muted/20">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-lg">
                {data ? data.fullName.charAt(0).toUpperCase() : <User className="w-6 h-6" />}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <DialogTitle className="text-xl font-bold tracking-tight">
                    {data ? data.fullName : "Staff Member Operations"}
                  </DialogTitle>
                  {data && (
                    <Badge showDot={false} className="font-mono text-xs bg-background border border-border">
                      {data.employeeCode}
                    </Badge>
                  )}
                  {data && (
                    <Badge
                      showDot={false}
                      className={
                        data.accountStatus === "ACTIVE"
                          ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/30 text-[10px]"
                          : "bg-muted text-muted-foreground text-[10px] border border-border"
                      }
                    >
                      {data.accountStatus}
                    </Badge>
                  )}
                </div>
                <DialogDescription className="text-xs text-muted-foreground flex items-center gap-2 mt-1">
                  <span>{data?.department || "Operations"}</span>
                  <span>•</span>
                  <span>{data?.designation || data?.role || "Staff"}</span>
                  {data?.joiningDate && (
                    <>
                      <span>•</span>
                      <span>Joined {new Date(data.joiningDate).toLocaleDateString()}</span>
                    </>
                  )}
                </DialogDescription>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={loadStaffData} disabled={isLoading} className="h-8 px-2 text-xs">
              <RotateCcw className={`w-3.5 h-3.5 mr-1 ${isLoading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>

          {/* Quick Contact & Details */}
          {data && (data.email || data.phone) && (
            <div className="flex flex-wrap items-center gap-4 mt-3 pt-3 border-t border-border/40 text-xs text-muted-foreground">
              {data.email && (
                <div className="flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-muted-foreground/70" />
                  <span>{data.email}</span>
                </div>
              )}
              {data.phone && (
                <div className="flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-muted-foreground/70" />
                  <span>{data.phone}</span>
                </div>
              )}
            </div>
          )}
        </DialogHeader>

        {isLoading ? (
          <div className="p-12 flex flex-col items-center justify-center text-muted-foreground gap-3">
            <RotateCcw className="w-6 h-6 animate-spin text-primary" />
            <p className="text-sm">Loading factual staff operations and work history...</p>
          </div>
        ) : !data ? (
          <div className="p-12 text-center text-muted-foreground">
            <AlertCircle className="w-8 h-8 mx-auto mb-2 text-amber-500" />
            <p className="text-sm font-medium">No operational records found for this staff member.</p>
          </div>
        ) : (
          <div className="p-6 space-y-6">
            {/* Workload & Operational Summary KPIs */}
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Operational Workload & Attendance Summary ({startDate} to {endDate})
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-lg border border-border/70 bg-card">
                  <span className="text-[11px] text-muted-foreground">Assigned Tasks</span>
                  <p className="text-xl font-bold font-mono text-foreground mt-0.5">
                    {data.workloadSummary.assigned}
                  </p>
                  <span className="text-[10px] text-blue-600 dark:text-blue-400">Open / Queued</span>
                </div>

                <div className="p-3 rounded-lg border border-border/70 bg-card">
                  <span className="text-[11px] text-muted-foreground">In Progress</span>
                  <p className="text-xl font-bold font-mono text-amber-600 dark:text-amber-400 mt-0.5">
                    {data.workloadSummary.inProgress}
                  </p>
                  <span className="text-[10px] text-muted-foreground">Actively working</span>
                </div>

                <div className="p-3 rounded-lg border border-border/70 bg-card">
                  <span className="text-[11px] text-muted-foreground">Completed (Period)</span>
                  <p className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-0.5">
                    {data.workloadSummary.completedPeriod}
                  </p>
                  <span className="text-[10px] text-muted-foreground">Finished work</span>
                </div>

                <div className="p-3 rounded-lg border border-border/70 bg-card">
                  <span className="text-[11px] text-muted-foreground">Attendance Rate</span>
                  <p className="text-xl font-bold font-mono text-foreground mt-0.5">
                    {formatPercentage(data.attendanceSummary.attendanceRate)}
                  </p>
                  <span className="text-[10px] text-muted-foreground">
                    {data.attendanceSummary.presentDays} Present / {data.attendanceSummary.totalDays} Days
                  </span>
                </div>
              </div>

              {data.workloadSummary.avgCompletionMinutes !== null && (
                <div className="mt-2.5 p-2.5 rounded-md bg-muted/40 border border-border/50 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <Timer className="w-3.5 h-3.5 text-primary" />
                    Average Task Handling Duration:
                  </span>
                  <span className="font-mono font-semibold text-foreground">
                    {data.workloadSummary.avgCompletionMinutes} minutes
                  </span>
                </div>
              )}
            </div>

            {/* Tabs: Work History vs Attendance Details */}
            <div>
              <div className="flex border-b border-border/60 gap-4 mb-4">
                <button
                  type="button"
                  onClick={() => setActiveTab("history")}
                  className={`pb-2 text-xs font-semibold border-b-2 transition-colors ${
                    activeTab === "history"
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Work History ({data.workHistory.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("attendance")}
                  className={`pb-2 text-xs font-semibold border-b-2 transition-colors ${
                    activeTab === "attendance"
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Attendance Ledger ({data.recentAttendance.length})
                </button>
              </div>

              {activeTab === "history" ? (
                <div className="space-y-2.5 max-h-[350px] overflow-y-auto pr-1">
                  {data.workHistory.length === 0 ? (
                    <div className="py-8 text-center text-muted-foreground text-xs border border-dashed rounded-lg">
                      No operational work records assigned to this staff member in this timeframe.
                    </div>
                  ) : (
                    data.workHistory.map((item) => (
                      <div
                        key={item.id}
                        className="p-3 rounded-lg border border-border/60 bg-card hover:bg-muted/30 transition-colors flex items-start justify-between gap-3 text-xs"
                      >
                        <div className="flex items-start gap-2.5 min-w-0">
                          <div className="p-2 rounded-md bg-muted/60 shrink-0 mt-0.5">
                            {getDomainIcon(item.domain)}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-foreground truncate">
                                {item.title}
                              </span>
                              {item.roomNumber && (
                                <Badge showDot={false} className="font-mono text-[10px] bg-background border border-border">
                                  Room {item.roomNumber}
                                </Badge>
                              )}
                              <Badge showDot={false} className="text-[10px] uppercase font-mono border border-border">
                                {item.domain.replace("_", " ")}
                              </Badge>
                            </div>
                            {item.notes && (
                              <p className="text-muted-foreground text-[11px] mt-1 line-clamp-1 italic">
                                &ldquo;{item.notes}&rdquo;
                              </p>
                            )}
                            <div className="flex items-center gap-3 mt-1.5 text-[10px] text-muted-foreground">
                              {item.startedAt && (
                                <span>Started: {new Date(item.startedAt).toLocaleString()}</span>
                              )}
                              {item.completedAt && (
                                <span>Completed: {new Date(item.completedAt).toLocaleString()}</span>
                              )}
                              {item.durationMinutes !== null && item.durationMinutes !== undefined && (
                                <span className="font-semibold text-foreground">
                                  Duration: {item.durationMinutes} mins
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="shrink-0 flex flex-col items-end gap-1">
                          {getStatusBadge(item.status)}
                          <span className="text-[10px] text-muted-foreground font-mono">
                            {item.priority}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              ) : (
                <div className="border border-border/60 rounded-lg overflow-hidden">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-muted/50 text-muted-foreground font-semibold border-b border-border/60">
                      <tr>
                        <th className="py-2.5 px-3">Date</th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3">Check In</th>
                        <th className="py-2.5 px-3">Check Out</th>
                        <th className="py-2.5 px-3">Source</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {data.recentAttendance.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-6 text-center text-muted-foreground text-xs">
                            No attendance records found for this period.
                          </td>
                        </tr>
                      ) : (
                        data.recentAttendance.map((att, idx) => (
                          <tr key={idx} className="hover:bg-muted/20">
                            <td className="py-2 px-3 font-medium text-foreground">
                              {att.date}
                            </td>
                            <td className="py-2 px-3">
                              {getAttendanceBadge(att.status)}
                            </td>
                            <td className="py-2 px-3 font-mono text-muted-foreground">
                              {att.checkInAt ? new Date(att.checkInAt).toLocaleTimeString() : "—"}
                            </td>
                            <td className="py-2 px-3 font-mono text-muted-foreground">
                              {att.checkOutAt ? new Date(att.checkOutAt).toLocaleTimeString() : "—"}
                            </td>
                            <td className="py-2 px-3 text-muted-foreground text-[11px]">
                              {att.source || "System"}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
