import * as React from "react";
import Link from "next/link";
import { 
  Sparkles, 
  ChevronRight, 
  Clock, 
  CheckCircle, 
  Hourglass, 
  ArrowLeft, 
  XCircle
} from "lucide-react";
import { cookies } from "next/headers";
import { getActiveGuestSession } from "@/lib/guest-portal/actions";
import { getGuestServiceRequests } from "@/lib/guest-services/queries";
import { GuestLiveRefresher } from "@/components/guest/guest-live-refresher";
import { ServiceRequestStatus } from "@/lib/guest-services/types";

export const metadata = {
  title: "StayHub — Your Service Requests",
  description: "Track the status of your submitted service requests.",
};

export default async function GuestRequestsPage() {
  const session = await getActiveGuestSession();
  const isVerifiedStay = session?.session_type === "VERIFIED_STAY";

  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("stayhub_guest_session");
  const requests = isVerifiedStay && sessionCookie?.value ? await getGuestServiceRequests(sessionCookie.value) : [];

  const getStatusBadge = (status: ServiceRequestStatus) => {
    switch (status) {
      case "COMPLETED":
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
            <CheckCircle className="w-3 h-3" />
            Completed
          </span>
        );
      case "IN_PROGRESS":
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/10 text-sky-400 border border-sky-500/20 flex items-center gap-1 animate-pulse">
            <Hourglass className="w-3 h-3" />
            In Progress
          </span>
        );
      case "ASSIGNED":
      case "ACKNOWLEDGED":
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Assigned
          </span>
        );
      case "CANCELLED":
      case "REJECTED":
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center gap-1">
            <XCircle className="w-3 h-3" />
            {status === "CANCELLED" ? "Cancelled" : "Declined"}
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Submitted
          </span>
        );
    }
  };

  return (
    <div className="p-4 space-y-6 pb-28 max-w-lg mx-auto">
      {/* Live staff-status updates (secure RPC refresh; anon realtime is RLS-blocked) */}
      <GuestLiveRefresher />
      {/* Header */}
      <div className="flex items-center justify-between">
        <Link
          href="/guest/services"
          className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-amber-300 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Services</span>
        </Link>
        <Link
          href="/guest/services"
          className="text-xs text-amber-400 hover:text-amber-300 font-bold px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 transition flex items-center gap-1"
        >
          <span>+ New Request</span>
        </Link>
      </div>

      {/* Hero Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#08111F] via-[#0E1B2E] to-[#08111F] border border-amber-500/20 p-5 shadow-xl">
        <div className="absolute top-0 right-0 w-44 h-44 bg-gradient-to-bl from-amber-500/10 to-transparent rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 space-y-1.5">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[10px] font-bold uppercase tracking-wider">
            <Sparkles className="w-3 h-3 text-amber-400" />
            <span>Concierge Log</span>
          </div>
          <h2 className="text-xl font-black text-white tracking-tight">
            Your Service Requests
          </h2>
          <p className="text-xs text-slate-300/80 leading-relaxed">
            Track housekeeping, maintenance, and concierge assistance for your room.
          </p>
        </div>
      </div>

      {requests.length === 0 ? (
        <div className="p-8 rounded-3xl bg-gradient-to-b from-[#0E1B2E] to-[#08111F] border border-slate-800 text-center space-y-5 shadow-xl">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 mx-auto flex items-center justify-center shadow-lg">
            <Sparkles className="w-8 h-8" />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-base font-bold text-white">No Service Requests</h3>
            <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
              You have not submitted any service requests during this stay.
            </p>
          </div>
          <Link
            href="/guest/services"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/20 transition active:scale-[0.98]"
          >
            <span>Request a Service</span>
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((req) => (
            <Link
              key={req.id}
              href={`/guest/requests/${req.id}`}
              className="block p-4 rounded-2xl bg-gradient-to-br from-[#0E1B2E] to-[#08111F] hover:from-[#132238] hover:to-[#0B1526] border border-slate-800 hover:border-amber-500/30 transition-all duration-200 active:scale-[0.99] group shadow-xl relative overflow-hidden"
            >
              <div className="flex items-start justify-between">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase font-bold text-amber-300 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-md">
                      {req.category}
                    </span>
                    {getStatusBadge(req.status)}
                  </div>
                  <h4 className="text-sm font-bold text-white group-hover:text-amber-300 transition">
                    {req.title}
                  </h4>
                  {req.description && (
                    <p className="text-xs text-slate-400 line-clamp-1">
                      {req.description}
                    </p>
                  )}
                </div>
                <div className="w-8 h-8 rounded-full bg-slate-800/80 border border-slate-700/80 flex items-center justify-center text-slate-400 group-hover:bg-amber-500 group-hover:text-slate-950 group-hover:border-amber-500 transition shrink-0 ml-2">
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>

              <div className="mt-3.5 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                <span>Requested at {new Date(req.requested_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                <span className="text-amber-400 font-bold group-hover:underline">
                  View Timeline →
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
