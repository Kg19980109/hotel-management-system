import * as React from "react";
import { getActiveGuestSession } from "@/lib/guest-portal/actions";
import { CartView } from "@/components/guest/cart-view";

export const metadata = {
  title: "StayHub — Your Food Cart",
  description: "Review your in-room dining cart and place your order.",
};

export default async function GuestCartPage() {
  const session = await getActiveGuestSession();

  return <CartView session={session} />;
}
