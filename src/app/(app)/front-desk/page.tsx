"use client";

import * as React from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/client";
import {
  fetchFrontDeskKPIs,
  fetchTodayArrivals,
  fetchTodayDepartures,
  fetchInHouseStays,
  fetchRoomAttentionList,
} from "@/lib/front-desk/queries";
import type {
  FrontDeskKPIStats,
  ArrivalRecord,
  DepartureRecord,
  InHouseRecord,
  RoomAttentionRecord,
} from "@/lib/front-desk/types";
import {
  FrontDeskKPIGrid,
  ArrivalsTable,
  DeparturesTable,
  InHouseTable,
  CheckInModal,
  CheckOutModal,
  NoShowModal,
  ReassignStayRoomModal,
  DirectRoomAssignmentModal,
} from "@/components/front-desk";
import { AssignRoomModal } from "@/components/bookings/assign-room-modal";
import type { ReservationRoom } from "@/lib/bookings/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LoadingState, ErrorState } from "@/components/ui/states";
import {
  LogIn,
  LogOut,
  Users,
  BedDouble,
  Search,
  UserPlus,
  Calendar,
  RotateCcw,
  Sparkles,
  ShieldCheck,
  ArrowRight,
  Info,
} from "lucide-react";
import { RoutePermissionGuard } from "@/components/auth/route-permission-guard";

const frontDeskCache = new Map<string, {
  stats: FrontDeskKPIStats;
  arrivals: ArrivalRecord[];
  departures: DepartureRecord[];
  inHouse: InHouseRecord[];
  attention: RoomAttentionRecord[];
  time: number;
}>();

export default function FrontDeskPage() {
  return (
    <RoutePermissionGuard permission="front_desk.view" moduleName="Front Desk & Reception">
      <FrontDeskContent />
    </RoutePermissionGuard>
  );
}

function FrontDeskContent() {
  const { currentProperty, loading: authLoading } = useAuth();
  const supabase = React.useMemo(() => createClient(), []);
  const activePropertyId = currentProperty?.property_id;

  // Default to arrivals so receptionist immediately sees expected guests arriving today
  const [activeTab, setActiveTab] = React.useState<"arrivals" | "in_house" | "departures" | "rooms">("arrivals");
  const [search, setSearch] = React.useState("");

  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [stats, setStats] = React.useState<FrontDeskKPIStats>({
    todayArrivals: 0,
    todayDepartures: 0,
    inHouseGuests: 0,
    occupiedRooms: 0,
    availableRooms: 0,
    attentionRooms: 0,
    totalRooms: 0,
    occupancyRate: 0,
  });

  const [arrivals, setArrivals] = React.useState<ArrivalRecord[]>([]);
  const [departures, setDepartures] = React.useState<DepartureRecord[]>([]);
  const [inHouseStays, setInHouseStays] = React.useState<InHouseRecord[]>([]);
  const [roomAttentionList, setRoomAttentionList] = React.useState<RoomAttentionRecord[]>([]);

  // Modal State
  const [checkInArrival, setCheckInArrival] = React.useState<ArrivalRecord | null>(null);
  const [checkOutStay, setCheckOutStay] = React.useState<DepartureRecord | InHouseRecord | null>(null);
  const [noShowArrival, setNoShowArrival] = React.useState<ArrivalRecord | null>(null);
  // Direct Guest-to-Room Assignment Modal State
  const [isDirectAssignOpen, setIsDirectAssignOpen] = React.useState(false);
  const [reassignStay, setReassignStay] = React.useState<InHouseRecord | null>(null);

  // Pre-Checkin Room Assignment Modal State
  const [assignRoomState, setAssignRoomState] = React.useState<{
    reservationId: string;
    reservationRoom: ReservationRoom | null;
  }>({ reservationId: "", reservationRoom: null });

  const loadData = React.useCallback(async (force = false) => {
    if (!activePropertyId) {
      setLoading(false);
      return;
    }

    const cached = frontDeskCache.get(activePropertyId);
    if (!force && cached && Date.now() - cached.time < 20000) {
      setStats(cached.stats);
      setArrivals(cached.arrivals);
      setDepartures(cached.departures);
      setInHouseStays(cached.inHouse);
      setRoomAttentionList(cached.attention);
      setLoading(false);
      return;
    }

    if (!cached) {
      setLoading(true);
    }
    setError(null);

    try {
      const [kpis, arrs, deps, inHouse, attention] = await Promise.all([
        fetchFrontDeskKPIs(supabase, activePropertyId),
        fetchTodayArrivals(supabase, activePropertyId),
        fetchTodayDepartures(supabase, activePropertyId),
        fetchInHouseStays(supabase, activePropertyId),
        fetchRoomAttentionList(supabase, activePropertyId),
      ]);

      setStats(kpis);
      setArrivals(arrs);
      setDepartures(deps);
      setInHouseStays(inHouse);
      setRoomAttentionList(attention);

      frontDeskCache.set(activePropertyId, {
        stats: kpis,
        arrivals: arrs,
        departures: deps,
        inHouse,
        attention,
        time: Date.now(),
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load front desk data";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [activePropertyId, supabase]);

  React.useEffect(() => {
    let isMounted = true;
    if (!authLoading) {
      if (activePropertyId) {
        void Promise.resolve().then(() => {
          if (!isMounted) return;
          loadData();
        });
      } else {
        setLoading(false);
      }
    }
    return () => {
      isMounted = false;
    };
  }, [authLoading, activePropertyId, loadData]);

  // Filtered collections by search query
  const q = search.trim().toLowerCase();

  const filteredArrivals = React.useMemo(() => {
    if (!q) return arrivals;
    return arrivals.filter(
      (a) =>
        a.guestName.toLowerCase().includes(q) ||
        a.confirmationNumber.toLowerCase().includes(q) ||
        (a.roomNumber && a.roomNumber.toLowerCase().includes(q)) ||
        (a.guestPhone && a.guestPhone.includes(q))
    );
  }, [arrivals, q]);

  const filteredDepartures = React.useMemo(() => {
    if (!q) return departures;
    return departures.filter(
      (d) =>
        d.guestName.toLowerCase().includes(q) ||
        d.confirmationNumber.toLowerCase().includes(q) ||
        d.roomNumber.toLowerCase().includes(q)
    );
  }, [departures, q]);

  const filteredInHouse = React.useMemo(() => {
    if (!q) return inHouseStays;
    return inHouseStays.filter(
      (s) =>
        s.guestName.toLowerCase().includes(q) ||
        s.confirmationNumber.toLowerCase().includes(q) ||
        s.roomNumber.toLowerCase().includes(q) ||
        (s.guestPhone && s.guestPhone.includes(q))
    );
  }, [inHouseStays, q]);

  if (authLoading) {
    return <LoadingState message="Loading property front desk console..." />;
  }

  return (
    <div className="space-y-5 pb-10">
      {/* ── LUXURY RECEPTION HERO ── */}
      <div
        className="relative overflow-hidden rounded-2xl px-6 pt-6 pb-5 border border-white/10"
        style={{
          background: "linear-gradient(135deg, #091224 0%, #0E1B38 50%, #12224A 100%)",
          boxShadow: "0 10px 30px -10px rgba(0,0,0,0.5)",
        }}
      >
        {/* Subtle Ambient Glows */}
        <div
          className="absolute -top-12 -right-12 h-44 w-44 rounded-full pointer-events-none blur-3xl opacity-25"
          style={{ background: "radial-gradient(circle, #D4AF37 0%, transparent 70%)" }}
        />
        <div
          className="absolute -bottom-12 -left-12 h-44 w-44 rounded-full pointer-events-none blur-3xl opacity-20"
          style={{ background: "radial-gradient(circle, #5146E5 0%, transparent 70%)" }}
        />

        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div>
            <div
              className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] px-2.5 py-0.5 rounded-full border mb-2"
              style={{
                color: "#E8CD8A",
                borderColor: "rgba(214,168,90,0.35)",
                background: "rgba(214,168,90,0.12)",
              }}
            >
              <LogIn className="h-3 w-3" />
              Front Desk Operations Command
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Reception & Guest Ledger
              <span className="block text-white/50 text-xs sm:text-sm font-normal mt-0.5">
                Active In-House Stays, Expected Check-Ins, Check-Outs & Room Allocation
              </span>
            </h1>

            <div className="flex items-center gap-4 mt-3 flex-wrap text-xs text-white/70">
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-xs" />
                <span>
                  <span className="font-bold text-white">{inHouseStays.length}</span> In-House ({stats.inHouseGuests} guests)
                </span>
              </div>
              <span className="text-white/20">·</span>
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-blue-400 shadow-xs" />
                <span>
                  <span className="font-bold text-white">{arrivals.length}</span> Arriving Today
                </span>
              </div>
              <span className="text-white/20">·</span>
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-amber-400 shadow-xs" />
                <span>
                  <span className="font-bold text-white">{departures.length}</span> Due Checkout
                </span>
              </div>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsDirectAssignOpen(true)}
              className="h-9 px-3.5 gap-1.5 shadow-md bg-amber-500 text-slate-950 hover:bg-amber-400 font-bold cursor-pointer"
            >
              <BedDouble className="h-4 w-4" />
              Assign Room & Check-In
            </Button>
            <Link href="/bookings/new?source=WALK_IN">
              <Button
                variant="outline"
                size="sm"
                className="h-9 gap-1.5 border-white/20 text-white hover:bg-white/10 cursor-pointer"
              >
                <UserPlus className="h-4 w-4" />
                Walk-In Booking
              </Button>
            </Link>
            <Link href="/bookings/calendar">
              <Button
                variant="ghost"
                size="sm"
                className="text-white/80 hover:text-white hover:bg-white/10 border border-white/10 h-9 gap-1.5 cursor-pointer"
              >
                <Calendar className="h-4 w-4" />
                Tape Chart
              </Button>
            </Link>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void loadData(true)}
              title="Refresh Live Console"
              className="text-white/80 hover:text-white hover:bg-white/10 border border-white/10 h-9 px-2.5 cursor-pointer"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* KPI Stats Strip */}
      <FrontDeskKPIGrid stats={stats} loading={loading && arrivals.length === 0} />

      {/* Search & Navigation Bar */}
      <div className="bg-card border border-border/80 rounded-xl p-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shadow-xs">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-muted/60 rounded-lg self-start overflow-x-auto max-w-full">
          {/* Tab 1: Expected Arrivals (Pending Check-In) */}
          <button
            type="button"
            onClick={() => setActiveTab("arrivals")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
              activeTab === "arrivals"
                ? "bg-card text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <LogIn className="h-3.5 w-3.5 text-blue-500" />
            <span>Expected Arrivals (Pending Check-In)</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold font-mono">
              {arrivals.length}
            </span>
          </button>

          {/* Tab 2: In-House (Arrived Guests) */}
          <button
            type="button"
            onClick={() => setActiveTab("in_house")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
              activeTab === "in_house"
                ? "bg-card text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Users className="h-3.5 w-3.5 text-emerald-500" />
            <span>In-House (Arrived Guests)</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold font-mono">
              {inHouseStays.length}
            </span>
          </button>

          {/* Tab 3: Departures */}
          <button
            type="button"
            onClick={() => setActiveTab("departures")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
              activeTab === "departures"
                ? "bg-card text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <LogOut className="h-3.5 w-3.5 text-amber-500" />
            <span>Departures</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold font-mono">
              {departures.length}
            </span>
          </button>

          {/* Tab 4: Room Status */}
          <button
            type="button"
            onClick={() => setActiveTab("rooms")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
              activeTab === "rooms"
                ? "bg-card text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <BedDouble className="h-3.5 w-3.5 text-purple-500" />
            <span>Room Operations</span>
            {roomAttentionList.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-rose-500/10 text-rose-600 dark:text-rose-400 font-bold font-mono">
                {roomAttentionList.length}
              </span>
            )}
          </button>
        </div>

        {/* Live Search */}
        <div className="w-full sm:w-72">
          <Input
            placeholder="Search guest, room, or booking code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftElement={<Search className="h-3.5 w-3.5 text-muted-foreground" />}
            className="h-8 text-xs bg-background"
          />
        </div>
      </div>

      {/* Main Content Area */}
      {loading && arrivals.length === 0 && inHouseStays.length === 0 ? (
        <LoadingState message="Loading front desk operational data..." />
      ) : error ? (
        <ErrorState
          title="Error Loading Front Desk"
          description={error}
          onRetry={loadData}
        />
      ) : (
        <>
          {/* TAB 1: IN-HOUSE (ARRIVED GUESTS) */}
          {activeTab === "in_house" && (
            <div className="space-y-3">
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-between text-xs text-foreground">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>
                    <strong>Arrived Guests Currently In-House:</strong> Manage active guest stays, assign/move rooms, view folios, or initiate check-out upon departure.
                  </span>
                </div>
                <span className="text-[11px] font-mono text-muted-foreground shrink-0 ml-2">
                  {filteredInHouse.length} {filteredInHouse.length === 1 ? "stay" : "stays"} active
                </span>
              </div>
              <InHouseTable
                stays={filteredInHouse}
                onCheckOut={(stay) => setCheckOutStay(stay)}
                onReassignRoom={(stay) => setReassignStay(stay)}
              />
            </div>
          )}

          {/* TAB 2: EXPECTED ARRIVALS (PENDING CHECK-IN) */}
          {activeTab === "arrivals" && (
            <div className="space-y-3">
              <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-center justify-between text-xs text-foreground">
                <div className="flex items-center gap-2">
                  <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                  <span>
                    <strong>Upcoming Arrivals Pending Check-In:</strong> These guests have confirmed reservations scheduled for today. Assign clean rooms and click <strong>Check In</strong> when the guest arrives at the desk.
                  </span>
                </div>
                <span className="text-[11px] font-mono text-muted-foreground shrink-0 ml-2">
                  {filteredArrivals.length} {filteredArrivals.length === 1 ? "arrival" : "arrivals"} pending
                </span>
              </div>
              <ArrivalsTable
                arrivals={filteredArrivals}
                onCheckIn={(arr) => setCheckInArrival(arr)}
                onAssignRoom={(arr) =>
                  setAssignRoomState({
                    reservationId: arr.reservationId,
                    reservationRoom: {
                      id: arr.reservationRoomId,
                      reservation_id: arr.reservationId,
                      property_id: activePropertyId || "",
                      room_type_id: arr.roomTypeId,
                      room_type_name: arr.roomTypeName,
                      room_type_code: arr.roomTypeCode,
                      room_id: arr.roomId,
                      room_number: arr.roomNumber || undefined,
                      check_in_date: arr.checkInDate,
                      check_out_date: arr.checkOutDate,
                      adults: arr.adults,
                      children: arr.children,
                      nightly_rate: 0,
                      total_amount: 0,
                      currency: "INR",
                      is_cancelled: false,
                      created_at: "",
                      updated_at: "",
                    },
                  })
                }
                onNoShow={(arr) => setNoShowArrival(arr)}
              />
            </div>
          )}

          {/* TAB 3: DEPARTURES */}
          {activeTab === "departures" && (
            <div className="space-y-3">
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center justify-between text-xs text-foreground">
                <div className="flex items-center gap-2">
                  <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span>
                    <strong>Guests Due for Check-Out Today:</strong> Review unsettled folio charges and click <strong>Check Out</strong>. Checking out automatically flags the room as <strong>DIRTY</strong> for Housekeeping turnaround.
                  </span>
                </div>
                <span className="text-[11px] font-mono text-muted-foreground shrink-0 ml-2">
                  {filteredDepartures.length} {filteredDepartures.length === 1 ? "departure" : "departures"}
                </span>
              </div>
              <DeparturesTable
                departures={filteredDepartures}
                onCheckOut={(dep) => setCheckOutStay(dep)}
              />
            </div>
          )}

          {/* TAB 4: ROOM OPERATIONAL STATUS */}
          {activeTab === "rooms" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Rooms requiring operational attention before next guest arrival.</span>
                <Link href="/rooms" className="text-[11px] text-primary hover:underline font-medium">
                  View Full Room Inventory →
                </Link>
              </div>

              {roomAttentionList.length === 0 ? (
                <div className="p-8 text-center bg-card border border-border/80 rounded-xl shadow-xs">
                  <BedDouble className="h-8 w-8 text-emerald-400 mx-auto mb-2" />
                  <h4 className="text-sm font-semibold text-foreground">All rooms in order</h4>
                  <p className="text-xs text-muted-foreground mt-1">There are no dirty or out-of-order rooms requiring attention.</p>
                </div>
              ) : (
                <div className="bg-card border border-border/80 rounded-xl overflow-hidden shadow-xs">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-border bg-muted/40 text-muted-foreground uppercase tracking-wider text-[10px]">
                        <th className="py-2.5 px-3 font-semibold">Room</th>
                        <th className="py-2.5 px-3 font-semibold">Category</th>
                        <th className="py-2.5 px-3 font-semibold">Floor</th>
                        <th className="py-2.5 px-3 font-semibold">Operational State</th>
                        <th className="py-2.5 px-3 font-semibold">Housekeeping State</th>
                        <th className="py-2.5 px-3 font-semibold text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50 font-mono">
                      {roomAttentionList.map((rm) => (
                        <tr key={rm.roomId} className="hover:bg-muted/30 transition-colors">
                          <td className="py-2.5 px-3 font-bold text-foreground">Room {rm.roomNumber}</td>
                          <td className="py-2.5 px-3 text-muted-foreground font-sans">{rm.roomTypeName}</td>
                          <td className="py-2.5 px-3 text-muted-foreground font-sans">{rm.floorName || "Main Level"}</td>
                          <td className="py-2.5 px-3 font-sans">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold ${
                                rm.status === "OUT_OF_ORDER" || rm.status === "OUT_OF_SERVICE"
                                  ? "bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-200"
                                  : "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300"
                              }`}
                            >
                              {rm.status.replace(/_/g, " ")}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-sans">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold ${
                                rm.housekeepingStatus === "DIRTY"
                                  ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                                  : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                              }`}
                            >
                              {rm.housekeepingStatus}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right font-sans">
                            <Link href={`/rooms/${rm.roomId}`}>
                              <Button variant="outline" size="sm" className="h-6 px-2 text-[10px] cursor-pointer">
                                Room Details
                              </Button>
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Check In Modal */}
      <CheckInModal
        open={!!checkInArrival}
        arrival={checkInArrival}
        propertyId={activePropertyId || ""}
        onClose={() => setCheckInArrival(null)}
        onSuccess={() => loadData(true)}
      />

      {/* Check Out Modal */}
      <CheckOutModal
        open={!!checkOutStay}
        stay={checkOutStay}
        propertyId={activePropertyId || ""}
        onClose={() => setCheckOutStay(null)}
        onSuccess={() => loadData(true)}
      />

      {/* No Show Modal */}
      <NoShowModal
        open={!!noShowArrival}
        arrival={noShowArrival}
        propertyId={activePropertyId || ""}
        onClose={() => setNoShowArrival(null)}
        onSuccess={() => loadData(true)}
      />

      {/* Reassign In-House Room Modal */}
      <ReassignStayRoomModal
        open={!!reassignStay}
        stay={reassignStay}
        propertyId={activePropertyId || ""}
        onClose={() => setReassignStay(null)}
        onSuccess={() => loadData(true)}
      />

      {/* Direct Guest-to-Room Assignment Modal */}
      <DirectRoomAssignmentModal
        isOpen={isDirectAssignOpen}
        propertyId={activePropertyId || ""}
        onClose={() => setIsDirectAssignOpen(false)}
        onSuccess={() => loadData(true)}
      />

      {/* Assign Physical Room Modal (Pre-Checkin) */}
      <AssignRoomModal
        open={!!assignRoomState.reservationRoom}
        reservationId={assignRoomState.reservationId}
        reservationRoom={assignRoomState.reservationRoom}
        propertyId={activePropertyId || ""}
        onClose={() => setAssignRoomState({ reservationId: "", reservationRoom: null })}
        onSuccess={() => loadData(true)}
      />
    </div>
  );
}
