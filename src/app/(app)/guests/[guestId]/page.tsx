"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/client";
import { GuestCRM } from "@/lib/guests/types";
import { fetchGuestById } from "@/lib/guests/queries";
import { deactivateGuestAction } from "@/lib/guests/actions";
import {
  GuestStatusBadge,
  GuestPreferencesCard,
  GuestNotesCard,
} from "@/components/guests";
import { PageHeader } from "@/components/shared/page-header";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { LoadingState, ErrorState } from "@/components/ui/states";
import {
  ArrowLeft,
  Edit2,
  Calendar,
  BedDouble,
  User,
  Phone,
  Mail,
  MapPin,
  ShieldCheck,
  Building,
  Sparkles,
  FileText,
  ExternalLink,
  Ban,
  PlusCircle,
  Eye,
} from "lucide-react";

export default function GuestDetailPage() {
  const params = useParams();
  const router = useRouter();
  const guestId = params?.guestId as string;

  const { currentProperty, loading: authLoading } = useAuth();
  const supabase = React.useMemo(() => createClient(), []);
  const activePropertyId = currentProperty?.property_id;

  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [guest, setGuest] = React.useState<GuestCRM | null>(null);
  const [activeTab, setActiveTab] = React.useState<
    "overview" | "reservations" | "stays" | "preferences" | "notes"
  >("overview");
  const [deactivating, setDeactivating] = React.useState(false);

  const loadGuest = React.useCallback(async () => {
    if (!activePropertyId || !guestId) return;

    setLoading(true);
    setError(null);
    try {
      const data = await fetchGuestById(supabase, activePropertyId, guestId);
      if (!data) {
        setError("Guest profile not found or does not belong to the active property.");
        return;
      }
      setGuest(data);
    } catch (err: unknown) {
      console.error("fetchGuestById error:", err);
      setError(err instanceof Error ? err.message : "Failed to load guest profile.");
    } finally {
      setLoading(false);
    }
  }, [activePropertyId, guestId, supabase]);

  React.useEffect(() => {
    let isMounted = true;
    void Promise.resolve().then(() => {
      if (isMounted) loadGuest();
    });
    return () => {
      isMounted = false;
    };
  }, [loadGuest]);

  const handleDeactivate = async () => {
    if (!activePropertyId || !guest) return;
    const confirmed = window.confirm(
      `Are you sure you want to deactivate ${guest.first_name} ${guest.last_name}? Guest history will remain intact.`
    );
    if (!confirmed) return;

    setDeactivating(true);
    try {
      const res = await deactivateGuestAction(activePropertyId, guest.id);
      if (res.success) {
        await loadGuest();
      } else {
        alert(res.error || "Failed to deactivate guest.");
      }
    } catch (err) {
      console.error("Deactivate error:", err);
    } finally {
      setDeactivating(false);
    }
  };

  if (authLoading || (loading && !guest)) {
    return <LoadingState message="Loading guest profile & history..." />;
  }

  if (error || !guest) {
    return (
      <div className="space-y-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push("/guests")}
          className="gap-1.5 text-xs"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Guests</span>
        </Button>
        <ErrorState
          title="Guest Profile Not Found"
          description={error || "The requested guest does not exist or has been removed."}
          onRetry={loadGuest}
        />
      </div>
    );
  }

  const fullName = `${guest.title ? `${guest.title} ` : ""}${guest.first_name} ${guest.middle_name ? `${guest.middle_name} ` : ""}${guest.last_name}`;

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Page Actions */}
      <PageHeader
        title={fullName}
        description={`Guest CRM Profile • Ref ID: ${guest.id.slice(0, 8)}`}
        breadcrumbs={[
          { label: "Operations" },
          { label: "Guests", href: "/guests" },
          { label: fullName },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Link href={`/guests/${guest.id}/edit`}>
              <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                <Edit2 className="h-3.5 w-3.5" />
                <span>Edit Profile</span>
              </Button>
            </Link>

            <Link href={`/bookings/new`}>
              <Button size="sm" className="gap-1.5 bg-[var(--primary)] text-white text-xs">
                <PlusCircle className="h-3.5 w-3.5" />
                <span>New Booking</span>
              </Button>
            </Link>

            {guest.status !== "INACTIVE" && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDeactivate}
                disabled={deactivating}
                className="gap-1.5 text-xs text-rose-600 hover:text-rose-800 hover:bg-rose-50"
              >
                <Ban className="h-3.5 w-3.5" />
                <span>Deactivate</span>
              </Button>
            )}
          </div>
        }
      />

      {/* Main Profile Header Card */}
      <div className="p-6 bg-white rounded-[var(--radius-xl)] border border-[var(--border)] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-start gap-4">
          <Avatar name={`${guest.first_name} ${guest.last_name}`} size="lg" className="h-16 w-16 text-lg" />
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-bold text-[var(--foreground)]">{fullName}</h2>
              <GuestStatusBadge status={guest.status} isReturning={guest.stats?.isReturning} />
            </div>

            <div className="text-xs text-[var(--foreground-muted)] flex flex-wrap items-center gap-x-4 gap-y-1">
              {guest.email && (
                <span className="flex items-center gap-1 text-slate-700">
                  <Mail className="h-3.5 w-3.5 text-slate-400" />
                  {guest.email}
                </span>
              )}
              {guest.phone && (
                <span className="flex items-center gap-1 text-slate-700">
                  <Phone className="h-3.5 w-3.5 text-slate-400" />
                  {guest.phone}
                </span>
              )}
              {guest.nationality && (
                <span className="text-slate-500">• Nationality: {guest.nationality}</span>
              )}
              {guest.company_name && (
                <span className="flex items-center gap-1 text-slate-700">
                  <Building className="h-3.5 w-3.5 text-slate-400" />
                  {guest.company_name} {guest.job_title ? `(${guest.job_title})` : ""}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Quick Summary KPIs */}
        <div className="flex items-center gap-4 sm:gap-6 border-t md:border-t-0 md:border-l border-slate-100 pt-3 md:pt-0 md:pl-6 text-xs">
          <div>
            <div className="text-[11px] text-slate-400 uppercase font-semibold">Total Stays</div>
            <div className="text-lg font-bold text-slate-800">{guest.stats?.totalStays || 0}</div>
          </div>
          <div>
            <div className="text-[11px] text-slate-400 uppercase font-semibold">Total Nights</div>
            <div className="text-lg font-bold text-slate-800">{guest.stats?.totalNights || 0}N</div>
          </div>
          <div>
            <div className="text-[11px] text-slate-400 uppercase font-semibold">Completed</div>
            <div className="text-lg font-bold text-emerald-700">{guest.stats?.completedStays || 0}</div>
          </div>
        </div>
      </div>

      {/* Operational Banners: Current Stay & Upcoming Reservation */}
      <div className="space-y-3">
        {guest.current_stay && (
          <div className="p-4 bg-emerald-50 rounded-[var(--radius-xl)] border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-100 text-emerald-800 rounded-full">
                <BedDouble className="h-5 w-5" />
              </div>
              <div>
                <div className="font-bold text-emerald-900 text-sm flex items-center gap-2">
                  <span>Currently In-House: Room {guest.current_stay.room_number}</span>
                  <span className="text-[10px] uppercase font-bold text-emerald-800 bg-emerald-200/60 px-1.5 py-0.5 rounded">
                    Checked In
                  </span>
                </div>
                <div className="text-xs text-emerald-700 mt-0.5">
                  Checked in {new Date(guest.current_stay.actual_check_in_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • Expected Departure: {guest.current_stay.expected_check_out_date}
                </div>
              </div>
            </div>

            <Link href={`/front-desk/stays/${guest.current_stay.id}`}>
              <Button size="sm" className="gap-1.5 text-xs bg-emerald-700 hover:bg-emerald-800 text-white shrink-0">
                <span>View Stay Console</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        )}

        {guest.upcoming_reservation && (
          <div className="p-4 bg-indigo-50/70 rounded-[var(--radius-xl)] border border-indigo-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-indigo-100 text-indigo-800 rounded-full">
                <Calendar className="h-5 w-5" />
              </div>
              <div>
                <div className="font-bold text-indigo-950 text-sm flex items-center gap-2">
                  <span>Upcoming Reservation: {guest.upcoming_reservation.confirmation_number}</span>
                  <span className="text-[10px] uppercase font-bold text-indigo-800 bg-indigo-200/60 px-1.5 py-0.5 rounded">
                    Confirmed
                  </span>
                </div>
                <div className="text-xs text-indigo-700 mt-0.5">
                  Arrival: {guest.upcoming_reservation.check_in_date} → Departure: {guest.upcoming_reservation.check_out_date}
                  {guest.upcoming_reservation.room_type_name ? ` (${guest.upcoming_reservation.room_type_name})` : ""}
                </div>
              </div>
            </div>

            <Link href={`/bookings/${guest.upcoming_reservation.id}`}>
              <Button size="sm" variant="outline" className="gap-1.5 text-xs text-indigo-700 border-indigo-300 hover:bg-indigo-100 shrink-0">
                <span>View Reservation</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-1 border-b border-[var(--border)] overflow-x-auto pb-px">
        {[
          { id: "overview", label: "Overview", icon: User },
          { id: "reservations", label: "Reservations", icon: Calendar, badge: guest.reservations?.length },
          { id: "stays", label: "Stay History", icon: BedDouble, badge: guest.stays?.length },
          { id: "preferences", label: "Preferences", icon: Sparkles, badge: guest.preferences?.length },
          { id: "notes", label: "Staff Notes", icon: FileText, badge: guest.guest_notes?.length },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all whitespace-nowrap ${
                isActive
                  ? "border-[var(--primary)] text-[var(--primary)]"
                  : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{tab.label}</span>
              {tab.badge !== undefined && tab.badge > 0 && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    isActive ? "bg-indigo-100 text-indigo-800" : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Panels */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Personal & Identity Card */}
          <div className="p-5 bg-white rounded-[var(--radius-xl)] border border-[var(--border)] shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-[var(--border)]">
              <User className="h-4 w-4 text-[var(--primary)]" />
              <h3 className="font-semibold text-sm text-[var(--foreground)]">Personal & Identity Details</h3>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-slate-400 block mb-0.5">Full Name</span>
                <span className="font-semibold text-slate-800 text-sm">{fullName}</span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">Preferred Name</span>
                <span className="text-slate-700">{guest.preferred_name || "—"}</span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">Date of Birth</span>
                <span className="text-slate-700">
                  {guest.date_of_birth ? new Date(guest.date_of_birth).toLocaleDateString() : "Not provided"}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">Gender</span>
                <span className="text-slate-700">{guest.gender || "Not specified"}</span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">Nationality</span>
                <span className="text-slate-700">{guest.nationality || "Not specified"}</span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">Preferred Language</span>
                <span className="text-slate-700 uppercase font-semibold">{guest.preferred_language || "en"}</span>
              </div>
            </div>

            {/* Official Identity Document */}
            <div className="pt-3 border-t border-slate-100">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 mb-2">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                <span>Identity Documentation</span>
              </div>
              {guest.id_document_type ? (
                <div className="p-3 bg-slate-50 rounded-[var(--radius-lg)] border border-slate-200 text-xs grid grid-cols-3 gap-2">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Type</span>
                    <span className="font-semibold text-slate-800">{guest.id_document_type}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Document No.</span>
                    <span className="font-semibold text-slate-800">{guest.id_document_number || "Provided"}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Country</span>
                    <span className="text-slate-700">{guest.id_document_country || "—"}</span>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-400">No identity document recorded.</p>
              )}
            </div>
          </div>

          {/* Contact & Address Card */}
          <div className="p-5 bg-white rounded-[var(--radius-xl)] border border-[var(--border)] shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-[var(--border)]">
              <MapPin className="h-4 w-4 text-[var(--primary)]" />
              <h3 className="font-semibold text-sm text-[var(--foreground)]">Contact & Address</h3>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-slate-400 block mb-0.5">Primary Email</span>
                <span className="font-medium text-slate-800">{guest.email || "None"}</span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">Phone Number</span>
                <span className="font-medium text-slate-800">{guest.phone || "None"}</span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">Alternate Phone</span>
                <span className="text-slate-700">{guest.alternate_phone || "None"}</span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">Marketing Consent</span>
                <span className={guest.marketing_consent ? "text-emerald-700 font-semibold" : "text-slate-500"}>
                  {guest.marketing_consent ? "Subscribed (Opted-in)" : "Not Subscribed"}
                </span>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 text-xs space-y-1">
              <span className="text-slate-400 block text-[10px]">Address</span>
              <p className="text-slate-800 font-medium leading-relaxed">
                {guest.address_line_1 ? (
                  <>
                    {guest.address_line_1}
                    {guest.address_line_2 && <>, {guest.address_line_2}</>}
                    <br />
                    {[guest.city, guest.state, guest.postal_code].filter(Boolean).join(", ")}
                    {guest.country && <>, {guest.country}</>}
                  </>
                ) : (
                  <span className="text-slate-400 font-normal">No address recorded</span>
                )}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Reservations Tab */}
      {activeTab === "reservations" && (
        <div className="stayhub-card overflow-hidden border border-[var(--border)] rounded-[var(--radius-xl)] bg-white shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-[var(--foreground)] border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-[var(--border)] text-[var(--foreground-muted)] uppercase tracking-wider text-[11px] font-semibold">
                  <th className="py-3 px-4">Confirmation</th>
                  <th className="py-3 px-4">Dates</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Channel</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {(guest.reservations || []).length > 0 ? (
                  (guest.reservations || []).map((res) => (
                    <tr key={res.id} className="hover:bg-slate-50/50">
                      <td className="py-3 px-4 font-semibold text-slate-800">
                        {res.confirmation_number}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        {res.check_in_date} → {res.check_out_date}
                      </td>
                      <td className="py-3 px-4">
                        {res.reservation_rooms?.[0]?.room_type?.name || "Standard"}
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-slate-600 font-medium">{res.booking_source}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                          {res.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Link href={`/bookings/${res.id}`}>
                          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1">
                            <Eye className="h-3 w-3" />
                            <span>Details</span>
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      No reservations recorded for this guest.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Stays Tab */}
      {activeTab === "stays" && (
        <div className="stayhub-card overflow-hidden border border-[var(--border)] rounded-[var(--radius-xl)] bg-white shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-[var(--foreground)] border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-[var(--border)] text-[var(--foreground-muted)] uppercase tracking-wider text-[11px] font-semibold">
                  <th className="py-3 px-4">Room</th>
                  <th className="py-3 px-4">Actual Check-in</th>
                  <th className="py-3 px-4">Actual Check-out</th>
                  <th className="py-3 px-4">Expected Departure</th>
                  <th className="py-3 px-4">Stay Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {(guest.stays || []).length > 0 ? (
                  (guest.stays || []).map((st) => (
                    <tr key={st.id} className="hover:bg-slate-50/50">
                      <td className="py-3 px-4 font-bold text-slate-800">
                        Room {st.room?.room_number || "—"}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap text-slate-600">
                        {st.actual_check_in_at
                          ? new Date(st.actual_check_in_at).toLocaleString()
                          : "Not checked in"}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap text-slate-600">
                        {st.actual_check_out_at
                          ? new Date(st.actual_check_out_at).toLocaleString()
                          : "In-House"}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap text-slate-600">
                        {st.expected_check_out_date}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                            st.status === "CHECKED_IN"
                              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                              : "bg-slate-100 text-slate-700 border-slate-200"
                          }`}
                        >
                          {st.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Link href={`/front-desk/stays/${st.id}`}>
                          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1">
                            <Eye className="h-3 w-3" />
                            <span>Stay Console</span>
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      No physical stay history recorded for this guest.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Preferences Tab */}
      {activeTab === "preferences" && (
        <GuestPreferencesCard
          propertyId={activePropertyId || ""}
          guestId={guest.id}
          preferences={guest.preferences || []}
          onPreferenceChanged={loadGuest}
        />
      )}

      {/* Notes Tab */}
      {activeTab === "notes" && (
        <GuestNotesCard
          propertyId={activePropertyId || ""}
          guestId={guest.id}
          notes={guest.guest_notes || []}
          onNotesChanged={loadGuest}
        />
      )}
    </div>
  );
}
