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

interface CategoryStyle {
  cardBg: string;
  borderColor: string;
  topBar: string;
  iconBg: string;
  badge: string;
  titleHover: string;
}

const CATEGORY_STYLE_MAP: Record<ServiceRequestCategory, CategoryStyle> = {
  HOUSEKEEPING: {
    cardBg: "from-emerald-50/80 via-white to-emerald-50/30",
    borderColor: "border-emerald-200/90 hover:border-emerald-300",
    topBar: "from-emerald-400 to-teal-600",
    iconBg: "from-emerald-400 to-teal-600 shadow-emerald-500/25",
    badge: "bg-emerald-100/90 text-emerald-800 border-emerald-300/80",
    titleHover: "group-hover:text-emerald-800",
  },
  FRONT_DESK: {
    cardBg: "from-purple-50/80 via-white to-purple-50/30",
    borderColor: "border-purple-200/90 hover:border-purple-300",
    topBar: "from-purple-400 to-indigo-600",
    iconBg: "from-purple-400 to-indigo-600 shadow-purple-500/25",
    badge: "bg-purple-100/90 text-purple-800 border-purple-300/80",
    titleHover: "group-hover:text-purple-800",
  },
  MAINTENANCE: {
    cardBg: "from-sky-50/80 via-white to-sky-50/30",
    borderColor: "border-sky-200/90 hover:border-sky-300",
    topBar: "from-sky-400 to-blue-600",
    iconBg: "from-sky-400 to-blue-600 shadow-sky-500/25",
    badge: "bg-sky-100/90 text-sky-800 border-sky-300/80",
    titleHover: "group-hover:text-sky-800",
  },
  LAUNDRY: {
    cardBg: "from-indigo-50/80 via-white to-indigo-50/30",
    borderColor: "border-indigo-200/90 hover:border-indigo-300",
    topBar: "from-indigo-400 to-violet-600",
    iconBg: "from-indigo-400 to-violet-600 shadow-indigo-500/25",
    badge: "bg-indigo-100/90 text-indigo-800 border-indigo-300/80",
    titleHover: "group-hover:text-indigo-800",
  },
  SPA: {
    cardBg: "from-pink-50/80 via-white to-pink-50/30",
    borderColor: "border-pink-200/90 hover:border-pink-300",
    topBar: "from-pink-400 to-rose-600",
    iconBg: "from-pink-400 to-rose-600 shadow-pink-500/25",
    badge: "bg-pink-100/90 text-pink-800 border-pink-300/80",
    titleHover: "group-hover:text-pink-800",
  },
  TRANSPORT: {
    cardBg: "from-teal-50/80 via-white to-teal-50/30",
    borderColor: "border-teal-200/90 hover:border-teal-300",
    topBar: "from-teal-400 to-cyan-600",
    iconBg: "from-teal-400 to-cyan-600 shadow-teal-500/25",
    badge: "bg-teal-100/90 text-teal-800 border-teal-300/80",
    titleHover: "group-hover:text-teal-800",
  },
  ROOM_SERVICE: {
    cardBg: "from-amber-50/80 via-white to-amber-50/30",
    borderColor: "border-amber-200/90 hover:border-amber-300",
    topBar: "from-amber-400 to-amber-600",
    iconBg: "from-amber-400 to-amber-600 shadow-amber-500/25",
    badge: "bg-amber-100/90 text-amber-800 border-amber-300/80",
    titleHover: "group-hover:text-amber-800",
  },
  CONCIERGE: {
    cardBg: "from-fuchsia-50/80 via-white to-fuchsia-50/30",
    borderColor: "border-fuchsia-200/90 hover:border-fuchsia-300",
    topBar: "from-fuchsia-400 to-pink-600",
    iconBg: "from-fuchsia-400 to-pink-600 shadow-fuchsia-500/25",
    badge: "bg-fuchsia-100/90 text-fuchsia-800 border-fuchsia-300/80",
    titleHover: "group-hover:text-fuchsia-800",
  },
  OTHER: {
    cardBg: "from-amber-50/80 via-white to-amber-50/30",
    borderColor: "border-amber-200/90 hover:border-amber-300",
    topBar: "from-amber-400 to-amber-600",
    iconBg: "from-amber-400 to-amber-600 shadow-amber-500/25",
    badge: "bg-amber-100/90 text-amber-800 border-amber-300/80",
    titleHover: "group-hover:text-amber-800",
  },
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
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-700" />
            Completed
          </span>
        );
      case "IN_PROGRESS":
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
            In Progress
          </span>
        );
      case "ASSIGNED":
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-300 flex items-center gap-1">
            <UserCheck className="w-3 h-3 text-indigo-700" />
            Staff Assigned
          </span>
        );
      case "ACKNOWLEDGED":
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-800 border border-sky-300 flex items-center gap-1">
            <Clock className="w-3 h-3 text-sky-700" />
            Acknowledged
          </span>
        );
      case "CANCELLED":
      case "REJECTED":
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300 flex items-center gap-1">
            <XCircle className="w-3 h-3 text-rose-700" />
            {status === "CANCELLED" ? "Cancelled" : "Declined"}
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">
            <Clock className="w-3 h-3 text-amber-700" />
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
              className="px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-white/15 text-[#E4C980] border border-[#D4AF37]/35 text-xs font-semibold transition flex items-center gap-1.5 shadow-2xs active:scale-95 duration-75 tap-active"
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
          <div className="p-8 sm:p-10 rounded-3xl bg-gradient-to-br from-indigo-50/70 via-white to-purple-50/30 border border-indigo-200/80 text-center space-y-4 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-400 via-purple-500 to-pink-500" />
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/25 mx-auto flex items-center justify-center">
              <Sparkles className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h2 className="text-base font-serif font-bold text-slate-900">No Requests Yet</h2>
              <p className="text-xs text-slate-600 max-w-xs mx-auto leading-relaxed">
                Whenever you need something, your hotel concierge is just a tap away.
              </p>
            </div>
            <Link
              href="/guest/services"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-bold text-xs shadow-md shadow-indigo-500/20 transition active:scale-95 duration-75 tap-active"
            >
              <Sparkles className="w-4 h-4 text-white" />
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
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse shadow-sm shadow-amber-500/50" />
                    <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-serif">
                      Active Requests ({activeRequests.length})
                    </h2>
                  </div>
                  <span className="text-[10px] text-amber-800 font-bold bg-amber-100/90 px-2.5 py-0.5 rounded-full border border-amber-300/80">
                    Live Concierge Dispatch
                  </span>
                </div>

                <div className="space-y-3">
                  {activeRequests.map((req) => {
                    const category = req.category as ServiceRequestCategory;
                    const Icon = CATEGORY_ICON_MAP[category] || Sparkles;
                    const style = CATEGORY_STYLE_MAP[category] || CATEGORY_STYLE_MAP.OTHER;

                    return (
                      <Link
                        key={req.id}
                        href={`/guest/requests/${req.id}`}
                        className={`block p-4 rounded-2xl bg-gradient-to-br ${style.cardBg} border ${style.borderColor} transition-all duration-75 active:scale-95 tap-active group shadow-2xs hover:shadow-md relative overflow-hidden`}
                      >
                        <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${style.topBar}`} />

                        <div className="flex items-start justify-between gap-3 pt-0.5">
                          <div className="flex items-start gap-3 min-w-0 flex-1">
                            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${style.iconBg} text-white flex items-center justify-center shrink-0 mt-0.5 shadow-md`}>
                              <Icon className="w-5 h-5" />
                            </div>

                            <div className="space-y-1 min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-md border ${style.badge}`}>
                                  {req.category}
                                </span>
                                {getStatusBadge(req.status)}
                              </div>

                              <h3 className={`text-sm font-serif font-bold text-slate-900 ${style.titleHover} transition truncate`}>
                                {req.title}
                              </h3>

                              {req.description && (
                                <p className="text-xs text-slate-600 line-clamp-1">
                                  {req.description}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="w-8 h-8 rounded-full bg-white/80 border border-slate-200 flex items-center justify-center text-slate-600 group-hover:bg-[#0B1526] group-hover:text-[#E4C980] transition shrink-0">
                            <ChevronRight className="w-4 h-4" />
                          </div>
                        </div>

                        <div className="mt-3 pt-2.5 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-500">
                          <span>Requested at {new Date(req.requested_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                          <span className="text-slate-800 font-bold group-hover:underline flex items-center gap-1">
                            <BellRing className="w-3.5 h-3.5 text-amber-600" />
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
                    const category = req.category as ServiceRequestCategory;
                    const Icon = CATEGORY_ICON_MAP[category] || Sparkles;
                    const isCancelledOrRejected = req.status === "CANCELLED" || req.status === "REJECTED";

                    return (
                      <Link
                        key={req.id}
                        href={`/guest/requests/${req.id}`}
                        className={`block p-3.5 rounded-2xl transition-all duration-75 active:scale-95 tap-active group shadow-2xs relative overflow-hidden ${
                          isCancelledOrRejected
                            ? "bg-gradient-to-br from-rose-50/60 via-white to-rose-50/30 border border-rose-200/80 hover:border-rose-300"
                            : "bg-gradient-to-br from-emerald-50/60 via-white to-emerald-50/30 border border-emerald-200/80 hover:border-emerald-300"
                        }`}
                      >
                        <div className={`absolute top-0 left-0 right-0 h-0.5 ${
                          isCancelledOrRejected
                            ? "bg-gradient-to-r from-rose-400 to-rose-600"
                            : "bg-gradient-to-r from-emerald-400 to-teal-600"
                        }`} />

                        <div className="flex items-start justify-between gap-2 pt-0.5">
                          <div className="flex items-start gap-3 min-w-0 flex-1">
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 shadow-xs ${
                              isCancelledOrRejected
                                ? "bg-rose-100 text-rose-700 border border-rose-200"
                                : "bg-emerald-100 text-emerald-800 border border-emerald-200"
                            }`}>
                              <Icon className="w-4 h-4" />
                            </div>

                            <div className="space-y-1 min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-[9.5px] uppercase font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                                  {req.category}
                                </span>
                                {getStatusBadge(req.status)}
                              </div>

                              <h3 className="text-xs sm:text-sm font-bold text-slate-800 group-hover:text-amber-800 transition truncate">
                                {req.title}
                              </h3>

                              {req.description && (
                                <p className="text-[11px] text-slate-500 line-clamp-1">
                                  {req.description}
                                </p>
                              )}
                            </div>
                          </div>

                          <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-amber-700 group-hover:translate-x-0.5 transition shrink-0 mt-1" />
                        </div>

                        <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[10.5px] text-slate-400">
                          <span>
                            {new Date(req.requested_at).toLocaleDateString([], { month: "short", day: "numeric" })} at {new Date(req.requested_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                          <span className="text-slate-600 group-hover:text-amber-700 font-bold">
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
