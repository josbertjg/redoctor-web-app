import type { Metadata } from 'next';

import { getTranslations } from 'next-intl/server';

import { pageNamespaces } from '@/app/lib/i18n/client-messages';
import { parsePlanSlug } from '@/app/lib/schemas/billing';

import { MessagesScope } from '@/app/ui/messages-scope';

import { PayFlow } from '../../../_components/pay-flow';

/*
 * `/panel/subscription/pay[?plan={slug}]` (M13; the owner's path of
 * 2026-10-13): the payment and nothing else — the plans to take one, the
 * change to a better one, the receipt owed with Redoctor's accounts in
 * bolívares, the report of the payment. `plan` is the plan a feature the
 * current one lacks invites to. The app never opens it and never links to
 * it (AGENTS.md §6); the billing emails do, through the admin's
 * `webPaymentUrl` (REDOC-357). Never indexed.
 */

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('billing');
  return { title: t('metaTitle'), robots: { index: false, follow: false } };
}

export default async function PayPage({
  searchParams,
}: PageProps<'/panel/subscription/pay'>) {
  const { plan } = await searchParams;
  return (
    <MessagesScope namespaces={pageNamespaces.pay}>
      <PayFlow wantedPlan={parsePlanSlug(plan)} />
    </MessagesScope>
  );
}
