import * as React from "react";
import { getActiveGuestSession } from "@/lib/guest-portal/actions";
import { GuestShell } from "@/components/guest/guest-shell";
import { CartProvider } from "@/components/guest/cart-context";

export const metadata = {
  title: "StayHub — Guest Portal",
  description: "Mobile-first hospitality guest experience and digital concierge.",
};

export default async function GuestRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getActiveGuestSession();

  return (
    <CartProvider>
      <GuestShell session={session}>{children}</GuestShell>
    </CartProvider>
  );
}
