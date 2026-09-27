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
  Send,
  MessageSquarePlus,
  Clock,
  Check,
  Building2,
  ShieldCheck,
  Tag
} from "lucide-react";
import { ServiceRequestCategory, ServiceRequestPriority } from "@/lib/guest-services/types";
import { createGuestServiceRequestAction } from "@/lib/guest-services/actions";
import { GuestVerifiedSessionContext } from "@/lib/guest-portal/types";
import { createClient } from "@/lib/supabase/client";
import { getDepartmentForCategory } from "@/lib/alerts/routing";
import { PayableServiceItem } from "@/lib/guest-services/queries";

interface ServicesViewProps {
  session?: GuestVerifiedSessionContext | null;
  payableServices?: PayableServiceItem[];
}

interface ServiceCategoryMeta {
  id: ServiceRequestCategory;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  accentBg: string;
  badgeColor: string;
  description: string;
  isPaid: boolean;
  commonQuickOptions: string[];
}

const SERVICE_CATEGORIES: ServiceCategoryMeta[] = [
  // Complimentary Services
  {
    id: "HOUSEKEEPING",
    name: "Housekeeping",
    icon: Sparkles,
    color: "text-emerald-400",
    accentBg: "from-emerald-500/20 to-emerald-600/5 border-emerald-500/30",
    badgeColor: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    description: "Linens, cleaning & toiletries",
    isPaid: false,
    commonQuickOptions: [
      "Fresh bath towels & hand towels",
      "Extra pillows & blankets",
      "Full room cleaning & turnover",
      "Toiletries & shampoo refill",
      "Complimentary water bottles",
      "Trash clearance & bin change",
    ],
  },
  {
    id: "FRONT_DESK",
    name: "Front Desk",
    icon: BedDouble,
    color: "text-amber-400",
    accentBg: "from-amber-500/20 to-amber-600/5 border-amber-500/30",
    badgeColor: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    description: "Reception & check-out assistance",
    isPaid: false,
    commonQuickOptions: [
      "Late check-out request",
      "Wake-up call setup",
      "Luggage & bellboy assistance",
      "Keycard replacement / PIN",
      "General reception inquiry",
      "Invoice / Folio summary request",
    ],
  },
  {
    id: "MAINTENANCE",
    name: "Maintenance",
    icon: Wrench,
    color: "text-blue-400",
    accentBg: "from-blue-500/20 to-blue-600/5 border-blue-500/30",
    badgeColor: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    description: "In-room technical & appliance repairs",
    isPaid: false,
    commonQuickOptions: [
      "Air Conditioning (AC) cooling issue",
      "Bathroom door / lock repair",
      "Plumbing & drainage blockage",
      "Hot water & shower pressure",
      "Television / Cable / Wi-Fi issue",
      "Lighting & electrical switch issue",
    ],
  },
  {
    id: "CONCIERGE",
    name: "Concierge",
    icon: Compass,
    color: "text-purple-400",
    accentBg: "from-purple-500/20 to-purple-600/5 border-purple-500/30",
    badgeColor: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    description: "Tours, bookings & local guides",
    isPaid: false,
    commonQuickOptions: [
      "Restaurant table reservation",
      "Sightseeing & day tour booking",
      "Local attraction guide & passes",
      "Medical / pharmacy assistance",
      "Flight / Train travel assistance",
      "Special occasion arrangement",
    ],
  },
  {
    id: "ROOM_SERVICE",
    name: "In-Room Dining Amenities",
    icon: Utensils,
    color: "text-rose-400",
    accentBg: "from-rose-500/20 to-rose-600/5 border-rose-500/30",
    badgeColor: "bg-rose-500/10 text-rose-400 border-rose-500/20",
    description: "Cutlery, ice bucket & dining extras",
    isPaid: false,
    commonQuickOptions: [
      "Fresh ice bucket & glasses",
      "Extra cutlery, plates & wine glasses",
      "Used dining tray & plate clearance",
      "Coffee & tea refill kit",
      "Birthday / celebration cake delivery",
      "Minibar restock request",
    ],
  },

  // Chargeable / Paid Services (Linked with POS Catalog)
  {
    id: "LAUNDRY",
    name: "Laundry & Dry Cleaning",
    icon: Shirt,
    color: "text-indigo-400",
    accentBg: "from-indigo-500/20 to-indigo-600/5 border-indigo-500/30",
    badgeColor: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
    description: "Dry cleaning, pressing & wash",
    isPaid: true,
    commonQuickOptions: [
      "Express same-day laundry pickup",
      "Wash & Fold service",
      "Shirt & trouser steam pressing",
      "Suit & blazer dry cleaning",
      "Delicate garment care",
      "Shoe polish & leather care",
    ],
  },
  {
    id: "SPA",
    name: "Spa & Wellness",
    icon: Flower2,
    color: "text-pink-400",
    accentBg: "from-pink-500/20 to-pink-600/5 border-pink-500/30",
    badgeColor: "bg-pink-500/10 text-pink-400 border-pink-500/20",
    description: "Spa therapies & fitness passes",
    isPaid: true,
    commonQuickOptions: [
      "Full body Swedish massage (60m)",
      "Deep tissue muscle therapy (90m)",
      "Luxury facial & skin care",
      "Couple wellness spa package",
      "Swimming pool & health club pass",
      "Spa therapist consultation",
    ],
  },
  {
    id: "TRANSPORT",
    name: "Transport & Cabs",
    icon: Car,
    color: "text-teal-400",
    accentBg: "from-teal-500/20 to-teal-600/5 border-teal-500/30",
    badgeColor: "bg-teal-500/10 text-teal-400 border-teal-500/20",
    description: "Airport private transfers & cabs",
    isPaid: true,
    commonQuickOptions: [
      "Airport private cab transfer",
      "Local city taxi booking",
      "Full-day private chauffeur",
      "Railway station pickup / drop",
      "Valet car retrieval to porch",
      "Intercity outstation cab",
    ],
  },
  {
    id: "OTHER",
    name: "Special Amenities & Other",
    icon: HelpCircle,
    color: "text-slate-300",
    accentBg: "from-slate-700/40 to-slate-800/20 border-slate-700",
    badgeColor: "bg-slate-800 text-slate-300 border-slate-700",
    description: "Banquet halls, upgrades & custom requests",
    isPaid: true,
    commonQuickOptions: [
      "Conference & banquet hall rental",
      "Day use tariff & room extension",
      "VIP room welcome setup",
      "Extra bed / rollaway cot setup",
      "Special dietary consultation",
      "Custom hotel service",
    ],
  },
];

export function ServicesView({ session, payableServices = [] }: ServicesViewProps) {
  const router = useRouter();
  const isVerifiedStay = session?.session_type === "VERIFIED_STAY";

  const [selectedCat, setSelectedCat] = React.useState<ServiceCategoryMeta | null>(null);
  const [selectedQuickOption, setSelectedQuickOption] = React.useState<string>("");
  const [selectedPaidItem, setSelectedPaidItem] = React.useState<PayableServiceItem | null>(null);
  const [customMessage, setCustomMessage] = React.useState<string>("");
  const [priority, setPriority] = React.useState<ServiceRequestPriority>("MEDIUM");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [successNotice, setSuccessNotice] = React.useState<{ id: string; title: string } | null>(null);

  // Helper to filter POS items strictly relevant to the active category
  const getCategoryPaidItems = (cat: ServiceCategoryMeta): PayableServiceItem[] => {
    if (!payableServices || payableServices.length === 0) return [];

    const id = cat.id;
    return payableServices.filter((item) => {
      const name = item.name.toLowerCase();
      const catName = (item.category_name || "").toLowerCase();

      if (id === "LAUNDRY") {
        return name.includes("laundry") || name.includes("dry clean") || name.includes("press") || name.includes("iron") || catName.includes("laundry");
      }
      if (id === "SPA") {
        return name.includes("spa") || name.includes("massage") || name.includes("therapy") || name.includes("pool") || name.includes("health club") || catName.includes("spa");
      }
      if (id === "TRANSPORT") {
        return name.includes("cab") || name.includes("transfer") || name.includes("taxi") || name.includes("airport") || name.includes("car") || catName.includes("transport");
      }
      if (id === "ROOM_SERVICE") {
        return name.includes("minibar") || name.includes("beverage") || name.includes("basket") || catName.includes("amenit");
      }
      if (id === "OTHER") {
        return name.includes("banquet") || name.includes("conference") || name.includes("hall") || name.includes("tariff") || name.includes("extra bed");
      }
      return false;
    });
  };

  const openCategoryModal = (cat: ServiceCategoryMeta) => {
    setSelectedCat(cat);
    setSelectedQuickOption("");
    setSelectedPaidItem(null);
    setCustomMessage("");
    setPriority("MEDIUM");
    setErrorMsg(null);
    setSuccessNotice(null);
  };

  const closeModal = () => {
    setSelectedCat(null);
    setSelectedQuickOption("");
    setSelectedPaidItem(null);
    setCustomMessage("");
    setErrorMsg(null);
  };

  const handleSubmitRequest = async () => {
    if (!selectedCat) return;
    if (!isVerifiedStay) {
      setErrorMsg("You must be an in-house guest with a verified room session to request services.");
      return;
    }

    // Determine final title and description
    let finalTitle = "";
    if (selectedPaidItem) {
      finalTitle = `${selectedPaidItem.name} (₹${selectedPaidItem.price.toFixed(2)})`;
    } else if (selectedQuickOption) {
      finalTitle = selectedQuickOption;
    } else if (customMessage.trim()) {
      finalTitle = customMessage.trim().split("\n")[0].substring(0, 80);
    } else {
      finalTitle = `${selectedCat.name} Assistance`;
    }

    if (!selectedPaidItem && !selectedQuickOption && !customMessage.trim()) {
      setErrorMsg("Please select an option or type your custom message.");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    const fullDescription = [
      selectedPaidItem ? `Requested Item: ${selectedPaidItem.name} — Rate: ₹${selectedPaidItem.price.toFixed(2)} (Billed to Folio)` : null,
      selectedQuickOption ? `Service Type: ${selectedQuickOption}` : null,
      customMessage.trim() ? `Guest Note: ${customMessage.trim()}` : null,
    ]
      .filter(Boolean)
      .join("\n\n");

    const res = await createGuestServiceRequestAction({
      category: selectedCat.id,
      requestType: selectedPaidItem?.name || selectedQuickOption || selectedCat.name,
      title: finalTitle,
      description: fullDescription || undefined,
      priority,
    });

    setIsSubmitting(false);

    if (!res.success || !res.requestId) {
      setErrorMsg(res.error || "Failed to submit request. Please try again.");
      return;
    }

    // Direct sub-50ms Realtime WebSocket Broadcast to staff screens
    const targetPropId = res.propertyId || session?.property_id;
    if (targetPropId) {
      try {
        const supabase = createClient();
        const alertChannel = supabase.channel(`stayhub:operational-alerts:${targetPropId}`);
        const finalCategory = res.category || selectedCat.id;
        void alertChannel.send({
          type: "broadcast",
          event: "OPERATIONAL_ALERT",
          payload: {
            id: res.requestId,
            type: "SERVICE_REQUEST",
            category: finalCategory,
            department: getDepartmentForCategory(finalCategory),
            roomNumber: res.roomNumber || session?.room_number || "—",
            guestName: res.guestName || (session?.guest_first_name ? `${session.guest_first_name} ${session.guest_last_name || ""}`.trim() : "Guest"),
            title: res.title || finalTitle,
            description: res.description || fullDescription || undefined,
            priority: res.priority || priority || "NORMAL",
            receivedAt: Date.now(),
            propertyId: targetPropId,
            status: "SUBMITTED",
          },
        });
      } catch (broadcastErr) {
        console.warn("Realtime broadcast trigger:", broadcastErr);
      }
    }

    setSuccessNotice({ id: res.requestId, title: res.title || finalTitle });
    setTimeout(() => {
      closeModal();
      router.push(`/guest/requests/${res.requestId}`);
    }, 1500);
  };

  const complimentaryCats = SERVICE_CATEGORIES.filter((c) => !c.isPaid);
  const paidCats = SERVICE_CATEGORIES.filter((c) => c.isPaid);

  return (
    <div className="p-4 space-y-6 pb-28 max-w-lg mx-auto">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#08111F] via-[#0E1B2E] to-[#08111F] border border-amber-500/20 p-5 shadow-xl">
        <div className="absolute top-0 right-0 w-44 h-44 bg-gradient-to-bl from-amber-500/10 to-transparent rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 space-y-1.5">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[10px] font-bold uppercase tracking-wider">
            <Sparkles className="w-3 h-3 text-amber-400" />
            <span>Digital Guest Concierge</span>
          </div>
          <h2 className="text-xl font-black text-white tracking-tight">
            Guest Services & Assistance
          </h2>
          <p className="text-xs text-slate-300/80 leading-relaxed">
            {isVerifiedStay
              ? `Select any service below to request immediate assistance for Room ${session?.room_number}.`
              : "Contactless digital service requests for verified hotel guests."}
          </p>
        </div>
      </div>

      {/* Prominent Food & Dining Card */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-500/15 via-[#0E1B2E] to-[#08111F] border border-amber-500/30 p-4 shadow-lg flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0">
            <Utensils className="w-5 h-5" />
          </div>
          <div className="space-y-0.5">
            <h4 className="text-xs font-bold text-white">Order Food & Room Service</h4>
            <p className="text-[10px] text-slate-400">Fresh dishes & drinks delivered directly to your room</p>
          </div>
        </div>
        <Link
          href="/guest/dining"
          className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition shadow-md shrink-0 flex items-center gap-1"
        >
          <span>Browse Menu</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Unverified Notice */}
      {!isVerifiedStay && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <p className="font-semibold text-amber-300">Room Verification Required</p>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              To submit service requests to hotel staff, please scan the QR code located in your room to verify your active stay.
            </p>
          </div>
        </div>
      )}

      {/* Track Active Requests */}
      {isVerifiedStay && (
        <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[#0E1B2E] border border-slate-800 shadow-md">
          <div className="space-y-0.5">
            <h4 className="text-xs font-bold text-white">Your Submitted Requests</h4>
            <p className="text-[10px] text-slate-400">Track staff assignment & turnaround in real time</p>
          </div>
          <Link
            href="/guest/requests"
            className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/20 font-bold text-xs flex items-center gap-1 transition shadow"
          >
            <span>View Requests</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

      {/* Section 1: Complimentary & Standard Services */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            Complimentary & Standard Services
          </h3>
          <span className="text-[10px] font-semibold text-emerald-400/80 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
            No Extra Charge
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {complimentaryCats.map((cat) => {
            const Icon = cat.icon;
            return (
              <button
                key={cat.id}
                onClick={() => openCategoryModal(cat)}
                className="p-4 rounded-2xl bg-[#0E1B2E] hover:bg-[#132238] border border-slate-800 hover:border-emerald-500/40 text-left transition-all duration-200 active:scale-[0.98] group flex flex-col justify-between h-32 shadow-md relative overflow-hidden"
              >
                <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${cat.accentBg} border flex items-center justify-center shrink-0 shadow-sm`}>
                  <Icon className={`w-5 h-5 ${cat.color}`} />
                </div>

                <div className="space-y-0.5">
                  <h4 className="text-xs font-bold text-white group-hover:text-emerald-300 transition">
                    {cat.name}
                  </h4>
                  <p className="text-[10px] text-slate-400 line-clamp-1">{cat.description}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Section 2: Premium & Chargeable Services */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
            <Tag className="w-3.5 h-3.5 text-amber-400" />
            Premium & Chargeable Services
          </h3>
          <span className="text-[10px] font-semibold text-amber-400/80 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20 font-mono">
            Billed to Room Folio
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {paidCats.map((cat) => {
            const Icon = cat.icon;
            const paidItems = getCategoryPaidItems(cat);
            return (
              <button
                key={cat.id}
                onClick={() => openCategoryModal(cat)}
                className="p-4 rounded-2xl bg-[#0E1B2E] hover:bg-[#132238] border border-slate-800 hover:border-amber-500/40 text-left transition-all duration-200 active:scale-[0.98] group flex flex-col justify-between h-32 shadow-md relative overflow-hidden"
              >
                <div className="flex items-center justify-between w-full">
                  <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${cat.accentBg} border flex items-center justify-center shrink-0 shadow-sm`}>
                    <Icon className={`w-5 h-5 ${cat.color}`} />
                  </div>
                  {paidItems.length > 0 && (
                    <span className="text-[9px] font-black text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded-md font-mono">
                      {paidItems.length} {paidItems.length === 1 ? "Option" : "Options"}
                    </span>
                  )}
                </div>

                <div className="space-y-0.5">
                  <h4 className="text-xs font-bold text-white group-hover:text-amber-300 transition">
                    {cat.name}
                  </h4>
                  <p className="text-[10px] text-slate-400 line-clamp-1">{cat.description}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Redesigned Request Window / Modal */}
      {selectedCat && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-[#0E1B2E] border-t sm:border border-slate-800 rounded-t-3xl sm:rounded-2xl p-5 space-y-4 shadow-2xl max-h-[92vh] overflow-y-auto">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${selectedCat.accentBg} border flex items-center justify-center shrink-0 shadow-sm`}>
                  <selectedCat.icon className={`w-5 h-5 ${selectedCat.color}`} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-black text-white">{selectedCat.name}</h3>
                    <span className={`px-2 py-0.5 rounded-md text-[9.5px] font-bold border ${selectedCat.isPaid ? "bg-amber-500/10 text-amber-400 border-amber-500/20" : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"}`}>
                      {selectedCat.isPaid ? "Payable Service" : "Complimentary"}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                    Room {session?.room_number || "—"} • {selectedCat.description}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={closeModal}
                className="w-8 h-8 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center text-xs transition"
              >
                ✕
              </button>
            </div>

            {successNotice ? (
              <div className="p-6 text-center space-y-3">
                <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center animate-bounce">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h4 className="text-sm font-bold text-white">Your request has been sent to the hotel!</h4>
                <p className="text-xs text-amber-400 font-mono font-semibold">
                  {successNotice.title}
                </p>
                <p className="text-xs text-slate-400">
                  Staff have been notified. Redirecting to live request tracker...
                </p>
              </div>
            ) : (
              <div className="space-y-4 pt-1">
                
                {/* 1. Category Specific Priced Items from POS (If Chargeable Category) */}
                {selectedCat.isPaid && (() => {
                  const paidItems = getCategoryPaidItems(selectedCat);
                  if (paidItems.length === 0) return null;

                  return (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                          <Tag className="w-3 h-3" />
                          Select Service & Price (Billed to Folio)
                        </label>
                      </div>

                      <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto p-1 rounded-xl bg-slate-950/40 border border-slate-800/80 scrollbar-thin">
                        {paidItems.map((item) => {
                          const isSelected = selectedPaidItem?.id === item.id;
                          return (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => {
                                if (isSelected) {
                                  setSelectedPaidItem(null);
                                } else {
                                  setSelectedPaidItem(item);
                                  setSelectedQuickOption("");
                                }
                              }}
                              className={`p-3 rounded-xl text-left transition flex items-center justify-between gap-3 border ${
                                isSelected
                                  ? "bg-amber-500/15 border-amber-500 text-white shadow-md font-bold"
                                  : "bg-[#0B1524] border-slate-800 hover:border-slate-700 text-slate-300"
                              }`}
                            >
                              <div className="space-y-0.5">
                                <p className="text-xs font-bold text-white">{item.name}</p>
                                {item.description && (
                                  <p className="text-[10px] text-slate-400 line-clamp-1">{item.description}</p>
                                )}
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                <span className="font-mono text-xs font-black text-amber-400">
                                  ₹{item.price.toFixed(2)}
                                </span>
                                {isSelected ? (
                                  <div className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center">
                                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                                  </div>
                                ) : (
                                  <div className="w-5 h-5 rounded-full border border-slate-700" />
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}

                {/* 2. Clean, Organized Quick Option Cards */}
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3 h-3 text-amber-400" />
                    {selectedCat.isPaid ? "Or Choose Standard Request" : "Quick Options"}
                  </label>

                  <div className="grid grid-cols-2 gap-2">
                    {selectedCat.commonQuickOptions.map((opt) => {
                      const isSelected = selectedQuickOption === opt;
                      return (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => {
                            if (isSelected) {
                              setSelectedQuickOption("");
                            } else {
                              setSelectedQuickOption(opt);
                              setSelectedPaidItem(null);
                            }
                          }}
                          className={`p-2.5 rounded-xl text-xs text-left transition flex items-center justify-between border ${
                            isSelected
                              ? "bg-amber-500 text-slate-950 font-bold border-amber-500 shadow-md"
                              : "bg-[#0B1524] border-slate-800 text-slate-300 hover:bg-slate-800/60"
                          }`}
                        >
                          <span className="line-clamp-2 leading-tight">{opt}</span>
                          {isSelected && <Check className="w-3.5 h-3.5 shrink-0 ml-1" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 3. Always Visible Custom Message / Custom Request Box */}
                <div className="space-y-1.5 p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-white flex items-center gap-1.5">
                      <MessageSquarePlus className="w-3.5 h-3.5 text-amber-400" />
                      Write Custom Message / Request
                    </label>
                    <span className="text-[10px] text-slate-500">Always available</span>
                  </div>

                  <p className="text-[10px] text-slate-400 leading-relaxed">
                    Can&apos;t find your exact requirement? Describe it directly below (e.g. &quot;Bathroom door lock not working&quot;, &quot;Please bring 2 extra towels at 5 PM&quot;):
                  </p>

                  <textarea
                    rows={3}
                    value={customMessage}
                    onChange={(e) => setCustomMessage(e.target.value)}
                    placeholder="Type your custom request or specific instructions here..."
                    className="w-full px-3 py-2.5 rounded-xl bg-[#0E1B2E] border border-slate-700/80 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 resize-none transition"
                  />
                </div>

                {/* 4. Priority Selector */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Priority
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setPriority("MEDIUM")}
                      className={`py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 border ${
                        priority === "MEDIUM"
                          ? "bg-amber-500 text-slate-950 border-amber-500 font-black shadow"
                          : "bg-[#0B1524] text-slate-400 border-slate-800 hover:bg-slate-800"
                      }`}
                    >
                      <Clock className="w-3.5 h-3.5" />
                      <span>Standard / Normal</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPriority("URGENT")}
                      className={`py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 border ${
                        priority === "URGENT"
                          ? "bg-rose-500 text-white border-rose-500 font-black shadow-lg"
                          : "bg-[#0B1524] text-slate-400 border-slate-800 hover:bg-slate-800"
                      }`}
                    >
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>Urgent / Immediate</span>
                    </button>
                  </div>
                </div>

                {errorMsg && (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                {/* Submit Action Button */}
                <button
                  type="button"
                  onClick={handleSubmitRequest}
                  disabled={isSubmitting}
                  className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:opacity-50 text-slate-950 font-black text-xs shadow-xl flex items-center justify-center gap-2 transition active:scale-[0.99]"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Sending Request to Staff...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>
                        {selectedPaidItem
                          ? `Request ${selectedPaidItem.name} • ₹${selectedPaidItem.price.toFixed(2)}`
                          : selectedQuickOption
                          ? `Submit: ${selectedQuickOption}`
                          : customMessage.trim()
                          ? "Submit Custom Request"
                          : `Submit ${selectedCat.name} Request`}
                      </span>
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
