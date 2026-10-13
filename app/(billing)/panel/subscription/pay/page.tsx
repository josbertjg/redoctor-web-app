import type { Metadata } from 'next';

import { getTranslations } from 'next-intl/server';

import { pageNamespaces } from '@/app/lib/i18n/client-messages';

import { MessagesScope } from '@/app/ui/messages-scope';

import { PayFlow } from '../../../_components/pay-flow';

/*
 * `/panel/subscription/pay` (M13; the owner's path of 2026-10-13): the
 * payment and nothing else — the plans to take one, the receipt owed with
 * Redoctor's accounts in bolívares, the report of the payment. The app
 * never opens it and never links to it (AGENTS.md §6); the billing emails
 * do, through the admin's `webPaymentUrl` (REDOC-357). Never indexed.
 */

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('billing');
  return { title: t('metaTitle'), robots: { index: false, follow: false } };
}

export default function PayPage() {
  return (
    <MessagesScope namespaces={pageNamespaces.pay}>
      <PayFlow />
    </MessagesScope>
  );
}
