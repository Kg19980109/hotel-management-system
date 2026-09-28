import * as React from "react";
import { getActiveGuestSession } from "@/lib/guest-portal/actions";
import { getGuestRestaurants } from "@/lib/guest-ordering/queries";
import { DiningDirectoryView } from "@/components/guest/dining-directory-view";

export const metadata = {
  title: "StayHub — In-Room Dining & Restaurants",
  description: "Browse luxury hotel restaurants and order in-room dining directly to your suite.",
};

export default async function GuestDiningPage() {
  const session = await getActiveGuestSession();
  const isVerifiedStay = session?.session_type === "VERIFIED_STAY";

  const restaurants = await getGuestRestaurants(session?.property_id);

  return (
    <DiningDirectoryView
      restaurants={restaurants}
      isVerifiedStay={isVerifiedStay}
      roomNumber={session?.room_number}
      propertyName={session?.property_name}
    />
  );
}
