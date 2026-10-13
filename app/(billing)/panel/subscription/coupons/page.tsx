import type { Metadata } from 'next';

import { getTranslations } from 'next-intl/server';

import { pageNamespaces } from '@/app/lib/i18n/client-messages';

import { MessagesScope } from '@/app/ui/messages-scope';

import { CouponsFlow } from '../../../_components/coupons-flow';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('billing.myCoupons');
  return { title: t('title'), robots: { index: false, follow: false } };
}

/*
 * `/panel/subscription/coupons`: «Mis cupones», the codes kept for later
 * and the personal ones, read and saved in the browser with the
 * specialist's session (AGENTS.md §4). Never indexed.
 */
export default function CouponsPage() {
  return (
    <MessagesScope namespaces={pageNamespaces.subscription}>
      <CouponsFlow />
    </MessagesScope>
  );
}
