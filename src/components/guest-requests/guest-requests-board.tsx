"use client";

import * as React from "react";
import Link from "next/link";
import { 
  Search, 
  RotateCcw, 
  Clock, 
  Eye
} from "lucide-react";
import { StaffGuestServiceRequest, ServiceRequestStatus } from "@/lib/guest-services/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { AssignRequestModal } from "./assign-request-modal";
import { StatusActionModal, StatusActionType } from "./status-action-modal";

interface GuestRequestsBoardProps {
  propertyId: string;
  requests: StaffGuestServiceRequest[];
  staffMembers: { id: string; full_name: string; email: string }[];
  onRefresh: () => void;
}

export function GuestRequestsBoard({
  propertyId,
  requests,
  staffMembers,
  onRefresh,
}: GuestRequestsBoardProps) {
  const [search, setSearch] = React.useState("");
  const [selectedCategory, setSelectedCategory] = React.useState("ALL");
  const [selectedStatus, setSelectedStatus] = React.useState("ALL");
  const [selectedPriority, setSelectedPriority] = React.useState("ALL");

  // Modal States
  const [assignTarget, setAssignTarget] = React.useState<StaffGuestServiceRequest | null>(null);
  const [actionTarget, setActionTarget] = React.useState<{
    request: StaffGuestServiceRequest;
    type: StatusActionType;
  } | null>(null);

  // Filtered requests
  const filtered = React.useMemo(() => {
    return requests.filter((r) => {
      if (selectedCategory !== "ALL" && r.category !== selectedCategory) return false;
      if (selectedStatus !== "ALL" && r.status !== selectedStatus) return false;
      if (selectedPriority !== "ALL" && r.priority !== selectedPriority) return false;

      if (search.trim().length > 0) {
        const s = search.toLowerCase().trim();
        const room = (r.room?.room_number || "").toLowerCase();
        const guest = `${r.guest?.first_name || ""} ${r.guest?.last_name || ""}`.toLowerCase();
        const title = (r.title || "").toLowerCase();
        const id = (r.id || "").toLowerCase();
        if (!room.includes(s) && !guest.includes(s) && !title.includes(s) && !id.includes(s)) {
          return false;
        }
      }

      return true;
    });
  }, [requests, selectedCategory, selectedStatus, selectedPriority, search]);

  // KPI calculations
  const total = requests.length;
  const submitted = requests.filter((r) => r.status === "SUBMITTED").length;
  const inProgress = requests.filter((r) => r.status === "IN_PROGRESS" || r.status === "ASSIGNED" || r.status === "ACKNOWLEDGED").length;
  const completed = requests.filter((r) => r.status === "COMPLETED").length;

  const getPriorityBadge = (p: string) => {
    switch (p) {
      case "URGENT":
        return <Badge variant="danger" className="font-bold">URGENT</Badge>;
      case "HIGH":
        return <Badge variant="warning" className="font-semibold">HIGH</Badge>;
      case "LOW":
        return <Badge variant="default">LOW</Badge>;
      default:
        return <Badge variant="info">MEDIUM</Badge>;
    }
  };

  const getStatusBadge = (s: ServiceRequestStatus) => {
    switch (s) {
      case "COMPLETED":
        return <Badge variant="success">COMPLETED</Badge>;
      case "IN_PROGRESS":
        return <Badge variant="info">IN PROGRESS</Badge>;
      case "ASSIGNED":
        return <Badge variant="info">ASSIGNED</Badge>;
      case "ACKNOWLEDGED":
        return <Badge variant="warning">ACKNOWLEDGED</Badge>;
      case "CANCELLED":
      case "REJECTED":
        return <Badge variant="danger">{s}</Badge>;
      default:
        return <Badge variant="pending">SUBMITTED</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-card border shadow-sm space-y-1">
          <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Total Requests</p>
          <p className="text-2xl font-black">{total}</p>
        </div>
        <div className="p-4 rounded-xl bg-card border border-amber-500/20 shadow-sm space-y-1">
          <p className="text-xs text-amber-500 uppercase font-bold tracking-wider">New / Submitted</p>
          <p className="text-2xl font-black text-amber-500">{submitted}</p>
        </div>
        <div className="p-4 rounded-xl bg-card border border-blue-500/20 shadow-sm space-y-1">
          <p className="text-xs text-blue-500 uppercase font-bold tracking-wider">Active / In-Progress</p>
          <p className="text-2xl font-black text-blue-500">{inProgress}</p>
        </div>
        <div className="p-4 rounded-xl bg-card border border-emerald-500/20 shadow-sm space-y-1">
          <p className="text-xs text-emerald-500 uppercase font-bold tracking-wider">Completed Today</p>
          <p className="text-2xl font-black text-emerald-500">{completed}</p>
        </div>
      </div>

      {/* 2. Filter Bar */}
      <div className="p-4 rounded-xl bg-card border shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search room, guest name, title..."
              className="pl-9"
            />
          </div>

          <div className="flex flex-wrap gap-2.5 w-full md:w-auto items-center justify-end">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="h-10 px-3 rounded-lg border border-[var(--border)] bg-card text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 text-[var(--foreground)]"
            >
              <option value="ALL">All Categories</option>
              <option value="HOUSEKEEPING">Housekeeping</option>
              <option value="FRONT_DESK">Front Desk</option>
              <option value="CONCIERGE">Concierge</option>
              <option value="MAINTENANCE">Maintenance</option>
              <option value="LAUNDRY">Laundry</option>
              <option value="SPA">Spa</option>
              <option value="TRANSPORT">Transport</option>
              <option value="ROOM_SERVICE">In-Room Dining</option>
              <option value="OTHER">Other</option>
            </select>

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="h-10 px-3 rounded-lg border border-[var(--border)] bg-card text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 text-[var(--foreground)]"
            >
              <option value="ALL">All Statuses</option>
              <option value="SUBMITTED">Submitted</option>
              <option value="ACKNOWLEDGED">Acknowledged</option>
              <option value="ASSIGNED">Assigned</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
              <option value="REJECTED">Rejected</option>
            </select>

            <select
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
              className="h-10 px-3 rounded-lg border border-[var(--border)] bg-card text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 text-[var(--foreground)]"
            >
              <option value="ALL">All Priorities</option>
              <option value="URGENT">Urgent</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>

            <Button variant="outline" size="icon" onClick={onRefresh} title="Refresh Requests">
              <RotateCcw className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* 3. Requests Table */}
      {filtered.length === 0 ? (
        <div className="p-12 text-center rounded-xl bg-card border border-dashed space-y-2">
          <Clock className="w-8 h-8 text-muted-foreground mx-auto" />
          <h3 className="text-sm font-bold">No guest requests match your filters</h3>
          <p className="text-xs text-muted-foreground">Try clearing filters or search terms.</p>
        </div>
      ) : (
        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/50 border-b text-muted-foreground uppercase font-bold tracking-wider">
                <tr>
                  <th className="py-3 px-4">Room</th>
                  <th className="py-3 px-4">Guest</th>
                  <th className="py-3 px-4">Category / Type</th>
                  <th className="py-3 px-4">Request Title & Note</th>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Assigned To</th>
                  <th className="py-3 px-4">Time</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map((r) => (
                  <tr key={r.id} className="hover:bg-muted/30 transition">
                    <td className="py-3 px-4 font-bold text-foreground whitespace-nowrap">
                      Room {r.room?.room_number || "—"}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      {r.guest?.first_name} {r.guest?.last_name}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="space-y-0.5">
                        <span className="font-semibold text-foreground block">{r.category}</span>
                        <span className="text-[10px] text-muted-foreground">{r.request_type}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 max-w-xs">
                      <p className="font-semibold text-foreground line-clamp-1">{r.title}</p>
                      {r.description && (
                        <p className="text-[11px] text-muted-foreground line-clamp-1">{r.description}</p>
                      )}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      {getPriorityBadge(r.priority)}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      {getStatusBadge(r.status)}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      {r.assigned_staff ? (
                        <span className="font-medium">{r.assigned_staff.full_name}</span>
                      ) : r.assigned_department ? (
                        <span className="text-muted-foreground italic">Dept: {r.assigned_department}</span>
                      ) : (
                        <span className="text-muted-foreground italic">Unassigned</span>
                      )}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-muted-foreground">
                      {new Date(r.requested_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap space-x-1">
                      {r.status === "SUBMITTED" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 border-amber-500/30"
                          onClick={() => setActionTarget({ request: r, type: "ACKNOWLEDGE" })}
                        >
                          Acknowledge
                        </Button>
                      )}

                      {r.status !== "COMPLETED" && r.status !== "CANCELLED" && r.status !== "REJECTED" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={() => setAssignTarget(r)}
                        >
                          Assign
                        </Button>
                      )}

                      {r.status === "ASSIGNED" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 border-blue-500/30"
                          onClick={() => setActionTarget({ request: r, type: "START" })}
                        >
                          Start
                        </Button>
                      )}

                      {r.status === "IN_PROGRESS" && (
                        <Button
                          size="sm"
                          variant="success"
                          className="h-7 text-xs"
                          onClick={() => setActionTarget({ request: r, type: "COMPLETE" })}
                        >
                          Complete
                        </Button>
                      )}

                      <Link href={`/guest-requests/${r.id}`}>
                        <Button size="sm" variant="ghost" className="h-7 text-xs">
                          <Eye className="w-3.5 h-3.5" />
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
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
