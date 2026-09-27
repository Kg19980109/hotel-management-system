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
  Tag,
  Search,
  Zap,
  Coffee,
  Crown,
  Flame,
  PhoneCall,
  BellRing,
  CheckCheck,
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
  color: string;
  iconBg: string;
  cardGradient: string;
  borderGlow: string;
  badgeBg: string;
  badgeText: string;
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
    color: "text-emerald-400",
    iconBg: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    cardGradient: "from-[#08201D]/90 via-[#0B182B]/95 to-[#08111F]",
    borderGlow: "border-emerald-500/30 hover:border-emerald-400/60 hover:shadow-emerald-950/40",
    badgeBg: "bg-emerald-500/15 border-emerald-500/30",
    badgeText: "text-emerald-300",
    description: "Linens, full cleaning & toiletries",
    isPaid: false,
    tag: "Free / Complimentary",
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
    color: "text-amber-400",
    iconBg: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    cardGradient: "from-[#231A08]/90 via-[#0B182B]/95 to-[#08111F]",
    borderGlow: "border-amber-500/30 hover:border-amber-400/60 hover:shadow-amber-950/40",
    badgeBg: "bg-amber-500/15 border-amber-500/30",
    badgeText: "text-amber-300",
    description: "Checkout, keys & front desk assistance",
    isPaid: false,
    tag: "Instant Front Desk",
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
    color: "text-blue-400",
    iconBg: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    cardGradient: "from-[#08182E]/90 via-[#0B182B]/95 to-[#08111F]",
    borderGlow: "border-blue-500/30 hover:border-blue-400/60 hover:shadow-blue-950/40",
    badgeBg: "bg-blue-500/15 border-blue-500/30",
    badgeText: "text-blue-300",
    description: "In-room AC, plumbing & technical repairs",
    isPaid: false,
    tag: "Engineering Dispatch",
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
    color: "text-indigo-400",
    iconBg: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30",
    cardGradient: "from-[#141238]/90 via-[#0B182B]/95 to-[#08111F]",
    borderGlow: "border-indigo-500/30 hover:border-indigo-400/60 hover:shadow-indigo-950/40",
    badgeBg: "bg-indigo-500/15 border-indigo-500/30",
    badgeText: "text-indigo-300",
    description: "Dry cleaning, pressing & garment wash",
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
    color: "text-pink-400",
    iconBg: "bg-pink-500/20 text-pink-400 border-pink-500/30",
    cardGradient: "from-[#2B0E23]/90 via-[#0B182B]/95 to-[#08111F]",
    borderGlow: "border-pink-500/30 hover:border-pink-400/60 hover:shadow-pink-950/40",
    badgeBg: "bg-pink-500/15 border-pink-500/30",
    badgeText: "text-pink-300",
    description: "Massages, therapies & wellness passes",
    isPaid: true,
    tag: "Luxury Wellness",
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
    color: "text-teal-400",
    iconBg: "bg-teal-500/20 text-teal-400 border-teal-500/30",
    cardGradient: "from-[#082223]/90 via-[#0B182B]/95 to-[#08111F]",
    borderGlow: "border-teal-500/30 hover:border-teal-400/60 hover:shadow-teal-950/40",
    badgeBg: "bg-teal-500/15 border-teal-500/30",
    badgeText: "text-teal-300",
    description: "Airport transfers, local taxis & chauffeur",
    isPaid: true,
    tag: "Chauffeur / Cab",
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
    color: "text-rose-400",
    iconBg: "bg-rose-500/20 text-rose-400 border-rose-500/30",
    cardGradient: "from-[#280B14]/90 via-[#0B182B]/95 to-[#08111F]",
    borderGlow: "border-rose-500/30 hover:border-rose-400/60 hover:shadow-rose-950/40",
    badgeBg: "bg-rose-500/15 border-rose-500/30",
    badgeText: "text-rose-300",
    description: "Cutlery, ice bucket, glasses & minibar kit",
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
    color: "text-purple-400",
    iconBg: "bg-purple-500/20 text-purple-400 border-purple-500/30",
    cardGradient: "from-[#1F0E2F]/90 via-[#0B182B]/95 to-[#08111F]",
    borderGlow: "border-purple-500/30 hover:border-purple-400/60 hover:shadow-purple-950/40",
    badgeBg: "bg-purple-500/15 border-purple-500/30",
    badgeText: "text-purple-300",
    description: "Sightseeing, table reservations & guide",
    isPaid: false,
    tag: "Personal Concierge",
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
    color: "text-amber-300",
    iconBg: "bg-amber-500/20 text-amber-300 border-amber-500/30",
    cardGradient: "from-[#251A08]/90 via-[#0B182B]/95 to-[#08111F]",
    borderGlow: "border-amber-500/30 hover:border-amber-400/60 hover:shadow-amber-950/40",
    badgeBg: "bg-amber-500/15 border-amber-500/30",
    badgeText: "text-amber-200",
    description: "Banquet halls, rollaway cots & custom hotel needs",
    isPaid: true,
    tag: "VIP & Upgrades",
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
    <div className="p-4 space-y-5 pb-28 max-w-lg mx-auto">
      {/* ── LUXURY HERO BANNER WITH AMBIENT GLOW ── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#071329] via-[#0D1C38] to-[#0A162E] border border-amber-500/25 p-5 shadow-2xl">
        {/* Glow orbs */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-bl from-amber-500/15 via-indigo-500/10 to-transparent rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[10px] font-black uppercase tracking-widest">
              <Sparkles className="w-3 h-3 text-amber-400" />
              <span>Digital Guest Concierge</span>
            </div>

            {isVerifiedStay && (
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-black border border-emerald-500/30 shadow-xs">
                Room {session?.room_number}
              </span>
            )}
          </div>

          <div>
            <h1 className="text-2xl font-black text-white tracking-tight leading-tight">
              Hotel Services &amp; Concierge
            </h1>
            <p className="text-xs text-slate-300/80 mt-0.5 leading-relaxed">
              {isVerifiedStay
                ? `1-tap dispatch for Room ${session?.room_number}. Staff respond in minutes.`
                : "Contactless digital room services for verified in-house guests."}
            </p>
          </div>

          {/* Real-time status pill */}
          <div className="flex items-center gap-2 pt-1">
            <span className="inline-flex items-center gap-1.5 text-[10.5px] font-bold text-emerald-400 bg-emerald-950/60 px-2.5 py-1 rounded-xl border border-emerald-500/30">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              24/7 Digital Dispatch Active
            </span>
            <Link
              href="/guest/requests"
              className="text-[10.5px] font-bold text-slate-300 hover:text-white bg-slate-800/80 px-2.5 py-1 rounded-xl border border-slate-700 flex items-center gap-1 transition"
            >
              <BellRing className="w-3 h-3 text-amber-400" />
              <span>Active Requests</span>
            </Link>
          </div>
        </div>
      </div>

      {/* ── IN-ROOM DINING & ROOM SERVICE BANNER ── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-500/20 via-[#0E1B2E] to-[#121E36] border border-amber-500/30 p-4 shadow-lg flex items-center justify-between gap-3 group">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-black shadow-md shrink-0 group-hover:scale-105 transition-transform">
            <Utensils className="w-5 h-5" />
          </div>
          <div className="space-y-0.5">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] uppercase font-black tracking-wider text-amber-400">Chef Specials</span>
              <span className="h-1 w-1 rounded-full bg-amber-400" />
              <span className="text-[10px] text-emerald-400 font-bold">Kitchen Open</span>
            </div>
            <h3 className="text-xs font-black text-white">Order Food &amp; Beverages</h3>
            <p className="text-[10px] text-slate-400">Hot meals, gourmet snacks &amp; drinks to Room {session?.room_number || "Suite"}</p>
          </div>
        </div>

        <Link
          href="/guest/dining"
          className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs transition shadow-md shrink-0 flex items-center gap-1 active:scale-95"
        >
          <span>Order</span>
          <ChevronRight className="w-3.5 h-3.5 stroke-[3]" />
        </Link>
      </div>

      {/* ── SEARCH & FILTER TABS ── */}
      <div className="space-y-3">
        {/* Search bar */}
        <div className="relative">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search towels, AC repair, laundry, spa, cab..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl text-xs bg-[#0E1B2E] border border-slate-800 text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500/50 shadow-inner"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveTab("ALL")}
            className={cn(
              "px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition",
              activeTab === "ALL"
                ? "bg-amber-500 text-slate-950 shadow-md font-black"
                : "bg-slate-900/80 text-slate-400 hover:text-white border border-slate-800"
            )}
          >
            ✨ All Services ({SERVICE_CATEGORIES.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("COMPLIMENTARY")}
            className={cn(
              "px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition flex items-center gap-1.5",
              activeTab === "COMPLIMENTARY"
                ? "bg-emerald-500 text-slate-950 shadow-md font-black"
                : "bg-slate-900/80 text-slate-400 hover:text-emerald-300 border border-slate-800"
            )}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Complimentary (5)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("PAID")}
            className={cn(
              "px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition flex items-center gap-1.5",
              activeTab === "PAID"
                ? "bg-amber-500 text-slate-950 shadow-md font-black"
                : "bg-slate-900/80 text-slate-400 hover:text-amber-300 border border-slate-800"
            )}
          >
            <Tag className="w-3.5 h-3.5" />
            <span>Premium &amp; Wellness (4)</span>
          </button>
        </div>
      </div>

      {/* ── GRAPHICAL SERVICE CARDS GRID ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {displayedCategories.map((cat) => {
          const Icon = cat.icon;
          const paidItems = getCategoryPaidItems(cat);

          return (
            <div
              key={cat.id}
              onClick={() => openCategoryModal(cat)}
              className={cn(
                "rounded-3xl p-4 transition-all duration-200 cursor-pointer border shadow-lg relative overflow-hidden flex flex-col justify-between group active:scale-[0.98]",
                `bg-gradient-to-br ${cat.cardGradient}`,
                cat.borderGlow
              )}
            >
              {/* Top Row: Icon + Badge */}
              <div className="flex items-start justify-between gap-2">
                <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center border shadow-md shrink-0 transition-transform group-hover:scale-105", cat.iconBg)}>
                  <Icon className="w-6 h-6" />
                </div>

                <span className={cn("text-[9.5px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border", cat.badgeBg, cat.badgeText)}>
                  {cat.tag}
                </span>
              </div>

              {/* Title & Description */}
              <div className="mt-3.5 space-y-1">
                <h4 className="text-sm font-black text-white group-hover:text-amber-300 transition-colors flex items-center justify-between">
                  <span>{cat.name}</span>
                  <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all" />
                </h4>
                <p className="text-[11px] text-slate-400 leading-relaxed line-clamp-1">
                  {cat.description}
                </p>
              </div>

              {/* Popular quick chips preview */}
              <div className="mt-3 pt-2.5 border-t border-white/[0.06] flex items-center gap-1.5 flex-wrap">
                {cat.commonQuickOptions.slice(0, 2).map((opt) => (
                  <span
                    key={opt}
                    className="text-[9.5px] font-semibold text-slate-300/80 bg-white/[0.04] px-2 py-0.5 rounded-lg border border-white/[0.06] truncate max-w-[150px]"
                  >
                    {opt}
                  </span>
                ))}
                {cat.commonQuickOptions.length > 2 && (
                  <span className="text-[9.5px] font-black text-amber-400/80">
                    +{cat.commonQuickOptions.length - 2} more
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── MODAL DIALOG FOR SELECTED SERVICE ── */}
      {selectedCat && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-[#0D1A30] border-t sm:border border-slate-800 rounded-t-3xl sm:rounded-3xl p-5 space-y-4 shadow-2xl max-h-[92vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className={cn("w-11 h-11 rounded-2xl flex items-center justify-center border shadow-md shrink-0", selectedCat.iconBg)}>
                  <selectedCat.icon className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-black text-white">{selectedCat.name}</h3>
                    <span className={cn("px-2 py-0.5 rounded-md text-[9.5px] font-bold border", selectedCat.badgeBg, selectedCat.badgeText)}>
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
                                  : "bg-[#091322] border-slate-800/80 hover:border-slate-700 text-slate-300"
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
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>{selectedCat.isPaid ? "Or Select Quick Request" : "Quick Selection"}</span>
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
                              ? "bg-amber-500 text-slate-950 font-black border-amber-500 shadow-md"
                              : "bg-[#091322] border-slate-800 text-slate-300 hover:bg-slate-800/60"
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
                      <span>Custom Message / Specific Instructions</span>
                    </label>
                  </div>

                  <textarea
                    rows={3}
                    value={customMessage}
                    onChange={(e) => setCustomMessage(e.target.value)}
                    placeholder="E.g., Please bring extra bath towels around 6 PM, or specify any other requirement..."
                    className="w-full px-3 py-2 rounded-xl bg-[#091322] border border-slate-700/80 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 resize-none transition"
                  />
                </div>

                {/* 4. Priority selection */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
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
                          : "bg-[#091322] text-slate-400 border-slate-800 hover:bg-slate-800"
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
                          : "bg-[#091322] text-slate-400 border-slate-800 hover:bg-slate-800"
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
