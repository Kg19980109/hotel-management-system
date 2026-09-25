"use client";

import * as React from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/client";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoadingState, ErrorState } from "@/components/ui/states";
import { InspectionModal } from "@/components/housekeeping/inspection-modal";
import {
  getHousekeepingTasks,
  getHousekeepingInspections,
} from "@/lib/housekeeping/queries";
import {
  HousekeepingTask,
  HousekeepingInspection,
} from "@/lib/housekeeping/types";
import {
  ClipboardCheck,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowLeft,
  RotateCcw,
} from "lucide-react";

export default function HousekeepingInspectionsPage() {
  const { currentProperty, loading: authLoading } = useAuth();
  const propertyId = currentProperty?.property_id;

  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [pendingTasks, setPendingTasks] = React.useState<HousekeepingTask[]>([]);
  const [recentInspections, setRecentInspections] = React.useState<HousekeepingInspection[]>([]);
  const [selectedTask, setSelectedTask] = React.useState<HousekeepingTask | null>(null);

  const loadData = React.useCallback(async () => {
    if (!propertyId) return;
    setLoading(true);
    setError(null);

    const supabase = createClient();

    try {
      const [tasksRes, inspectionsRes] = await Promise.all([
        getHousekeepingTasks(supabase, propertyId, { status: "INSPECTION_PENDING", pageSize: 50 }),
        getHousekeepingInspections(supabase, propertyId, 50),
      ]);

      setPendingTasks(tasksRes.tasks);
      setRecentInspections(inspectionsRes);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load inspection queue";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [propertyId]);

  React.useEffect(() => {
    let isMounted = true;
    if (!authLoading && propertyId) {
      void Promise.resolve().then(() => {
        if (!isMounted) return;
        loadData();
      });
    }
    return () => {
      isMounted = false;
    };
  }, [authLoading, propertyId, loadData]);

  if (authLoading) {
    return <LoadingState message="Loading inspection queue..." />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Room Inspection Queue"
        description="Inspect cleaned rooms to certify readiness for upcoming guest arrivals."
        breadcrumbs={[
          { label: "Operations", href: "/housekeeping" },
          { label: "Housekeeping", href: "/housekeeping" },
          { label: "Inspections" },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Link href="/housekeeping">
              <Button variant="outline" size="sm" className="gap-1.5">
                <ArrowLeft className="h-4 w-4" />
                Back to Board
              </Button>
            </Link>
            <Button
              variant="outline"
              size="sm"
              onClick={loadData}
              title="Refresh Queue"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </Button>
          </div>
        }
      />

      {loading && pendingTasks.length === 0 ? (
        <LoadingState message="Fetching rooms awaiting inspection..." />
      ) : error ? (
        <ErrorState
          title="Error Loading Inspections"
          description={error}
          onRetry={loadData}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Pending Inspections Queue */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-[var(--foreground)] flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-500" />
                Awaiting Inspection ({pendingTasks.length})
              </h3>
              <span className="text-xs text-[var(--foreground-muted)]">
                Passed rooms immediately become Available
              </span>
            </div>

            {pendingTasks.length === 0 ? (
              <Card className="p-8 text-center bg-white border border-[var(--border)]">
                <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto mb-2" />
                <h4 className="text-sm font-semibold text-[var(--foreground)]">
                  Inspection Queue Clear
                </h4>
                <p className="text-xs text-[var(--foreground-muted)] mt-1">
                  All cleaned rooms have been inspected and released.
                </p>
              </Card>
            ) : (
              <div className="space-y-3">
                {pendingTasks.map((task) => (
                  <Card
                    key={task.id}
                    className="p-4 bg-white border border-[var(--border)] shadow-xs hover:border-amber-300 transition-colors flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-base font-bold font-mono text-[var(--foreground)]">
                          Room {task.room?.room_number}
                        </span>
                        <span className="text-xs text-[var(--foreground-muted)]">
                          Floor {task.room?.floor?.floor_number || 1} • {task.room?.room_type?.name}
                        </span>
                      </div>

                      <p className="text-xs text-[var(--foreground-muted)] mt-1">
                        Cleaned by:{" "}
                        <span className="font-semibold text-[var(--foreground)]">
                          {task.assigned_profile?.full_name || "Housekeeper"}
                        </span>
                      </p>

                      {task.notes && (
                        <p className="text-xs text-amber-800 italic bg-amber-50 p-1.5 rounded mt-2 border border-amber-200/60">
                          &quot;{task.notes}&quot;
                        </p>
                      )}
                    </div>

                    <Button
                      variant="primary"
                      onClick={() => setSelectedTask(task)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shrink-0"
                    >
                      <ClipboardCheck className="h-4 w-4 mr-1.5" />
                      Inspect Room
                    </Button>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Recent Inspection Activity Log */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-[var(--foreground)] flex items-center gap-2">
              <ClipboardCheck className="h-4 w-4 text-indigo-500" />
              Recent Inspection Log
            </h3>

            <Card className="p-4 bg-white border border-[var(--border)] shadow-xs divide-y divide-[var(--border)] max-h-[600px] overflow-y-auto">
              {recentInspections.length === 0 ? (
                <p className="text-xs text-[var(--foreground-subtle)] italic text-center py-4">
                  No inspection records recorded yet.
                </p>
              ) : (
                recentInspections.map((insp) => (
                  <div key={insp.id} className="py-3 first:pt-0 last:pb-0 space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold font-mono text-[var(--foreground)]">
                        Room {insp.room?.room_number}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 font-semibold px-2 py-0.5 rounded-full text-[10px] ${
                          insp.result === "PASSED"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-rose-50 text-rose-700 border border-rose-200"
                        }`}
                      >
                        {insp.result === "PASSED" ? (
                          <CheckCircle2 className="h-3 w-3" />
                        ) : (
                          <XCircle className="h-3 w-3" />
                        )}
                        {insp.result}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-[var(--foreground-muted)]">
                      <span>Inspector: {insp.inspector_profile?.full_name || "Staff"}</span>
                      <span>{new Date(insp.inspected_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                    </div>

                    {insp.notes && (
                      <p className="text-[11px] text-[var(--foreground-muted)] italic bg-slate-50 p-1.5 rounded">
                        {insp.notes}
                      </p>
                    )}
                  </div>
                ))
              )}
            </Card>
          </div>
        </div>
      )}

      {/* Inspection Modal */}
      <InspectionModal
        task={selectedTask}
        isOpen={!!selectedTask}
        onClose={() => setSelectedTask(null)}
        propertyId={propertyId || ""}
        onSuccess={loadData}
      />
    </div>
  );
}
