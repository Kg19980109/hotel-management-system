import * as React from "react";
import { getActiveGuestSession } from "@/lib/guest-portal/actions";
import { getGuestPayableServices } from "@/lib/guest-services/queries";
import { ServicesView } from "@/components/guest/services-view";

export const metadata = {
  title: "StayHub — Guest Services",
  description: "Request housekeeping, maintenance, front desk, and concierge services.",
};

interface PageProps {
  searchParams?: Promise<{ category?: string; cat?: string }>;
}

export default async function GuestServicesPage(props: PageProps) {
  const session = await getActiveGuestSession();
  const payableServices = session?.property_id
    ? await getGuestPayableServices(session.property_id)
    : [];

  const searchParams = props.searchParams ? await props.searchParams : {};
  const initialCategory = searchParams.category || searchParams.cat;

  return (
    <ServicesView
      session={session}
      payableServices={payableServices}
      initialCategory={initialCategory}
    />
  );
}
