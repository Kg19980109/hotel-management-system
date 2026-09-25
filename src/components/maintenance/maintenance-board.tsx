"use client";

import * as React from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/states";
import {
  MaintenanceWorkOrder,
  WorkOrderStatus,
} from "@/lib/maintenance/types";
import { StaffOption } from "@/lib/maintenance/queries";
import {
  WorkOrderStatusBadge,
  MaintenancePriorityBadge,
  MaintenanceCategoryBadge,
} from "./work-order-badge";
import { NewWorkOrderModal } from "./new-work-order-modal";
import { AssignWorkOrderModal } from "./assign-work-order-modal";
import { ResolveWorkOrderModal } from "./resolve-work-order-modal";
import { StatusTransitionModal, TransitionAction } from "./status-transition-modal";
import {
  Search,
  Plus,
  LayoutGrid,
  List,
  ClockAlert,
  ArrowRight,
} from "lucide-react";

interface RoomOption {
  id: string;
  room_number: string;
  room_type?: { name: string } | null;
}

interface MaintenanceBoardProps {
  propertyId: string;
  workOrders: MaintenanceWorkOrder[];
  rooms: RoomOption[];
  staff: StaffOption[];
  onRefresh?: () => void;
}

export function MaintenanceBoard({
  propertyId,
  workOrders,
  rooms,
  staff,
  onRefresh,
}: MaintenanceBoardProps) {
  const [viewMode, setViewMode] = React.useState<"kanban" | "table">("kanban");
  const [statusFilter, setStatusFilter] = React.useState<string>("ALL");
  const [priorityFilter, setPriorityFilter] = React.useState<string>("ALL");
  const [categoryFilter, setCategoryFilter] = React.useState<string>("ALL");
  const [roomFilter, setRoomFilter] = React.useState<string>("ALL");
  const [staffFilter, setStaffFilter] = React.useState<string>("ALL");
  const [overdueOnly, setOverdueOnly] = React.useState<boolean>(false);
  const [searchQuery, setSearchQuery] = React.useState<string>("");

  // Modal States
  const [isNewModalOpen, setIsNewModalOpen] = React.useState<boolean>(false);
  const [assignModalWorkOrder, setAssignModalWorkOrder] = React.useState<MaintenanceWorkOrder | null>(null);
  const [resolveModalWorkOrder, setResolveModalWorkOrder] = React.useState<MaintenanceWorkOrder | null>(null);
  const [transitionModalWorkOrder, setTransitionModalWorkOrder] = React.useState<MaintenanceWorkOrder | null>(null);
  const [transitionActionType, setTransitionActionType] = React.useState<TransitionAction>("HOLD");

  // Filter Work Orders
  const now = new Date();
  const filteredWorkOrders = workOrders.filter((wo) => {
    if (statusFilter !== "ALL" && wo.status !== statusFilter) return false;
    if (priorityFilter !== "ALL" && wo.priority !== priorityFilter) return false;
    if (categoryFilter !== "ALL" && wo.category !== categoryFilter) return false;
    if (roomFilter !== "ALL") {
      if (roomFilter === "FACILITY" && wo.room_id !== null) return false;
      if (roomFilter !== "FACILITY" && wo.room_id !== roomFilter) return false;
    }
    if (staffFilter !== "ALL" && wo.assigned_to !== staffFilter) return false;

    const isUnresolved = !["RESOLVED", "CLOSED", "CANCELLED"].includes(wo.status);
    const isOverdue = isUnresolved && wo.scheduled_for && new Date(wo.scheduled_for) < new Date();
    if (overdueOnly && !isOverdue) return false;

    if (searchQuery.trim() !== "") {
      const query = searchQuery.toLowerCase();
      const matchTitle = wo.title.toLowerCase().includes(query);
      const matchDesc = wo.description?.toLowerCase().includes(query) || false;
      const matchRoom = wo.room?.room_number.toLowerCase().includes(query) || false;
      const matchTech = wo.technician?.full_name?.toLowerCase().includes(query) || false;
      if (!matchTitle && !matchDesc && !matchRoom && !matchTech) return false;
    }

    return true;
  });

  const kanbanColumns: { title: string; status: WorkOrderStatus[]; color: string }[] = [
    { title: "Open / Unassigned", status: ["OPEN"], color: "border-blue-500" },
    { title: "Assigned", status: ["ASSIGNED"], color: "border-indigo-500" },
    { title: "In Progress", status: ["IN_PROGRESS"], color: "border-purple-500" },
    { title: "On Hold", status: ["ON_HOLD"], color: "border-amber-500" },
    { title: "Resolved & Closed", status: ["RESOLVED", "CLOSED"], color: "border-emerald-500" },
  ];

  return (
    <div className="space-y-4">
      {/* Action Toolbar & Filters */}
      <Card className="p-4 bg-white border border-[var(--border)] shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--foreground-muted)]" />
            <Input
              type="text"
              placeholder="Search work orders, rooms, technicians..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-sm"
            />
          </div>

          {/* Quick Action & View Toggle */}
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsNewModalOpen(true)}
            >
              <Plus className="h-4 w-4 mr-1.5" />
              Report Work Order
            </Button>

            <div className="flex items-center border border-[var(--border)] rounded-lg p-0.5 bg-[var(--background-subtle)]">
              <button
                type="button"
                onClick={() => setViewMode("kanban")}
                className={`px-2.5 py-1 text-xs font-medium rounded-md flex items-center gap-1.5 transition-colors ${
                  viewMode === "kanban"
                    ? "bg-white text-[var(--foreground)] shadow-xs"
                    : "text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
                }`}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                Board
              </button>
              <button
                type="button"
                onClick={() => setViewMode("table")}
                className={`px-2.5 py-1 text-xs font-medium rounded-md flex items-center gap-1.5 transition-colors ${
                  viewMode === "table"
                    ? "bg-white text-[var(--foreground)] shadow-xs"
                    : "text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
                }`}
              >
                <List className="h-3.5 w-3.5" />
                Table
              </button>
            </div>
          </div>
        </div>

        {/* Filter Dropdowns */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 pt-3 mt-3 border-t border-[var(--border)]">
          {/* Status */}
          <div>
            <label className="block text-[10px] font-semibold text-[var(--foreground-muted)] uppercase mb-1">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full h-8 px-2 text-xs rounded-md border border-[var(--border)] bg-white text-[var(--foreground)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
            >
              <option value="ALL">All Statuses</option>
              <option value="OPEN">Open</option>
              <option value="ASSIGNED">Assigned</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="ON_HOLD">On Hold</option>
              <option value="RESOLVED">Resolved</option>
              <option value="CLOSED">Closed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>

          {/* Priority */}
          <div>
            <label className="block text-[10px] font-semibold text-[var(--foreground-muted)] uppercase mb-1">
              Priority
            </label>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="w-full h-8 px-2 text-xs rounded-md border border-[var(--border)] bg-white text-[var(--foreground)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
            >
              <option value="ALL">All Priorities</option>
              <option value="URGENT">Urgent</option>
              <option value="HIGH">High</option>
              <option value="NORMAL">Normal</option>
              <option value="LOW">Low</option>
            </select>
          </div>

          {/* Category */}
          <div>
            <label className="block text-[10px] font-semibold text-[var(--foreground-muted)] uppercase mb-1">
              Category
            </label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full h-8 px-2 text-xs rounded-md border border-[var(--border)] bg-white text-[var(--foreground)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
            >
              <option value="ALL">All Categories</option>
              <option value="PLUMBING">Plumbing</option>
              <option value="ELECTRICAL">Electrical</option>
              <option value="HVAC">HVAC</option>
              <option value="APPLIANCE">Appliance</option>
              <option value="FURNITURE">Furniture</option>
              <option value="LIGHTING">Lighting</option>
              <option value="DOOR_LOCK">Door / Lock</option>
              <option value="TV">TV / Media</option>
              <option value="WIFI_NETWORK">Wi-Fi / Net</option>
              <option value="CIVIL">Civil</option>
              <option value="SAFETY">Safety</option>
              <option value="OTHER">Other</option>
            </select>
          </div>

          {/* Room / Area */}
          <div>
            <label className="block text-[10px] font-semibold text-[var(--foreground-muted)] uppercase mb-1">
              Location
            </label>
            <select
              value={roomFilter}
              onChange={(e) => setRoomFilter(e.target.value)}
              className="w-full h-8 px-2 text-xs rounded-md border border-[var(--border)] bg-white text-[var(--foreground)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
            >
              <option value="ALL">All Locations</option>
              <option value="FACILITY">Property Area (No Room)</option>
              {rooms.map((r) => (
                <option key={r.id} value={r.id}>
                  Room {r.room_number}
                </option>
              ))}
            </select>
          </div>

          {/* Technician */}
          <div>
            <label className="block text-[10px] font-semibold text-[var(--foreground-muted)] uppercase mb-1">
              Technician
            </label>
            <select
              value={staffFilter}
              onChange={(e) => setStaffFilter(e.target.value)}
              className="w-full h-8 px-2 text-xs rounded-md border border-[var(--border)] bg-white text-[var(--foreground)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
            >
              <option value="ALL">All Staff</option>
              {staff.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.fullName}
                </option>
              ))}
            </select>
          </div>

          {/* Overdue Toggle */}
          <div className="flex items-end pb-1">
            <label className="flex items-center gap-1.5 cursor-pointer text-xs font-medium text-[var(--foreground)]">
              <input
                type="checkbox"
                checked={overdueOnly}
                onChange={(e) => setOverdueOnly(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-rose-600 focus:ring-rose-500"
              />
              <ClockAlert className="h-3.5 w-3.5 text-rose-500" />
              Overdue Only
            </label>
          </div>
        </div>
      </Card>

      {/* Main Board Representation */}
      {filteredWorkOrders.length === 0 ? (
        <Card className="p-12 text-center bg-white border border-[var(--border)]">
          <EmptyState
            title="No Maintenance Work Orders"
            description={
              searchQuery || statusFilter !== "ALL" || priorityFilter !== "ALL"
                ? "No work orders match the selected filters."
                : "All hotel equipment, guest rooms, and facilities are operating normally."
            }
            action={{
              label: "Report Work Order",
              onClick: () => setIsNewModalOpen(true),
            }}
          />
        </Card>
      ) : viewMode === "kanban" ? (
        /* Kanban View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {kanbanColumns.map((col) => {
            const columnOrders = filteredWorkOrders.filter((wo) =>
              col.status.includes(wo.status)
            );

            return (
              <div key={col.title} className="flex flex-col space-y-3">
                {/* Column Header */}
                <div
                  className={`flex items-center justify-between px-3 py-2 bg-white rounded-lg border-t-2 ${col.color} border-x border-b border-[var(--border)] shadow-xs`}
                >
                  <span className="text-xs font-bold text-[var(--foreground)] uppercase tracking-wider">
                    {col.title}
                  </span>
                  <Badge variant="default" size="sm">
                    {columnOrders.length}
                  </Badge>
                </div>

                {/* Cards */}
                <div className="space-y-2.5">
                  {columnOrders.map((wo) => {
                    const isUnresolved = !["RESOLVED", "CLOSED", "CANCELLED"].includes(wo.status);
                    const isOverdue = isUnresolved && wo.scheduled_for && new Date(wo.scheduled_for) < now;

                    return (
                      <Card
                        key={wo.id}
                        className="p-3.5 bg-white border border-[var(--border)] shadow-xs hover:shadow-md transition-shadow flex flex-col space-y-2.5"
                      >
                        {/* Header: Room/Area & Priority */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            {wo.room ? (
                              <span className="text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-800">
                                Room {wo.room.room_number}
                              </span>
                            ) : (
                              <span className="text-xs font-medium px-2 py-0.5 rounded bg-blue-50 text-blue-800">
                                Property Area
                              </span>
                            )}
                            <MaintenanceCategoryBadge category={wo.category} />
                          </div>
                          <MaintenancePriorityBadge priority={wo.priority} />
                        </div>

                        {/* Title & Description */}
                        <div>
                          <Link
                            href={`/maintenance/${wo.id}`}
                            className="text-sm font-semibold text-[var(--foreground)] hover:text-[var(--primary)] line-clamp-1"
                          >
                            {wo.title}
                          </Link>
                          {wo.description && (
                            <p className="text-xs text-[var(--foreground-muted)] line-clamp-2 mt-0.5">
                              {wo.description}
                            </p>
                          )}
                        </div>

                        {/* Meta & Overdue Tag */}
                        <div className="flex items-center justify-between text-[11px] text-[var(--foreground-subtle)] pt-1 border-t border-[var(--border)]">
                          <span>
                            Tech:{" "}
                            <strong className="text-[var(--foreground)] font-medium">
                              {wo.technician?.full_name || "Unassigned"}
                            </strong>
                          </span>
                          {isOverdue && (
                            <span className="text-[10px] font-bold text-red-600 flex items-center gap-0.5">
                              <ClockAlert className="h-3 w-3" /> Overdue
                            </span>
                          )}
                        </div>

                        {/* Quick Action Buttons */}
                        <div className="flex items-center justify-between pt-1 gap-1">
                          <Link
                            href={`/maintenance/${wo.id}`}
                            className="text-xs font-medium text-[var(--primary)] hover:underline flex items-center gap-0.5"
                          >
                            View <ArrowRight className="h-3 w-3" />
                          </Link>

                          <div className="flex items-center gap-1">
                            {wo.status === "OPEN" && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs px-2"
                                onClick={() => setAssignModalWorkOrder(wo)}
                              >
                                Assign
                              </Button>
                            )}

                            {(wo.status === "OPEN" || wo.status === "ASSIGNED" || wo.status === "ON_HOLD") && (
                              <Button
                                size="sm"
                                variant="primary"
                                className="h-7 text-xs px-2"
                                onClick={() => {
                                  if (wo.status === "ON_HOLD") {
                                    setTransitionModalWorkOrder(wo);
                                    setTransitionActionType("RESUME");
                                  } else {
                                    setAssignModalWorkOrder(wo);
                                  }
                                }}
                              >
                                {wo.status === "ON_HOLD" ? "Resume" : "Start"}
                              </Button>
                            )}

                            {wo.status === "IN_PROGRESS" && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-xs px-2 text-amber-600 border-amber-300"
                                  onClick={() => {
                                    setTransitionModalWorkOrder(wo);
                                    setTransitionActionType("HOLD");
                                  }}
                                >
                                  Hold
                                </Button>
                                <Button
                                  size="sm"
                                  variant="primary"
                                  className="h-7 text-xs px-2 bg-emerald-600 hover:bg-emerald-700"
                                  onClick={() => setResolveModalWorkOrder(wo)}
                                >
                                  Resolve
                                </Button>
                              </>
                            )}

                            {wo.status === "RESOLVED" && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs px-2"
                                onClick={() => {
                                  setTransitionModalWorkOrder(wo);
                                  setTransitionActionType("CLOSE");
                                }}
                              >
                                Close
                              </Button>
                            )}
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Table View */
        <Card className="bg-white border border-[var(--border)] shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[var(--background-subtle)] text-[var(--foreground-muted)] text-[11px] uppercase tracking-wider border-b border-[var(--border)]">
                <tr>
                  <th className="py-3 px-4 font-semibold">Location / Room</th>
                  <th className="py-3 px-4 font-semibold">Work Order</th>
                  <th className="py-3 px-4 font-semibold">Category</th>
                  <th className="py-3 px-4 font-semibold">Priority</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                  <th className="py-3 px-4 font-semibold">Technician</th>
                  <th className="py-3 px-4 font-semibold">Reported</th>
                  <th className="py-3 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {filteredWorkOrders.map((wo) => {
                  const isUnresolved = !["RESOLVED", "CLOSED", "CANCELLED"].includes(wo.status);
                  const isOverdue = isUnresolved && wo.scheduled_for && new Date(wo.scheduled_for) < now;

                  return (
                    <tr key={wo.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-medium">
                        {wo.room ? (
                          <span className="font-bold text-[var(--foreground)]">
                            Room {wo.room.room_number}
                          </span>
                        ) : (
                          <span className="text-xs font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                            Property Area
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <Link
                          href={`/maintenance/${wo.id}`}
                          className="font-semibold text-[var(--foreground)] hover:text-[var(--primary)] line-clamp-1"
                        >
                          {wo.title}
                        </Link>
                        {wo.description && (
                          <p className="text-xs text-[var(--foreground-muted)] line-clamp-1">
                            {wo.description}
                          </p>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <MaintenanceCategoryBadge category={wo.category} />
                      </td>
                      <td className="py-3 px-4">
                        <MaintenancePriorityBadge priority={wo.priority} />
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <WorkOrderStatusBadge status={wo.status} />
                          {isOverdue && (
                            <span className="text-[10px] font-bold text-red-600 flex items-center gap-0.5">
                              <ClockAlert className="h-3 w-3" /> Overdue
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-xs text-[var(--foreground-muted)]">
                        {wo.technician?.full_name || (
                          <span className="text-slate-400 italic">Unassigned</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-xs text-[var(--foreground-muted)] font-mono">
                        {new Date(wo.reported_at).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {wo.status === "OPEN" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs"
                              onClick={() => setAssignModalWorkOrder(wo)}
                            >
                              Assign
                            </Button>
                          )}
                          {wo.status === "IN_PROGRESS" && (
                            <Button
                              size="sm"
                              variant="primary"
                              className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700"
                              onClick={() => setResolveModalWorkOrder(wo)}
                            >
                              Resolve
                            </Button>
                          )}
                          <Link href={`/maintenance/${wo.id}`}>
                            <Button size="sm" variant="outline" className="h-7 text-xs">
                              Details
                            </Button>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Modals */}
      <NewWorkOrderModal
        isOpen={isNewModalOpen}
        onClose={() => setIsNewModalOpen(false)}
        propertyId={propertyId}
        rooms={rooms}
        staff={staff}
        onSuccess={onRefresh}
      />

      <AssignWorkOrderModal
        isOpen={assignModalWorkOrder !== null}
        onClose={() => setAssignModalWorkOrder(null)}
        workOrder={assignModalWorkOrder}
        staff={staff}
        onSuccess={onRefresh}
      />

      <ResolveWorkOrderModal
        isOpen={resolveModalWorkOrder !== null}
        onClose={() => setResolveModalWorkOrder(null)}
        workOrder={resolveModalWorkOrder}
        onSuccess={onRefresh}
      />

      <StatusTransitionModal
        isOpen={transitionModalWorkOrder !== null}
        onClose={() => setTransitionModalWorkOrder(null)}
        workOrder={transitionModalWorkOrder}
        actionType={transitionActionType}
        onSuccess={onRefresh}
      />
    </div>
  );
}
