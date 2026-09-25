"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  Sparkles, 
  BedDouble, 
  Wrench, 
  Shirt, 
  Flower2, 
  Car, 
  Utensils, 
  Compass, 
  HelpCircle,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Loader2,
  Send
} from "lucide-react";
import { ServiceRequestCategory, ServiceRequestPriority } from "@/lib/guest-services/types";
import { createGuestServiceRequestAction } from "@/lib/guest-services/actions";
import { GuestVerifiedSessionContext } from "@/lib/guest-portal/types";

interface ServicesViewProps {
  session?: GuestVerifiedSessionContext | null;
}

interface CategoryConfig {
  id: ServiceRequestCategory;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  description: string;
  options: string[];
}

const CATEGORIES: CategoryConfig[] = [
  {
    id: "HOUSEKEEPING",
    name: "Housekeeping",
    icon: Sparkles,
    color: "from-emerald-500/20 to-emerald-600/10 text-emerald-400 border-emerald-500/30",
    description: "Linens, cleaning, and essential guest supplies",
    options: [
      "Extra towels",
      "Extra pillows & blankets",
      "Room cleaning & turnover",
      "Toiletries refill",
      "Complimentary water bottles",
      "Trash clearance",
    ],
  },
  {
    id: "FRONT_DESK",
    name: "Front Desk",
    icon: BedDouble,
    color: "from-amber-500/20 to-amber-600/10 text-amber-400 border-amber-500/30",
    description: "General reception & check-out assistance",
    options: [
      "General assistance",
      "Check-out timing enquiry",
      "Hotel information & guide",
      "Wake-up call request",
      "Key card replacement",
    ],
  },
  {
    id: "MAINTENANCE",
    name: "Maintenance",
    icon: Wrench,
    color: "from-blue-500/20 to-blue-600/10 text-blue-400 border-blue-500/30",
    description: "In-room technical & appliance repairs",
    options: [
      "Air Conditioning (AC) issue",
      "Television & entertainment issue",
      "Wi-Fi connectivity issue",
      "Plumbing & bathroom drainage",
      "Lighting & electrical switch",
    ],
  },
  {
    id: "LAUNDRY",
    name: "Laundry",
    icon: Shirt,
    color: "from-indigo-500/20 to-indigo-600/10 text-indigo-400 border-indigo-500/30",
    description: "Dry cleaning, pressing, and laundry collection",
    options: [
      "Laundry pickup from room",
      "Ironing & pressing request",
      "Laundry status update",
    ],
  },
  {
    id: "CONCIERGE",
    name: "Concierge",
    icon: Compass,
    color: "from-purple-500/20 to-purple-600/10 text-purple-400 border-purple-500/30",
    description: "Recommendations, tours, and local bookings",
    options: [
      "Restaurant recommendation & reservation",
      "Local attraction guide & tickets",
      "Taxi assistance & city guide",
    ],
  },
  {
    id: "SPA",
    name: "Spa & Wellness",
    icon: Flower2,
    color: "from-pink-500/20 to-pink-600/10 text-pink-400 border-pink-500/30",
    description: "Spa appointments, massages, and wellness",
    options: [
      "Spa appointment enquiry",
      "Signature massage booking",
      "Wellness center schedule",
    ],
  },
  {
    id: "TRANSPORT",
    name: "Transport",
    icon: Car,
    color: "from-teal-500/20 to-teal-600/10 text-teal-400 border-teal-500/30",
    description: "Airport transfers, luxury shuttles & taxis",
    options: [
      "Airport departure transfer",
      "City taxi booking",
      "Valet car retrieval",
    ],
  },
  {
    id: "ROOM_SERVICE",
    name: "In-Room Dining",
    icon: Utensils,
    color: "from-rose-500/20 to-rose-600/10 text-rose-400 border-rose-500/30",
    description: "Cutlery, ice bucket, and dining requests",
    options: [
      "Ice bucket & glasses",
      "Extra cutlery & crockery",
      "Special dietary assistance",
      "Used tray clearance",
    ],
  },
  {
    id: "OTHER",
    name: "Other Request",
    icon: HelpCircle,
    color: "from-slate-700/40 to-slate-800/20 text-slate-300 border-slate-700",
    description: "Custom guest requirement",
    options: ["Custom hotel service", "Special occasion request"],
  },
];

export function ServicesView({ session }: ServicesViewProps) {
  const router = useRouter();
  const isVerifiedStay = session?.session_type === "VERIFIED_STAY";

  const [selectedCat, setSelectedCat] = React.useState<CategoryConfig | null>(null);
  const [selectedOption, setSelectedOption] = React.useState<string>("");
  const [customTitle, setCustomTitle] = React.useState<string>("");
  const [description, setDescription] = React.useState<string>("");
  const [priority, setPriority] = React.useState<ServiceRequestPriority>("MEDIUM");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [successNotice, setSuccessNotice] = React.useState<{ id: string; title: string } | null>(null);

  const openCategoryModal = (cat: CategoryConfig) => {
    setSelectedCat(cat);
    setSelectedOption(cat.options[0] || "");
    setCustomTitle("");
    setDescription("");
    setPriority("MEDIUM");
    setErrorMsg(null);
    setSuccessNotice(null);
  };

  const closeModal = () => {
    setSelectedCat(null);
    setSelectedOption("");
    setCustomTitle("");
    setDescription("");
    setErrorMsg(null);
  };

  const handleSubmitRequest = async () => {
    if (!selectedCat) return;
    if (!isVerifiedStay) {
      setErrorMsg("You must be an in-house guest with a verified room session to request services.");
      return;
    }

    const title = selectedOption === "Other" || selectedCat.id === "OTHER"
      ? (customTitle.trim() || selectedOption || "Service Request")
      : (customTitle.trim() || selectedOption);

    if (!title) {
      setErrorMsg("Please select or enter a request title.");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    const res = await createGuestServiceRequestAction({
      category: selectedCat.id,
      requestType: selectedOption || selectedCat.name,
      title,
      description: description.trim() || undefined,
      priority,
    });

    setIsSubmitting(false);

    if (!res.success || !res.requestId) {
      setErrorMsg(res.error || "Failed to submit request. Please try again.");
      return;
    }

    setSuccessNotice({ id: res.requestId, title: res.title || title });
    setTimeout(() => {
      closeModal();
      router.push(`/guest/requests/${res.requestId}`);
    }, 1500);
  };

  return (
    <div className="p-4 space-y-5 pb-24">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-850 to-slate-900 border border-slate-800 p-5 shadow-xl">
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[11px] font-bold uppercase tracking-wider">
            <Sparkles className="w-3 h-3" />
            Digital Guest Concierge
          </div>
          <h2 className="text-xl font-extrabold text-white tracking-tight">
            Guest Services & Requests
          </h2>
          <p className="text-xs text-slate-400">
            {isVerifiedStay
              ? `Select any service below to request immediate assistance for Room ${session?.room_number}.`
              : "Contactless digital service requests for verified hotel guests."}
          </p>
        </div>
      </div>

      {/* Unverified Notice */}
      {!isVerifiedStay && (
        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <p className="font-semibold text-amber-300">Room Verification Required</p>
            <p className="text-slate-400 text-[11px]">
              To submit service requests to hotel staff, please scan the QR code in your room to verify your reservation.
            </p>
          </div>
        </div>
      )}

      {/* Quick Link to My Requests */}
      {isVerifiedStay && (
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-900 border border-slate-800 shadow-md">
          <div className="space-y-0.5">
            <h4 className="text-xs font-bold text-white">Your Submitted Requests</h4>
            <p className="text-[10px] text-slate-400">Track staff assignment & completion</p>
          </div>
          <Link
            href="/guest/requests"
            className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1 transition shadow"
          >
            <span>View Requests</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

      {/* Service Categories Grid */}
      <div className="space-y-2.5">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">
          Select Service Category
        </h3>

        <div className="grid grid-cols-2 gap-3">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            return (
              <button
                key={cat.id}
                onClick={() => openCategoryModal(cat)}
                className="p-4 rounded-2xl bg-slate-900 hover:bg-slate-850 border border-slate-800 text-left transition active:scale-[0.98] group flex flex-col justify-between h-32 shadow-md relative overflow-hidden"
              >
                <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${cat.color} border flex items-center justify-center shrink-0`}>
                  <Icon className="w-5 h-5" />
                </div>

                <div className="space-y-0.5">
                  <h4 className="text-xs font-bold text-white group-hover:text-amber-400 transition">
                    {cat.name}
                  </h4>
                  <p className="text-[10px] text-slate-400 line-clamp-1">{cat.description}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Modal / Bottom Sheet for Request Submission */}
      {selectedCat && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-slate-900 border-t sm:border border-slate-800 rounded-t-3xl sm:rounded-2xl p-5 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${selectedCat.color} border flex items-center justify-center`}>
                  <selectedCat.icon className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">{selectedCat.name} Request</h3>
                  <p className="text-[10px] text-amber-400 font-semibold">Room {session?.room_number}</p>
                </div>
              </div>
              <button
                onClick={closeModal}
                className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center text-xs"
              >
                ✕
              </button>
            </div>

            {successNotice ? (
              <div className="p-6 text-center space-y-3">
                <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center animate-bounce">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h4 className="text-sm font-bold text-white">Your request has been sent to the hotel.</h4>
                <p className="text-xs text-amber-400 font-mono font-semibold">
                  {successNotice.title}
                </p>
                <p className="text-xs text-slate-400">
                  Staff have been notified. Redirecting to request tracker...
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Options Pills */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Quick Options
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {selectedCat.options.map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => {
                          setSelectedOption(opt);
                          setCustomTitle(opt);
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                          selectedOption === opt
                            ? "bg-amber-500 text-slate-950 shadow-md font-bold"
                            : "bg-slate-850 text-slate-300 border border-slate-700/80 hover:bg-slate-800"
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Specific Title Input */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Request Title
                  </label>
                  <input
                    type="text"
                    value={customTitle || selectedOption}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    placeholder="E.g., 2 Extra Towels & Bath Soap"
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                  />
                </div>

                {/* Additional Note */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Details or Preferred Time (Optional)
                  </label>
                  <textarea
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Provide any additional details or specific time preferences..."
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 resize-none"
                  />
                </div>

                {/* Urgency Selector */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Priority
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(["LOW", "MEDIUM", "URGENT"] as ServiceRequestPriority[]).map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setPriority(p)}
                        className={`py-1.5 rounded-xl text-xs font-bold transition ${
                          priority === p
                            ? p === "URGENT"
                              ? "bg-rose-500 text-white"
                              : "bg-amber-500 text-slate-950"
                            : "bg-slate-950 text-slate-400 border border-slate-800 hover:bg-slate-800"
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                {errorMsg && (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                {/* Submit Button */}
                <button
                  onClick={handleSubmitRequest}
                  disabled={isSubmitting}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:opacity-50 text-slate-950 font-black text-xs shadow-xl flex items-center justify-center gap-2 transition active:scale-[0.99]"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Sending Request...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Submit Request</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
