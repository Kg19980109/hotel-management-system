import * as React from "react";
import Link from "next/link";
import { 
  ArrowLeft, 
  CheckCircle2, 
  ChefHat, 
  Clock, 
  PackageCheck, 
  AlertCircle,
  BedDouble,
  Receipt
} from "lucide-react";
import { cookies } from "next/headers";
import { getActiveGuestSession } from "@/lib/guest-portal/actions";
import { getGuestFoodOrderDetail } from "@/lib/guest-ordering/queries";

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

  // Determine stage progression: 1 = Placed, 2 = Preparing, 3 = Ready, 4 = Delivered
  let stage = 1;
  if (order.status === "PREPARING" || order.kds_status === "IN_PROGRESS") {
    stage = 2;
  } else if (order.status === "READY" || order.kds_status === "READY") {
    stage = 3;
  } else if (order.status === "COMPLETED" || order.status === "SERVED" || order.kds_status === "COMPLETED") {
    stage = 4;
  }

  const isCancelled = order.status === "CANCELLED";

  const stages = [
    { label: "Order Received", icon: Clock, completed: stage >= 1 },
    { label: "Preparing", icon: ChefHat, completed: stage >= 2 },
    { label: "Ready for Delivery", icon: CheckCircle2, completed: stage >= 3 },
    { label: "Delivered", icon: PackageCheck, completed: stage >= 4 },
  ];

  return (
    <div className="p-4 space-y-5 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Link
          href="/guest/orders"
          className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-white transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>All Orders</span>
        </Link>
        <span className="text-xs font-mono font-bold text-amber-400">
          #{order.order_number}
        </span>
      </div>

      {/* Hero Status Card */}
      <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-850 to-slate-900 border border-slate-800 shadow-xl space-y-4">
        <div className="space-y-1">
          <span className="text-[10px] uppercase font-bold text-slate-400">
            {order.restaurant_name}
          </span>
          <h2 className="text-lg font-black text-white">
            {isCancelled ? "Order Cancelled" : stage === 4 ? "Order Delivered!" : "Order in Progress"}
          </h2>
          <p className="text-xs text-slate-400">
            Placed at {new Date(order.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </p>
        </div>

        {/* Status Stepper */}
        {!isCancelled && (
          <div className="grid grid-cols-4 gap-2 pt-2 border-t border-slate-800">
            {stages.map((st, idx) => {
              const Icon = st.icon;
              const isCurrent = stage === idx + 1;
              return (
                <div key={st.label} className="flex flex-col items-center text-center space-y-1.5">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                      st.completed
                        ? "bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20"
                        : "bg-slate-800 text-slate-500"
                    } ${isCurrent ? "ring-2 ring-amber-400/50 animate-pulse" : ""}`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <span
                    className={`text-[9px] font-semibold leading-tight ${
                      st.completed ? "text-slate-200" : "text-slate-500"
                    }`}
                  >
                    {st.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Destination Card */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
            <BedDouble className="w-5 h-5" />
          </div>
          <div className="space-y-0.5">
            <span className="text-[10px] uppercase font-bold text-slate-400">Delivery Room</span>
            <p className="text-xs font-bold text-white">
              Room {session?.room_number} • In-House Delivery
            </p>
          </div>
        </div>
      </div>

      {/* Items Breakdown */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
          <Receipt className="w-4 h-4 text-amber-400" />
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">
            Order Items ({order.items.length})
          </h3>
        </div>

        <div className="space-y-2.5">
          {order.items.map((item) => (
            <div
              key={item.id}
              className="flex items-start justify-between text-xs py-1 border-b border-slate-800/40 last:border-none"
            >
              <div className="space-y-0.5">
                <div className="font-bold text-white">
                  {item.quantity} × {item.item_name}
                </div>
                {item.notes && (
                  <p className="text-[11px] text-amber-400/80 italic">Note: {item.notes}</p>
                )}
              </div>
              <span className="font-mono font-bold text-slate-200 shrink-0 ml-3">
                {order.currency || "INR"} {Number(item.subtotal_price).toFixed(2)}
              </span>
            </div>
          ))}
        </div>

        {/* Price Breakdown */}
        <div className="pt-3 border-t border-slate-800 space-y-1.5 text-xs">
          <div className="flex items-center justify-between text-slate-400">
            <span>Subtotal</span>
            <span>{order.currency || "INR"} {Number(order.subtotal).toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between text-slate-400">
            <span>Taxes & Levies</span>
            <span>{order.currency || "INR"} {Number(order.tax_amount).toFixed(2)}</span>
          </div>
          <div className="pt-2 border-t border-slate-800 flex items-center justify-between font-black text-sm text-white">
            <span>Total Amount</span>
            <span className="text-amber-400 font-mono">
              {order.currency || "INR"} {Number(order.total_amount).toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* Special Notes */}
      {order.notes && (
        <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1 text-xs">
          <span className="text-[10px] uppercase font-bold text-slate-400">Guest Note / Instructions</span>
          <p className="text-slate-300 italic">{order.notes}</p>
        </div>
      )}
    </div>
  );
}
