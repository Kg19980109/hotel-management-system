import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getFolioById, getFolioCharges, getFolioPayments, getFolioRefunds, getFolioEvents } from '@/lib/billing/queries';
import { FolioDetailView } from '@/components/billing/folio-detail-view';

export const metadata: Metadata = {
  title: 'Folio Details | StayHub Billing',
  description: 'Manage guest folio charges, adjustments, payments, refunds and invoice generation.',
};

interface PageProps {
  params: Promise<{
    folioId: string;
  }>;
}

export default async function FolioDetailPage({ params }: PageProps) {
  const { folioId } = await params;

  const [folio, charges, payments, refunds, events] = await Promise.all([
    getFolioById(folioId),
    getFolioCharges(folioId),
    getFolioPayments(folioId),
    getFolioRefunds(folioId),
    getFolioEvents(folioId),
  ]);

  if (!folio) {
    notFound();
  }

  return (
    <FolioDetailView
      folio={folio}
      charges={charges}
      payments={payments}
      refunds={refunds}
      events={events}
    />
  );
}
