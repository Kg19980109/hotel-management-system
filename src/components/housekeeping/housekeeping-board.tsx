"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { Avatar } from "@/components/ui/avatar";
import { OperationalStatusBadge } from "@/components/rooms/room-status-badge";
import {
  TaskStatusBadge,
  PriorityBadge,
  TaskTypeBadge,
} from "./task-status-badge";
import { AssignTaskModal } from "./assign-task-modal";
import { InspectionModal } from "./inspection-modal";
import { NewTaskModal } from "./new-task-modal";
import {
  HousekeepingTask,
  StaffOption,
} from "@/lib/housekeeping/types";
import {
  startHousekeepingTaskAction,
  completeHousekeepingTaskAction,
} from "@/lib/housekeeping/actions";
import {
  Search,
  Plus,
  Play,
  CheckCheck,
  UserCheck,
  ClipboardCheck,
  LayoutGrid,
  List,
  Loader2,
  Layers,
  Sparkles,
} from "lucide-react";

import { useAuth } from "@/lib/auth/context";

interface FloorOption {
  id: string;
  floorNumber: number;
  name: string;
}

interface RoomOption {
  id: string;
  roomNumber: string;
  roomTypeName: string;
  status: string;
  housekeepingStatus: string;
}

interface HousekeepingBoardProps {
  tasks: HousekeepingTask[];
  floors: FloorOption[];
  rooms: RoomOption[];
  staffList: StaffOption[];
  propertyId: string;
  userRole?: string;
}

export function HousekeepingBoard({
  tasks,
  floors,
  rooms,
  staffList,
  propertyId,
}: HousekeepingBoardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, profile } = useAuth();
  const currentUserId = user?.id;
  const currentProfileId = profile?.id;

  // Filters State from URL or local
  const [viewMode, setViewMode] = React.useState<"board" | "table">("board");
  const [statusFilter, setStatusFilter] = React.useState<string>(
    searchParams.get("status") || "ALL"
  );
  const [priorityFilter, setPriorityFilter] = React.useState<string>(
    searchParams.get("priority") || "ALL"
  );
  const [typeFilter, setTypeFilter] = React.useState<string>(
    searchParams.get("type") || "ALL"
  );
  const [floorFilter, setFloorFilter] = React.useState<string>(
    searchParams.get("floor") || "ALL"
  );
  const [assignedFilter, setAssignedFilter] = React.useState<string>(
    searchParams.get("assigned") || "ALL"
  );
  const [searchQuery, setSearchQuery] = React.useState<string>(
    searchParams.get("q") || ""
  );

  // Modals state
  const [assignModalTask, setAssignModalTask] = React.useState<HousekeepingTask | null>(null);
  const [inspectModalTask, setInspectModalTask] = React.useState<HousekeepingTask | null>(null);
  const [isNewTaskModalOpen, setIsNewTaskModalOpen] = React.useState(false);
  const [actionLoadingId, setActionLoadingId] = React.useState<string | null>(null);

  // Quick Action Handlers
  const handleStartTask = async (task: HousekeepingTask) => {
    setActionLoadingId(task.id);
    await startHousekeepingTaskAction({ propertyId, taskId: task.id });
    setActionLoadingId(null);
    router.refresh();
  };

  const handleCompleteTask = async (task: HousekeepingTask) => {
    setActionLoadingId(task.id);
    await completeHousekeepingTaskAction({ propertyId, taskId: task.id });
    setActionLoadingId(null);
    router.refresh();
  };

  // Filter Tasks Client-side or from filtered list
  const filteredTasks = React.useMemo(() => {
    return tasks.filter((t) => {
      if (statusFilter !== "ALL" && t.status !== statusFilter) return false;
      if (priorityFilter !== "ALL" && t.priority !== priorityFilter) return false;
      if (typeFilter !== "ALL" && t.task_type !== typeFilter) return false;
      if (floorFilter !== "ALL" && t.room?.floor_id !== floorFilter) return false;
      if (assignedFilter === "MY_WORK") {
        if (t.assigned_to !== currentUserId && t.assigned_to !== currentProfileId) return false;
      } else if (assignedFilter !== "ALL") {
        if (assignedFilter === "UNASSIGNED" && t.assigned_to) return false;
        if (assignedFilter !== "UNASSIGNED" && t.assigned_to !== assignedFilter) return false;
      }
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const roomNumber = t.room?.room_number.toLowerCase() || "";
        const notes = (t.notes || "").toLowerCase();
        if (!roomNumber.includes(query) && !notes.includes(query)) return false;
      }
      return true;
    });
  }, [tasks, statusFilter, priorityFilter, typeFilter, floorFilter, assignedFilter, searchQuery, currentUserId, currentProfileId]);

  return (
    <div className="space-y-4">
      {/* Controls Bar */}
      <div className="stayhub-card p-4 flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
        {/* Search & Main Filters */}
        <div className="flex flex-1 flex-wrap gap-2.5 items-center">
          <div className="relative w-full sm:w-48 md:w-56">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--foreground-muted)]" />
            <Input
              type="search"
              placeholder="Search room..."
              className="pl-9 text-xs h-9 bg-[var(--background-subtle)]"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full sm:w-36 text-xs h-9"
          >
            <option value="ALL">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="ASSIGNED">Assigned</option>
            <option value="IN_PROGRESS">Cleaning</option>
            <option value="INSPECTION_PENDING">Inspection Pending</option>
            <option value="COMPLETED">Completed</option>
          </Select>

          <Select
            value={floorFilter}
            onChange={(e) => setFloorFilter(e.target.value)}
            className="w-full sm:w-32 text-xs h-9"
          >
            <option value="ALL">All Floors</option>
            {floors.map((f) => (
              <option key={f.id} value={f.id}>
                Floor {f.floorNumber}
              </option>
            ))}
          </Select>

          <Select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="w-full sm:w-32 text-xs h-9"
          >
            <option value="ALL">All Priorities</option>
            <option value="URGENT">Urgent</option>
            <option value="HIGH">High</option>
            <option value="NORMAL">Normal</option>
            <option value="LOW">Low</option>
          </Select>

          <Select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="w-full sm:w-36 text-xs h-9"
          >
            <option value="ALL">All Task Types</option>
            <option value="CLEANING">Cleaning</option>
            <option value="DEEP_CLEAN">Deep Clean</option>
            <option value="TURNDOWN">Turndown</option>
            <option value="INSPECTION">Inspection</option>
            <option value="LINEN_CHANGE">Linen Change</option>
            <option value="TOUCHUP">Touchup</option>
          </Select>

          <Select
            value={assignedFilter}
            onChange={(e) => setAssignedFilter(e.target.value)}
            className="w-full sm:w-36 text-xs h-9"
          >
            <option value="ALL">All Staff</option>
            <option value="MY_WORK">My Tasks</option>
            <option value="UNASSIGNED">Unassigned</option>
            {staffList.map((s) => (
              <option key={s.userId} value={s.userId}>
                {s.fullName}
              </option>
            ))}
          </Select>

          <Button
            type="button"
            variant={assignedFilter === "MY_WORK" ? "primary" : "outline"}
            size="sm"
            onClick={() => setAssignedFilter((prev) => (prev === "MY_WORK" ? "ALL" : "MY_WORK"))}
            className="h-9 text-xs font-semibold shrink-0"
          >
            <Sparkles className="h-3.5 w-3.5 mr-1" />
            My Tasks
          </Button>
        </div>

        {/* View Toggle & New Task Button */}
        <div className="flex items-center gap-2">
          <div className="flex bg-[var(--background-subtle)] p-1 rounded-xl border border-[var(--border)]">
            <button
              onClick={() => setViewMode("board")}
              className={`p-1.5 rounded-lg text-xs flex items-center gap-1 font-medium transition-colors ${
                viewMode === "board"
                  ? "bg-white dark:bg-slate-800 text-[var(--foreground)] shadow-xs font-semibold"
                  : "text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
              }`}
              title="Board View"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode("table")}
              className={`p-1.5 rounded-lg text-xs flex items-center gap-1 font-medium transition-colors ${
                viewMode === "table"
                  ? "bg-white dark:bg-slate-800 text-[var(--foreground)] shadow-xs font-semibold"
                  : "text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
              }`}
              title="Table View"
            >
              <List className="h-4 w-4" />
            </button>
          </div>

          <Button
            variant="primary"
            onClick={() => setIsNewTaskModalOpen(true)}
            className="text-xs h-9 font-semibold"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            New Task
          </Button>
        </div>
      </div>

      {/* Content Rendering: Board vs Table */}
      {filteredTasks.length === 0 ? (
        <div className="stayhub-card p-12 text-center">
          <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-3 text-emerald-500">
            <CheckCheck className="h-6 w-6" />
          </div>
          <h3 className="text-base font-bold text-[var(--foreground)] font-heading">
            No Housekeeping Tasks Found
          </h3>
          <p className="text-xs text-[var(--foreground-muted)] max-w-sm mx-auto mt-1 mb-4">
            There are no active housekeeping tasks matching the current filters. All rooms may be clean and inspected.
          </p>
          <Button
            variant="outline"
            onClick={() => setIsNewTaskModalOpen(true)}
            size="sm"
            className="h-9 text-xs"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Create Cleaning Task
          </Button>
        </div>
      ) : viewMode === "board" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredTasks.map((task) => {
            const isLoading = actionLoadingId === task.id;
            const isUrgent = task.priority === "URGENT";
            return (
              <div
                key={task.id}
                className={`stayhub-card overflow-hidden flex flex-col justify-between transition-all duration-200 hover:-translate-y-1 hover:shadow-lg ${
                  isUrgent ? "border-rose-400/50 ring-2 ring-rose-400/15" : ""
                }`}
              >
                {/* Midnight Header Accent */}
                <div className="bg-gradient-to-r from-[#08111F] via-[#0E1A36] to-[#14234A] px-4 py-3 text-white flex items-center justify-between border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <span className="text-base font-extrabold font-mono tracking-tight text-white">
                      Room {task.room?.room_number}
                    </span>
                    <PriorityBadge priority={task.priority} />
                  </div>
                  <TaskTypeBadge type={task.task_type} />
                </div>

                {/* Card Body */}
                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div>
                    <p className="text-[11px] text-[var(--foreground-muted)] flex items-center gap-1.5 mb-2.5">
                      <Layers className="h-3.5 w-3.5 text-slate-400" />
                      <span>Floor {task.room?.floor?.floor_number || 1} • {task.room?.room_type?.name || "Standard Room"}</span>
                    </p>

                    {/* Room status & Task status pills */}
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      <OperationalStatusBadge status={task.room?.status || "DIRTY"} />
                      <TaskStatusBadge status={task.status} size="sm" />
                    </div>

                    {/* Assigned staff */}
                    <div className="bg-[var(--background-subtle)] p-2.5 rounded-xl border border-[var(--border)] text-xs flex items-center justify-between my-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <Avatar
                          src={task.assigned_profile?.avatar_url || undefined}
                          name={task.assigned_profile?.full_name || "Unassigned"}
                          size="sm"
                        />
                        <div className="min-w-0">
                          <p className="font-semibold text-[var(--foreground)] leading-tight truncate">
                            {task.assigned_profile?.full_name || "Unassigned"}
                          </p>
                          <p className="text-[10px] text-[var(--foreground-subtle)]">
                            {task.assigned_profile ? "Assigned Cleaner" : "Ready to assign"}
                          </p>
                        </div>
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setAssignModalTask(task)}
                        className="text-[11px] h-7 px-2 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 font-medium shrink-0 ml-1"
                      >
                        <UserCheck className="h-3.5 w-3.5 mr-1" />
                        {task.assigned_to ? "Change" : "Assign"}
                      </Button>
                    </div>

                    {/* Notes / Special Instructions */}
                    {task.notes && (
                      <p className="text-xs text-[var(--foreground-muted)] line-clamp-2 italic bg-amber-500/10 p-2.5 rounded-xl border border-amber-500/20 mb-2">
                        &quot;{task.notes}&quot;
                      </p>
                    )}
                  </div>

                  {/* Footer Operations Actions */}
                  <div className="pt-3 border-t border-[var(--border)] mt-2">
                    {task.status === "PENDING" || task.status === "ASSIGNED" ? (
                      <Button
                        variant="primary"
                        className="w-full text-xs font-bold h-9 shadow-sm"
                        disabled={isLoading}
                        onClick={() => handleStartTask(task)}
                      >
                        {isLoading ? (
                          <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                        ) : (
                          <Play className="h-4 w-4 mr-1.5" />
                        )}
                        Start Cleaning
                      </Button>
                    ) : task.status === "IN_PROGRESS" ? (
                      <Button
                        variant="primary"
                        className="w-full text-xs font-bold h-9 bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-sm"
                        disabled={isLoading}
                        onClick={() => handleCompleteTask(task)}
                      >
                        {isLoading ? (
                          <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                        ) : (
                          <CheckCheck className="h-4 w-4 mr-1.5" />
                        )}
                        Send for Inspection
                      </Button>
                    ) : task.status === "INSPECTION_PENDING" ? (
                      <Button
                        variant="primary"
                        className="w-full text-xs font-bold h-9 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                        onClick={() => setInspectModalTask(task)}
                      >
                        <ClipboardCheck className="h-4 w-4 mr-1.5" />
                        Inspect Room
                      </Button>
                    ) : (
                      <div className="text-center text-xs text-emerald-600 font-bold py-1.5 bg-emerald-500/10 rounded-lg">
                        Task Completed
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Table View */
        <div className="stayhub-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[var(--background-subtle)] border-b border-[var(--border)] text-[var(--foreground-muted)] uppercase tracking-wider font-bold text-[10px]">
                  <th className="py-3 px-4">Room</th>
                  <th className="py-3 px-4">Floor / Type</th>
                  <th className="py-3 px-4">Room Status</th>
                  <th className="py-3 px-4">Task Type</th>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4">Task Status</th>
                  <th className="py-3 px-4">Assigned Staff</th>
                  <th className="py-3 px-4">Notes</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {filteredTasks.map((task) => {
                  const isLoading = actionLoadingId === task.id;
                  return (
                    <tr key={task.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4 font-bold font-mono text-[var(--foreground)] text-sm">
                        Room {task.room?.room_number}
                      </td>
                      <td className="py-3.5 px-4 text-[var(--foreground-muted)]">
                        Floor {task.room?.floor?.floor_number || 1} • {task.room?.room_type?.name}
                      </td>
                      <td className="py-3.5 px-4">
                        <OperationalStatusBadge status={task.room?.status || "DIRTY"} />
                      </td>
                      <td className="py-3.5 px-4">
                        <TaskTypeBadge type={task.task_type} />
                      </td>
                      <td className="py-3.5 px-4">
                        <PriorityBadge priority={task.priority} />
                      </td>
                      <td className="py-3.5 px-4">
                        <TaskStatusBadge status={task.status} />
                      </td>
                      <td className="py-3.5 px-4 font-medium text-[var(--foreground)]">
                        {task.assigned_profile ? (
                          <div className="flex items-center gap-1.5">
                            <Avatar
                              src={task.assigned_profile.avatar_url || undefined}
                              name={task.assigned_profile.full_name}
                              size="sm"
                            />
                            <span className="truncate max-w-[120px]">{task.assigned_profile.full_name}</span>
                          </div>
                        ) : (
                          <span className="text-[var(--foreground-subtle)] italic">Unassigned</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-[var(--foreground-muted)] max-w-xs truncate">
                        {task.notes || "-"}
                      </td>
                      <td className="py-3.5 px-4 text-right space-x-1.5 whitespace-nowrap">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setAssignModalTask(task)}
                          className="text-xs h-7 px-2"
                        >
                          Assign
                        </Button>
                        {task.status === "PENDING" || task.status === "ASSIGNED" ? (
                          <Button
                            variant="primary"
                            size="sm"
                            disabled={isLoading}
                            onClick={() => handleStartTask(task)}
                            className="text-xs h-7 px-2.5 font-bold"
                          >
                            {isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : "Start"}
                          </Button>
                        ) : task.status === "IN_PROGRESS" ? (
                          <Button
                            variant="primary"
                            size="sm"
                            disabled={isLoading}
                            onClick={() => handleCompleteTask(task)}
                            className="text-xs h-7 px-2.5 font-bold bg-amber-500 hover:bg-amber-600 text-slate-950"
                          >
                            {isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : "Complete"}
                          </Button>
                        ) : task.status === "INSPECTION_PENDING" ? (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => setInspectModalTask(task)}
                            className="text-xs h-7 px-2.5 font-bold bg-emerald-600 hover:bg-emerald-700"
                          >
                            Inspect
                          </Button>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modals */}
      <AssignTaskModal
        task={assignModalTask}
        isOpen={!!assignModalTask}
        onClose={() => setAssignModalTask(null)}
        staffList={staffList}
        propertyId={propertyId}
        onSuccess={() => router.refresh()}
      />

      <InspectionModal
        task={inspectModalTask}
        isOpen={!!inspectModalTask}
        onClose={() => setInspectModalTask(null)}
        propertyId={propertyId}
        onSuccess={() => router.refresh()}
      />

      <NewTaskModal
        isOpen={isNewTaskModalOpen}
        onClose={() => setIsNewTaskModalOpen(false)}
        propertyId={propertyId}
        rooms={rooms}
        staffList={staffList}
        onSuccess={() => router.refresh()}
      />
    </div>
  );
}
