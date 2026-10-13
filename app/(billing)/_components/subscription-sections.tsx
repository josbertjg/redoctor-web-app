'use client';

import { useId } from 'react';

import ReceiptLong from '@material-symbols/svg-400/rounded/receipt_long.svg?svgr';
import Savings from '@material-symbols/svg-400/rounded/savings.svg?svgr';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';

import type { SessionUser } from '@/app/lib/firebase/client';
import {
  balanceQueryOptions,
  invoicesQueryOptions,
} from '@/app/lib/queries/billing';
import { routes } from '@/app/lib/routes';

import { BalanceMovementRow, BalanceSummary } from './balance-pieces';
import { Collapse } from './collapse';
import { InvoiceCard, InvoiceCardSkeleton } from './invoice-card';
import { ListNotice } from './list-notice';
import { SectionHeader } from './section-header';

/** What «Mi suscripción» shows of each list; the rest is on its page. */
const visibleCount = 3;

/*
 * The balance on «Mi suscripción» (the app's BalanceSection): how much
 * there is and the latest movements. Only when there is something to tell
 * — a balance, or its history —; otherwise it takes no room, and it
 * unfolds when it comes. A balance that cannot be read says nothing: the
 * page is about the plan.
 */
export function BalanceSection({ user }: { user: SessionUser }) {
  const t = useTranslations('billing.balance');
  const headingId = useId();
  const balance = useInfiniteQuery(balanceQueryOptions(user));
  const pages = balance.data?.pages ?? [];
  // The latest page read says the balance as it stands.
  const amount = pages.at(-1)?.balance ?? null;
  const movements = pages.flatMap((page) => page.items);
  const hasAnything =
    amount !== null && (amount.amount !== 0 || movements.length > 0);

  return (
    <Collapse open={hasAnything}>
      {amount === null ? null : (
        <section aria-labelledby={headingId} className="flex flex-col gap-3">
          <SectionHeader
            id={headingId}
            icon={Savings}
            title={t('title')}
            more={{
              href: routes.subscriptionBalance(),
              label: t('seeAll'),
              shown: movements.length > visibleCount || balance.hasNextPage,
            }}
          />
          <BalanceSummary balance={amount} />
          {movements.length > 0 ? (
            <ul className="flex flex-col gap-3">
              {movements.slice(0, visibleCount).map((movement) => (
                <BalanceMovementRow key={movement.id} movement={movement} />
              ))}
            </ul>
          ) : null}
        </section>
      )}
    </Collapse>
  );
}

/*
 * The latest receipts, at the foot of «Mi suscripción» (the app's
 * RecentInvoicesSection), with the way to all of them: it answers «did they
 * approve what I paid?» without leaving the page.
 */
export function RecentInvoices({ user }: { user: SessionUser }) {
  const t = useTranslations('billing.invoices');
  const headingId = useId();
  const invoices = useInfiniteQuery(invoicesQueryOptions(user, null));
  const recent = invoices.data?.pages[0]?.items.slice(0, visibleCount) ?? [];

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-3">
      <SectionHeader
        id={headingId}
        icon={ReceiptLong}
        title={t('title')}
        more={{
          href: routes.subscriptionInvoices(),
          label: t('seeAll'),
          // No receipts: «Ver todos» would lead to an empty list.
          shown: recent.length > 0,
        }}
      />
      {content()}
    </section>
  );

  function content() {
    if (invoices.isPending) {
      return (
        <div aria-busy="true" className="flex flex-col gap-3">
          <InvoiceCardSkeleton />
          <InvoiceCardSkeleton />
        </div>
      );
    }
    // Only when there is nothing to show: a failed re-read keeps the receipts.
    if (invoices.isLoadingError) {
      return (
        <ListNotice
          text={t('loadErrorTitle')}
          retrying={invoices.isFetching}
          onRetry={() => {
            void invoices.refetch();
          }}
        />
      );
    }
    if (recent.length === 0) {
      return <ListNotice text={t('emptyDescription')} />;
    }
    return (
      <ul className="flex flex-col gap-3">
        {recent.map((invoice) => (
          <InvoiceCard key={invoice.id} invoice={invoice} />
        ))}
      </ul>
    );
  }
}
