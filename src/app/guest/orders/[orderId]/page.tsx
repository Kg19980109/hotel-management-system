import * as React from "react";
import Link from "next/link";
import { ArrowLeft, AlertCircle } from "lucide-react";
import { cookies } from "next/headers";
import { getActiveGuestSession } from "@/lib/guest-portal/actions";
import { getGuestFoodOrderDetail } from "@/lib/guest-ordering/queries";
import { GuestOrderDetailView } from "@/components/guest/guest-order-detail-view";

interface OrderDetailPageProps {
  params: Promise<{
    orderId: string;
  }>;
}

export const metadata = {
  title: "StayHub — Order Progress & Receipt",
  description: "Track the real-time status of your in-room dining order.",
};

export default async function GuestOrderDetailPage({
  params,
}: OrderDetailPageProps) {
  const { orderId } = await params;
  await getActiveGuestSession();

  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("stayhub_guest_session");
  const order = sessionCookie?.value ? await getGuestFoodOrderDetail(orderId, sessionCookie.value) : null;

  if (!order) {
    return (
      <div className="p-4 space-y-6">
        <Link
          href="/guest/orders"
          className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-white transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Orders</span>
        </Link>

        <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 text-center space-y-3">
          <div className="w-12 h-12 rounded-xl bg-rose-500/10 text-rose-400 mx-auto flex items-center justify-center">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-white">Order Not Found</h3>
            <p className="text-xs text-slate-400 max-w-xs mx-auto">
              This order could not be located or does not belong to your verified room session.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return <GuestOrderDetailView initialOrder={order} />;
}
