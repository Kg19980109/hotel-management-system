import * as React from "react";
import { notFound } from "next/navigation";
import { getActiveGuestSession } from "@/lib/guest-portal/actions";
import { getGuestRestaurantMenu } from "@/lib/guest-ordering/queries";
import { DiningMenuView } from "@/components/guest/dining-menu-view";

interface RestaurantMenuPageProps {
  params: Promise<{
    restaurantId: string;
  }>;
}

export const metadata = {
  title: "StayHub — Restaurant Menu",
  description: "Browse menu items and order room service directly.",
};

export default async function GuestRestaurantMenuPage({
  params,
}: RestaurantMenuPageProps) {
  const { restaurantId } = await params;
  const session = await getActiveGuestSession();
  const isVerifiedStay = session?.session_type === "VERIFIED_STAY";

  const { restaurant, categories } = await getGuestRestaurantMenu(restaurantId);

  if (!restaurant) {
    notFound();
  }

  return (
    <DiningMenuView
      restaurant={restaurant}
      categories={categories}
      isVerifiedStay={isVerifiedStay}
      roomNumber={session?.room_number}
    />
  );
}
