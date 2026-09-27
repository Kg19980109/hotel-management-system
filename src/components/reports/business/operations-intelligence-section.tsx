"use client";

import * as React from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import type { OperationsIntelligenceSummary } from "@/lib/reports/business-types";
import {
  Sparkles,
  Wrench,
  Boxes,
  UsersRound,
  BellRing,
  ArrowRight,
  CheckCircle2,
  Clock,
  AlertTriangle,
} from "lucide-react";

interface OperationsIntelligenceSectionProps {
  operations: OperationsIntelligenceSummary;
}

export function OperationsIntelligenceSection({
  operations,
}: OperationsIntelligenceSectionProps) {
  const { housekeeping, maintenance, inventory, staff, guestServices } = operations;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. Housekeeping */}
      <Card className="border-border/80 shadow-xs flex flex-col justify-between">
        <CardHeader className="py-3 px-4 border-b border-border/50 bg-muted/20 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-foreground">
              Housekeeping
            </CardTitle>
          </div>
          <Link href="/housekeeping">
            <span className="text-[11px] text-primary hover:underline flex items-center gap-0.5 font-medium">
              Console <ArrowRight className="w-3 h-3" />
            </span>
          </Link>
        </CardHeader>

        <CardContent className="p-4 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Cleaning Tasks</span>
            <span className="text-xs font-bold text-foreground font-mono">{housekeeping.tasksCreated}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Completed</span>
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 font-mono">
              {housekeeping.tasksCompleted}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Pending / In Progress</span>
            <span className="text-xs font-bold text-amber-600 font-mono">{housekeeping.pendingTasks}</span>
          </div>
          <div className="pt-2 border-t border-border/50 flex items-center justify-between">
            <span className="text-xs font-semibold text-foreground">Completion Rate</span>
            <span className="text-xs font-bold font-mono text-primary">{housekeeping.completionRate}%</span>
          </div>
        </CardContent>
      </Card>

      {/* 2. Maintenance */}
      <Card className="border-border/80 shadow-xs flex flex-col justify-between">
        <CardHeader className="py-3 px-4 border-b border-border/50 bg-muted/20 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <Wrench className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-foreground">
              Maintenance
            </CardTitle>
          </div>
          <Link href="/maintenance">
            <span className="text-[11px] text-primary hover:underline flex items-center gap-0.5 font-medium">
              Console <ArrowRight className="w-3 h-3" />
            </span>
          </Link>
        </CardHeader>

        <CardContent className="p-4 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Total Work Orders</span>
            <span className="text-xs font-bold text-foreground font-mono">{maintenance.totalRequests}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Open / Assigned</span>
            <span className="text-xs font-bold text-amber-600 font-mono">{maintenance.openRequests}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Resolved</span>
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 font-mono">
              {maintenance.completedRequests}
            </span>
          </div>
          <div className="pt-2 border-t border-border/50 flex items-center justify-between">
            <span className="text-xs font-semibold text-foreground">High Priority Urgent</span>
            <span
              className={`text-xs font-bold font-mono ${
                maintenance.highPriorityCount > 0 ? "text-rose-600" : "text-muted-foreground"
              }`}
            >
              {maintenance.highPriorityCount}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* 3. Staff & Attendance */}
      <Card className="border-border/80 shadow-xs flex flex-col justify-between">
        <CardHeader className="py-3 px-4 border-b border-border/50 bg-muted/20 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <UsersRound className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-foreground">
              Staff & Payroll
            </CardTitle>
          </div>
          <Link href="/staff">
            <span className="text-[11px] text-primary hover:underline flex items-center gap-0.5 font-medium">
              Directory <ArrowRight className="w-3 h-3" />
            </span>
          </Link>
        </CardHeader>

        <CardContent className="p-4 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Active Staff Members</span>
            <span className="text-xs font-bold text-foreground font-mono">{staff.activeStaffCount}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Attendance Rate</span>
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 font-mono">
              {staff.attendanceRate}%
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Absent Shifts</span>
            <span className="text-xs font-bold text-muted-foreground font-mono">{staff.absentDaysCount}</span>
          </div>
          <div className="pt-2 border-t border-border/50 flex items-center justify-between">
            <span className="text-xs font-semibold text-foreground">Payroll Status</span>
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">Current</span>
          </div>
        </CardContent>
      </Card>

      {/* 4. Guest Service Requests */}
      <Card className="border-border/80 shadow-xs flex flex-col justify-between">
        <CardHeader className="py-3 px-4 border-b border-border/50 bg-muted/20 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <BellRing className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-foreground">
              Guest Services (QR)
            </CardTitle>
          </div>
          <Link href="/guest-requests">
            <span className="text-[11px] text-primary hover:underline flex items-center gap-0.5 font-medium">
              Queue <ArrowRight className="w-3 h-3" />
            </span>
          </Link>
        </CardHeader>

        <CardContent className="p-4 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Total Requests</span>
            <span className="text-xs font-bold text-foreground font-mono">{guestServices.totalRequests}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Fulfilled</span>
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 font-mono">
              {guestServices.completedRequests}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">In Progress</span>
            <span className="text-xs font-bold text-amber-600 font-mono">{guestServices.pendingRequests}</span>
          </div>
          <div className="pt-2 border-t border-border/50 flex items-center justify-between">
            <span className="text-xs font-semibold text-foreground">Fulfillment Rate</span>
            <span className="text-xs font-bold font-mono text-teal-600 dark:text-teal-400">
              {guestServices.completionRate}%
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
