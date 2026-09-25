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
    <div className="p-4 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Link
          href="/guest/services"
          className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-white transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Services</span>
        </Link>
        <Link
          href="/guest/services"
          className="text-xs text-amber-400 hover:underline font-semibold"
        >
          + New Request
        </Link>
      </div>

      <div className="space-y-1">
        <h2 className="text-xl font-black text-white">Your Service Requests</h2>
        <p className="text-xs text-slate-400">
          Track housekeeping, maintenance, and concierge assistance for your room.
        </p>
      </div>

      {requests.length === 0 ? (
        <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 text-center space-y-4">
          <div className="w-12 h-12 rounded-xl bg-slate-800 text-slate-500 mx-auto flex items-center justify-center">
            <Sparkles className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-white">No Service Requests</h3>
            <p className="text-xs text-slate-400 max-w-xs mx-auto">
              You have not submitted any service requests during this stay.
            </p>
          </div>
          <Link
            href="/guest/services"
            className="inline-block px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow transition"
          >
            Request a Service
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((req) => (
            <Link
              key={req.id}
              href={`/guest/requests/${req.id}`}
              className="block p-4 rounded-2xl bg-slate-900 hover:bg-slate-850 border border-slate-800 transition active:scale-[0.99] group shadow-md"
            >
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase font-bold text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                      {req.category}
                    </span>
                    {getStatusBadge(req.status)}
                  </div>
                  <h4 className="text-sm font-bold text-white group-hover:text-amber-400 transition">
                    {req.title}
                  </h4>
                  {req.description && (
                    <p className="text-xs text-slate-400 line-clamp-1">
                      {req.description}
                    </p>
                  )}
                </div>
                <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-amber-400 transition shrink-0 ml-2" />
              </div>

              <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
                <span>Requested at {new Date(req.requested_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                <span className="text-amber-400 font-semibold group-hover:underline">
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
