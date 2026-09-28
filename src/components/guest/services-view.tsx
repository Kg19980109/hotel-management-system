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
  SlidersHorizontal,
  X,
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
  group: "ROOM" | "ASSISTANCE" | "EXPERIENCE";
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
  // ROOM GROUP
  {
    id: "HOUSEKEEPING",
    name: "Housekeeping",
    group: "ROOM",
    icon: Sparkles,
    iconColor: "text-violet-400",
    iconBg: "bg-violet-950/50 text-violet-300 border-violet-500/30",
    badgeBg: "bg-emerald-500/15",
    badgeText: "text-emerald-300",
    badgeBorder: "border-emerald-500/30",
    description: "Linens, fresh towels, turndown & toiletries replenishment",
    isPaid: false,
    tag: "Complimentary",
    commonQuickOptions: [
      "Fresh bath towels & hand towels",
      "Extra pillows & duvet",
      "Full room refresh & cleaning",
      "Luxury toiletries & shampoo refill",
      "Complimentary mineral water",
      "Waste bin clearance",
    ],
  },
  {
    id: "MAINTENANCE",
    name: "Engineering & Maintenance",
    group: "ROOM",
    icon: Wrench,
    iconColor: "text-sky-400",
    iconBg: "bg-sky-950/50 text-sky-300 border-sky-500/30",
    badgeBg: "bg-sky-500/15",
    badgeText: "text-sky-300",
    badgeBorder: "border-sky-500/30",
    description: "In-room climate control, electronics, plumbing & repairs",
    isPaid: false,
    tag: "Engineering",
    commonQuickOptions: [
      "AC climate & temperature control",
      "Plumbing & shower water pressure",
      "TV, streaming & Wi-Fi assistance",
      "Lighting & electrical switches",
      "Door lock & keycard check",
      "Safe & electronic locker assistance",
    ],
  },
  {
    id: "LAUNDRY",
    name: "Laundry & Dry Cleaning",
    group: "ROOM",
    icon: Shirt,
    iconColor: "text-indigo-400",
    iconBg: "bg-indigo-950/50 text-indigo-300 border-indigo-500/30",
    badgeBg: "bg-violet-500/15",
    badgeText: "text-violet-300",
    badgeBorder: "border-violet-500/30",
    description: "Express valet, garment pressing, wash & dry cleaning",
    isPaid: true,
    tag: "Billed to Folio",
    commonQuickOptions: [
      "Express same-day laundry pickup",
      "Shirt & suit steam pressing",
      "Premium dry cleaning care",
      "Wash & fold bag service",
      "Shoe shine & leather care",
      "Delicate garment service",
    ],
  },

  // ASSISTANCE GROUP
  {
    id: "FRONT_DESK",
    name: "Front Desk & Reception",
    group: "ASSISTANCE",
    icon: BedDouble,
    iconColor: "text-amber-400",
    iconBg: "bg-amber-950/50 text-amber-300 border-amber-500/30",
    badgeBg: "bg-emerald-500/15",
    badgeText: "text-emerald-300",
    badgeBorder: "border-emerald-500/30",
    description: "Luggage assistance, wake-up calls, keys & reception inquiries",
    isPaid: false,
    tag: "Complimentary",
    commonQuickOptions: [
      "Late check-out request",
      "Luggage & bellman assistance",
      "Wake-up call coordination",
      "Keycard reprint / PIN reset",
      "Folio summary & billing inquiry",
      "Courier & parcel receipt",
    ],
  },
  {
    id: "CONCIERGE",
    name: "Concierge & City Tours",
    group: "ASSISTANCE",
    icon: Compass,
    iconColor: "text-purple-400",
    iconBg: "bg-purple-950/50 text-purple-300 border-purple-500/30",
    badgeBg: "bg-purple-500/15",
    badgeText: "text-purple-300",
    badgeBorder: "border-purple-500/30",
    description: "Fine dining reservations, city itineraries & VIP tickets",
    isPaid: false,
    tag: "Concierge Desk",
    commonQuickOptions: [
      "Fine dining table reservation",
      "City sightseeing & curated tour",
      "Local museum & monument passes",
      "Florist & celebration arrangements",
      "Flight & rail travel rebooking",
      "Pharmacy & medical assistance",
    ],
  },
  {
    id: "TRANSPORT",
    name: "Chauffeur & Airport Transfers",
    group: "ASSISTANCE",
    icon: Car,
    iconColor: "text-teal-400",
    iconBg: "bg-teal-950/50 text-teal-300 border-teal-500/30",
    badgeBg: "bg-violet-500/15",
    badgeText: "text-violet-300",
    badgeBorder: "border-violet-500/30",
    description: "Airport limousine, private driver & station transfers",
    isPaid: true,
    tag: "Billed to Folio",
    commonQuickOptions: [
      "Airport private limousine transfer",
      "Full-day private chauffeur",
      "Local city taxi dispatch",
      "Railway station drop / pickup",
      "Valet car retrieval to main porch",
      "Intercity luxury travel cab",
    ],
  },

  // EXPERIENCE GROUP
  {
    id: "ROOM_SERVICE",
    name: "In-Room Dining Amenities",
    group: "EXPERIENCE",
    icon: Coffee,
    iconColor: "text-rose-400",
    iconBg: "bg-rose-950/50 text-rose-300 border-rose-500/30",
    badgeBg: "bg-emerald-500/15",
    badgeText: "text-emerald-300",
    badgeBorder: "border-emerald-500/30",
    description: "Ice buckets, extra cutlery, glassware & minibar refills",
    isPaid: false,
    tag: "Complimentary",
    commonQuickOptions: [
      "Fresh ice bucket & crystal glassware",
      "Extra cutlery, plates & wine glasses",
      "Used dining tray clearance",
      "Nespresso coffee & tea box replenishment",
      "Minibar restock request",
      "Celebration cake & candle setup",
    ],
  },
  {
    id: "SPA",
    name: "Spa, Wellness & Massages",
    group: "EXPERIENCE",
    icon: Flower2,
    iconColor: "text-pink-400",
    iconBg: "bg-pink-950/50 text-pink-300 border-pink-500/30",
    badgeBg: "bg-violet-500/15",
    badgeText: "text-violet-300",
    badgeBorder: "border-violet-500/30",
    description: "Holistic massages, aromatherapy, sauna & beauty therapies",
    isPaid: true,
    tag: "Wellness Service",
    commonQuickOptions: [
      "Signature Swedish massage (60 min)",
      "Deep tissue recovery therapy (90 min)",
      "Luxury facial & radiant skin treatment",
      "Couples rejuvenation spa suite",
      "Heated pool & health club session",
      "Ayurvedic wellness consultation",
    ],
  },
  {
    id: "OTHER",
    name: "Bespoke Requests & Upgrades",
    group: "EXPERIENCE",
    icon: Crown,
    iconColor: "text-amber-400",
    iconBg: "bg-amber-950/50 text-amber-300 border-amber-500/30",
    badgeBg: "bg-violet-500/15",
    badgeText: "text-violet-300",
    badgeBorder: "border-violet-500/30",
    description: "Rollaway beds, banquet suites, room upgrades & special needs",
    isPaid: true,
    tag: "Custom / Upgrade",
    commonQuickOptions: [
      "Extra bed / rollaway cot setup",
      "VIP room welcome setup & amenities",
      "Conference & meeting hall rental",
      "Extended day-use tariff request",
      "Special dietary chef consultation",
      "Custom hotel concierge request",
    ],
  },
];

const GROUP_LABELS: Record<"ROOM" | "ASSISTANCE" | "EXPERIENCE", { title: string; subtitle: string }> = {
  ROOM: {
    title: "Room & Comfort",
    subtitle: "Housekeeping, linens, repairs and laundry care",
  },
  ASSISTANCE: {
    title: "Concierge & Front Desk",
    subtitle: "Luggage, city reservations and private chauffeur services",
  },
  EXPERIENCE: {
    title: "Wellness & Amenities",
    subtitle: "In-room dining extras, spa sessions and tailored upgrades",
  },
};

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
  const getCategoryPaidItems = React.useCallback(
    (cat: ServiceCategoryMeta): PayableServiceItem[] => {
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
    },
    [payableServices]
  );

  const openCategoryModal = React.useCallback((cat: ServiceCategoryMeta, preselectOption?: string) => {
    setSelectedCat(cat);
    setSelectedQuickOption(preselectOption || "");
    setSelectedPaidItem(null);
    setCustomMessage("");
    setPriority("MEDIUM");
    setErrorMsg(null);
    setSuccessNotice(null);
  }, []);

  const closeModal = React.useCallback(() => {
    setSelectedCat(null);
    setSelectedQuickOption("");
    setSelectedPaidItem(null);
    setCustomMessage("");
    setErrorMsg(null);
  }, []);

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
      setErrorMsg("Please select an option or specify your request.");
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

    // Sub-50ms Realtime WebSocket Broadcast to staff
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
    }, 1400);
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

  // Group filtered categories
  const groupedCategories = React.useMemo(() => {
    const groups: { key: "ROOM" | "ASSISTANCE" | "EXPERIENCE"; items: ServiceCategoryMeta[] }[] = [
      { key: "ROOM", items: [] },
      { key: "ASSISTANCE", items: [] },
      { key: "EXPERIENCE", items: [] },
    ];

    displayedCategories.forEach((cat) => {
      const g = groups.find((grp) => grp.key === cat.group);
      if (g) g.items.push(cat);
    });

    return groups.filter((g) => g.items.length > 0);
  }, [displayedCategories]);

  return (
    <div className="space-y-5 pb-28">
      {/* ── 1. LUXURY VIOLET HEADER BANNER ── */}
      <div className="relative overflow-hidden rounded-3xl bg-[#0B132B] border border-violet-500/30 text-white shadow-xl shadow-violet-950/40">
        <div className="absolute inset-0 z-0 bg-gradient-to-br from-violet-900/30 via-[#0B132B] to-indigo-950/40 pointer-events-none" />
        <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-violet-600/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-48 h-48 rounded-full bg-indigo-600/15 blur-2xl pointer-events-none" />

        <div className="relative z-10 p-5 sm:p-6 space-y-3.5">
          <div className="flex items-center justify-between">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-500/20 border border-violet-400/40 text-violet-200 text-[10.5px] font-semibold tracking-wide backdrop-blur-xs">
              <Sparkles className="w-3.5 h-3.5 text-violet-400" />
              <span>Digital Hotel Concierge</span>
            </div>

            {isVerifiedStay && session?.room_number && (
              <span className="text-xs px-3 py-1 rounded-full bg-violet-950/70 text-violet-300 font-bold border border-violet-500/30 backdrop-blur-xs">
                Room {session.room_number}
              </span>
            )}
          </div>

          <div className="space-y-1 pt-1">
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-white tracking-tight leading-tight">
              Guest Services
            </h1>
            <p className="text-xs text-slate-300/85 leading-relaxed max-w-md font-sans">
              {isVerifiedStay
                ? `Immediate assistance and bespoke luxury services for Room ${session?.room_number}.`
                : "Experience effortless luxury service with 24/7 dedicated hotel staff."}
            </p>
          </div>

          <div className="flex items-center gap-2 pt-1 flex-wrap">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-300 bg-emerald-950/70 px-2.5 py-1 rounded-full border border-emerald-500/30 backdrop-blur-xs">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Staff on Duty · Fast Dispatch
            </span>

            <Link
              href="/guest/requests"
              className="text-[11px] font-semibold text-violet-200 hover:text-white bg-violet-900/40 hover:bg-violet-900/60 px-3 py-1 rounded-full border border-violet-400/30 flex items-center gap-1.5 transition shadow-xs"
            >
              <BellRing className="w-3.5 h-3.5 text-violet-400" />
              <span>Active Requests</span>
            </Link>
          </div>
        </div>
      </div>

      <div className="space-y-5">
        {/* ── 2. IN-ROOM DINING PROMOTION BANNER ── */}
        <div className="p-4 rounded-2xl bg-[#111C38]/90 border border-violet-500/25 shadow-lg shadow-violet-950/20 flex items-center justify-between gap-3 hover:border-violet-400/40 transition-all backdrop-blur-md">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white flex items-center justify-center font-bold shadow-md shadow-violet-900/30 shrink-0">
              <Utensils className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-violet-400 uppercase tracking-wider">
                <span>In-Room Dining</span>
              </div>
              <h3 className="text-xs sm:text-sm font-serif font-bold text-white truncate">
                Chef-Crafted Room Delivery
              </h3>
              <p className="text-[11px] text-slate-300 line-clamp-1">Freshly prepared gourmet dishes &amp; drinks</p>
            </div>
          </div>

          <Link
            href="/guest/dining"
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold text-xs transition shadow-md shadow-violet-950/40 shrink-0 flex items-center gap-1 active:scale-95"
          >
            <span>View Menu</span>
            <ChevronRight className="w-3.5 h-3.5 stroke-[2.5]" />
          </Link>
        </div>

        {/* ── 3. SEARCH & REFINED FILTER TABS ── */}
        <div className="space-y-3">
          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-violet-400/80" />
            <input
              type="text"
              placeholder="Search towels, room cleaning, AC, laundry, spa, taxi..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl text-xs bg-[#111C38]/80 border border-violet-500/20 text-white placeholder:text-slate-400 focus:outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-400 shadow-md shadow-violet-950/20 transition"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3.5 top-2.5 text-slate-400 hover:text-white p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            <button
              type="button"
              onClick={() => setActiveTab("ALL")}
              className={cn(
                "px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition shadow-xs",
                activeTab === "ALL"
                  ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-violet-900/30 font-bold"
                  : "bg-[#111C38]/70 text-slate-300 hover:text-white border border-violet-500/20"
              )}
            >
              All Services ({SERVICE_CATEGORIES.length})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("COMPLIMENTARY")}
              className={cn(
                "px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition flex items-center gap-1.5 shadow-xs",
                activeTab === "COMPLIMENTARY"
                  ? "bg-emerald-600 text-white font-bold"
                  : "bg-[#111C38]/70 text-slate-300 hover:text-emerald-300 border border-violet-500/20"
              )}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Complimentary (5)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("PAID")}
              className={cn(
                "px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition flex items-center gap-1.5 shadow-xs",
                activeTab === "PAID"
                  ? "bg-gradient-to-r from-violet-600 to-purple-600 text-white font-bold"
                  : "bg-[#111C38]/70 text-slate-300 hover:text-violet-300 border border-violet-500/20"
              )}
            >
              <Tag className="w-3.5 h-3.5 text-violet-400" />
              <span>Chargeable Services (4)</span>
            </button>
          </div>
        </div>

        {/* ── 4. REFINED SERVICE GROUPS & CARDS ── */}
        {groupedCategories.length === 0 ? (
          <div className="p-8 rounded-3xl bg-[#111C38]/90 border border-violet-500/25 text-center space-y-3 shadow-lg shadow-violet-950/20">
            <div className="w-12 h-12 rounded-full bg-violet-950/60 border border-violet-500/30 text-violet-300 mx-auto flex items-center justify-center">
              <Search className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-serif font-bold text-white">No Services Found</h3>
            <p className="text-xs text-slate-300 max-w-xs mx-auto">
              No matching hotel service found for &ldquo;{searchQuery}&rdquo;. Try another keyword or reset filters.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setActiveTab("ALL");
              }}
              className="px-4 py-2 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-xs font-semibold shadow-md shadow-violet-950/30 transition"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {groupedCategories.map((group) => {
              const meta = GROUP_LABELS[group.key];
              return (
                <div key={group.key} className="space-y-3">
                  {/* Section Title */}
                  <div className="px-0.5">
                    <h2 className="text-xs font-bold text-violet-300 uppercase tracking-wider font-sans">
                      {meta.title}
                    </h2>
                    <p className="text-[11px] text-slate-400">{meta.subtitle}</p>
                  </div>

                  {/* Cards Grid */}
                  <div className="space-y-3">
                    {group.items.map((cat) => {
                      const Icon = cat.icon;

                      return (
                        <div
                          key={cat.id}
                          className="p-4 rounded-2xl bg-[#111C38]/90 border border-violet-500/25 hover:border-violet-400/50 shadow-lg shadow-violet-950/20 space-y-3 transition-all backdrop-blur-md"
                        >
                          {/* Top Row */}
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3 min-w-0">
                              <div className={cn("w-11 h-11 rounded-2xl flex items-center justify-center border shadow-xs shrink-0", cat.iconBg)}>
                                <Icon className="w-5 h-5" />
                              </div>
                              <div className="min-w-0">
                                <h3 className="text-sm font-serif font-bold text-white leading-snug">
                                  {cat.name}
                                </h3>
                                <p className="text-[11.5px] text-slate-300 mt-0.5 leading-snug line-clamp-2">
                                  {cat.description}
                                </p>
                              </div>
                            </div>

                            <span className={cn("text-[9.5px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border shrink-0", cat.badgeBg, cat.badgeText, cat.badgeBorder)}>
                              {cat.tag}
                            </span>
                          </div>

                          {/* Quick Options Chips */}
                          <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                            {cat.commonQuickOptions.slice(0, 3).map((opt) => (
                              <button
                                key={opt}
                                type="button"
                                onClick={() => openCategoryModal(cat, opt)}
                                className="text-[11px] font-medium text-violet-200 bg-violet-950/40 hover:bg-violet-900/50 hover:text-white px-2.5 py-1 rounded-lg border border-violet-500/20 hover:border-violet-400/40 transition-all active:scale-95"
                              >
                                + {opt}
                              </button>
                            ))}
                          </div>

                          {/* Action Row */}
                          <div className="pt-2.5 border-t border-violet-500/20 flex items-center justify-between">
                            <span className="text-[10.5px] text-slate-400 font-sans">
                              {cat.isPaid ? "Billed directly to room folio" : "Provided with compliments"}
                            </span>

                            <button
                              type="button"
                              onClick={() => openCategoryModal(cat)}
                              className="inline-flex items-center gap-1 text-xs font-semibold text-violet-400 hover:text-violet-300 transition"
                            >
                              <span>Request Service</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── 5. LUXURY REQUEST CREATION SHEET / MODAL ── */}
      {selectedCat && (
        <div className="fixed inset-0 z-50 bg-[#060B14]/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-[#0B132B] border-t sm:border border-violet-500/30 rounded-t-3xl sm:rounded-3xl p-5 space-y-4 shadow-2xl shadow-violet-950/50 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3.5 border-b border-violet-500/20">
              <div className="flex items-center gap-3">
                <div className={cn("w-11 h-11 rounded-2xl flex items-center justify-center border shadow-xs shrink-0", selectedCat.iconBg)}>
                  <selectedCat.icon className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-serif font-bold text-white">{selectedCat.name}</h3>
                    <span className={cn("px-2 py-0.5 rounded-full text-[9px] font-bold border", selectedCat.badgeBg, selectedCat.badgeText, selectedCat.badgeBorder)}>
                      {selectedCat.tag}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 font-medium mt-0.5">
                    Room {session?.room_number || "—"} • {selectedCat.description}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={closeModal}
                className="w-8 h-8 rounded-full bg-violet-950/60 hover:bg-violet-900/80 text-violet-300 hover:text-white flex items-center justify-center text-xs border border-violet-500/30 transition"
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>

            {successNotice ? (
              <div className="py-8 text-center space-y-3">
                <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center shadow-lg border border-emerald-500/40">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h4 className="text-sm font-serif font-bold text-white">
                  Request Dispatched to Hotel Staff
                </h4>
                <p className="text-xs text-violet-300 font-semibold bg-violet-950/60 py-1.5 px-3 rounded-lg border border-violet-500/30 inline-block">
                  {successNotice.title}
                </p>
                <p className="text-xs text-slate-400">
                  Acknowledged by concierge desk. Opening live tracking...
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
                      <label className="text-[11px] font-bold text-violet-300 uppercase tracking-wider flex items-center gap-1.5 font-sans">
                        <Tag className="w-3.5 h-3.5 text-violet-400" />
                        <span>Select Service / Package (Billed to Room Folio)</span>
                      </label>

                      <div className="grid grid-cols-1 gap-2 max-h-44 overflow-y-auto p-1 rounded-2xl bg-[#111C38]/80 border border-violet-500/20 scrollbar-thin">
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
                                  ? "bg-violet-950/70 border-violet-400 text-white shadow-xs font-semibold"
                                  : "bg-[#0B132B]/70 border-violet-500/15 hover:border-violet-400/40 text-slate-300"
                              )}
                            >
                              <div className="space-y-0.5 min-w-0">
                                <p className="text-xs font-semibold text-white truncate">{item.name}</p>
                                {item.description && (
                                  <p className="text-[10px] text-slate-400 line-clamp-1">{item.description}</p>
                                )}
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                <span className="font-mono text-xs font-bold text-violet-300">
                                  ₹{item.price.toFixed(2)}
                                </span>
                                {isSelected ? (
                                  <div className="w-5 h-5 rounded-full bg-violet-600 text-white flex items-center justify-center">
                                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                                  </div>
                                ) : (
                                  <div className="w-5 h-5 rounded-full border border-violet-500/30" />
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
                  <label className="text-[11px] font-bold text-violet-300 uppercase tracking-wider flex items-center gap-1.5 font-sans">
                    <Sparkles className="w-3.5 h-3.5 text-violet-400" />
                    <span>{selectedCat.isPaid ? "Or Choose Common Option" : "Select Requirement"}</span>
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
                              ? "bg-violet-950/80 text-white font-semibold border-violet-400 shadow-xs"
                              : "bg-[#111C38]/70 border-violet-500/15 text-slate-300 hover:bg-violet-950/40 hover:text-white"
                          )}
                        >
                          <span className="line-clamp-2 leading-tight">{opt}</span>
                          {isSelected && <Check className="w-3.5 h-3.5 shrink-0 ml-1 stroke-[3] text-violet-400" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 3. Custom message box */}
                <div className="space-y-1.5 p-3.5 rounded-2xl bg-[#111C38]/80 border border-violet-500/20">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-violet-300 flex items-center gap-1.5 font-sans">
                      <MessageSquarePlus className="w-3.5 h-3.5 text-violet-400" />
                      <span>Additional Instructions / Timing</span>
                    </label>
                  </div>

                  <textarea
                    rows={3}
                    value={customMessage}
                    onChange={(e) => setCustomMessage(e.target.value)}
                    placeholder="E.g., Please deliver around 6:00 PM, or mention any specific preferences..."
                    className="w-full px-3 py-2 rounded-xl bg-[#0B132B] border border-violet-500/25 text-xs text-white placeholder:text-slate-400 focus:outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-400 resize-none transition"
                  />
                </div>

                {/* 4. Priority selection */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-violet-300 uppercase tracking-wider font-sans">
                    Dispatch Priority
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setPriority("MEDIUM")}
                      className={cn(
                        "py-2 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1.5 border",
                        priority === "MEDIUM"
                          ? "bg-violet-950/80 text-white border-violet-400 shadow-xs"
                          : "bg-[#111C38]/70 text-slate-300 border-violet-500/15 hover:bg-violet-950/40"
                      )}
                    >
                      <Clock className="w-3.5 h-3.5" />
                      <span>Standard Dispatch</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPriority("URGENT")}
                      className={cn(
                        "py-2 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1.5 border",
                        priority === "URGENT"
                          ? "bg-gradient-to-r from-amber-600 to-rose-600 text-white border-amber-500 shadow-xs"
                          : "bg-[#111C38]/70 text-slate-300 border-violet-500/15 hover:bg-violet-950/40"
                      )}
                    >
                      <Zap className="w-3.5 h-3.5" />
                      <span>Urgent / Immediate</span>
                    </button>
                  </div>
                </div>

                {errorMsg && (
                  <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/30 text-xs text-rose-300 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                {/* Submit button */}
                <button
                  type="button"
                  onClick={handleSubmitRequest}
                  disabled={isSubmitting}
                  className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-600 hover:from-violet-500 hover:to-indigo-500 text-white disabled:opacity-50 font-bold text-xs shadow-lg shadow-violet-950/40 flex items-center justify-center gap-2 transition active:scale-[0.99]"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      <span>Sending Request to Staff...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 text-violet-200" />
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
