import type { Metadata } from 'next';

import { getTranslations } from 'next-intl/server';

import { pageNamespaces } from '@/app/lib/i18n/client-messages';

import { MessagesScope } from '@/app/ui/messages-scope';

import { SubscriptionFlow } from '../../_components/subscription-flow';

/*
 * `/panel/subscription` (M13): «Mi suscripción», where the plan stands.
 * The billing emails' «Abrir Redoctor» leads here: on a phone with the app
 * the app opens its own screen; anywhere else this page shows the same.
 * Read in the browser with the specialist's session (AGENTS.md §4); never
 * indexed.
 */

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('billing.mySubscription');
  return { title: t('title'), robots: { index: false, follow: false } };
}

export default function SubscriptionPage() {
  return (
    <MessagesScope namespaces={pageNamespaces.subscription}>
      <SubscriptionFlow />
    </MessagesScope>
  );
}
