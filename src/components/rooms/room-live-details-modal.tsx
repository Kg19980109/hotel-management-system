"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Room, RoomOperationalStatus, RoomHousekeepingStatus } from "@/lib/rooms/types";
import { updateRoomStatusAction, updateRoomAction } from "@/lib/rooms/actions";
import {
  staffAcknowledgeGuestRequestAction,
  staffStartGuestRequestAction,
  staffCompleteGuestRequestAction,
} from "@/lib/guest-services/actions";
import { formatCurrency } from "@/lib/dashboard/formatters";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RecordPaymentModal } from "@/components/billing/record-payment-modal";
import {
  BedDouble,
  User,
  CreditCard,
  BellRing,
  Sparkles,
  MapPin,
  Calendar,
  Clock,
  Phone,
  Mail,
  ShieldCheck,
  AlertTriangle,
  Wrench,
  CheckCircle2,
  ArrowRight,
  SlidersHorizontal,
  Edit,
  ExternalLink,
  Receipt,
  Users,
  Check,
  Play,
  CheckCheck,
  Loader2,
  Crown,
  Key,
  Layers,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface RoomLiveDetailsModalProps {
  open: boolean;
  room: Room | null;
  propertyId: string;
  currency: string;
  onClose: () => void;
  onSuccess: () => void;
}

const STATUS_THEMES: Record<
  RoomOperationalStatus,
  {
    gradient: string;
    badgeBg: string;
    badgeText: string;
    border: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }
> = {
  AVAILABLE: {
    gradient: "from-emerald-950 via-slate-900 to-slate-950",
    badgeBg: "bg-emerald-500/20 border-emerald-500/40",
    badgeText: "text-emerald-300",
    border: "border-emerald-500/30",
    label: "Available / Ready",
    icon: ShieldCheck,
  },
  OCCUPIED: {
    gradient: "from-indigo-950 via-slate-900 to-slate-950",
    badgeBg: "bg-indigo-500/20 border-indigo-500/40",
    badgeText: "text-indigo-300",
    border: "border-indigo-500/30",
    label: "Occupied / In-House",
    icon: BedDouble,
  },
  DIRTY: {
    gradient: "from-amber-950 via-slate-900 to-slate-950",
    badgeBg: "bg-amber-500/20 border-amber-500/40",
    badgeText: "text-amber-300",
    border: "border-amber-500/30",
    label: "Needs Cleaning",
    icon: Sparkles,
  },
  CLEANING: {
    gradient: "from-sky-950 via-slate-900 to-slate-950",
    badgeBg: "bg-sky-500/20 border-sky-500/40",
    badgeText: "text-sky-300",
    border: "border-sky-500/30",
    label: "Cleaning In Progress",
    icon: Sparkles,
  },
  INSPECTED: {
    gradient: "from-teal-950 via-slate-900 to-slate-950",
    badgeBg: "bg-teal-500/20 border-teal-500/40",
    badgeText: "text-teal-300",
    border: "border-teal-500/30",
    label: "Inspected & Approved",
    icon: CheckCircle2,
  },
  OUT_OF_ORDER: {
    gradient: "from-rose-950 via-slate-900 to-slate-950",
    badgeBg: "bg-rose-500/20 border-rose-500/40",
    badgeText: "text-rose-300",
    border: "border-rose-500/30",
    label: "Out of Order",
    icon: AlertTriangle,
  },
  OUT_OF_SERVICE: {
    gradient: "from-zinc-950 via-slate-900 to-slate-950",
    badgeBg: "bg-zinc-500/20 border-zinc-500/40",
    badgeText: "text-zinc-300",
    border: "border-zinc-500/30",
    label: "Out of Service",
    icon: Wrench,
  },
};

export function RoomLiveDetailsModal({
  open,
  room,
  propertyId,
  currency,
  onClose,
  onSuccess,
}: RoomLiveDetailsModalProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = React.useState<"guest" | "billing" | "requests" | "specs">("guest");
  const [updatingStatus, setUpdatingStatus] = React.useState(false);
  const [updatingRequestId, setUpdatingRequestId] = React.useState<string | null>(null);
  const [showPaymentModal, setShowPaymentModal] = React.useState(false);

  React.useEffect(() => {
    if (room?.liveStay) {
      setActiveTab("guest");
    } else if (room?.activeRequests && room.activeRequests.length > 0) {
      setActiveTab("requests");
    } else {
      setActiveTab("specs");
    }
  }, [room]);

  if (!room) return null;

  const currentStatus = room.status as RoomOperationalStatus;
  const theme = STATUS_THEMES[currentStatus] || STATUS_THEMES.AVAILABLE;
  const StatusIcon = theme.icon;
  const liveStay = room.liveStay;
  const activeRequests = room.activeRequests || [];
  const typeName = room.room_type?.name || "Standard Room";
  const floorName = room.floor?.name || "Main Floor";
  const rate = room.room_type?.base_rate || 0;

  const handleQuickStatusChange = async (newStatus: RoomOperationalStatus) => {
    if (liveStay && newStatus !== "OCCUPIED") {
      const guestName = liveStay.guestName || "In-House Guest";
      alert(
        `Cannot change status to ${newStatus}: Room currently has an active in-house guest (${guestName}). Please check out the guest from the Front Desk first.`
      );
      return;
    }

    setUpdatingStatus(true);
    try {
      const res = await updateRoomStatusAction(propertyId, room.id, newStatus);
      if (res.success) {
        onSuccess();
      } else {
        alert(res.error || "Failed to update room status.");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleQuickHousekeepingChange = async (newHkStatus: RoomHousekeepingStatus) => {
    setUpdatingStatus(true);
    try {
      const res = await updateRoomAction(propertyId, room.id, { housekeeping_status: newHkStatus });
      if (res.success) {
        onSuccess();
      } else {
        alert(res.error || "Failed to update housekeeping status.");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleUpdateRequestStatus = async (requestId: string, targetStatus: string) => {
    setUpdatingRequestId(requestId);
    try {
      if (targetStatus === "ACKNOWLEDGED") {
        await staffAcknowledgeGuestRequestAction(propertyId, requestId);
      } else if (targetStatus === "IN_PROGRESS") {
        await staffStartGuestRequestAction(propertyId, requestId);
      } else if (targetStatus === "COMPLETED") {
        await staffCompleteGuestRequestAction(propertyId, requestId, "Completed from Room Inspector");
      }
      onSuccess();
    } catch (err) {
      console.error(err);
    } finally {
      setUpdatingRequestId(null);
    }
  };

  return (
    <>
      <Modal open={open} onClose={onClose} size="xl" className="p-0 overflow-hidden max-w-3xl" hideCloseButton={true}>
      <div className="flex flex-col max-h-[88vh] overflow-hidden -m-6">
        {/* ── TOP HERO HEADER BANNER ── */}
        <div
          className={cn(
            "relative p-5 text-white bg-gradient-to-br border-b shrink-0",
            theme.gradient,
            theme.border
          )}
        >
          {/* Subtle gold accent top line */}
          <div
            className="absolute top-0 left-0 right-0 h-[2px]"
            style={{
              background: "linear-gradient(90deg, transparent 0%, rgba(214,168,90,0.6) 50%, transparent 100%)",
            }}
          />

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
            {/* Left: Room Badge + Title */}
            <div className="flex items-center gap-3.5">
              <div
                className="px-3.5 py-2 rounded-xl text-center min-w-[56px] shadow-lg border"
                style={{
                  background: "linear-gradient(135deg, rgba(214,168,90,0.25) 0%, rgba(214,168,90,0.1) 100%)",
                  borderColor: "rgba(214,168,90,0.45)",
                }}
              >
                <span className="block text-[8.5px] uppercase font-black tracking-widest text-[#E8CD8A]/70">
                  ROOM
                </span>
                <span className="text-[20px] font-black text-[#E8CD8A] leading-none">
                  {room.room_number}
                </span>
              </div>

              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-[18px] font-black tracking-tight text-white">
                    {room.room_name ? `${room.room_name} · Room ${room.room_number}` : `Room ${room.room_number}`}
                  </h2>
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold border shadow-2xs",
                      theme.badgeBg,
                      theme.badgeText
                    )}
                  >
                    <StatusIcon className="w-3.5 h-3.5" />
                    <span>{theme.label}</span>
                  </span>
                </div>
                <div className="flex items-center gap-3 text-[12px] text-white/60 mt-1 flex-wrap">
                  <span className="flex items-center gap-1 font-semibold text-white/80">
                    <BedDouble className="w-3.5 h-3.5 text-indigo-400" />
                    {typeName}
                  </span>
                  <span className="text-white/20">·</span>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-amber-400" />
                    {floorName} {room.view_type ? `(${room.view_type} View)` : ""}
                  </span>
                  <span className="text-white/20">·</span>
                  <span className="font-bold text-emerald-300">
                    {formatCurrency(rate, currency)} <span className="text-white/50 text-[10.5px]">/night</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Right: Quick Status Changer & Close */}
            <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
              <div className="flex flex-col items-end">
                <span className="text-[9.5px] font-black uppercase tracking-wider text-white/40 mb-1">
                  {liveStay ? "Status (In-House Guest)" : "Change Status"}
                </span>
                {liveStay ? (
                  <div
                    title="Room status is locked while a guest is in-house. Check out the guest to mark room available."
                    className="h-8 text-[11px] font-bold rounded-lg px-2.5 bg-purple-950/80 border border-purple-500/40 text-purple-200 flex items-center gap-1.5 shadow-sm cursor-not-allowed"
                  >
                    <span>🟣 Occupied (In-House)</span>
                    <span className="text-[10px] bg-purple-500/20 px-1.5 py-0.5 rounded text-purple-300">
                      Locked
                    </span>
                  </div>
                ) : (
                  <select
                    disabled={updatingStatus}
                    value={room.status}
                    onChange={(e) => handleQuickStatusChange(e.target.value as RoomOperationalStatus)}
                    className="h-8 text-[11.5px] font-bold rounded-lg px-2.5 bg-slate-900/90 border border-white/20 text-white focus:outline-none focus:border-amber-400 cursor-pointer shadow-sm"
                  >
                    <option value="AVAILABLE">🟢 Available / Vacant Clean</option>
                    <option value="OCCUPIED">🟣 Occupied / In-House</option>
                    <option value="DIRTY">🟠 Dirty / Needs Cleaning</option>
                    <option value="CLEANING">🔵 Cleaning In Progress</option>
                    <option value="INSPECTED">✅ Inspected & Approved</option>
                    <option value="OUT_OF_ORDER">🔴 Out of Order</option>
                    <option value="OUT_OF_SERVICE">⚪ Out of Service</option>
                  </select>
                )}
              </div>

              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white/70 hover:text-white flex items-center justify-center transition-colors shrink-0 ml-1"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* ── INTERACTIVE TAB NAVIGATION ── */}
        <div className="flex items-center gap-1 px-5 pt-3 pb-2 bg-slate-50 border-b border-slate-200 overflow-x-auto shrink-0">
          <button
            onClick={() => setActiveTab("guest")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-bold transition-all shrink-0",
              activeTab === "guest"
                ? "bg-white text-indigo-700 shadow-xs border border-slate-200/80"
                : "text-slate-600 hover:text-slate-900"
            )}
          >
            <User className="w-3.5 h-3.5 text-indigo-600" />
            <span>Guest &amp; Stay</span>
            {liveStay && (
              <span className="h-2 w-2 rounded-full bg-indigo-600 animate-pulse" />
            )}
          </button>

          <button
            onClick={() => setActiveTab("billing")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-bold transition-all shrink-0",
              activeTab === "billing"
                ? "bg-white text-emerald-700 shadow-xs border border-slate-200/80"
                : "text-slate-600 hover:text-slate-900"
            )}
          >
            <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
            <span>Bill &amp; Folio</span>
            {liveStay && (
              <span className="text-[10px] font-black px-1.5 py-0.2 rounded-md bg-emerald-100 text-emerald-800">
                {formatCurrency(liveStay.balanceDue, currency)}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("requests")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-bold transition-all shrink-0",
              activeTab === "requests"
                ? "bg-white text-amber-800 shadow-xs border border-slate-200/80"
                : "text-slate-600 hover:text-slate-900"
            )}
          >
            <BellRing className="w-3.5 h-3.5 text-amber-600" />
            <span>Service Requests</span>
            {activeRequests.length > 0 && (
              <span className="text-[10px] font-black px-1.5 py-0.2 rounded-full bg-rose-500 text-white animate-pulse">
                {activeRequests.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("specs")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-bold transition-all shrink-0",
              activeTab === "specs"
                ? "bg-white text-slate-800 shadow-xs border border-slate-200/80"
                : "text-slate-600 hover:text-slate-900"
            )}
          >
            <Layers className="w-3.5 h-3.5 text-slate-500" />
            <span>Room Specs &amp; HK</span>
          </button>
        </div>

        {/* ── TAB CONTENTS ── */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4 bg-white">
          {/* TAB 1: GUEST & STAY */}
          {activeTab === "guest" && (
            <div>
              {liveStay ? (
                <div className="space-y-3.5">
                  {/* Primary Guest Card */}
                  <div className="p-4 rounded-xl border border-indigo-100 bg-gradient-to-r from-indigo-50/50 to-purple-50/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
                    <div className="flex items-center gap-3">
                      <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-700 flex items-center justify-center text-white font-black text-sm shadow-md shrink-0">
                        {liveStay.guestName.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-[15px] font-black text-slate-900">
                            {liveStay.guestName}
                          </h4>
                          {liveStay.guestVip && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9.5px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-300">
                              <Crown className="w-2.5 h-2.5 text-amber-600" />
                              VIP
                            </span>
                          )}
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-white text-slate-700 border border-slate-200">
                            {liveStay.confirmationNumber}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-[12px] text-slate-500 mt-1 flex-wrap">
                          {liveStay.guestPhone && (
                            <span className="flex items-center gap-1">
                              <Phone className="w-3 h-3 text-slate-400" />
                              {liveStay.guestPhone}
                            </span>
                          )}
                          {liveStay.guestEmail && (
                            <span className="flex items-center gap-1">
                              <Mail className="w-3 h-3 text-slate-400" />
                              {liveStay.guestEmail}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto flex-wrap">
                      {liveStay.folioId && (
                        <Button
                          size="sm"
                          onClick={() => setShowPaymentModal(true)}
                          className="h-8 px-3 text-[11.5px] font-bold rounded-lg gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                        >
                          <CreditCard className="w-3.5 h-3.5" />
                          <span>Take Payment</span>
                        </Button>
                      )}
                      <Link href={`/front-desk/stays/${liveStay.id}`}>
                        <Button
                          size="sm"
                          className="h-8 px-3 text-[11.5px] font-bold rounded-lg gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs"
                        >
                          <span>Stay Record</span>
                          <ExternalLink className="w-3 h-3" />
                        </Button>
                      </Link>
                    </div>
                  </div>

                  {/* Stay Dates & Occupants Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div className="p-3 rounded-xl border border-slate-200/80 bg-slate-50/70">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                        Checked In
                      </span>
                      <p className="text-[13px] font-extrabold text-slate-900 mt-0.5 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                        {new Date(liveStay.checkInDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                      </p>
                    </div>

                    <div className="p-3 rounded-xl border border-slate-200/80 bg-slate-50/70">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                        Expected Out
                      </span>
                      <p className="text-[13px] font-extrabold text-slate-900 mt-0.5 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-amber-600" />
                        {new Date(liveStay.expectedCheckOutDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                      </p>
                    </div>

                    <div className="p-3 rounded-xl border border-slate-200/80 bg-slate-50/70">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                        Occupants
                      </span>
                      <p className="text-[13px] font-extrabold text-slate-900 mt-0.5 flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-indigo-600" />
                        {liveStay.adults} Adults {liveStay.children > 0 ? `, ${liveStay.children} Kids` : ""}
                      </p>
                    </div>

                    <div className="p-3 rounded-xl border border-slate-200/80 bg-slate-50/70">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                        Key Card
                      </span>
                      <p className="text-[13px] font-extrabold text-slate-900 mt-0.5 flex items-center gap-1">
                        <Key className="w-3.5 h-3.5 text-slate-500" />
                        {liveStay.keyCardNumber || "Issued (Front Desk)"}
                      </p>
                    </div>
                  </div>

                  {liveStay.notes && (
                    <div className="p-3 rounded-xl border border-slate-200 bg-amber-50/40 text-[12px] text-slate-700">
                      <span className="font-bold text-slate-900">Front Desk Notes: </span>
                      {liveStay.notes}
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-8 text-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50 space-y-3">
                  <div className="h-10 w-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-2xs">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-[14px] font-black text-slate-800">Room is Currently Vacant</h4>
                    <p className="text-[12px] text-slate-500 max-w-sm mx-auto mt-0.5">
                      No active guest stay is assigned to Room {room.room_number}. You can assign a walk-in guest or check in an arrival.
                    </p>
                  </div>
                  <Link href={`/front-desk?action=walkin&room=${room.id}`}>
                    <Button size="sm" className="h-8 px-4 text-[12px] font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 shadow-xs">
                      <span>Assign Walk-In Guest</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: BILLING & FOLIO */}
          {activeTab === "billing" && (
            <div>
              {liveStay ? (
                <div className="space-y-3.5">
                  {/* Folio Summary Tiles */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/80">
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">
                        Total Billed
                      </span>
                      <p className="text-[18px] font-black text-slate-900 mt-1 tabular-nums">
                        {formatCurrency(liveStay.totalCharges, currency)}
                      </p>
                    </div>

                    <div className="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/80">
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">
                        Total Paid
                      </span>
                      <p className="text-[18px] font-black text-emerald-600 mt-1 tabular-nums">
                        {formatCurrency(liveStay.totalPaid, currency)}
                      </p>
                    </div>

                    <div className="p-3.5 rounded-xl border border-amber-200/80 bg-amber-50/60">
                      <span className="text-[10px] font-black text-amber-800 uppercase tracking-wider block">
                        Balance Due
                      </span>
                      <p className="text-[18px] font-black text-amber-700 mt-1 tabular-nums">
                        {formatCurrency(liveStay.balanceDue, currency)}
                      </p>
                    </div>
                  </div>

                  {/* Folio Actions & Direct Link */}
                  <div className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/40 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                        <Receipt className="h-4.5 w-4.5" />
                      </div>
                      <div>
                        <h5 className="text-[13px] font-bold text-slate-900">
                          Live Stay Folio &amp; Room Bill
                        </h5>
                        <p className="text-[11.5px] text-slate-500 mt-0.5">
                          {liveStay.charges && liveStay.charges.length > 0
                            ? `${liveStay.charges.length} active charge line items on record.`
                            : "In-room dining, POS bills, and stay tariff post directly to this folio."}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 flex-wrap">
                      {liveStay.folioId && (
                        <Button
                          size="sm"
                          onClick={() => setShowPaymentModal(true)}
                          className="h-8 px-3 text-[11.5px] font-bold rounded-lg gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                        >
                          <CreditCard className="w-3.5 h-3.5" />
                          <span>Collect Payment</span>
                        </Button>
                      )}
                      <Link href={liveStay.folioId ? `/billing/folios/${liveStay.folioId}` : "/billing/folios"}>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 px-3 text-[11.5px] font-bold rounded-lg gap-1.5 bg-white border-slate-300 hover:bg-slate-100 text-slate-800 shadow-xs"
                        >
                          <span>Manage Folio</span>
                          <ExternalLink className="w-3 h-3" />
                        </Button>
                      </Link>
                    </div>
                  </div>

                  {/* Itemized Running Charges Breakdown */}
                  {liveStay.charges && liveStay.charges.length > 0 && (
                    <div className="rounded-xl border border-slate-200/80 overflow-hidden">
                      <div className="px-3.5 py-2 bg-slate-100/80 border-b border-slate-200/80 flex items-center justify-between">
                        <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-600">
                          Running Itemized Charges
                        </span>
                        <span className="text-[10.5px] font-semibold text-slate-500">
                          {liveStay.charges.length} items
                        </span>
                      </div>
                      <div className="divide-y divide-slate-100 max-h-48 overflow-y-auto bg-white">
                        {liveStay.charges.map((c) => (
                          <div key={c.id} className="p-3 flex items-center justify-between gap-2 hover:bg-slate-50/70 transition-colors">
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 border border-slate-200 uppercase">
                                  {c.chargeType.replace(/_/g, " ")}
                                </span>
                                <p className="text-[12px] font-bold text-slate-900 truncate">
                                  {c.description}
                                </p>
                              </div>
                              <p className="text-[10.5px] text-slate-400 mt-0.5">
                                {new Date(c.postedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })} · {new Date(c.postedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                              </p>
                            </div>
                            <span className="text-[12.5px] font-black text-slate-900 tabular-nums shrink-0">
                              {formatCurrency(c.amount, currency)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-8 text-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50 space-y-2">
                  <Receipt className="h-8 w-8 text-slate-400 mx-auto" />
                  <h4 className="text-[14px] font-bold text-slate-800">No Active Folio</h4>
                  <p className="text-[12px] text-slate-500 max-w-xs mx-auto">
                    Room is vacant. Base rate for booking is {formatCurrency(rate, currency)} /night.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: SERVICE REQUESTS */}
          {activeTab === "requests" && (
            <div className="space-y-2.5">
              {activeRequests.length === 0 ? (
                <div className="p-8 text-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50 space-y-2">
                  <CheckCircle2 className="h-8 w-8 text-emerald-600 mx-auto" />
                  <h4 className="text-[14px] font-bold text-slate-800">No Pending Service Requests</h4>
                  <p className="text-[12px] text-slate-500 max-w-sm mx-auto">
                    All housekeeping, maintenance, and concierge requests for Room {room.room_number} are fulfilled.
                  </p>
                </div>
              ) : (
                activeRequests.map((req) => (
                  <div
                    key={req.id}
                    className="p-3 rounded-xl border border-slate-200/80 bg-slate-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
                  >
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-extrabold text-[13px] text-slate-900">
                          {req.title}
                        </span>
                        <Badge
                          variant={req.priority === "URGENT" ? "danger" : req.priority === "HIGH" ? "warning" : "info"}
                          size="sm"
                        >
                          {req.priority}
                        </Badge>
                        <Badge variant="default" size="sm">
                          {req.status}
                        </Badge>
                        <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-slate-200 text-slate-700 uppercase">
                          {req.category}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[11.5px] text-slate-500 mt-1">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-400" />
                          {new Date(req.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                        {req.assignedStaffName && (
                          <>
                            <span>·</span>
                            <span>Assigned: {req.assignedStaffName}</span>
                          </>
                        )}
                        {req.description && (
                          <>
                            <span>·</span>
                            <span className="italic text-slate-600 line-clamp-1">{req.description}</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
                      {req.status === "SUBMITTED" && (
                        <Button
                          size="sm"
                          disabled={updatingRequestId === req.id}
                          onClick={() => handleUpdateRequestStatus(req.id, "ACKNOWLEDGED")}
                          className="h-7 px-2.5 text-[11px] font-bold rounded-lg gap-1 bg-amber-500 hover:bg-amber-600 text-white"
                        >
                          {updatingRequestId === req.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                          <span>Accept</span>
                        </Button>
                      )}

                      {(req.status === "ACKNOWLEDGED" || req.status === "ASSIGNED") && (
                        <Button
                          size="sm"
                          disabled={updatingRequestId === req.id}
                          onClick={() => handleUpdateRequestStatus(req.id, "IN_PROGRESS")}
                          className="h-7 px-2.5 text-[11px] font-bold rounded-lg gap-1 bg-indigo-600 hover:bg-indigo-700 text-white"
                        >
                          {updatingRequestId === req.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
                          <span>Start</span>
                        </Button>
                      )}

                      {req.status === "IN_PROGRESS" && (
                        <Button
                          size="sm"
                          disabled={updatingRequestId === req.id}
                          onClick={() => handleUpdateRequestStatus(req.id, "COMPLETED")}
                          className="h-7 px-2.5 text-[11px] font-bold rounded-lg gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                          {updatingRequestId === req.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCheck className="w-3 h-3" />}
                          <span>Complete</span>
                        </Button>
                      )}

                      <Link href={`/guest-requests/${req.id}`}>
                        <Button size="sm" variant="outline" className="h-7 px-2 text-[11px] font-bold rounded-lg">
                          Details
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 4: ROOM SPECS & HOUSEKEEPING */}
          {activeTab === "specs" && (
            <div className="space-y-4">
              {/* Housekeeping Quick Toggle */}
              <div className="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-[10.5px] font-black uppercase tracking-wider text-slate-500 block">
                    Housekeeping Status
                  </span>
                  <div className="flex items-center gap-2 mt-1">
                    <span
                      className={cn(
                        "px-2.5 py-0.5 rounded-full text-[11.5px] font-black border",
                        room.housekeeping_status === "CLEAN"
                          ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                          : room.housekeeping_status === "DIRTY"
                          ? "bg-amber-100 text-amber-800 border-amber-300"
                          : room.housekeeping_status === "CLEANING"
                          ? "bg-sky-100 text-sky-800 border-sky-300"
                          : "bg-teal-100 text-teal-800 border-teal-300"
                      )}
                    >
                      {room.housekeeping_status}
                    </span>
                    <span className="text-[12px] text-slate-500">
                      {room.housekeeping_status === "CLEAN" ? "Ready for guest arrival" : "Requires attention"}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <Button
                    size="sm"
                    variant={room.housekeeping_status === "CLEAN" ? "secondary" : "outline"}
                    disabled={updatingStatus}
                    onClick={() => handleQuickHousekeepingChange("CLEAN")}
                    className="h-7.5 px-2.5 text-[11px] font-bold rounded-lg text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border-emerald-200"
                  >
                    Mark Clean
                  </Button>
                  <Button
                    size="sm"
                    variant={room.housekeeping_status === "DIRTY" ? "secondary" : "outline"}
                    disabled={updatingStatus}
                    onClick={() => handleQuickHousekeepingChange("DIRTY")}
                    className="h-7.5 px-2.5 text-[11px] font-bold rounded-lg text-amber-700 bg-amber-50 hover:bg-amber-100 border-amber-200"
                  >
                    Mark Dirty
                  </Button>
                </div>
              </div>

              {/* Physical Room Metadata */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                <div className="p-3 rounded-xl border border-slate-200/80 bg-slate-50/50">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                    Capacity
                  </span>
                  <p className="text-[13px] font-extrabold text-slate-900 mt-0.5">
                    {room.max_occupancy || room.room_type?.max_occupancy || 2} Guests
                  </p>
                </div>

                <div className="p-3 rounded-xl border border-slate-200/80 bg-slate-50/50">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                    Bedding
                  </span>
                  <p className="text-[13px] font-extrabold text-slate-900 mt-0.5 truncate">
                    {room.room_type?.bed_configuration || "King Bed"}
                  </p>
                </div>

                <div className="p-3 rounded-xl border border-slate-200/80 bg-slate-50/50">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                    Size
                  </span>
                  <p className="text-[13px] font-extrabold text-slate-900 mt-0.5">
                    {room.room_type?.size_sqft ? `${room.room_type.size_sqft} sq ft` : "Standard Suite"}
                  </p>
                </div>
              </div>

              {/* Amenities */}
              {room.room_type?.amenities && room.room_type.amenities.length > 0 && (
                <div>
                  <span className="text-[11px] font-black text-slate-600 uppercase tracking-wider block mb-2">
                    Room Amenities
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {room.room_type.amenities.map((amenity, i) => (
                      <span
                        key={i}
                        className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200/80"
                      >
                        {amenity}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── FOOTER ACTIONS ── */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2 flex-wrap shrink-0">
          <div className="flex items-center gap-2">
            <Link href={`/rooms/${room.id}`}>
              <Button
                size="sm"
                variant="outline"
                className="h-8 px-3 text-[11.5px] font-bold rounded-lg gap-1.5 bg-white border-slate-300 hover:bg-slate-100 text-slate-800"
              >
                <span>Full Room Page</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </Link>

            <Link href={`/rooms/${room.id}/edit`}>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 px-2.5 text-[11.5px] font-bold rounded-lg gap-1 text-slate-600 hover:text-slate-900"
              >
                <Edit className="w-3.5 h-3.5" />
                <span>Edit Specs</span>
              </Button>
            </Link>
          </div>

          <Button
            size="sm"
            onClick={onClose}
            className="h-8 px-4 text-[12px] font-bold rounded-lg bg-slate-900 hover:bg-slate-800 text-white"
          >
            Done
          </Button>
        </div>
      </div>
    </Modal>

    {liveStay?.folioId && (
      <RecordPaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        propertyId={propertyId}
        folioId={liveStay.folioId}
        currency={currency}
        balanceDue={liveStay.balanceDue || 0}
        onSuccess={() => {
          setShowPaymentModal(false);
          onSuccess();
          router.refresh();
        }}
      />
    )}
    </>
  );
}
