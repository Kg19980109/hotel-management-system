import * as React from "react";
import Link from "next/link";
import { 
  Sparkles, 
  ChevronRight, 
  Clock, 
  CheckCircle2, 
  Hourglass, 
  ArrowLeft, 
  XCircle,
  BellRing,
  UserCheck,
  Wrench,
  Shirt,
  Flower2,
  Car,
  Utensils,
  Compass,
  BedDouble,
  Crown,
} from "lucide-react";
import { cookies } from "next/headers";
import { getActiveGuestSession } from "@/lib/guest-portal/actions";
import { getGuestServiceRequests } from "@/lib/guest-services/queries";
import { GuestLiveRefresher } from "@/components/guest/guest-live-refresher";
import { ServiceRequestCategory, ServiceRequestStatus } from "@/lib/guest-services/types";

export const metadata = {
  title: "StayHub — Your Service Requests",
  description: "Track the real-time status of your hotel service requests.",
};

const CATEGORY_ICON_MAP: Record<ServiceRequestCategory, React.ComponentType<{ className?: string }>> = {
  HOUSEKEEPING: Sparkles,
  FRONT_DESK: BedDouble,
  MAINTENANCE: Wrench,
  LAUNDRY: Shirt,
  SPA: Flower2,
  TRANSPORT: Car,
  ROOM_SERVICE: Utensils,
  CONCIERGE: Compass,
  OTHER: Crown,
};

export default async function GuestRequestsPage() {
  const session = await getActiveGuestSession();
  const isVerifiedStay = session?.session_type === "VERIFIED_STAY";

  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("stayhub_guest_session");
  const requests = isVerifiedStay && sessionCookie?.value ? await getGuestServiceRequests(sessionCookie.value) : [];

  const activeRequests = requests.filter((r) => !["COMPLETED", "CANCELLED", "REJECTED"].includes(r.status));
  const pastRequests = requests.filter((r) => ["COMPLETED", "CANCELLED", "REJECTED"].includes(r.status));

  const getStatusBadge = (status: ServiceRequestStatus) => {
    switch (status) {
      case "COMPLETED":
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            Completed
          </span>
        );
      case "IN_PROGRESS":
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
            In Progress
          </span>
        );
      case "ASSIGNED":
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-violet-500/20 text-violet-300 border border-violet-500/30 flex items-center gap-1">
            <UserCheck className="w-3 h-3 text-violet-400" />
            Staff Assigned
          </span>
        );
      case "ACKNOWLEDGED":
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30 flex items-center gap-1">
            <Clock className="w-3 h-3 text-sky-400" />
            Acknowledged
          </span>
        );
      case "CANCELLED":
      case "REJECTED":
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1">
            <XCircle className="w-3 h-3 text-rose-400" />
            {status === "CANCELLED" ? "Cancelled" : "Declined"}
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-violet-500/20 text-violet-300 border border-violet-500/30 flex items-center gap-1">
            <Clock className="w-3 h-3 text-violet-400" />
            Submitted
          </span>
        );
    }
  };

  return (
    <div className="space-y-5 pb-28">
      {/* Live staff-status updates */}
      <GuestLiveRefresher />

      {/* ── 1. LUXURY VIOLET HEADER BANNER ── */}
      <div className="relative overflow-hidden rounded-3xl bg-[#0B132B] border border-violet-500/30 text-white shadow-xl shadow-violet-950/40">
        <div className="absolute inset-0 z-0 bg-gradient-to-br from-violet-900/30 via-[#0B132B] to-indigo-950/40 pointer-events-none" />
        <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-violet-600/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-48 h-48 rounded-full bg-indigo-600/15 blur-2xl pointer-events-none" />

        <div className="relative z-10 p-5 sm:p-6 space-y-3.5">
          {/* Top Quick Navigation */}
          <div className="flex items-center justify-between">
            <Link
              href="/guest/services"
              className="inline-flex items-center gap-1.5 text-xs text-violet-300 hover:text-white transition font-medium"
              aria-label="Back to Services"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Guest Services</span>
            </Link>
            <Link
              href="/guest/services"
              className="px-3.5 py-1.5 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-violet-950/40"
            >
              <Sparkles className="w-3.5 h-3.5 text-violet-200" />
              <span>+ New Request</span>
            </Link>
          </div>

          <div className="space-y-1 pt-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-violet-500/20 border border-violet-400/40 text-violet-200 text-[10px] font-semibold tracking-wide backdrop-blur-xs">
              <Sparkles className="w-3 h-3 text-violet-400" />
              <span>Concierge Log</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-white tracking-tight leading-tight">
              Service Requests
            </h1>
            <p className="text-xs text-slate-300/85 leading-relaxed max-w-sm font-sans">
              {isVerifiedStay && session?.room_number ? (
                <>Track live housekeeping, repairs and concierge assistance for <span className="text-violet-300 font-bold">Room {session.room_number}</span>.</>
              ) : (
                "Review your active service requests and historical concierge records."
              )}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-5">
        {/* Requests Content */}
        {requests.length === 0 ? (
          <div className="p-10 rounded-3xl bg-[#111C38]/90 border border-violet-500/25 text-center space-y-4 shadow-lg shadow-violet-950/20 backdrop-blur-md">
            <div className="w-16 h-16 rounded-2xl bg-violet-950/60 border border-violet-500/30 text-violet-300 mx-auto flex items-center justify-center">
              <Sparkles className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h2 className="text-base font-serif font-bold text-white">No Requests Yet</h2>
              <p className="text-xs text-slate-300 max-w-xs mx-auto leading-relaxed font-sans">
                Whenever you need something, your hotel concierge is just a tap away.
              </p>
            </div>
            <Link
              href="/guest/services"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-violet-950/40 transition active:scale-[0.98]"
            >
              <Sparkles className="w-4 h-4 text-violet-200" />
              <span>Explore Services</span>
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {/* ── ACTIVE / IN-PROGRESS REQUESTS ── */}
            {activeRequests.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between px-0.5">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                    <h2 className="text-xs font-bold text-violet-300 uppercase tracking-wider font-sans">
                      Active Requests ({activeRequests.length})
                    </h2>
                  </div>
                  <span className="text-[10px] text-violet-300 font-semibold">Live Concierge Dispatch</span>
                </div>

                <div className="space-y-3">
                  {activeRequests.map((req) => {
                    const Icon = CATEGORY_ICON_MAP[req.category as ServiceRequestCategory] || Sparkles;
                    return (
                      <Link
                        key={req.id}
                        href={`/guest/requests/${req.id}`}
                        className="block p-4 rounded-2xl bg-[#111C38]/90 hover:bg-[#152347] border border-violet-500/25 hover:border-violet-400/50 transition-all duration-200 active:scale-[0.99] group shadow-lg shadow-violet-950/20 relative overflow-hidden backdrop-blur-md"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3 min-w-0 flex-1">
                            <div className="w-10 h-10 rounded-xl bg-violet-950/60 text-violet-300 border border-violet-500/30 flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                              <Icon className="w-5 h-5" />
                            </div>

                            <div className="space-y-1 min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-[10px] uppercase font-bold text-violet-200 bg-violet-950/50 border border-violet-500/20 px-2 py-0.5 rounded-md">
                                  {req.category}
                                </span>
                                {getStatusBadge(req.status)}
                              </div>

                              <h3 className="text-sm font-serif font-bold text-white group-hover:text-violet-300 transition truncate">
                                {req.title}
                              </h3>

                              {req.description && (
                                <p className="text-xs text-slate-300 line-clamp-1 font-sans">
                                  {req.description}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="w-8 h-8 rounded-full bg-violet-950/60 border border-violet-500/30 flex items-center justify-center text-violet-300 group-hover:bg-violet-600 group-hover:text-white transition shrink-0">
                            <ChevronRight className="w-4 h-4" />
                          </div>
                        </div>

                        <div className="mt-3 pt-2.5 border-t border-violet-500/20 flex items-center justify-between text-[11px] text-slate-400 font-sans">
                          <span>Requested at {new Date(req.requested_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                          <span className="text-violet-300 font-semibold group-hover:underline flex items-center gap-1">
                            <BellRing className="w-3 h-3 text-violet-400" />
                            <span>View Live Timeline →</span>
                          </span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── PAST / COMPLETED REQUESTS ── */}
            {pastRequests.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between px-0.5">
                  <h2 className="text-xs font-bold text-violet-300 uppercase tracking-wider font-sans">
                    Past Requests ({pastRequests.length})
                  </h2>
                </div>

                <div className="space-y-2.5">
                  {pastRequests.map((req) => {
                    const Icon = CATEGORY_ICON_MAP[req.category as ServiceRequestCategory] || Sparkles;
                    return (
                      <Link
                        key={req.id}
                        href={`/guest/requests/${req.id}`}
                        className="block p-3.5 rounded-2xl bg-[#111C38]/70 hover:bg-[#152347]/90 border border-violet-500/20 transition active:scale-[0.99] group shadow-md shadow-violet-950/15 backdrop-blur-md"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-3 min-w-0 flex-1">
                            <div className="w-9 h-9 rounded-xl bg-violet-950/40 text-violet-400 border border-violet-500/20 flex items-center justify-center shrink-0 mt-0.5">
                              <Icon className="w-4 h-4" />
                            </div>

                            <div className="space-y-1 min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-[9.5px] uppercase font-semibold text-slate-400">
                                  {req.category}
                                </span>
                                {getStatusBadge(req.status)}
                              </div>

                              <h3 className="text-xs sm:text-sm font-semibold text-white group-hover:text-violet-300 transition truncate">
                                {req.title}
                              </h3>

                              {req.description && (
                                <p className="text-[11px] text-slate-400 line-clamp-1">
                                  {req.description}
                                </p>
                              )}
                            </div>
                          </div>

                          <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-violet-300 group-hover:translate-x-0.5 transition shrink-0 mt-1" />
                        </div>

                        <div className="mt-2 pt-2 border-t border-violet-500/15 flex items-center justify-between text-[10.5px] text-slate-400">
                          <span>
                            {new Date(req.requested_at).toLocaleDateString([], { month: "short", day: "numeric" })} at {new Date(req.requested_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                          <span className="text-violet-400 group-hover:text-violet-300 font-medium">
                            View Details →
                          </span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
