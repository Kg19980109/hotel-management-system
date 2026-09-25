import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getInvoiceById } from '@/lib/billing/queries';
import { InvoiceDetailView } from '@/components/billing/invoice-detail-view';

export const metadata: Metadata = {
  title: 'Invoice Details | StayHub Billing',
  description: 'View, print, and manage tax invoice line items and payment settlements.',
};

interface PageProps {
  params: Promise<{
    invoiceId: string;
  }>;
}

export default async function InvoiceDetailPage({ params }: PageProps) {
  const { invoiceId } = await params;
  const invoice = await getInvoiceById(invoiceId);

  if (!invoice) {
    notFound();
  }

  return <InvoiceDetailView invoice={invoice} />;
}
