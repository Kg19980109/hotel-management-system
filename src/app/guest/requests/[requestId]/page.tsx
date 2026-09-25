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
      <div className="p-4 space-y-6">
        <Link
          href="/guest/requests"
          className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-white transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Requests</span>
        </Link>

        <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 text-center space-y-3">
          <div className="w-12 h-12 rounded-xl bg-rose-500/10 text-rose-400 mx-auto flex items-center justify-center">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-white">Request Not Found</h3>
            <p className="text-xs text-slate-400 max-w-xs mx-auto">
              This request could not be located or does not belong to your verified room session.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return <GuestRequestDetailView request={request} />;
}
