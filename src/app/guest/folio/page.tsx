import * as React from 'react';
import { getActiveGuestSession, getActiveGuestSessionToken } from '@/lib/guest-portal/actions';
import { getGuestPortalFolio } from '@/lib/billing/queries';
import { GuestFolioView } from '@/components/guest/guest-folio-view';

export const metadata = {
  title: 'StayHub — Guest Folio & Bill',
  description: 'View your live room bill, restaurant & room service charges, payments, and balance.',
};

export default async function GuestFolioPage() {
  const [session, rawToken] = await Promise.all([
    getActiveGuestSession(),
    getActiveGuestSessionToken(),
  ]);

  const folioContext = rawToken ? await getGuestPortalFolio(rawToken) : null;

  return <GuestFolioView folioContext={folioContext} session={session} />;
}
