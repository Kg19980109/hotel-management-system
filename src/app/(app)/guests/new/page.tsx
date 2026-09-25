"use client";

import * as React from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth/context";
import { PageHeader } from "@/components/shared/page-header";
import { GuestForm } from "@/components/guests";
import { Button } from "@/components/ui/button";
import { LoadingState } from "@/components/ui/states";
import { ArrowLeft } from "lucide-react";

export default function NewGuestPage() {
  const { currentProperty, loading: authLoading } = useAuth();
  const activePropertyId = currentProperty?.property_id;

  if (authLoading) {
    return <LoadingState message="Authenticating session..." />;
  }

  if (!activePropertyId) {
    return (
      <div className="p-8 text-center text-xs text-slate-500">
        Please select an active hotel property first.
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <PageHeader
        title="Register New Guest"
        description="Create a comprehensive guest profile with identity, address, corporate relations, and stay preferences."
        breadcrumbs={[
          { label: "Operations" },
          { label: "Guests", href: "/guests" },
          { label: "New Profile" },
        ]}
        actions={
          <Link href="/guests">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs">
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Guests</span>
            </Button>
          </Link>
        }
      />

      <GuestForm propertyId={activePropertyId} mode="create" />
    </div>
  );
}
