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
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            Completed
          </span>
        );
      case "IN_PROGRESS":
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
            In Progress
          </span>
        );
      case "ASSIGNED":
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center gap-1">
            <UserCheck className="w-3 h-3 text-indigo-600" />
            Staff Assigned
          </span>
        );
      case "ACKNOWLEDGED":
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-sky-50 text-sky-700 border border-sky-200 flex items-center gap-1">
            <Clock className="w-3 h-3 text-sky-600" />
            Acknowledged
          </span>
        );
      case "CANCELLED":
      case "REJECTED":
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1">
            <XCircle className="w-3 h-3 text-rose-600" />
            {status === "CANCELLED" ? "Cancelled" : "Declined"}
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#FAF4E6] text-[#A67C1E] border border-[#D4AF37]/30 flex items-center gap-1">
            <Clock className="w-3 h-3 text-[#A67C1E]" />
            Submitted
          </span>
        );
    }
  };

  return (
    <div className="space-y-5 pb-28">
      {/* Live staff-status updates (secure realtime & relaxed fallback) */}
      <GuestLiveRefresher />

      {/* ── 1. EDITORIAL HEADER BANNER ── */}
      <div className="relative overflow-hidden bg-[#0B1526] text-white">
        <div className="absolute inset-0 z-0 bg-gradient-to-br from-[#0B1526] via-[#111D31] to-[#0B1526]">
          <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-[#D4AF37]/10 blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full bg-amber-500/5 blur-2xl pointer-events-none" />
        </div>

        <div className="relative z-10 px-5 pt-6 pb-6 space-y-3.5">
          {/* Top Quick Navigation */}
          <div className="flex items-center justify-between">
            <Link
              href="/guest/services"
              className="inline-flex items-center gap-1.5 text-xs text-slate-300 hover:text-white transition"
              aria-label="Back to Services"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Guest Services</span>
            </Link>
            <Link
              href="/guest/services"
              className="px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-white/15 text-[#E4C980] border border-[#D4AF37]/35 text-xs font-semibold transition flex items-center gap-1.5 shadow-2xs"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span>+ New Request</span>
            </Link>
          </div>

          <div className="space-y-1 pt-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/10 border border-[#D4AF37]/35 text-[#E4C980] text-[10px] font-medium tracking-wide">
              <Sparkles className="w-3 h-3 text-[#D4AF37]" />
              <span>Concierge Log</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-serif font-semibold text-white tracking-tight leading-tight">
              Service Requests
            </h1>
            <p className="text-xs text-slate-300/80 leading-relaxed max-w-sm">
              {isVerifiedStay && session?.room_number ? (
                <>Track live housekeeping, repairs and concierge assistance for <span className="text-[#E4C980] font-semibold">Room {session.room_number}</span>.</>
              ) : (
                "Review your active service requests and historical concierge records."
              )}
            </p>
          </div>
        </div>
      </div>

      <div className="px-4 space-y-5">
        {/* Requests Content */}
        {requests.length === 0 ? (
          <div className="p-10 rounded-3xl bg-white border border-[#EAE3D2] text-center space-y-4 shadow-sm">
            <div className="w-16 h-16 rounded-2xl bg-[#FAF4E6] border border-[#D4AF37]/30 text-[#A67C1E] mx-auto flex items-center justify-center">
              <Sparkles className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h2 className="text-base font-serif font-semibold text-slate-900">No Requests Yet</h2>
              <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
                Whenever you need something, your hotel concierge is just a tap away.
              </p>
            </div>
            <Link
              href="/guest/services"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-[#0B1526] hover:bg-[#111D31] text-[#E4C980] border border-[#D4AF37]/35 font-semibold text-xs shadow-md transition active:scale-[0.98]"
            >
              <Sparkles className="w-4 h-4 text-[#D4AF37]" />
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
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                    <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-serif">
                      Active Requests ({activeRequests.length})
                    </h2>
                  </div>
                  <span className="text-[10px] text-[#A67C1E] font-semibold">Live Concierge Dispatch</span>
                </div>

                <div className="space-y-3">
                  {activeRequests.map((req) => {
                    const Icon = CATEGORY_ICON_MAP[req.category as ServiceRequestCategory] || Sparkles;
                    return (
                      <Link
                        key={req.id}
                        href={`/guest/requests/${req.id}`}
                        className="block p-4 rounded-2xl bg-white hover:bg-slate-50 border border-[#EAE3D2] hover:border-[#D4AF37]/40 transition-all duration-200 active:scale-[0.99] group shadow-sm hover:shadow-md relative overflow-hidden"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3 min-w-0 flex-1">
                            <div className="w-10 h-10 rounded-xl bg-[#FAF4E6] text-[#A67C1E] border border-[#D4AF37]/30 flex items-center justify-center shrink-0 mt-0.5">
                              <Icon className="w-5 h-5" />
                            </div>

                            <div className="space-y-1 min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-[10px] uppercase font-bold text-slate-700 bg-[#FAF8F5] border border-[#EAE3D2] px-2 py-0.5 rounded-md">
                                  {req.category}
                                </span>
                                {getStatusBadge(req.status)}
                              </div>

                              <h3 className="text-sm font-serif font-semibold text-slate-900 group-hover:text-[#A67C1E] transition truncate">
                                {req.title}
                              </h3>

                              {req.description && (
                                <p className="text-xs text-slate-500 line-clamp-1">
                                  {req.description}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="w-8 h-8 rounded-full bg-[#FAF4E6] border border-[#D4AF37]/30 flex items-center justify-center text-[#A67C1E] group-hover:bg-[#0B1526] group-hover:text-[#E4C980] transition shrink-0">
                            <ChevronRight className="w-4 h-4" />
                          </div>
                        </div>

                        <div className="mt-3 pt-2.5 border-t border-[#EAE3D2] flex items-center justify-between text-[11px] text-slate-500">
                          <span>Requested at {new Date(req.requested_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                          <span className="text-[#A67C1E] font-semibold group-hover:underline flex items-center gap-1">
                            <BellRing className="w-3 h-3 text-[#D4AF37]" />
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
                  <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider font-serif">
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
                        className="block p-3.5 rounded-2xl bg-white hover:bg-slate-50 border border-[#EAE3D2] transition active:scale-[0.99] group shadow-2xs"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-3 min-w-0 flex-1">
                            <div className="w-9 h-9 rounded-xl bg-slate-50 text-slate-600 border border-slate-200 flex items-center justify-center shrink-0 mt-0.5">
                              <Icon className="w-4 h-4" />
                            </div>

                            <div className="space-y-1 min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-[9.5px] uppercase font-semibold text-slate-500">
                                  {req.category}
                                </span>
                                {getStatusBadge(req.status)}
                              </div>

                              <h3 className="text-xs sm:text-sm font-semibold text-slate-800 group-hover:text-[#A67C1E] transition truncate">
                                {req.title}
                              </h3>

                              {req.description && (
                                <p className="text-[11px] text-slate-500 line-clamp-1">
                                  {req.description}
                                </p>
                              )}
                            </div>
                          </div>

                          <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-[#A67C1E] group-hover:translate-x-0.5 transition shrink-0 mt-1" />
                        </div>

                        <div className="mt-2 pt-2 border-t border-[#EAE3D2]/70 flex items-center justify-between text-[10.5px] text-slate-400">
                          <span>
                            {new Date(req.requested_at).toLocaleDateString([], { month: "short", day: "numeric" })} at {new Date(req.requested_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                          <span className="text-slate-600 group-hover:text-[#A67C1E] font-medium">
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
