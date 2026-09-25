import * as React from "react";
import { resolveGuestQrAccess } from "@/lib/guest-portal/queries";
import { StayVerificationCard } from "@/components/guest/stay-verification-card";

interface PageProps {
  params: Promise<{
    token: string;
  }>;
}

export default async function GuestQrResolverPage({ params }: PageProps) {
  const { token } = await params;
  const resolution = await resolveGuestQrAccess(token);

  return (
    <div className="py-6 flex flex-col justify-center min-h-[70vh]">
      <StayVerificationCard rawToken={token} resolution={resolution} />
    </div>
  );
}
