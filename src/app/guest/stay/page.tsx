import * as React from "react";
import Link from "next/link";
import { 
  BedDouble, 
  CalendarDays, 
  Users, 
  ShieldCheck, 
  Clock, 
  PhoneCall, 
  KeyRound
} from "lucide-react";
import { getActiveGuestSession } from "@/lib/guest-portal/actions";

export default async function GuestStayPage() {
  const session = await getActiveGuestSession();

  if (!session || session.session_type !== "VERIFIED_STAY") {
    return (
      <div className="p-6 text-center space-y-4 my-auto min-h-[60vh] flex flex-col justify-center">
        <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 mx-auto flex items-center justify-center">
          <KeyRound className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-bold text-white">No Active Verified Stay</h2>
        <p className="text-xs text-slate-400 max-w-xs mx-auto">
          Please scan your in-room QR code and enter your confirmation number to access your stay itinerary and room details.
        </p>
        <Link
          href="/guest/home"
          className="inline-block mx-auto py-2.5 px-4 rounded-xl bg-slate-800 text-amber-400 text-xs font-semibold hover:bg-slate-700 transition"
        >
          Return to Guest Home
        </Link>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-5">
      {/* Title & Badge */}
      <div className="space-y-1">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-bold uppercase tracking-wider">
          <ShieldCheck className="w-3.5 h-3.5" />
          Verified In-House Stay
        </div>
        <h2 className="text-xl font-extrabold text-white tracking-tight">
          My Room & Stay Details
        </h2>
        <p className="text-xs text-slate-400">
          Essential stay itinerary and check-out schedule for Room {session.room_number}.
        </p>
      </div>

      {/* Primary Stay Card */}
      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <BedDouble className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] text-slate-500 uppercase font-semibold block">Room Assignment</span>
              <h3 className="text-sm font-bold text-white">Room {session.room_number}</h3>
            </div>
          </div>

          <span className="text-xs px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 font-medium">
            {session.room_type || "Standard Room"}
          </span>
        </div>

        {/* Guest Name & Party */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/60 space-y-1">
            <span className="text-[10px] text-slate-500 uppercase font-medium flex items-center gap-1">
              <Users className="w-3 h-3 text-slate-400" />
              Primary Guest
            </span>
            <span className="text-slate-200 font-bold block truncate">
              {session.guest_first_name} {session.guest_last_name}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/60 space-y-1">
            <span className="text-[10px] text-slate-500 uppercase font-medium flex items-center gap-1">
              <Users className="w-3 h-3 text-slate-400" />
              Party Size
            </span>
            <span className="text-slate-200 font-bold block">
              {session.adults || 1} Adult{session.adults && session.adults > 1 ? "s" : ""}
              {session.children && session.children > 0 ? `, ${session.children} Child` : ""}
            </span>
          </div>
        </div>

        {/* Schedule */}
        <div className="grid grid-cols-2 gap-3 text-xs pt-1">
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/60 space-y-1">
            <span className="text-[10px] text-slate-500 uppercase font-medium flex items-center gap-1">
              <CalendarDays className="w-3 h-3 text-slate-400" />
              Check-In Time
            </span>
            <span className="text-slate-200 font-bold block">
              {session.check_in_time || "14:00"}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/60 space-y-1">
            <span className="text-[10px] text-slate-500 uppercase font-medium flex items-center gap-1">
              <Clock className="w-3 h-3 text-slate-400" />
              Expected Check-Out
            </span>
            <span className="text-amber-400 font-bold block">
              {session.expected_check_out_date || "11:00"}
            </span>
          </div>
        </div>
      </div>

      {/* View Bill & Charges Link */}
      <Link
        href="/guest/folio"
        className="w-full p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-slate-900 border border-amber-500/30 flex items-center justify-between group hover:border-amber-500/50 transition shadow-md"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold">
            ₹
          </div>
          <div>
            <h4 className="text-sm font-bold text-white group-hover:text-amber-300 transition">
              My Bill & Folio
            </h4>
            <p className="text-[11px] text-slate-400">
              View live room charges, restaurant orders, payments & balance.
            </p>
          </div>
        </div>
        <span className="text-xs font-semibold text-amber-400 group-hover:translate-x-0.5 transition">
          View &rarr;
        </span>
      </Link>

      {/* Safe Check-Out Guidelines */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2.5">
        <h4 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-amber-400" />
          <span>Check-Out Notice</span>
        </h4>
        <p className="text-xs text-slate-400 leading-relaxed">
          Standard check-out is at {session.check_out_time || "11:00 AM"}. If you require late check-out or luggage assistance, please reach out to the front desk in advance.
        </p>
      </div>

      {/* Front Desk Direct Dial */}
      {session.front_desk_phone && (
        <a
          href={`tel:${session.front_desk_phone}`}
          className="w-full py-3.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-800 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition"
        >
          <PhoneCall className="w-4 h-4 text-amber-400" />
          <span>Call Front Desk ({session.front_desk_phone})</span>
        </a>
      )}
    </div>
  );
}
