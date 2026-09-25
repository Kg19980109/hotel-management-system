"use client";

// ============================================================
// STAYHUB PUBLIC HOTEL BOOKING PORTAL (Phase 21)
// Consumer-facing public direct booking experience
// ============================================================

import * as React from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  searchPublicAvailabilityAction,
} from "@/lib/booking/actions";
import type { PublicPropertyInfo, PublicRoomType } from "@/lib/booking/types";
import {
  Hotel,
  Calendar,
  Users,
  Search,
  MapPin,
  Phone,
  Clock,
  ShieldCheck,
  Sparkles,
  Check,
  BedDouble,
  ChevronRight,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

export default function PublicBookingPortalPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const propertySlug = (params?.propertySlug as string) || "stayhub-grand";

  // Default dates: tomorrow to +3 days
  const today = new Date();
  const defaultCheckIn = new Date(today.setDate(today.getDate() + 1)).toISOString().split("T")[0];
  const defaultCheckOut = new Date(today.setDate(today.getDate() + 3)).toISOString().split("T")[0];

  const [checkInDate, setCheckInDate] = React.useState(searchParams.get("checkIn") || defaultCheckIn);
  const [checkOutDate, setCheckOutDate] = React.useState(searchParams.get("checkOut") || defaultCheckOut);
  const [adults, setAdults] = React.useState(Number(searchParams.get("adults")) || 2);
  const [children, setChildren] = React.useState(Number(searchParams.get("children")) || 0);
  const [roomsCount, setRoomsCount] = React.useState(Number(searchParams.get("rooms")) || 1);

  const [property, setProperty] = React.useState<PublicPropertyInfo | null>(null);
  const [roomTypes, setRoomTypes] = React.useState<PublicRoomType[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSearching, setIsSearching] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    let active = true;
    searchPublicAvailabilityAction(propertySlug, {
      checkInDate,
      checkOutDate,
      adults,
      children,
      roomsCount,
    })
      .then((res) => {
        if (!active) return;
        if (res.error) {
          setErrorMessage(res.error);
        } else {
          setProperty(res.property);
          setRoomTypes(res.roomTypes);
        }
        setIsLoading(false);
      })
      .catch(() => {
        if (!active) return;
        setErrorMessage("Failed to load hotel availability.");
        setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [propertySlug, checkInDate, checkOutDate, adults, children, roomsCount]);

  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSearching(true);
    setErrorMessage(null);
    try {
      const res = await searchPublicAvailabilityAction(propertySlug, {
        checkInDate,
        checkOutDate,
        adults,
        children,
        roomsCount,
      });
      if (res.error) {
        setErrorMessage(res.error);
      } else {
        setProperty(res.property);
        setRoomTypes(res.roomTypes);
      }
    } catch {
      setErrorMessage("Failed to load hotel availability.");
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectRoom = (room: PublicRoomType) => {
    const query = new URLSearchParams({
      roomTypeId: room.id,
      checkIn: checkInDate,
      checkOut: checkOutDate,
      adults: String(adults),
      children: String(children),
      rooms: String(roomsCount),
    });
    router.push(`/book/${propertySlug}/checkout?${query.toString()}`);
  };

  if (isLoading && !property) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-3" />
        <p className="text-sm font-medium text-slate-600">Loading hotel booking experience...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">
      {/* Consumer Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-2xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center shadow-sm">
              <Hotel className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-slate-900 tracking-tight text-base leading-none">
                {property?.name || "StayHub Luxury Hotel"}
              </span>
              <p className="text-[11px] text-slate-400 mt-0.5">Direct Online Booking</p>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-4 text-xs text-slate-600 font-medium">
            {property?.phone && (
              <a href={`tel:${property.phone}`} className="flex items-center gap-1.5 hover:text-indigo-600 transition-colors">
                <Phone className="w-3.5 h-3.5 text-indigo-600" />
                <span>{property.phone}</span>
              </a>
            )}
            <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs">
              Best Rate Guarantee
            </Badge>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white py-12 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto space-y-4 text-center sm:text-left">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-xs text-indigo-200 font-medium">
            <MapPin className="w-3.5 h-3.5 text-indigo-400" />
            <span>{property?.city}, {property?.country}</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white max-w-2xl">
            {property?.name}
          </h1>
          <p className="text-sm sm:text-base text-slate-300 max-w-3xl leading-relaxed">
            {property?.description}
          </p>

          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 pt-2 text-xs text-slate-300">
            <span className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-amber-400" />
              Check-in: {property?.checkInTime || "14:00"} | Check-out: {property?.checkOutTime || "11:00"}
            </span>
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Pay at Hotel • Free Cancellation Available
            </span>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 -mt-6 space-y-8 pb-16">
        {/* Availability Search Bar */}
        <form
          onSubmit={handleSearchSubmit}
          className="bg-white rounded-2xl p-4 sm:p-5 shadow-md border border-slate-200 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3"
        >
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-600 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-indigo-600" />
              Check-In Date
            </label>
            <Input
              type="date"
              value={checkInDate}
              onChange={(e) => setCheckInDate(e.target.value)}
              className="text-xs bg-slate-50 rounded-xl h-10"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-600 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-indigo-600" />
              Check-Out Date
            </label>
            <Input
              type="date"
              value={checkOutDate}
              onChange={(e) => setCheckOutDate(e.target.value)}
              className="text-xs bg-slate-50 rounded-xl h-10"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-600 flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-indigo-600" />
              Adults
            </label>
            <Input
              type="number"
              min={1}
              max={10}
              value={adults}
              onChange={(e) => setAdults(Math.max(1, Number(e.target.value)))}
              className="text-xs bg-slate-50 rounded-xl h-10"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-600 flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-indigo-600" />
              Children
            </label>
            <Input
              type="number"
              min={0}
              max={8}
              value={children}
              onChange={(e) => setChildren(Math.max(0, Number(e.target.value)))}
              className="text-xs bg-slate-50 rounded-xl h-10"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-600 flex items-center gap-1">
              <BedDouble className="w-3.5 h-3.5 text-indigo-600" />
              Rooms
            </label>
            <Input
              type="number"
              min={1}
              max={10}
              value={roomsCount}
              onChange={(e) => setRoomsCount(Math.max(1, Number(e.target.value)))}
              className="text-xs bg-slate-50 rounded-xl h-10"
            />
          </div>

          <div className="flex items-end">
            <Button
              type="submit"
              disabled={isSearching}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold h-10 rounded-xl gap-2 shadow-sm"
            >
              {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              Search Rooms
            </Button>
          </div>
        </form>

        {/* Error Banner */}
        {errorMessage && (
          <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Available Room Types Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold tracking-tight text-slate-900">
              Available Rooms & Suites
            </h2>
            <span className="text-xs text-slate-500 font-medium">
              Rates for {checkInDate} to {checkOutDate}
            </span>
          </div>

          {roomTypes.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 space-y-2">
              <BedDouble className="w-10 h-10 text-slate-400 mx-auto" />
              <h3 className="text-base font-bold text-slate-800">No Available Rooms for These Dates</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                All rooms are fully booked for your selected stay window. Please try adjusting your check-in or check-out dates.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {roomTypes.map((room) => (
                <div
                  key={room.id}
                  className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-md transition-all overflow-hidden flex flex-col justify-between"
                >
                  <div className="p-6 space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-bold text-slate-900 tracking-tight">
                          {room.name}
                        </h3>
                        <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                          {room.description || "Luxurious hotel accommodations equipped with premium amenities."}
                        </p>
                      </div>
                      <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200 text-[11px] shrink-0">
                        Max {room.maxOccupancy} Guests
                      </Badge>
                    </div>

                    {/* Amenities list */}
                    <div className="flex flex-wrap gap-1.5">
                      {room.amenities.slice(0, 4).map((amenity) => (
                        <span
                          key={amenity}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-50 text-slate-700 text-[11px] border border-slate-200/60"
                        >
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span>{amenity}</span>
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Pricing and Action Footer */}
                  <div className="px-6 py-4 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between">
                    <div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-black text-slate-900">
                          {room.currency} {room.baseRate.toFixed(2)}
                        </span>
                        <span className="text-xs text-slate-500">/ night</span>
                      </div>
                      <span className="text-[11px] text-emerald-600 font-medium">
                        {room.availableCount} room{room.availableCount > 1 ? "s" : ""} left
                      </span>
                    </div>

                    <Button
                      onClick={() => handleSelectRoom(room)}
                      disabled={!room.isAvailable}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs h-10 px-5 rounded-xl gap-1.5 shadow-sm"
                    >
                      <span>Book Room</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Hotel Amenities & Policies */}
        <div className="p-6 bg-white rounded-2xl border border-slate-200/80 shadow-2xs space-y-4">
          <h3 className="text-base font-bold text-slate-900">Hotel Amenities & Policies</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-slate-600">
            {(property?.amenities || []).map((item) => (
              <div key={item} className="flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                <span>{item}</span>
              </div>
            ))}
          </div>
          {property?.cancellationPolicy && (
            <div className="pt-3 border-t border-slate-100 text-xs text-slate-500">
              <span className="font-bold text-slate-700">Cancellation Policy: </span>
              {property.cancellationPolicy}
            </div>
          )}
        </div>
      </main>

      {/* Consumer Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-400">
        <p>&copy; {new Date().getFullYear()} {property?.name}. Powered by StayHub Hospitality OS.</p>
      </footer>
    </div>
  );
}
