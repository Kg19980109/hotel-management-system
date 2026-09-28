import * as React from "react";
import Link from "next/link";
import { ArrowLeft, AlertCircle, UtensilsCrossed } from "lucide-react";
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
  const session = await getActiveGuestSession();

  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("stayhub_guest_session");
  const order = sessionCookie?.value ? await getGuestFoodOrderDetail(orderId, sessionCookie.value) : null;

  if (!order) {
    return (
      <div className="space-y-6 max-w-lg mx-auto pb-28">
        <Link
          href="/guest/orders"
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Orders</span>
        </Link>

        <div className="p-10 rounded-3xl bg-[#111C38]/90 border border-violet-500/25 text-center space-y-4 shadow-lg shadow-violet-950/20 backdrop-blur-md">
          <div className="w-14 h-14 rounded-2xl bg-rose-950/60 border border-rose-500/30 text-rose-400 mx-auto flex items-center justify-center">
            <AlertCircle className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-serif font-bold text-white">Order Not Found</h3>
            <p className="text-xs text-slate-300 max-w-xs mx-auto leading-relaxed font-sans">
              This order could not be located or does not belong to your verified room session.
            </p>
          </div>
          <Link
            href="/guest/dining"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-violet-950/40 transition"
          >
            <UtensilsCrossed className="w-4 h-4 text-violet-200" />
            <span>Explore Dining Menus</span>
          </Link>
        </div>
      </div>
    );
  }

  return <GuestOrderDetailView initialOrder={order} roomNumber={session?.room_number} />;
}
