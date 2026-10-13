import type { Metadata } from 'next';

import { getTranslations } from 'next-intl/server';

import { pageNamespaces } from '@/app/lib/i18n/client-messages';
import { parseInvoiceId } from '@/app/lib/schemas/billing';

import { MessagesScope } from '@/app/ui/messages-scope';

import { InvoiceFlow } from '../../../../_components/invoice-flow';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('billing.invoices');
  return { title: t('detailTitle'), robots: { index: false, follow: false } };
}

/*
 * `/panel/subscription/invoices/{id}`: one receipt of the specialist's,
 * read in the browser with their session (AGENTS.md §4). An id no receipt
 * could have, or one the API does not know, says so on the page — a
 * `notFound()` under the panel's frame would answer 200 anyway (§4,
 * streaming). Never indexed.
 */
export default async function InvoicePage({
  params,
}: PageProps<'/panel/subscription/invoices/[invoiceId]'>) {
  const { invoiceId } = await params;
  return (
    <MessagesScope namespaces={pageNamespaces.subscription}>
      <InvoiceFlow invoiceId={parseInvoiceId(invoiceId)} />
    </MessagesScope>
  );
}
