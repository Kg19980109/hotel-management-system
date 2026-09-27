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
  BellRing,
  Inbox,
  CheckCircle2,
  AlertTriangle
} from "lucide-react";
import { StaffGuestServiceRequest, ServiceRequestStatus } from "@/lib/guest-services/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { KPIWidget } from "@/components/hotel/hotel-cards";
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
        return <Badge variant="danger" className="font-black animate-pulse">URGENT</Badge>;
      case "HIGH":
        return <Badge variant="warning" className="font-bold">HIGH</Badge>;
      case "LOW":
        return <Badge variant="default" className="text-slate-500">LOW</Badge>;
      default:
        return <Badge variant="info">NORMAL</Badge>;
    }
  };

  const getStatusBadge = (s: ServiceRequestStatus) => {
    switch (s) {
      case "COMPLETED":
        return <Badge variant="success" className="font-bold">COMPLETED</Badge>;
      case "IN_PROGRESS":
        return <Badge variant="info" className="font-bold">IN PROGRESS</Badge>;
      case "ASSIGNED":
        return <Badge variant="info">ASSIGNED</Badge>;
      case "ACKNOWLEDGED":
        return <Badge variant="warning" className="font-bold">ACKNOWLEDGED</Badge>;
      case "CANCELLED":
      case "REJECTED":
        return <Badge variant="danger">{s}</Badge>;
      default:
        return <Badge variant="pending" className="font-bold text-amber-500">SUBMITTED</Badge>;
    }
  };

  const getCategoryIcon = (cat: string) => {
    switch (cat?.toUpperCase()) {
      case "HOUSEKEEPING":
        return <Sparkles className="w-3.5 h-3.5 text-emerald-500" />;
      case "MAINTENANCE":
        return <Wrench className="w-3.5 h-3.5 text-blue-500" />;
      case "ROOM_SERVICE":
      case "FOOD":
        return <Utensils className="w-3.5 h-3.5 text-amber-500" />;
      case "LAUNDRY":
        return <Shirt className="w-3.5 h-3.5 text-cyan-500" />;
      case "TRANSPORT":
        return <Car className="w-3.5 h-3.5 text-indigo-500" />;
      default:
        return <BellRing className="w-3.5 h-3.5 text-violet-500" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Canonical KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPIWidget
          title="Total Requests"
          value={total}
          trendLabel="Hotel-wide logs"
          color="primary"
          icon={<Inbox className="w-4 h-4 text-primary" />}
        />
        <KPIWidget
          title="New / Submitted"
          value={submitted}
          trendLabel={submitted > 0 ? "Requires triage" : "Acknowledged"}
          color="warning"
          icon={<AlertTriangle className="w-4 h-4 text-amber-500" />}
        />
        <KPIWidget
          title="Active / In-Progress"
          value={inProgress}
          trendLabel="In operational dispatch"
          color="info"
          icon={<Clock className="w-4 h-4 text-blue-500" />}
        />
        <KPIWidget
          title="Completed Today"
          value={completed}
          trendLabel="Resolved"
          color="success"
          icon={<CheckCircle2 className="w-4 h-4 text-emerald-500" />}
        />
      </div>

      {/* 2. Filter Bar in stayhub-card */}
      <div className="stayhub-card p-4 space-y-3">
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search room, guest name, title..."
              className="pl-9 bg-background/50 h-10 border-border/80 rounded-xl"
            />
          </div>

          <div className="flex flex-wrap gap-2.5 w-full md:w-auto items-center justify-end">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="h-10 px-3.5 rounded-xl border border-border bg-card text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#D4AF37] text-foreground transition"
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
              className="h-10 px-3.5 rounded-xl border border-border bg-card text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#D4AF37] text-foreground transition"
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
              className="h-10 px-3.5 rounded-xl border border-border bg-card text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#D4AF37] text-foreground transition"
            >
              <option value="ALL">All Priorities</option>
              <option value="URGENT">Urgent</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>

            <Button variant="outline" size="icon" onClick={onRefresh} title="Refresh Requests" className="h-10 w-10 rounded-xl">
              <RotateCcw className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* 3. Requests Table in stayhub-card */}
      {filtered.length === 0 ? (
        <div className="stayhub-card p-12 text-center border-dashed space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-muted/60 flex items-center justify-center mx-auto text-muted-foreground">
            <Clock className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-foreground">No guest requests match your filters</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            Try adjusting your search criteria or clearing department filters to view active hotel tickets.
          </p>
        </div>
      ) : (
        <div className="stayhub-card p-0 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#0B1528]/5 dark:bg-white/5 border-b border-border text-muted-foreground uppercase font-bold tracking-wider text-[10px]">
                <tr>
                  <th className="py-3.5 px-4">Room</th>
                  <th className="py-3.5 px-4">Guest</th>
                  <th className="py-3.5 px-4">Category / Type</th>
                  <th className="py-3.5 px-4">Request Title & Note</th>
                  <th className="py-3.5 px-4">Priority</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Assigned To</th>
                  <th className="py-3.5 px-4">Time</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filtered.map((r) => (
                  <tr key={r.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-3.5 px-4 font-black whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary/10 text-primary border border-primary/20 text-xs">
                        <BedDouble className="w-3.5 h-3.5" />
                        Room {r.room?.room_number || "—"}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="font-semibold text-foreground">
                        {r.guest?.first_name} {r.guest?.last_name}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <div className="p-1 rounded bg-muted/60">
                          {getCategoryIcon(r.category)}
                        </div>
                        <div className="space-y-0.5">
                          <span className="font-semibold text-foreground block text-xs">{r.category}</span>
                          <span className="text-[10px] text-muted-foreground block">{r.request_type}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 max-w-xs">
                      <p className="font-bold text-foreground text-xs line-clamp-1">{r.title}</p>
                      {r.description && (
                        <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">{r.description}</p>
                      )}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {getPriorityBadge(r.priority)}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {getStatusBadge(r.status)}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {r.assigned_staff ? (
                        <span className="font-medium text-foreground">{r.assigned_staff.full_name}</span>
                      ) : r.assigned_department ? (
                        <span className="text-muted-foreground italic text-xs">Dept: {r.assigned_department}</span>
                      ) : (
                        <span className="text-muted-foreground/80 italic text-xs">Unassigned</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap text-muted-foreground font-mono text-[11px]">
                      {new Date(r.requested_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap space-x-1.5">
                      {r.status === "SUBMITTED" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 border-amber-500/30 font-bold"
                          onClick={() => setActionTarget({ request: r, type: "ACKNOWLEDGE" })}
                        >
                          Accept
                        </Button>
                      )}

                      {r.status !== "COMPLETED" && r.status !== "CANCELLED" && r.status !== "REJECTED" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs font-semibold"
                          onClick={() => setAssignTarget(r)}
                        >
                          Assign
                        </Button>
                      )}

                      {r.status === "ASSIGNED" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 border-blue-500/30 font-semibold"
                          onClick={() => setActionTarget({ request: r, type: "START" })}
                        >
                          Start
                        </Button>
                      )}

                      {r.status === "IN_PROGRESS" && (
                        <Button
                          size="sm"
                          variant="success"
                          className="h-7 text-xs font-bold"
                          onClick={() => setActionTarget({ request: r, type: "COMPLETE" })}
                        >
                          Complete
                        </Button>
                      )}

                      <Link href={`/guest-requests/${r.id}`}>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" title="View Dossier">
                          <Eye className="w-3.5 h-3.5 text-muted-foreground" />
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
