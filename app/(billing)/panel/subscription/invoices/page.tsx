import { Suspense } from 'react';

import type { Metadata } from 'next';

import { getTranslations } from 'next-intl/server';

import { pageNamespaces } from '@/app/lib/i18n/client-messages';

import { MessagesScope } from '@/app/ui/messages-scope';

import {
  InvoicesFlow,
  InvoicesSkeleton,
} from '../../../_components/invoices-flow';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('billing.invoices');
  return { title: t('title'), robots: { index: false, follow: false } };
}

/*
 * `/panel/subscription/invoices[?status=]`: the specialist's receipts, the
 * newest first, with a status in the address. Read in the browser with
 * the specialist's session (AGENTS.md §4); never indexed.
 */
export default function InvoicesPage() {
  return (
    <MessagesScope namespaces={pageNamespaces.subscription}>
      {/* The status lives in the address: read in the browser, under a boundary. */}
      <Suspense fallback={<InvoicesSkeleton />}>
        <InvoicesFlow />
      </Suspense>
    </MessagesScope>
  );
}
