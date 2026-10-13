import type { Metadata } from 'next';

import { getTranslations } from 'next-intl/server';

import { pageNamespaces } from '@/app/lib/i18n/client-messages';
import { parseInvoiceId, parsePlanSlug } from '@/app/lib/schemas/billing';

import { MessagesScope } from '@/app/ui/messages-scope';

import { PayFlow } from '../_components/pay-flow';

/*
 * `/pay[?plan={slug}|?view=plans|?invoice={id}]` (M13): paying and choosing
 * the plan — the plans to take one or to change to, the change itself, the
 * receipt owed with Redoctor's accounts in bolívares, the report of the
 * payment. `plan` is the plan a feature the current one lacks invites to;
 * `view=plans` is «Cambiar de plan»; `invoice` is the receipt «Pagar ahora»
 * on its page pays. Out of `/panel/` on purpose (the owner, 2026-10-13): no
 * app lists it, so a link to pay reaches the web even on a phone with the
 * app, and the app never links to it (AGENTS.md §6); the billing emails do,
 * through the admin's `webPaymentUrl` (REDOC-357). The panel's frame and
 * guard come from the module's layout. Never indexed.
 */

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('billing');
  return { title: t('metaTitle'), robots: { index: false, follow: false } };
}

export default async function PayPage({ searchParams }: PageProps<'/pay'>) {
  const { plan, view, invoice } = await searchParams;
  return (
    <MessagesScope namespaces={pageNamespaces.pay}>
      <PayFlow
        request={{
          plan: parsePlanSlug(plan),
          plans: view === 'plans',
          invoice: parseInvoiceId(invoice),
        }}
      />
    </MessagesScope>
  );
}
