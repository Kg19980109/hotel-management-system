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
} from "@/components/front-desk";
import { AssignRoomModal } from "@/components/bookings/assign-room-modal";
import type { ReservationRoom } from "@/lib/bookings/types";
import { PageHeader } from "@/components/shared/page-header";
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
} from "lucide-react";

export default function FrontDeskPage() {
  const { currentProperty, loading: authLoading } = useAuth();
  const supabase = React.useMemo(() => createClient(), []);
  const activePropertyId = currentProperty?.property_id;

  const [activeTab, setActiveTab] = React.useState<"arrivals" | "departures" | "in_house" | "rooms">("arrivals");
  const [search, setSearch] = React.useState("");

  const [loading, setLoading] = React.useState(true);
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
  const [reassignStay, setReassignStay] = React.useState<InHouseRecord | null>(null);

  // Pre-Checkin Room Assignment Modal State
  const [assignRoomState, setAssignRoomState] = React.useState<{
    reservationId: string;
    reservationRoom: ReservationRoom | null;
  }>({ reservationId: "", reservationRoom: null });

  const loadData = React.useCallback(async () => {
    if (!activePropertyId) {
      setLoading(false);
      return;
    }
    setLoading(true);
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
    <div className="space-y-6">
      {/* ── LUXURY RECEPTION HERO ── */}
      <div
        className="relative overflow-hidden rounded-[var(--radius-2xl)] px-7 pt-7 pb-6 border border-white/10"
        style={{
          background: "linear-gradient(155deg, #08111F 0%, #0D1830 55%, #111A3C 100%)",
          boxShadow: "0 16px 48px rgba(13,24,48,0.22), 0 4px 12px rgba(13,24,48,0.12)",
        }}
      >
        {/* Decorative ambient radial glows */}
        <div
          className="absolute -top-20 -right-20 h-64 w-64 rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(81,70,229,0.18) 0%, transparent 70%)" }}
        />
        <div
          className="absolute bottom-0 left-0 h-40 w-80 rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(214,168,90,0.08) 0%, transparent 70%)" }}
        />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div>
            {/* Tag */}
            <div
              className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] px-2.5 py-1 rounded-full border mb-3"
              style={{
                color: "var(--brand-gold)",
                borderColor: "rgba(214,168,90,0.30)",
                background: "rgba(214,168,90,0.10)",
              }}
            >
              <LogIn className="h-3 w-3" />
              Front Desk Reception
            </div>

            <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight leading-tight">
              Reception & Occupancy Ledger
              <span className="block text-white/50 text-base font-normal mt-0.5">
                Arrivals, Departures, Room Allocation & In-House Stays
              </span>
            </h1>

            <div className="flex items-center gap-4 mt-4 flex-wrap text-xs text-white/70">
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: "var(--info)" }} />
                <span><span className="font-bold text-white">{arrivals.length}</span> expected arrivals</span>
              </div>
              <span className="text-white/20">·</span>
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: "var(--warning)" }} />
                <span><span className="font-bold text-white">{departures.length}</span> departures</span>
              </div>
              <span className="text-white/20">·</span>
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: "var(--success)" }} />
                <span><span className="font-bold text-white">{inHouseStays.length}</span> parties in-house</span>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            <Link href="/bookings/calendar">
              <Button
                variant="ghost"
                size="sm"
                className="text-white/80 hover:text-white hover:bg-white/10 border border-white/10 h-9 gap-1.5"
              >
                <Calendar className="h-4 w-4" />
                Tape Chart
              </Button>
            </Link>
            <Link href="/bookings/new?source=WALK_IN">
              <Button
                variant="primary"
                size="sm"
                className="h-9 gap-1.5 shadow-md"
              >
                <UserPlus className="h-4 w-4" />
                Walk-In Guest
              </Button>
            </Link>
            <Button
              variant="ghost"
              size="sm"
              onClick={loadData}
              title="Refresh Live Console"
              className="text-white/80 hover:text-white hover:bg-white/10 border border-white/10 h-9 px-2.5"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* KPI Section */}
      <FrontDeskKPIGrid stats={stats} loading={loading && arrivals.length === 0} />

      {/* Search & Navigation Bar in stayhub-card */}
      <div className="stayhub-card p-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-[var(--secondary)] rounded-[var(--radius-lg)] self-start overflow-x-auto max-w-full">
          <button
            type="button"
            onClick={() => setActiveTab("arrivals")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-[var(--radius-md)] text-xs font-bold transition-all ${
              activeTab === "arrivals"
                ? "bg-white text-[var(--foreground)] shadow-xs"
                : "text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
            }`}
          >
            <LogIn className="h-3.5 w-3.5 text-[var(--info)]" />
            <span>Expected Arrivals</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-[var(--info-light)] text-[var(--info-foreground)] font-bold">
              {arrivals.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("departures")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-[var(--radius-md)] text-xs font-bold transition-all ${
              activeTab === "departures"
                ? "bg-white text-[var(--foreground)] shadow-xs"
                : "text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
            }`}
          >
            <LogOut className="h-3.5 w-3.5 text-[var(--warning)]" />
            <span>Departures</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-[var(--warning-light)] text-[var(--warning-foreground)] font-bold">
              {departures.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("in_house")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-[var(--radius-md)] text-xs font-bold transition-all ${
              activeTab === "in_house"
                ? "bg-white text-[var(--foreground)] shadow-xs"
                : "text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
            }`}
          >
            <Users className="h-3.5 w-3.5 text-[var(--success)]" />
            <span>In-House Guests</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-[var(--success-light)] text-[var(--success-foreground)] font-bold">
              {inHouseStays.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("rooms")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-[var(--radius-md)] text-xs font-bold transition-all ${
              activeTab === "rooms"
                ? "bg-white text-[var(--foreground)] shadow-xs"
                : "text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
            }`}
          >
            <BedDouble className="h-3.5 w-3.5 text-[var(--purple)]" />
            <span>Room Status</span>
            {roomAttentionList.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-[var(--danger-light)] text-[var(--danger-foreground)] font-bold">
                {roomAttentionList.length}
              </span>
            )}
          </button>
        </div>

        {/* Live Search */}
        <div className="w-full sm:w-72">
          <Input
            placeholder="Search guest, room, or code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftElement={<Search className="h-3.5 w-3.5 text-[var(--foreground-muted)]" />}
            className="h-8 text-xs bg-white"
          />
        </div>
      </div>

      {/* Main Content Area */}
      {loading && arrivals.length === 0 ? (
        <LoadingState message="Loading front desk operational data..." />
      ) : error ? (
        <ErrorState
          title="Error Loading Front Desk"
          description={error}
          onRetry={loadData}
        />
      ) : (
        <>
          {activeTab === "arrivals" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-[var(--foreground-muted)]">
                <span>Showing {filteredArrivals.length} reservation{filteredArrivals.length === 1 ? "" : "s"} scheduled for arrival.</span>
                <span className="text-[11px] text-slate-400">Times shown in property local schedule.</span>
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

          {activeTab === "departures" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-[var(--foreground-muted)]">
                <span>Showing {filteredDepartures.length} stay{filteredDepartures.length === 1 ? "" : "s"} due for check-out today.</span>
                <span className="text-[11px] text-slate-400">Check-out transitions room to DIRTY for Housekeeping.</span>
              </div>
              <DeparturesTable
                departures={filteredDepartures}
                onCheckOut={(dep) => setCheckOutStay(dep)}
              />
            </div>
          )}

          {activeTab === "in_house" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-[var(--foreground-muted)]">
                <span>Showing {filteredInHouse.length} guest party currently in-house.</span>
                <span className="text-[11px] text-slate-400">Total in-house persons: {stats.inHouseGuests}</span>
              </div>
              <InHouseTable
                stays={filteredInHouse}
                onCheckOut={(stay) => setCheckOutStay(stay)}
                onReassignRoom={(stay) => setReassignStay(stay)}
              />
            </div>
          )}

          {activeTab === "rooms" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-[var(--foreground-muted)]">
                <span>Rooms requiring operational attention before next guest arrival.</span>
                <Link href="/rooms" className="text-[11px] text-[var(--primary)] hover:underline font-medium">
                  View Full Room Inventory →
                </Link>
              </div>

              {roomAttentionList.length === 0 ? (
                <div className="p-8 text-center bg-white border border-[var(--border)] rounded-[var(--radius-lg)]">
                  <BedDouble className="h-8 w-8 text-emerald-400 mx-auto mb-2" />
                  <h4 className="text-sm font-semibold text-slate-800">All rooms in order</h4>
                  <p className="text-xs text-slate-500 mt-1">There are no dirty or out-of-order rooms requiring attention.</p>
                </div>
              ) : (
                <div className="bg-white border border-[var(--border)] rounded-[var(--radius-lg)] overflow-hidden shadow-xs">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-[var(--border)] bg-[var(--surface-elevated)] text-[var(--foreground-muted)] uppercase tracking-wider text-[10px]">
                        <th className="py-2 px-3">Room</th>
                        <th className="py-2 px-3">Category</th>
                        <th className="py-2 px-3">Floor</th>
                        <th className="py-2 px-3">Operational State</th>
                        <th className="py-2 px-3">Housekeeping State</th>
                        <th className="py-2 px-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)]">
                      {roomAttentionList.map((rm) => (
                        <tr key={rm.roomId} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3 font-mono font-bold text-slate-900">Room {rm.roomNumber}</td>
                          <td className="py-2.5 px-3 text-slate-600">{rm.roomTypeName}</td>
                          <td className="py-2.5 px-3 text-slate-600">{rm.floorName || "Main Level"}</td>
                          <td className="py-2.5 px-3">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold ${
                                rm.status === "OUT_OF_ORDER" || rm.status === "OUT_OF_SERVICE"
                                  ? "bg-slate-200 text-slate-800"
                                  : "bg-amber-100 text-amber-900"
                              }`}
                            >
                              {rm.status.replace(/_/g, " ")}
                            </span>
                          </td>
                          <td className="py-2.5 px-3">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold ${
                                rm.housekeepingStatus === "DIRTY"
                                  ? "bg-rose-100 text-rose-800"
                                  : "bg-amber-100 text-amber-800"
                              }`}
                            >
                              {rm.housekeepingStatus}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <Link href={`/rooms/${rm.roomId}`}>
                              <Button variant="outline" size="sm" className="h-6 px-2 text-[10px]">
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
        onSuccess={loadData}
      />

      {/* Check Out Modal */}
      <CheckOutModal
        open={!!checkOutStay}
        stay={checkOutStay}
        propertyId={activePropertyId || ""}
        onClose={() => setCheckOutStay(null)}
        onSuccess={loadData}
      />

      {/* No Show Modal */}
      <NoShowModal
        open={!!noShowArrival}
        arrival={noShowArrival}
        propertyId={activePropertyId || ""}
        onClose={() => setNoShowArrival(null)}
        onSuccess={loadData}
      />

      {/* Reassign In-House Room Modal */}
      <ReassignStayRoomModal
        open={!!reassignStay}
        stay={reassignStay}
        propertyId={activePropertyId || ""}
        onClose={() => setReassignStay(null)}
        onSuccess={loadData}
      />

      {/* Assign Physical Room Modal (Pre-Checkin) */}
      <AssignRoomModal
        open={!!assignRoomState.reservationRoom}
        reservationId={assignRoomState.reservationId}
        reservationRoom={assignRoomState.reservationRoom}
        propertyId={activePropertyId || ""}
        onClose={() => setAssignRoomState({ reservationId: "", reservationRoom: null })}
        onSuccess={loadData}
      />
    </div>
  );
}
