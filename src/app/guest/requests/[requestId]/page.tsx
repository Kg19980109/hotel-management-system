import * as React from "react";
import Link from "next/link";
import { ArrowLeft, AlertCircle } from "lucide-react";
import { cookies } from "next/headers";
import { getGuestServiceRequestDetail } from "@/lib/guest-services/queries";
import { GuestRequestDetailView } from "@/components/guest/guest-request-detail-view";

interface GuestRequestDetailPageProps {
  params: Promise<{
    requestId: string;
  }>;
}

export const metadata = {
  title: "StayHub — Service Request Details",
  description: "Track the timeline and status of your guest service request.",
};

export default async function GuestRequestDetailPage({
  params,
}: GuestRequestDetailPageProps) {
  const { requestId } = await params;
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("stayhub_guest_session");
  const request = sessionCookie?.value ? await getGuestServiceRequestDetail(requestId, sessionCookie.value) : null;

  if (!request) {
    return (
      <div className="space-y-6 pb-28 max-w-lg mx-auto">
        <Link
          href="/guest/requests"
          className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-white transition font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Requests</span>
        </Link>

        <div className="p-8 rounded-3xl bg-[#111C38]/90 border border-violet-500/25 text-center space-y-3 shadow-lg shadow-violet-950/20 backdrop-blur-md">
          <div className="w-14 h-14 rounded-2xl bg-rose-950/60 text-rose-400 border border-rose-500/30 mx-auto flex items-center justify-center">
            <AlertCircle className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h1 className="text-base font-serif font-bold text-white">Request Not Found</h1>
            <p className="text-xs text-slate-300 max-w-xs mx-auto leading-relaxed font-sans">
              This service request could not be located or does not belong to your verified room session.
            </p>
          </div>
          <Link
            href="/guest/requests"
            className="inline-flex items-center justify-center px-5 py-2.5 rounded-full bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-bold shadow-md shadow-violet-950/30 transition"
          >
            Return to Requests
          </Link>
        </div>
      </div>
    );
  }

  return <GuestRequestDetailView request={request} />;
}
