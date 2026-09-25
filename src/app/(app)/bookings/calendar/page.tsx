"use client";

import * as React from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/client";
import { fetchCalendarBookings } from "@/lib/bookings/queries";
import { fetchRooms } from "@/lib/rooms/queries";
import { BookingCalendarView } from "@/components/bookings/booking-calendar-view";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { List, Plus, RotateCcw } from "lucide-react";

export default function BookingsCalendarPage() {
  const { currentProperty } = useAuth();
  const supabase = React.useMemo(() => createClient(), []);
  const activePropertyId = currentProperty?.property_id;

  const [startDate, setStartDate] = React.useState<Date>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1); // start 1 day in the past for immediate context
    return d;
  });

  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [rooms, setRooms] = React.useState<
    { id: string; room_number: string; room_name: string | null; room_type?: { name: string; code: string } }[]
  >([]);
  const [bookings, setBookings] = React.useState<
    {
      id: string;
      confirmationNumber: string;
      status: string;
      guestName: string;
      roomId: string;
      roomNumber: string;
      checkInDate: string;
      checkOutDate: string;
    }[]
  >([]);

  const loadCalendarData = React.useCallback(async () => {
    if (!activePropertyId) return;
    setLoading(true);
    setError(null);

    const startStr = startDate.toISOString().split("T")[0];
    const end = new Date(startDate.getTime() + 15 * 86400000);
    const endStr = end.toISOString().split("T")[0];

    try {
      const [roomsData, bookingsData] = await Promise.all([
        fetchRooms(supabase, activePropertyId, { pageSize: 100, isActive: true }),
        fetchCalendarBookings(supabase, activePropertyId, startStr, endStr),
      ]);

      setRooms(
        roomsData.rooms.map((r) => ({
          id: r.id,
          room_number: r.room_number,
          room_name: r.room_name,
          room_type: r.room_type ? { name: r.room_type.name, code: r.room_type.code } : undefined,
        }))
      );
      setBookings(bookingsData);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load calendar data";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [activePropertyId, startDate, supabase]);

  React.useEffect(() => {
    let isMounted = true;
    if (activePropertyId) {
      void Promise.resolve().then(() => {
        if (!isMounted) return;
        loadCalendarData();
      });
    }
    return () => {
      isMounted = false;
    };
  }, [activePropertyId, loadCalendarData]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reservation Calendar"
        description="Visual tape chart displaying room occupancy, guest stays, and availability."
        breadcrumbs={[
          { label: "Bookings", href: "/bookings" },
          { label: "Tape Chart" },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Link href="/bookings">
              <Button variant="outline" size="sm" className="gap-1.5">
                <List className="h-4 w-4" />
                List View
              </Button>
            </Link>
            <Link href="/bookings/new">
              <Button variant="primary" size="sm" className="gap-1.5">
                <Plus className="h-4 w-4" />
                New Booking
              </Button>
            </Link>
          </div>
        }
      />

      {error ? (
        <div className="p-5 rounded-[var(--radius-lg)] border border-rose-200 bg-rose-50 text-rose-800 text-xs flex items-center justify-between">
          <div>{error}</div>
          <Button variant="outline" size="sm" onClick={loadCalendarData}>
            <RotateCcw className="h-3.5 w-3.5 mr-1" />
            Retry
          </Button>
        </div>
      ) : (
        <BookingCalendarView
          rooms={rooms}
          bookings={bookings}
          startDate={startDate}
          daysToShow={14}
          onDateChange={setStartDate}
          loading={loading}
        />
      )}
    </div>
  );
}
