import type { Metadata } from 'next';

import { getTranslations } from 'next-intl/server';

import { pageNamespaces } from '@/app/lib/i18n/client-messages';

import { MessagesScope } from '@/app/ui/messages-scope';

import { PayFlow } from '../_components/pay-flow';

/*
 * `/pay` (M13): the specialist's subscription and its payment — the plans
 * to take one, the receipt owed with Redoctor's accounts in bolívares, the
 * report of the payment and its review. Read in the browser with the
 * specialist's session (AGENTS.md §4); never indexed. The billing emails
 * send people here (`webPaymentUrl`, REDOC-357).
 */

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('billing');
  return { title: t('metaTitle'), robots: { index: false, follow: false } };
}

export default function PayPage() {
  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col px-gutter pt-6 pb-16">
      <MessagesScope namespaces={pageNamespaces.pay}>
        <PayFlow />
      </MessagesScope>
    </main>
  );
}
