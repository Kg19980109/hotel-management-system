"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/client";
import { GuestCRM } from "@/lib/guests/types";
import { fetchGuestById } from "@/lib/guests/queries";
import { PageHeader } from "@/components/shared/page-header";
import { GuestForm } from "@/components/guests";
import { Button } from "@/components/ui/button";
import { LoadingState, ErrorState } from "@/components/ui/states";
import { ArrowLeft } from "lucide-react";

export default function EditGuestPage() {
  const params = useParams();
  const router = useRouter();
  const guestId = params?.guestId as string;

  const { currentProperty, loading: authLoading } = useAuth();
  const supabase = React.useMemo(() => createClient(), []);
  const activePropertyId = currentProperty?.property_id;

  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [guest, setGuest] = React.useState<GuestCRM | null>(null);

  const loadGuest = React.useCallback(async () => {
    if (!activePropertyId || !guestId) return;

    setLoading(true);
    setError(null);
    try {
      const data = await fetchGuestById(supabase, activePropertyId, guestId);
      if (!data) {
        setError("Guest profile not found.");
        return;
      }
      setGuest(data);
    } catch (err: unknown) {
      console.error("EditGuestPage load error:", err);
      setError(err instanceof Error ? err.message : "Failed to load guest.");
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

  if (authLoading || (loading && !guest)) {
    return <LoadingState message="Loading guest profile for editing..." />;
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
          title="Guest Not Found"
          description={error || "Unable to locate the specified guest profile."}
          onRetry={loadGuest}
        />
      </div>
    );
  }

  const fullName = `${guest.first_name} ${guest.last_name}`;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <PageHeader
        title={`Edit Profile: ${fullName}`}
        description="Update personal details, identity documentation, contact information, and preferences."
        breadcrumbs={[
          { label: "Operations" },
          { label: "Guests", href: "/guests" },
          { label: fullName, href: `/guests/${guest.id}` },
          { label: "Edit" },
        ]}
        actions={
          <Link href={`/guests/${guest.id}`}>
            <Button variant="outline" size="sm" className="gap-1.5 text-xs">
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Profile</span>
            </Button>
          </Link>
        }
      />

      <GuestForm
        propertyId={activePropertyId!}
        initialData={guest}
        mode="edit"
        onSuccess={() => router.push(`/guests/${guest.id}`)}
        onCancel={() => router.push(`/guests/${guest.id}`)}
      />
    </div>
  );
}
