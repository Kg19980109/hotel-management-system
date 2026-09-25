"use client";

import * as React from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MaintenanceWorkOrder } from "@/lib/maintenance/types";
import { StaffOption } from "@/lib/maintenance/queries";
import {
  WorkOrderStatusBadge,
  MaintenancePriorityBadge,
  MaintenanceCategoryBadge,
} from "./work-order-badge";
import { NewWorkOrderModal } from "./new-work-order-modal";
import { RoomStatusOverrideModal } from "./room-status-override-modal";
import {
  Wrench,
  Plus,
  ShieldAlert,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";

interface RoomMaintenanceCardProps {
  propertyId: string;
  roomId: string;
  roomNumber: string;
  currentRoomStatus: string;
  history: MaintenanceWorkOrder[];
  staff: StaffOption[];
  onRefresh?: () => void;
}

export function RoomMaintenanceCard({
  propertyId,
  roomId,
  roomNumber,
  currentRoomStatus,
  history,
  staff,
  onRefresh,
}: RoomMaintenanceCardProps) {
  const [isNewModalOpen, setIsNewModalOpen] = React.useState<boolean>(false);
  const [isOverrideModalOpen, setIsOverrideModalOpen] = React.useState<boolean>(false);

  const activeWorkOrders = history.filter(
    (wo) => !["RESOLVED", "CLOSED", "CANCELLED"].includes(wo.status)
  );

  const resolvedHistory = history.filter((wo) =>
    ["RESOLVED", "CLOSED", "CANCELLED"].includes(wo.status)
  );

  return (
    <Card className="p-6 bg-white border border-[var(--border)] shadow-xs space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-[var(--border)]">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-amber-50 text-amber-700">
            <Wrench className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-[var(--foreground)]">
              Room Maintenance & Work Orders
            </h3>
            <p className="text-xs text-[var(--foreground-muted)]">
              Facilities status, active equipment repair tickets, and maintenance history.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsOverrideModalOpen(true)}
          >
            <ShieldAlert className="h-4 w-4 mr-1.5 text-slate-600" />
            Status Override
          </Button>

          <Button
            size="sm"
            variant="primary"
            onClick={() => setIsNewModalOpen(true)}
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Report Issue
          </Button>
        </div>
      </div>

      {/* Operational Room Status Notice if OOO / OOS */}
      {(currentRoomStatus === "OUT_OF_ORDER" || currentRoomStatus === "OUT_OF_SERVICE") && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-red-600 shrink-0" />
            <div>
              <p className="text-xs font-bold text-red-900">
                Room is currently {currentRoomStatus.replace(/_/g, " ")}
              </p>
              <p className="text-[11px] text-red-700">
                Room inventory is blocked from guest bookings until returned to service by management.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs border-red-300 text-red-700 hover:bg-red-100"
            onClick={() => setIsOverrideModalOpen(true)}
          >
            Manage
          </Button>
        </div>
      )}

      {/* Active Work Orders Section */}
      <div>
        <h4 className="text-xs font-bold text-[var(--foreground)] uppercase tracking-wider mb-2 flex items-center gap-2">
          <span>Active Maintenance Issues</span>
          <Badge variant={activeWorkOrders.length > 0 ? "warning" : "confirmed"} size="sm">
            {activeWorkOrders.length}
          </Badge>
        </h4>

        {activeWorkOrders.length === 0 ? (
          <div className="p-4 rounded-lg bg-slate-50 border border-slate-100 text-center">
            <CheckCircle2 className="h-6 w-6 text-emerald-500 mx-auto mb-1" />
            <p className="text-xs font-medium text-slate-700">No Active Maintenance Issues</p>
            <p className="text-[11px] text-slate-500">
              All room fixtures, HVAC, and amenities are operating normally.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {activeWorkOrders.map((wo) => (
              <div
                key={wo.id}
                className="p-3.5 rounded-lg border border-[var(--border)] bg-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 hover:border-[var(--primary)] transition-colors"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <MaintenanceCategoryBadge category={wo.category} />
                    <MaintenancePriorityBadge priority={wo.priority} />
                    <WorkOrderStatusBadge status={wo.status} />
                  </div>
                  <Link
                    href={`/maintenance/${wo.id}`}
                    className="text-sm font-semibold text-[var(--foreground)] hover:text-[var(--primary)]"
                  >
                    {wo.title}
                  </Link>
                  {wo.description && (
                    <p className="text-xs text-[var(--foreground-muted)] line-clamp-1">
                      {wo.description}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right text-xs">
                    <span className="text-[var(--foreground-subtle)] block">Tech</span>
                    <span className="font-medium text-[var(--foreground)]">
                      {wo.technician?.full_name || "Unassigned"}
                    </span>
                  </div>
                  <Link href={`/maintenance/${wo.id}`}>
                    <Button size="sm" variant="outline" className="h-8 text-xs">
                      View <ArrowRight className="h-3 w-3 ml-1" />
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Historical Maintenance Log */}
      {resolvedHistory.length > 0 && (
        <div className="pt-3 border-t border-[var(--border)]">
          <h4 className="text-xs font-bold text-[var(--foreground)] uppercase tracking-wider mb-2">
            Recent Maintenance History
          </h4>
          <div className="space-y-2">
            {resolvedHistory.slice(0, 3).map((wo) => (
              <div
                key={wo.id}
                className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs flex items-center justify-between"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-800">{wo.title}</span>
                    <WorkOrderStatusBadge status={wo.status} size="sm" />
                  </div>
                  {wo.resolution_notes && (
                    <p className="text-[11px] text-slate-600 mt-0.5 line-clamp-1">
                      Resolution: {wo.resolution_notes}
                    </p>
                  )}
                </div>
                <span className="text-[10px] text-slate-500 font-mono shrink-0 ml-2">
                  {new Date(wo.created_at).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modals */}
      <NewWorkOrderModal
        isOpen={isNewModalOpen}
        onClose={() => setIsNewModalOpen(false)}
        propertyId={propertyId}
        rooms={[{ id: roomId, room_number: roomNumber }]}
        staff={staff}
        preselectedRoomId={roomId}
        onSuccess={onRefresh}
      />

      <RoomStatusOverrideModal
        isOpen={isOverrideModalOpen}
        onClose={() => setIsOverrideModalOpen(false)}
        propertyId={propertyId}
        roomId={roomId}
        roomNumber={roomNumber}
        currentStatus={currentRoomStatus}
        onSuccess={onRefresh}
      />
    </Card>
  );
}
