import type { Metadata } from 'next';

import { getTranslations } from 'next-intl/server';

import { pageNamespaces } from '@/app/lib/i18n/client-messages';

import { MessagesScope } from '@/app/ui/messages-scope';

import { BalanceFlow } from '../../../_components/balance-flow';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('billing.balance');
  return { title: t('title'), robots: { index: false, follow: false } };
}

/*
 * `/panel/subscription/balance`: the specialist's balance and its
 * movements, read in the browser with their session (AGENTS.md §4). Never
 * indexed.
 */
export default function BalancePage() {
  return (
    <MessagesScope namespaces={pageNamespaces.subscription}>
      <BalanceFlow />
    </MessagesScope>
  );
}
