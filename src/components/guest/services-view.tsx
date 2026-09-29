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
  cardBg: string;
  cardBorder: string;
  accentBar: string;
  chipBg: string;
  chipText: string;
  chipBorder: string;
  chipHover: string;
  btnBg: string;
  btnText: string;
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
    iconColor: "text-amber-600",
    iconBg: "bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 text-white shadow-md shadow-amber-500/25",
    cardBg: "bg-gradient-to-br from-amber-50/80 via-white to-amber-50/30",
    cardBorder: "border-amber-200/90 hover:border-amber-400",
    accentBar: "from-amber-400 to-amber-600",
    chipBg: "bg-amber-100/60",
    chipText: "text-amber-950",
    chipBorder: "border-amber-200",
    chipHover: "hover:bg-amber-100 hover:border-amber-300",
    btnBg: "bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-xs shadow-amber-500/20",
    btnText: "text-white",
    badgeBg: "bg-emerald-100 text-emerald-800",
    badgeText: "text-emerald-800 font-bold",
    badgeBorder: "border-emerald-200",
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
    iconColor: "text-sky-600",
    iconBg: "bg-gradient-to-br from-sky-400 via-blue-500 to-blue-600 text-white shadow-md shadow-sky-500/25",
    cardBg: "bg-gradient-to-br from-sky-50/80 via-white to-blue-50/30",
    cardBorder: "border-sky-200/90 hover:border-sky-400",
    accentBar: "from-sky-400 to-blue-600",
    chipBg: "bg-sky-100/60",
    chipText: "text-sky-950",
    chipBorder: "border-sky-200",
    chipHover: "hover:bg-sky-100 hover:border-sky-300",
    btnBg: "bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white shadow-xs shadow-sky-500/20",
    btnText: "text-white",
    badgeBg: "bg-sky-100 text-sky-800",
    badgeText: "text-sky-800 font-bold",
    badgeBorder: "border-sky-200",
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
    iconColor: "text-indigo-600",
    iconBg: "bg-gradient-to-br from-indigo-400 via-indigo-500 to-purple-600 text-white shadow-md shadow-indigo-500/25",
    cardBg: "bg-gradient-to-br from-indigo-50/80 via-white to-purple-50/30",
    cardBorder: "border-indigo-200/90 hover:border-indigo-400",
    accentBar: "from-indigo-400 to-purple-600",
    chipBg: "bg-indigo-100/60",
    chipText: "text-indigo-950",
    chipBorder: "border-indigo-200",
    chipHover: "hover:bg-indigo-100 hover:border-indigo-300",
    btnBg: "bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white shadow-xs shadow-indigo-500/20",
    btnText: "text-white",
    badgeBg: "bg-indigo-100 text-indigo-800",
    badgeText: "text-indigo-800 font-bold",
    badgeBorder: "border-indigo-200",
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
    iconColor: "text-emerald-600",
    iconBg: "bg-gradient-to-br from-emerald-400 via-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/25",
    cardBg: "bg-gradient-to-br from-emerald-50/80 via-white to-teal-50/30",
    cardBorder: "border-emerald-200/90 hover:border-emerald-400",
    accentBar: "from-emerald-400 to-teal-600",
    chipBg: "bg-emerald-100/60",
    chipText: "text-emerald-950",
    chipBorder: "border-emerald-200",
    chipHover: "hover:bg-emerald-100 hover:border-emerald-300",
    btnBg: "bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-xs shadow-emerald-500/20",
    btnText: "text-white",
    badgeBg: "bg-emerald-100 text-emerald-800",
    badgeText: "text-emerald-800 font-bold",
    badgeBorder: "border-emerald-200",
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
    iconColor: "text-purple-600",
    iconBg: "bg-gradient-to-br from-purple-400 via-purple-500 to-pink-600 text-white shadow-md shadow-purple-500/25",
    cardBg: "bg-gradient-to-br from-purple-50/80 via-white to-pink-50/30",
    cardBorder: "border-purple-200/90 hover:border-purple-400",
    accentBar: "from-purple-400 to-pink-600",
    chipBg: "bg-purple-100/60",
    chipText: "text-purple-950",
    chipBorder: "border-purple-200",
    chipHover: "hover:bg-purple-100 hover:border-purple-300",
    btnBg: "bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white shadow-xs shadow-purple-500/20",
    btnText: "text-white",
    badgeBg: "bg-purple-100 text-purple-800",
    badgeText: "text-purple-800 font-bold",
    badgeBorder: "border-purple-200",
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
    name: "Chauffeur & Transfers",
    group: "ASSISTANCE",
    icon: Car,
    iconColor: "text-teal-600",
    iconBg: "bg-gradient-to-br from-teal-400 via-teal-500 to-cyan-600 text-white shadow-md shadow-teal-500/25",
    cardBg: "bg-gradient-to-br from-teal-50/80 via-white to-cyan-50/30",
    cardBorder: "border-teal-200/90 hover:border-teal-400",
    accentBar: "from-teal-400 to-cyan-600",
    chipBg: "bg-teal-100/60",
    chipText: "text-teal-950",
    chipBorder: "border-teal-200",
    chipHover: "hover:bg-teal-100 hover:border-teal-300",
    btnBg: "bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white shadow-xs shadow-teal-500/20",
    btnText: "text-white",
    badgeBg: "bg-teal-100 text-teal-800",
    badgeText: "text-teal-800 font-bold",
    badgeBorder: "border-teal-200",
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
    iconColor: "text-rose-600",
    iconBg: "bg-gradient-to-br from-rose-400 via-rose-500 to-red-600 text-white shadow-md shadow-rose-500/25",
    cardBg: "bg-gradient-to-br from-rose-50/80 via-white to-orange-50/30",
    cardBorder: "border-rose-200/90 hover:border-rose-400",
    accentBar: "from-rose-400 to-red-600",
    chipBg: "bg-rose-100/60",
    chipText: "text-rose-950",
    chipBorder: "border-rose-200",
    chipHover: "hover:bg-rose-100 hover:border-rose-300",
    btnBg: "bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700 text-white shadow-xs shadow-rose-500/20",
    btnText: "text-white",
    badgeBg: "bg-rose-100 text-rose-800",
    badgeText: "text-rose-800 font-bold",
    badgeBorder: "border-rose-200",
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
    iconColor: "text-pink-600",
    iconBg: "bg-gradient-to-br from-pink-400 via-pink-500 to-rose-600 text-white shadow-md shadow-pink-500/25",
    cardBg: "bg-gradient-to-br from-pink-50/80 via-white to-rose-50/30",
    cardBorder: "border-pink-200/90 hover:border-pink-400",
    accentBar: "from-pink-400 to-rose-600",
    chipBg: "bg-pink-100/60",
    chipText: "text-pink-950",
    chipBorder: "border-pink-200",
    chipHover: "hover:bg-pink-100 hover:border-pink-300",
    btnBg: "bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-white shadow-xs shadow-pink-500/20",
    btnText: "text-white",
    badgeBg: "bg-pink-100 text-pink-800",
    badgeText: "text-pink-800 font-bold",
    badgeBorder: "border-pink-200",
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
    iconColor: "text-amber-600",
    iconBg: "bg-gradient-to-br from-amber-400 via-yellow-500 to-amber-600 text-white shadow-md shadow-amber-500/25",
    cardBg: "bg-gradient-to-br from-amber-100/60 via-white to-yellow-50/40",
    cardBorder: "border-amber-300/90 hover:border-amber-500",
    accentBar: "from-amber-400 to-yellow-600",
    chipBg: "bg-amber-100/70",
    chipText: "text-amber-950",
    chipBorder: "border-amber-300",
    chipHover: "hover:bg-amber-100 hover:border-amber-400",
    btnBg: "bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-white shadow-xs shadow-amber-500/20",
    btnText: "text-white",
    badgeBg: "bg-amber-100 text-amber-800",
    badgeText: "text-amber-800 font-bold",
    badgeBorder: "border-amber-200",
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

function getPackagePerks(name: string, categoryId: string): { icon: string; text: string }[] {
  const n = name.toLowerCase();

  if (categoryId === "SPA") {
    if (n.includes("ayurvedic") || n.includes("therapy") || n.includes("massage")) {
      return [
        { icon: "🌿", text: "60-Min Full Body" },
        { icon: "✨", text: "Herbal Warm Oils" },
        { icon: "🧖", text: "Steam & Shower" },
      ];
    }
    if (n.includes("pool") || n.includes("health club") || n.includes("pass")) {
      return [
        { icon: "🏊", text: "Full Day Access" },
        { icon: "♨️", text: "Heated Jacuzzi" },
        { icon: "🥋", text: "Robes & Locker" },
      ];
    }
    if (n.includes("facial") || n.includes("skin")) {
      return [
        { icon: "🌸", text: "Radiant Skin Care" },
        { icon: "🧴", text: "Organic Botanicals" },
        { icon: "💆", text: "Relaxation Suite" },
      ];
    }
    return [
      { icon: "🌿", text: "Wellness Ritual" },
      { icon: "⭐", text: "5-Star Therapist" },
      { icon: "🧖", text: "Suite Attendance" },
    ];
  }

  if (categoryId === "TRANSPORT") {
    if (n.includes("airport")) {
      return [
        { icon: "🚗", text: "Private Premium Sedan" },
        { icon: "✈️", text: "Flight Monitored" },
        { icon: "🧳", text: "Luggage Valet" },
      ];
    }
    if (n.includes("chauffeur") || n.includes("day")) {
      return [
        { icon: "🚘", text: "Full-Day Driver (8h)" },
        { icon: "🗺️", text: "Flexible Stops" },
        { icon: "💧", text: "Water & Mints" },
      ];
    }
    return [
      { icon: "🚗", text: "Direct Porch Pickup" },
      { icon: "⚡", text: "Instant Dispatch" },
      { icon: "🛡️", text: "Verified Chauffeur" },
    ];
  }

  if (categoryId === "LAUNDRY") {
    if (n.includes("express") || n.includes("same-day")) {
      return [
        { icon: "⚡", text: "4-Hour Express Return" },
        { icon: "👔", text: "Steam Press & Fold" },
        { icon: "📦", text: "Hanger & Cover" },
      ];
    }
    if (n.includes("dry clean")) {
      return [
        { icon: "✨", text: "Gentle Fabric Care" },
        { icon: "🛡️", text: "Stain Protection" },
        { icon: "👔", text: "Garment Bag Finish" },
      ];
    }
    return [
      { icon: "👔", text: "Professional Wash" },
      { icon: "♨️", text: "Steam Pressing" },
      { icon: "🛎️", text: "Suite Delivery" },
    ];
  }

  if (categoryId === "OTHER") {
    if (n.includes("suite") || n.includes("tariff")) {
      return [
        { icon: "👑", text: "Executive High Floor" },
        { icon: "🍸", text: "Club Lounge Access" },
        { icon: "⏰", text: "Late 2 PM Checkout" },
      ];
    }
    if (n.includes("extra bed") || n.includes("bed")) {
      return [
        { icon: "🛏️", text: "Plush Ortho Mattress" },
        { icon: "✨", text: "Fresh Duvet & Pillows" },
        { icon: "⚡", text: "Express Setup" },
      ];
    }
  }

  return [
    { icon: "⭐", text: "5-Star Hotel Service" },
    { icon: "✓", text: "Direct Folio Charge" },
    { icon: "⚡", text: "Priority Desk Dispatch" },
  ];
}

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

  const [modalMode, setModalMode] = React.useState<"PACKAGES" | "CUSTOM">("PACKAGES");
  const [activeTab, setActiveTab] = React.useState<"ALL" | "COMPLIMENTARY" | "PAID">("ALL");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedCat, setSelectedCat] = React.useState<ServiceCategoryMeta | null>(matchedInitialCat);
  const [selectedQuickOptions, setSelectedQuickOptions] = React.useState<string[]>([]);
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

  // Helper to filter POS items strictly relevant to the active category, deduplicated & curated
  const getCategoryPaidItems = React.useCallback(
    (cat: ServiceCategoryMeta): PayableServiceItem[] => {
      if (!payableServices || payableServices.length === 0) return [];

      const id = cat.id;
      const matched = payableServices.filter((item) => {
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

      // Deduplicate by name and price to ensure no duplicate packages appear
      const seen = new Set<string>();
      const uniqueItems: PayableServiceItem[] = [];
      for (const item of matched) {
        const key = `${item.name.trim().toLowerCase()}_${item.price}`;
        if (!seen.has(key)) {
          seen.add(key);
          uniqueItems.push(item);
        }
      }

      return uniqueItems;
    },
    [payableServices]
  );

  const openCategoryModal = React.useCallback((cat: ServiceCategoryMeta, preselectOption?: string) => {
    setSelectedCat(cat);
    const availablePaid = getCategoryPaidItems(cat);
    if (preselectOption) {
      setModalMode("CUSTOM");
      setSelectedQuickOptions([preselectOption]);
      setSelectedPaidItem(null);
    } else if (cat.isPaid && availablePaid.length > 0) {
      setModalMode("PACKAGES");
      setSelectedPaidItem(availablePaid[0]); // Auto-select 1st package for immediate seamless booking
      setSelectedQuickOptions([]);
    } else {
      setModalMode("CUSTOM");
      setSelectedPaidItem(null);
      setSelectedQuickOptions([]);
    }
    setCustomMessage("");
    setPriority("MEDIUM");
    setErrorMsg(null);
    setSuccessNotice(null);
  }, [getCategoryPaidItems]);

  const closeModal = React.useCallback(() => {
    setSelectedCat(null);
    setSelectedQuickOptions([]);
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
    } else if (selectedQuickOptions.length > 0) {
      if (selectedQuickOptions.length === 1) {
        finalTitle = selectedQuickOptions[0];
      } else {
        const fullJoined = selectedQuickOptions.join(", ");
        if (fullJoined.length <= 80) {
          finalTitle = fullJoined;
        } else {
          finalTitle = `${selectedQuickOptions[0]}, ${selectedQuickOptions[1]} +${selectedQuickOptions.length - 2} more`;
        }
      }
    } else if (customMessage.trim()) {
      finalTitle = customMessage.trim().split("\n")[0].substring(0, 80);
    } else {
      finalTitle = `${selectedCat.name} Assistance`;
    }

    if (!selectedPaidItem && selectedQuickOptions.length === 0 && !customMessage.trim()) {
      setErrorMsg("Please select at least one requirement or specify your request.");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    const fullDescription = [
      selectedPaidItem ? `Requested Item: ${selectedPaidItem.name} — Rate: ₹${selectedPaidItem.price.toFixed(2)} (Billed to Folio)` : null,
      selectedQuickOptions.length > 0
        ? `Selected Requirements (${selectedQuickOptions.length}):\n${selectedQuickOptions.map((o) => `• ${o}`).join("\n")}`
        : null,
      customMessage.trim() ? `Guest Note: ${customMessage.trim()}` : null,
    ]
      .filter(Boolean)
      .join("\n\n");

    const res = await createGuestServiceRequestAction({
      category: selectedCat.id,
      requestType: selectedPaidItem?.name || (selectedQuickOptions.length > 0 ? selectedQuickOptions.join(", ") : selectedCat.name),
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
      {/* ── 1. EDITORIAL HEADER BANNER ── */}
      <div className="relative overflow-hidden bg-gradient-to-b from-[#070D18] via-[#0D1829] to-[#0A1322] text-white rounded-b-[2rem] shadow-xl border-b border-[#D4AF37]/25 pb-7 pt-5 px-5">
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-[#D4AF37]/15 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full bg-amber-500/10 blur-2xl pointer-events-none" />
        <div className="absolute inset-0 opacity-[0.03] bg-[radial-gradient(#D4AF37_1px,transparent_1px)] [background-size:20px_20px]" />

        <div className="relative z-10 space-y-3.5">
          <div className="flex items-center justify-between">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-[#D4AF37]/35 text-[#E4C980] text-[10.5px] font-medium tracking-wide shadow-xs">
              <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span>Digital Hotel Concierge</span>
            </div>

            {isVerifiedStay && session?.room_number && (
              <span className="text-xs px-3 py-1 rounded-full bg-white/10 text-[#E4C980] font-semibold border border-[#D4AF37]/35 backdrop-blur-xs">
                Suite {session.room_number}
              </span>
            )}
          </div>

          <div className="space-y-1 pt-1">
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-white tracking-tight leading-tight">
              Guest Services
            </h1>
            <p className="text-xs text-slate-300/85 leading-relaxed max-w-md">
              {isVerifiedStay
                ? `Immediate assistance and bespoke hotel services for Room ${session?.room_number}.`
                : "Experience effortless luxury service with 24/7 dedicated hotel staff."}
            </p>
          </div>

          <div className="flex items-center gap-2 pt-1 flex-wrap">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-400 bg-emerald-950/60 px-2.5 py-1 rounded-full border border-emerald-500/25 backdrop-blur-xs">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Staff on Duty · Fast Dispatch
            </span>

            <Link
              href="/guest/requests"
              className="text-[11px] font-semibold text-[#E4C980] hover:text-white bg-white/10 hover:bg-white/15 px-3 py-1 rounded-full border border-[#D4AF37]/30 flex items-center gap-1.5 transition shadow-2xs"
            >
              <BellRing className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span>Active Requests</span>
            </Link>
          </div>
        </div>
      </div>

      <div className="px-4 space-y-5">
        {/* ── 2. QUICK CATEGORY SHORTCUTS CAROUSEL / GRID ── */}
        <div className="space-y-2">
          <div className="flex items-center justify-between px-0.5">
            <span className="text-[11px] font-bold text-slate-800 uppercase tracking-wider font-serif">
              Quick Services
            </span>
            <span className="text-[10px] text-slate-500">Tap to request</span>
          </div>

          <div className="flex items-center gap-2.5 overflow-x-auto pb-1.5 pt-0.5 scrollbar-none">
            {SERVICE_CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => openCategoryModal(cat)}
                  className="flex flex-col items-center gap-1.5 p-2 rounded-2xl bg-white border border-[#EAE3D2] hover:border-[#D4AF37]/50 shadow-2xs transition-transform duration-75 active:scale-90 shrink-0 w-20 text-center select-none group"
                >
                  <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105", cat.iconBg)}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-semibold text-slate-800 line-clamp-1 leading-tight">
                    {cat.name.split(" ")[0]}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── 3. IN-ROOM DINING PROMOTION BANNER ── */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-[#0B1526] via-[#152542] to-[#0B1526] text-white border border-[#D4AF37]/35 shadow-md flex items-center justify-between gap-3 transition-transform duration-75 active:scale-[0.99]">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-white flex items-center justify-center font-bold shadow-md shadow-amber-500/25 shrink-0">
              <Utensils className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#E4C980] uppercase tracking-wider">
                <span>In-Room Dining</span>
              </div>
              <h3 className="text-xs sm:text-sm font-serif font-semibold text-white truncate">
                Chef-Crafted Room Delivery
              </h3>
              <p className="text-[11px] text-slate-300/80 line-clamp-1">Freshly prepared gourmet dishes &amp; drinks</p>
            </div>
          </div>

          <Link
            href="/guest/dining"
            prefetch={true}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#E4C980] hover:from-[#C5A030] hover:to-[#D4AF37] text-[#0B1526] font-bold text-xs transition-transform duration-75 active:scale-95 shadow-md shadow-[#D4AF37]/20 shrink-0 flex items-center gap-1"
          >
            <span>View Menu</span>
            <ChevronRight className="w-3.5 h-3.5 stroke-[2.5]" />
          </Link>
        </div>

        {/* ── 4. SEARCH & VIBRANT FILTER TABS ── */}
        <div className="space-y-3">
          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search towels, room cleaning, AC, laundry, spa, taxi..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl text-xs bg-white border border-[#EAE3D2] text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] shadow-2xs transition"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3.5 top-2.5 text-slate-400 hover:text-slate-600 p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filter Pills with rich tactile feedback */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            <button
              type="button"
              onClick={() => setActiveTab("ALL")}
              className={cn(
                "px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-transform duration-75 active:scale-95 select-none",
                activeTab === "ALL"
                  ? "bg-[#0B1526] text-[#E4C980] border border-[#D4AF37]/50 shadow-xs"
                  : "bg-white text-slate-600 hover:text-slate-900 border border-[#EAE3D2]"
              )}
            >
              All Services ({SERVICE_CATEGORIES.length})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("COMPLIMENTARY")}
              className={cn(
                "px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-transform duration-75 active:scale-95 flex items-center gap-1.5 select-none",
                activeTab === "COMPLIMENTARY"
                  ? "bg-emerald-600 text-white shadow-xs font-bold"
                  : "bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200"
              )}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Complimentary (5)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("PAID")}
              className={cn(
                "px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-transform duration-75 active:scale-95 flex items-center gap-1.5 select-none",
                activeTab === "PAID"
                  ? "bg-indigo-600 text-white shadow-xs font-bold"
                  : "bg-indigo-50 text-indigo-800 hover:bg-indigo-100 border border-indigo-200"
              )}
            >
              <Tag className="w-3.5 h-3.5" />
              <span>Chargeable Services (4)</span>
            </button>
          </div>
        </div>

        {/* ── 5. COLORFUL SERVICE GROUPS & CARDS ── */}
        {groupedCategories.length === 0 ? (
          <div className="p-8 rounded-3xl bg-white border border-[#EAE3D2] text-center space-y-3 shadow-sm">
            <div className="w-12 h-12 rounded-full bg-[#FAF4E6] border border-[#D4AF37]/30 text-[#A67C1E] mx-auto flex items-center justify-center">
              <Search className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-serif font-semibold text-slate-900">No Services Found</h3>
            <p className="text-xs text-slate-500 max-w-xs mx-auto">
              No matching hotel service found for &ldquo;{searchQuery}&rdquo;. Try another keyword or clear search.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setActiveTab("ALL");
              }}
              className="px-4 py-2 rounded-full bg-[#0B1526] text-[#E4C980] border border-[#D4AF37]/30 text-xs font-semibold transition active:scale-95"
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
                    <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-serif">
                      {meta.title}
                    </h2>
                    <p className="text-[11px] text-slate-500">{meta.subtitle}</p>
                  </div>

                  {/* Colorful Cards Grid */}
                  <div className="space-y-3.5">
                    {group.items.map((cat) => {
                      const Icon = cat.icon;

                      return (
                        <div
                          key={cat.id}
                          className={cn(
                            "rounded-2xl border p-4 shadow-2xs hover:shadow-md transition-all duration-150 space-y-3 relative overflow-hidden",
                            cat.cardBg,
                            cat.cardBorder
                          )}
                        >
                          {/* Accent line indicator at the top */}
                          <div className={cn("absolute top-0 left-0 right-0 h-1 bg-gradient-to-r", cat.accentBar)} />

                          {/* Top Row: Icon + Title & Description + Badge */}
                          <div className="flex items-start justify-between gap-3 pt-0.5">
                            <div className="flex items-start gap-3 min-w-0">
                              <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-md", cat.iconBg)}>
                                <Icon className="w-6 h-6" />
                              </div>
                              <div className="min-w-0">
                                <h3 className="text-sm font-serif font-bold text-slate-900 leading-snug">
                                  {cat.name}
                                </h3>
                                <p className="text-[11.5px] text-slate-600 mt-0.5 leading-snug line-clamp-2">
                                  {cat.description}
                                </p>
                              </div>
                            </div>

                            <span className={cn("text-[9.5px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border shrink-0 shadow-2xs", cat.badgeBg, cat.badgeBorder)}>
                              {cat.tag}
                            </span>
                          </div>

                          {/* Quick Options Chips with Colorful Theme */}
                          <div className="space-y-1.5 pt-0.5">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                              Popular Requests
                            </span>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {cat.commonQuickOptions.slice(0, 3).map((opt) => (
                                <button
                                  key={opt}
                                  type="button"
                                  onClick={() => openCategoryModal(cat, opt)}
                                  className={cn(
                                    "text-[11px] font-semibold px-2.5 py-1 rounded-lg border transition-transform duration-75 active:scale-95 shadow-2xs flex items-center gap-1 select-none",
                                    cat.chipBg,
                                    cat.chipText,
                                    cat.chipBorder,
                                    cat.chipHover
                                  )}
                                >
                                  <span>+</span>
                                  <span>{opt}</span>
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Action Row */}
                          <div className="pt-2.5 border-t border-slate-200/60 flex items-center justify-between gap-2">
                            <span className="text-[10.5px] font-medium text-slate-500">
                              {cat.isPaid ? "Billed directly to room folio" : "Provided with compliments"}
                            </span>

                            <button
                              type="button"
                              onClick={() => openCategoryModal(cat)}
                              className={cn(
                                "px-3.5 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-transform duration-75 active:scale-95 shrink-0 shadow-xs",
                                cat.btnBg
                              )}
                            >
                              <span>Request</span>
                              <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
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
        <div className="fixed inset-0 z-50 bg-[#0B1526]/70 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-white border-t sm:border border-[#EAE3D2] rounded-t-3xl sm:rounded-3xl p-5 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3.5 border-b border-[#EAE3D2]">
              <div className="flex items-center gap-3">
                <div className={cn("w-11 h-11 rounded-2xl flex items-center justify-center border shadow-2xs shrink-0", selectedCat.iconBg)}>
                  <selectedCat.icon className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-serif font-semibold text-slate-900">{selectedCat.name}</h3>
                    <span className={cn("px-2 py-0.5 rounded-full text-[9px] font-semibold border", selectedCat.badgeBg, selectedCat.badgeText, selectedCat.badgeBorder)}>
                      {selectedCat.tag}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                    Room {session?.room_number || "—"} • {selectedCat.description}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={closeModal}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center text-xs transition"
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>

            {successNotice ? (
              <div className="py-8 text-center space-y-3">
                <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center shadow-md border border-emerald-200">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h4 className="text-sm font-serif font-bold text-slate-900">
                  Request Dispatched to Hotel Staff
                </h4>
                <p className="text-xs text-[#A67C1E] font-medium bg-[#FAF4E6] py-1.5 px-3 rounded-lg border border-[#D4AF37]/30 inline-block">
                  {successNotice.title}
                </p>
                <p className="text-xs text-slate-500">
                  Acknowledged by concierge desk. Opening live tracking...
                </p>
              </div>
            ) : (
              <div className="space-y-4 pt-1">
                {/* ── TOP SEGMENTED SWITCHER (FOR PAID SERVICES) ── */}
                {selectedCat.isPaid && (() => {
                  const paidItems = getCategoryPaidItems(selectedCat);
                  if (paidItems.length === 0) return null;

                  return (
                    <div className="grid grid-cols-2 p-1 rounded-2xl bg-[#FAF8F5] border border-[#EAE3D2] shadow-2xs">
                      <button
                        type="button"
                        onClick={() => {
                          setModalMode("PACKAGES");
                          if (!selectedPaidItem && paidItems.length > 0) {
                            setSelectedPaidItem(paidItems[0]);
                          }
                          setSelectedQuickOptions([]);
                        }}
                        className={cn(
                          "py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 select-none",
                          modalMode === "PACKAGES"
                            ? "bg-[#0B1526] text-[#E4C980] border border-[#D4AF37]/50 shadow-xs"
                            : "text-slate-600 hover:text-slate-900"
                        )}
                      >
                        <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
                        <span>Packages ({paidItems.length})</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setModalMode("CUSTOM");
                          setSelectedPaidItem(null);
                        }}
                        className={cn(
                          "py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 select-none",
                          modalMode === "CUSTOM"
                            ? "bg-[#0B1526] text-[#E4C980] border border-[#D4AF37]/50 shadow-xs"
                            : "text-slate-600 hover:text-slate-900"
                        )}
                      >
                        <MessageSquarePlus className="w-3.5 h-3.5" />
                        <span>Custom Request</span>
                      </button>
                    </div>
                  );
                })()}

                {/* ── VIEW 1: SIGNATURE CURATED PACKAGES SHOWCASE ── */}
                {selectedCat.isPaid && modalMode === "PACKAGES" && (() => {
                  const paidItems = getCategoryPaidItems(selectedCat);
                  if (paidItems.length === 0) return null;

                  return (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between px-1">
                        <span className="text-[11px] font-bold text-slate-800 uppercase tracking-wider font-serif flex items-center gap-1.5">
                          <Crown className="w-3.5 h-3.5 text-[#D4AF37]" />
                          <span>Select Experience Package</span>
                        </span>
                        <span className="text-[10px] text-emerald-800 font-bold bg-emerald-100/90 px-2.5 py-0.5 rounded-full border border-emerald-300 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          <span>Billed to Room Folio</span>
                        </span>
                      </div>

                      {/* Signature Experience Cards Stack */}
                      <div className="space-y-3 pt-0.5">
                        {paidItems.map((item, idx) => {
                          const isSelected = selectedPaidItem?.id === item.id;
                          const itemName = item.name.toLowerCase();
                          const perks = getPackagePerks(item.name, selectedCat.id);

                          let packageTag = "Curated Package";
                          let packageIcon = "💎";
                          if (idx === 0) {
                            packageTag = "Most Popular Choice";
                            packageIcon = "★";
                          } else if (itemName.includes("ayurvedic") || itemName.includes("therapy") || itemName.includes("spa")) {
                            packageTag = "Signature Wellness";
                            packageIcon = "🌿";
                          } else if (itemName.includes("airport") || itemName.includes("cab") || itemName.includes("chauffeur")) {
                            packageTag = "VIP Chauffeur Transfer";
                            packageIcon = "🚗";
                          } else if (itemName.includes("laundry") || itemName.includes("dry clean")) {
                            packageTag = "Valet Garment Express";
                            packageIcon = "👔";
                          } else if (itemName.includes("suite") || itemName.includes("tariff") || itemName.includes("extra bed")) {
                            packageTag = "Suite Upgrade Privilege";
                            packageIcon = "👑";
                          }

                          return (
                            <div
                              key={`${item.id}-${idx}`}
                              onClick={() => {
                                setSelectedPaidItem(item);
                                setSelectedQuickOptions([]);
                              }}
                              className={cn(
                                "p-4 rounded-3xl transition-all duration-200 border cursor-pointer select-none relative overflow-hidden group",
                                isSelected
                                  ? "bg-gradient-to-br from-[#0B1526] via-[#111F36] to-[#0B1526] text-white border-2 border-[#D4AF37] shadow-xl shadow-amber-950/20 ring-2 ring-[#D4AF37]/30 scale-[1.01]"
                                  : "bg-white hover:bg-[#FAF8F5] border-[#E2D9C8] hover:border-[#D4AF37]/70 text-slate-900 shadow-sm hover:shadow-md active:scale-[0.99]"
                              )}
                            >
                              {/* Accent gold line on top when selected */}
                              {isSelected && (
                                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#D4AF37] via-[#F3E5AB] to-[#D4AF37]" />
                              )}

                              {/* Card Header: Tag Badge + Price & Radio Check */}
                              <div className="flex items-center justify-between gap-2">
                                <span className={cn(
                                  "text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border flex items-center gap-1 shadow-2xs",
                                  isSelected
                                    ? "bg-white/10 text-[#E4C980] border-[#D4AF37]/40"
                                    : "bg-[#FAF4E6] text-[#A67C1E] border-[#D4AF37]/30"
                                )}>
                                  <span>{packageIcon}</span>
                                  <span>{packageTag}</span>
                                </span>

                                <div className="flex items-center gap-2.5">
                                  <div className="flex items-baseline gap-0.5">
                                    <span className={cn("text-xs font-bold", isSelected ? "text-[#E4C980]" : "text-slate-500")}>₹</span>
                                    <span className={cn("text-xl font-black font-mono tracking-tight", isSelected ? "text-white" : "text-slate-900")}>
                                      {item.price.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                    </span>
                                    <span className={cn("text-[10px] font-mono", isSelected ? "text-slate-400" : "text-slate-400")}>.00</span>
                                  </div>

                                  <div className={cn(
                                    "w-6 h-6 rounded-full flex items-center justify-center transition-all",
                                    isSelected
                                      ? "bg-gradient-to-r from-[#D4AF37] to-[#E4C980] text-[#0B1526] shadow-sm scale-110"
                                      : "border-2 border-slate-300 text-transparent group-hover:border-[#D4AF37]"
                                  )}>
                                    <Check className="w-3.5 h-3.5 stroke-[3.5]" />
                                  </div>
                                </div>
                              </div>

                              {/* Card Title & Description */}
                              <div className="pt-2 pb-1 space-y-1">
                                <h4 className={cn(
                                  "text-sm sm:text-base font-bold font-serif leading-snug tracking-tight",
                                  isSelected ? "text-white" : "text-slate-900 group-hover:text-amber-950"
                                )}>
                                  {item.name}
                                </h4>
                                <p className={cn(
                                  "text-[11px] leading-relaxed line-clamp-2",
                                  isSelected ? "text-slate-300/90" : "text-slate-600"
                                )}>
                                  {item.description || "Curated 5-star hotel service package billed directly to your room folio upon completion."}
                                </p>
                              </div>

                              {/* Smart Package Inclusions Chips */}
                              <div className="flex items-center gap-1.5 flex-wrap pt-2">
                                {perks.map((p, pIdx) => (
                                  <span
                                    key={pIdx}
                                    className={cn(
                                      "text-[10px] font-semibold px-2.5 py-1 rounded-xl border flex items-center gap-1 shadow-2xs",
                                      isSelected
                                        ? "bg-white/10 text-slate-200 border-white/10"
                                        : "bg-[#FAF8F5] text-slate-700 border-[#EAE3D2]"
                                    )}
                                  >
                                    <span>{p.icon}</span>
                                    <span>{p.text}</span>
                                  </span>
                                ))}
                              </div>

                              {/* Bottom Footer Info */}
                              <div className={cn(
                                "pt-2.5 mt-2.5 border-t flex items-center justify-between text-[10.5px] font-medium",
                                isSelected ? "border-white/10 text-slate-300" : "border-slate-100 text-slate-500"
                              )}>
                                <span className="flex items-center gap-1 text-emerald-500 font-semibold">
                                  <ShieldCheck className="w-3.5 h-3.5" />
                                  <span>Direct Room Folio Charge</span>
                                </span>

                                <span className={cn(
                                  "font-bold text-[11px] flex items-center gap-1",
                                  isSelected ? "text-[#E4C980]" : "text-[#A67C1E] group-hover:underline"
                                )}>
                                  {isSelected ? "Selected ✓" : "Tap to Select"}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Instructions for Selected Package */}
                      <div className="space-y-1.5 p-3 rounded-2xl bg-[#FAF8F5] border border-[#EAE3D2] mt-2">
                        <label className="text-[11px] font-semibold text-slate-800 flex items-center gap-1.5 font-serif">
                          <Clock className="w-3.5 h-3.5 text-[#D4AF37]" />
                          <span>Preferred Timing &amp; Delivery Notes (Optional)</span>
                        </label>
                        <input
                          type="text"
                          value={customMessage}
                          onChange={(e) => setCustomMessage(e.target.value)}
                          placeholder="E.g., Please arrive around 6:00 PM, or mention any preferences..."
                          className="w-full px-3 py-2 rounded-xl bg-white border border-[#EAE3D2] text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] transition"
                        />
                      </div>
                    </div>
                  );
                })()}

                {/* ── VIEW 2: CUSTOM REQUEST & QUICK REQUIREMENT CHIPS (MULTI-SELECT SUPPORT) ── */}
                {(!selectedCat.isPaid || modalMode === "CUSTOM") && (
                  <div className="space-y-3.5">
                    {/* Quick Options Chips */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-semibold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 font-serif">
                          <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
                          <span>Select Requirement(s)</span>
                        </label>

                        {selectedQuickOptions.length > 0 && (
                          <div className="flex items-center gap-2">
                            <span className="text-[10.5px] font-bold text-[#A67C1E] bg-[#FAF4E6] px-2 py-0.5 rounded-full border border-[#D4AF37]/30">
                              {selectedQuickOptions.length} Selected
                            </span>
                            <button
                              type="button"
                              onClick={() => setSelectedQuickOptions([])}
                              className="text-[10.5px] text-slate-500 hover:text-slate-800 underline font-medium"
                            >
                              Clear
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        {selectedCat.commonQuickOptions.map((opt) => {
                          const isSelected = selectedQuickOptions.includes(opt);
                          return (
                            <button
                              key={opt}
                              type="button"
                              onClick={() => {
                                setSelectedPaidItem(null);
                                setSelectedQuickOptions((prev) =>
                                  prev.includes(opt) ? prev.filter((o) => o !== opt) : [...prev, opt]
                                );
                              }}
                              className={cn(
                                "p-2.5 rounded-xl text-xs text-left transition-all duration-150 active:scale-95 flex items-center justify-between border select-none",
                                isSelected
                                  ? "bg-[#0B1526] text-[#E4C980] font-semibold border-[#D4AF37]/60 shadow-2xs ring-1 ring-[#D4AF37]/30"
                                  : "bg-[#FAF8F5] border-[#EAE3D2] text-slate-700 hover:bg-slate-100"
                              )}
                            >
                              <span className="line-clamp-2 leading-tight">{opt}</span>
                              {isSelected && <Check className="w-3.5 h-3.5 shrink-0 ml-1 stroke-[3] text-[#D4AF37]" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Custom message box */}
                    <div className="space-y-1.5 p-3.5 rounded-2xl bg-[#FAF8F5] border border-[#EAE3D2]">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-semibold text-slate-800 flex items-center gap-1.5 font-serif">
                          <MessageSquarePlus className="w-3.5 h-3.5 text-[#D4AF37]" />
                          <span>Additional Instructions / Timing</span>
                        </label>
                      </div>

                      <textarea
                        rows={3}
                        value={customMessage}
                        onChange={(e) => setCustomMessage(e.target.value)}
                        placeholder="E.g., Please deliver around 6:00 PM, or mention any specific preferences..."
                        className="w-full px-3 py-2 rounded-xl bg-white border border-[#EAE3D2] text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] resize-none transition"
                      />
                    </div>
                  </div>
                )}

                {/* ── PRIORITY SELECTION ── */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-slate-800 uppercase tracking-wider font-serif">
                    Dispatch Priority
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setPriority("MEDIUM")}
                      className={cn(
                        "py-2 rounded-xl text-xs font-semibold transition-transform duration-75 active:scale-95 flex items-center justify-center gap-1.5 border select-none",
                        priority === "MEDIUM"
                          ? "bg-[#0B1526] text-[#E4C980] border-[#D4AF37]/50 shadow-2xs"
                          : "bg-[#FAF8F5] text-slate-600 border-[#EAE3D2] hover:bg-slate-100"
                      )}
                    >
                      <Clock className="w-3.5 h-3.5" />
                      <span>Standard Dispatch</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPriority("URGENT")}
                      className={cn(
                        "py-2 rounded-xl text-xs font-semibold transition-transform duration-75 active:scale-95 flex items-center justify-center gap-1.5 border select-none",
                        priority === "URGENT"
                          ? "bg-amber-600 text-white border-amber-600 shadow-2xs font-bold"
                          : "bg-[#FAF8F5] text-slate-600 border-[#EAE3D2] hover:bg-slate-100"
                      )}
                    >
                      <Zap className="w-3.5 h-3.5" />
                      <span>Urgent / Immediate</span>
                    </button>
                  </div>
                </div>

                {errorMsg && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                {/* ── SUBMIT BUTTON ── */}
                <button
                  type="button"
                  onClick={handleSubmitRequest}
                  disabled={isSubmitting}
                  className="w-full py-3.5 px-4 rounded-xl bg-[#0B1526] hover:bg-[#111D31] text-[#E4C980] border border-[#D4AF37]/35 disabled:opacity-50 font-semibold text-xs shadow-md flex items-center justify-center gap-2 transition-transform duration-75 active:scale-[0.98] select-none"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-[#D4AF37]" />
                      <span>Sending Request to Staff...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 text-[#D4AF37]" />
                      <span className="truncate">
                        {selectedPaidItem
                          ? `Book Package: ${selectedPaidItem.name} (₹${selectedPaidItem.price.toFixed(2)})`
                          : selectedQuickOptions.length === 1
                          ? `Submit: ${selectedQuickOptions[0]}`
                          : selectedQuickOptions.length > 1
                          ? `Submit (${selectedQuickOptions.length} Requirements): ${selectedQuickOptions.slice(0, 2).join(", ")}${selectedQuickOptions.length > 2 ? ` +${selectedQuickOptions.length - 2} more` : ""}`
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
