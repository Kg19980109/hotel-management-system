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
  ShieldCheck,
  Tag,
  Search,
  Zap,
  Coffee,
  Crown,
  BellRing,
  ArrowRight,
} from "lucide-react";
import { ServiceRequestCategory, ServiceRequestPriority } from "@/lib/guest-services/types";
import { createGuestServiceRequestAction } from "@/lib/guest-services/actions";
import { GuestVerifiedSessionContext } from "@/lib/guest-portal/types";
import { createClient } from "@/lib/supabase/client";
import { getDepartmentForCategory } from "@/lib/alerts/routing";
import { PayableServiceItem } from "@/lib/guest-services/queries";
import { cn } from "@/lib/utils";

interface ServicesViewProps {
  session?: GuestVerifiedSessionContext | null;
  payableServices?: PayableServiceItem[];
  initialCategory?: string;
}

interface ServiceCategoryMeta {
  id: ServiceRequestCategory;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
  iconBg: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  description: string;
  isPaid: boolean;
  tag: string;
  commonQuickOptions: string[];
}

const SERVICE_CATEGORIES: ServiceCategoryMeta[] = [
  // 1. Housekeeping
  {
    id: "HOUSEKEEPING",
    name: "Housekeeping",
    icon: Sparkles,
    iconColor: "text-emerald-400",
    iconBg: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    badgeBg: "bg-emerald-500/15",
    badgeText: "text-emerald-300",
    badgeBorder: "border-emerald-500/30",
    description: "Linens, towels, room cleaning & fresh toiletries",
    isPaid: false,
    tag: "Complimentary",
    commonQuickOptions: [
      "Fresh bath towels & hand towels",
      "Extra pillows & blankets",
      "Full room cleaning & turnover",
      "Toiletries & shampoo refill",
      "Complimentary water bottles",
      "Trash clearance & bin change",
    ],
  },
  // 2. Front Desk
  {
    id: "FRONT_DESK",
    name: "Front Desk & Reception",
    icon: BedDouble,
    iconColor: "text-amber-400",
    iconBg: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    badgeBg: "bg-amber-500/15",
    badgeText: "text-amber-300",
    badgeBorder: "border-amber-500/30",
    description: "Checkout assistance, luggage, keys & inquiries",
    isPaid: false,
    tag: "Front Desk",
    commonQuickOptions: [
      "Late check-out request",
      "Wake-up call setup",
      "Luggage & bellboy assistance",
      "Keycard replacement / PIN",
      "General reception inquiry",
      "Invoice / Folio summary request",
    ],
  },
  // 3. Maintenance
  {
    id: "MAINTENANCE",
    name: "Room Maintenance",
    icon: Wrench,
    iconColor: "text-sky-400",
    iconBg: "bg-sky-500/20 text-sky-400 border-sky-500/30",
    badgeBg: "bg-sky-500/15",
    badgeText: "text-sky-300",
    badgeBorder: "border-sky-500/30",
    description: "In-room AC cooling, plumbing, TV & electrical fixes",
    isPaid: false,
    tag: "Engineering",
    commonQuickOptions: [
      "Air Conditioning (AC) cooling issue",
      "Bathroom door / lock repair",
      "Plumbing & drainage blockage",
      "Hot water & shower pressure",
      "Television / Cable / Wi-Fi issue",
      "Lighting & electrical switch issue",
    ],
  },
  // 4. Laundry & Pressing
  {
    id: "LAUNDRY",
    name: "Laundry & Dry Cleaning",
    icon: Shirt,
    iconColor: "text-indigo-400",
    iconBg: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30",
    badgeBg: "bg-indigo-500/15",
    badgeText: "text-indigo-300",
    badgeBorder: "border-indigo-500/30",
    description: "Dry cleaning, steam pressing, wash & fold",
    isPaid: true,
    tag: "Billed to Folio",
    commonQuickOptions: [
      "Express same-day laundry pickup",
      "Wash & Fold service",
      "Shirt & trouser steam pressing",
      "Suit & blazer dry cleaning",
      "Delicate garment care",
      "Shoe polish & leather care",
    ],
  },
  // 5. Spa & Wellness
  {
    id: "SPA",
    name: "Spa & Wellness",
    icon: Flower2,
    iconColor: "text-pink-400",
    iconBg: "bg-pink-500/20 text-pink-400 border-pink-500/30",
    badgeBg: "bg-pink-500/15",
    badgeText: "text-pink-300",
    badgeBorder: "border-pink-500/30",
    description: "Full body massages, facial therapies & pool passes",
    isPaid: true,
    tag: "Wellness Service",
    commonQuickOptions: [
      "Full body Swedish massage (60m)",
      "Deep tissue muscle therapy (90m)",
      "Luxury facial & skin care",
      "Couple wellness spa package",
      "Swimming pool & health club pass",
      "Spa therapist consultation",
    ],
  },
  // 6. Transport & Cabs
  {
    id: "TRANSPORT",
    name: "Transport & Cabs",
    icon: Car,
    iconColor: "text-teal-400",
    iconBg: "bg-teal-500/20 text-teal-400 border-teal-500/30",
    badgeBg: "bg-teal-500/15",
    badgeText: "text-teal-300",
    badgeBorder: "border-teal-500/30",
    description: "Airport private transfers, city cabs & chauffeur",
    isPaid: true,
    tag: "Cab / Transfer",
    commonQuickOptions: [
      "Airport private cab transfer",
      "Local city taxi booking",
      "Full-day private chauffeur",
      "Railway station pickup / drop",
      "Valet car retrieval to porch",
      "Intercity outstation cab",
    ],
  },
  // 7. Room Dining Amenities
  {
    id: "ROOM_SERVICE",
    name: "In-Room Dining Extras",
    icon: Coffee,
    iconColor: "text-rose-400",
    iconBg: "bg-rose-500/20 text-rose-400 border-rose-500/30",
    badgeBg: "bg-rose-500/15",
    badgeText: "text-rose-300",
    badgeBorder: "border-rose-500/30",
    description: "Cutlery, ice bucket, glassware & minibar refill",
    isPaid: false,
    tag: "Dining Extras",
    commonQuickOptions: [
      "Fresh ice bucket & glasses",
      "Extra cutlery, plates & wine glasses",
      "Used dining tray & plate clearance",
      "Coffee & tea refill kit",
      "Birthday / celebration setup",
      "Minibar restock request",
    ],
  },
  // 8. Concierge & Local Guides
  {
    id: "CONCIERGE",
    name: "Concierge & Tours",
    icon: Compass,
    iconColor: "text-purple-400",
    iconBg: "bg-purple-500/20 text-purple-400 border-purple-500/30",
    badgeBg: "bg-purple-500/15",
    badgeText: "text-purple-300",
    badgeBorder: "border-purple-500/30",
    description: "Sightseeing tours, table bookings & local guidance",
    isPaid: false,
    tag: "Concierge",
    commonQuickOptions: [
      "Restaurant table reservation",
      "Sightseeing & day tour booking",
      "Local attraction guide & passes",
      "Medical / pharmacy assistance",
      "Flight / Train travel assistance",
      "Special occasion arrangement",
    ],
  },
  // 9. Special Requests & Banquet
  {
    id: "OTHER",
    name: "Special Amenities & Upgrades",
    icon: Crown,
    iconColor: "text-amber-400",
    iconBg: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    badgeBg: "bg-amber-500/15",
    badgeText: "text-amber-300",
    badgeBorder: "border-amber-500/30",
    description: "Banquet halls, rollaway cots & custom hotel needs",
    isPaid: true,
    tag: "Custom / Upgrade",
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

export function ServicesView({ session, payableServices = [], initialCategory }: ServicesViewProps) {
  const router = useRouter();
  const isVerifiedStay = session?.session_type === "VERIFIED_STAY";

  // Match initial category if provided via query params or props
  const matchedInitialCat = React.useMemo(() => {
    if (!initialCategory) return null;
    const clean = initialCategory.trim().toUpperCase();
    return SERVICE_CATEGORIES.find(
      (c) =>
        c.id.toUpperCase() === clean ||
        c.name.toUpperCase().includes(clean) ||
        clean.includes(c.id.toUpperCase())
    ) || null;
  }, [initialCategory]);

  const [activeTab, setActiveTab] = React.useState<"ALL" | "COMPLIMENTARY" | "PAID">("ALL");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedCat, setSelectedCat] = React.useState<ServiceCategoryMeta | null>(matchedInitialCat);
  const [selectedQuickOption, setSelectedQuickOption] = React.useState<string>("");
  const [selectedPaidItem, setSelectedPaidItem] = React.useState<PayableServiceItem | null>(null);
  const [customMessage, setCustomMessage] = React.useState<string>("");
  const [priority, setPriority] = React.useState<ServiceRequestPriority>("MEDIUM");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [successNotice, setSuccessNotice] = React.useState<{ id: string; title: string } | null>(null);

  React.useEffect(() => {
    if (matchedInitialCat) {
      setSelectedCat(matchedInitialCat);
    }
  }, [matchedInitialCat]);

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

  const openCategoryModal = (cat: ServiceCategoryMeta, preselectOption?: string) => {
    setSelectedCat(cat);
    setSelectedQuickOption(preselectOption || "");
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

    // Sub-50ms Realtime WebSocket Broadcast
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

  // Filter categories based on search & active tab
  const displayedCategories = React.useMemo(() => {
    return SERVICE_CATEGORIES.filter((cat) => {
      if (activeTab === "COMPLIMENTARY" && cat.isPaid) return false;
      if (activeTab === "PAID" && !cat.isPaid) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = cat.name.toLowerCase().includes(q);
        const matchDesc = cat.description.toLowerCase().includes(q);
        const matchOpts = cat.commonQuickOptions.some((o) => o.toLowerCase().includes(q));
        if (!matchName && !matchDesc && !matchOpts) return false;
      }
      return true;
    });
  }, [activeTab, searchQuery]);

  return (
    <div className="p-4 space-y-4 pb-28 max-w-lg mx-auto">
      {/* ── HEADER HERO BANNER ── */}
      <div className="p-5 rounded-3xl bg-[#0F172A] border border-slate-800 shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10.5px] font-extrabold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Guest Services Concierge</span>
          </div>

          {isVerifiedStay && (
            <span className="text-xs px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-300 font-extrabold border border-emerald-500/30">
              Room {session?.room_number}
            </span>
          )}
        </div>

        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            Hotel Services &amp; Requests
          </h1>
          <p className="text-xs text-slate-300 mt-1 leading-relaxed">
            {isVerifiedStay
              ? `Instant service dispatch for Room ${session?.room_number}. Choose a category below:`
              : "Contactless digital service requests for verified hotel guests."}
          </p>
        </div>

        <div className="flex items-center gap-2 pt-1">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-400 bg-emerald-950/50 px-2.5 py-1 rounded-xl border border-emerald-500/25">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Staff on Duty · Fast Dispatch
          </span>
          <Link
            href="/guest/requests"
            className="text-[11px] font-bold text-slate-300 hover:text-white bg-slate-800 px-3 py-1 rounded-xl border border-slate-700 flex items-center gap-1 transition"
          >
            <BellRing className="w-3.5 h-3.5 text-amber-400" />
            <span>Track Requests</span>
          </Link>
        </div>
      </div>

      {/* ── FOOD & ROOM SERVICE CTA BANNER ── */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/15 via-[#0F172A] to-[#0F172A] border border-amber-500/30 flex items-center justify-between gap-3 shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-black shadow shrink-0">
            <Utensils className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-amber-400 uppercase tracking-wider">
              <span>Dining &amp; Room Delivery</span>
            </div>
            <h3 className="text-xs font-black text-white">Order Food &amp; Beverages</h3>
            <p className="text-[10.5px] text-slate-400">Delivered hot directly to your room</p>
          </div>
        </div>

        <Link
          href="/guest/dining"
          className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition shadow shrink-0 flex items-center gap-1 active:scale-95"
        >
          <span>Menu</span>
          <ChevronRight className="w-3.5 h-3.5 stroke-[3]" />
        </Link>
      </div>

      {/* ── SEARCH & FILTER TABS ── */}
      <div className="space-y-2.5">
        {/* Search input */}
        <div className="relative">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search towels, cleaning, AC, laundry, spa, taxi..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl text-xs bg-[#0F172A] border border-slate-800 text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
          />
        </div>

        {/* Filter buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("ALL")}
            className={cn(
              "px-3 py-1.5 rounded-xl text-xs font-bold transition",
              activeTab === "ALL"
                ? "bg-amber-500 text-slate-950 font-black shadow"
                : "bg-[#0F172A] text-slate-400 hover:text-white border border-slate-800"
            )}
          >
            All ({SERVICE_CATEGORIES.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("COMPLIMENTARY")}
            className={cn(
              "px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1",
              activeTab === "COMPLIMENTARY"
                ? "bg-emerald-500 text-slate-950 font-black shadow"
                : "bg-[#0F172A] text-slate-400 hover:text-emerald-300 border border-slate-800"
            )}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Free / Complimentary (5)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("PAID")}
            className={cn(
              "px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1",
              activeTab === "PAID"
                ? "bg-amber-500 text-slate-950 font-black shadow"
                : "bg-[#0F172A] text-slate-400 hover:text-amber-300 border border-slate-800"
            )}
          >
            <Tag className="w-3.5 h-3.5" />
            <span>Chargeable (4)</span>
          </button>
        </div>
      </div>

      {/* ── CRISP HIGH-CONTRAST SERVICE CARDS ── */}
      <div className="space-y-3">
        {displayedCategories.map((cat) => {
          const Icon = cat.icon;

          return (
            <div
              key={cat.id}
              className="p-4 rounded-2xl bg-[#0F172A] border border-slate-800 hover:border-slate-700 shadow-md space-y-3 transition-all"
            >
              {/* Top Row: Icon, Title & Badge */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className={cn("w-11 h-11 rounded-2xl flex items-center justify-center border shadow shrink-0", cat.iconBg)}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white leading-tight">
                      {cat.name}
                    </h3>
                    <p className="text-[11.5px] text-slate-300 mt-0.5 leading-snug">
                      {cat.description}
                    </p>
                  </div>
                </div>

                <span className={cn("text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-md border shrink-0", cat.badgeBg, cat.badgeText, cat.badgeBorder)}>
                  {cat.tag}
                </span>
              </div>

              {/* Quick Clickable Options Chips */}
              <div className="flex items-center gap-1.5 flex-wrap pt-1">
                {cat.commonQuickOptions.slice(0, 3).map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => openCategoryModal(cat, opt)}
                    className="text-[11px] font-bold text-slate-200 bg-[#1E293B] hover:bg-amber-500 hover:text-slate-950 px-2.5 py-1 rounded-lg border border-slate-700 hover:border-amber-500 transition-all active:scale-95"
                  >
                    + {opt}
                  </button>
                ))}
              </div>

              {/* Bottom Action Row */}
              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                <span className="text-[10.5px] text-slate-400 font-medium">
                  {cat.isPaid ? "Billed directly to room folio" : "Provided with compliments"}
                </span>

                <button
                  type="button"
                  onClick={() => openCategoryModal(cat)}
                  className="inline-flex items-center gap-1 text-xs font-black text-amber-400 hover:text-amber-300 transition"
                >
                  <span>Request {cat.name}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── MODAL DIALOG FOR SELECTED SERVICE ── */}
      {selectedCat && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-[#0F172A] border-t sm:border border-slate-800 rounded-t-3xl sm:rounded-3xl p-5 space-y-4 shadow-2xl max-h-[92vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className={cn("w-11 h-11 rounded-2xl flex items-center justify-center border shadow shrink-0", selectedCat.iconBg)}>
                  <selectedCat.icon className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-black text-white">{selectedCat.name}</h3>
                    <span className={cn("px-2 py-0.5 rounded-md text-[9.5px] font-bold border", selectedCat.badgeBg, selectedCat.badgeText, selectedCat.badgeBorder)}>
                      {selectedCat.tag}
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
              <div className="py-8 text-center space-y-3">
                <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center animate-bounce shadow-lg">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h4 className="text-sm font-extrabold text-white">Your request has been dispatched to hotel staff!</h4>
                <p className="text-xs text-amber-400 font-mono font-bold bg-amber-500/10 py-1 px-3 rounded-lg border border-amber-500/20 inline-block">
                  {successNotice.title}
                </p>
                <p className="text-xs text-slate-400">
                  Staff acknowledged. Redirecting to live tracking...
                </p>
              </div>
            ) : (
              <div className="space-y-4 pt-1">
                {/* 1. Paid items catalog if chargeable */}
                {selectedCat.isPaid && (() => {
                  const paidItems = getCategoryPaidItems(selectedCat);
                  if (paidItems.length === 0) return null;

                  return (
                    <div className="space-y-2">
                      <label className="text-[11px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Tag className="w-3.5 h-3.5" />
                        <span>Select Service / Package (Billed to Room Folio)</span>
                      </label>

                      <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto p-1 rounded-2xl bg-slate-950/50 border border-slate-800 scrollbar-thin">
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
                              className={cn(
                                "p-3 rounded-xl text-left transition flex items-center justify-between gap-3 border",
                                isSelected
                                  ? "bg-amber-500/20 border-amber-500 text-white shadow-md font-bold"
                                  : "bg-[#1E293B] border-slate-800 hover:border-slate-700 text-slate-300"
                              )}
                            >
                              <div className="space-y-0.5 min-w-0">
                                <p className="text-xs font-bold text-white truncate">{item.name}</p>
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

                {/* 2. Quick Options Chips */}
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>{selectedCat.isPaid ? "Or Choose Request Type" : "Quick Selection"}</span>
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
                          className={cn(
                            "p-2.5 rounded-xl text-xs text-left transition flex items-center justify-between border",
                            isSelected
                              ? "bg-amber-500 text-slate-950 font-black border-amber-500 shadow"
                              : "bg-[#1E293B] border-slate-700 text-slate-200 hover:bg-slate-700/80"
                          )}
                        >
                          <span className="line-clamp-2 leading-tight">{opt}</span>
                          {isSelected && <Check className="w-3.5 h-3.5 shrink-0 ml-1 stroke-[3]" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 3. Custom message box */}
                <div className="space-y-1.5 p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-white flex items-center gap-1.5">
                      <MessageSquarePlus className="w-3.5 h-3.5 text-amber-400" />
                      <span>Custom Instructions / Notes</span>
                    </label>
                  </div>

                  <textarea
                    rows={3}
                    value={customMessage}
                    onChange={(e) => setCustomMessage(e.target.value)}
                    placeholder="E.g., Please bring extra bath towels around 6 PM, or specify any other requirement..."
                    className="w-full px-3 py-2 rounded-xl bg-[#1E293B] border border-slate-700 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-amber-400 resize-none transition"
                  />
                </div>

                {/* 4. Priority selection */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                    Priority
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setPriority("MEDIUM")}
                      className={cn(
                        "py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 border",
                        priority === "MEDIUM"
                          ? "bg-amber-500 text-slate-950 border-amber-500 font-black shadow"
                          : "bg-[#1E293B] text-slate-300 border-slate-700 hover:bg-slate-700"
                      )}
                    >
                      <Clock className="w-3.5 h-3.5" />
                      <span>Standard Dispatch</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPriority("URGENT")}
                      className={cn(
                        "py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 border",
                        priority === "URGENT"
                          ? "bg-rose-500 text-white border-rose-500 font-black shadow-lg"
                          : "bg-[#1E293B] text-slate-300 border-slate-700 hover:bg-slate-700"
                      )}
                    >
                      <Zap className="w-3.5 h-3.5" />
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

                {/* Submit button */}
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
