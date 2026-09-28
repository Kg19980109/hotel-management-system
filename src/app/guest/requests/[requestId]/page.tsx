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
      <div className="p-4 space-y-6 pb-28 max-w-lg mx-auto">
        <Link
          href="/guest/requests"
          className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-900 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Requests</span>
        </Link>

        <div className="p-8 rounded-3xl bg-white border border-[#EAE3D2] text-center space-y-3 shadow-sm">
          <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 border border-rose-200 mx-auto flex items-center justify-center">
            <AlertCircle className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h1 className="text-base font-serif font-semibold text-slate-900">Request Not Found</h1>
            <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
              This service request could not be located or does not belong to your verified room session.
            </p>
          </div>
          <Link
            href="/guest/requests"
            className="inline-flex items-center justify-center px-5 py-2.5 rounded-full bg-[#0B1526] text-[#E4C980] border border-[#D4AF37]/35 text-xs font-semibold transition"
          >
            Return to Requests
          </Link>
        </div>
      </div>
    );
  }

  return <GuestRequestDetailView request={request} />;
}
