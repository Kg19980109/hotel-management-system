import * as React from "react";
import { getActiveGuestSession } from "@/lib/guest-portal/actions";
import { getGuestPayableServices } from "@/lib/guest-services/queries";
import { ServicesView } from "@/components/guest/services-view";

export const metadata = {
  title: "StayHub — Guest Services",
  description: "Request housekeeping, maintenance, front desk, and concierge services.",
};

export default async function GuestServicesPage() {
  const session = await getActiveGuestSession();
  const payableServices = session?.property_id
    ? await getGuestPayableServices(session.property_id)
    : [];

  return <ServicesView session={session} payableServices={payableServices} />;
}
