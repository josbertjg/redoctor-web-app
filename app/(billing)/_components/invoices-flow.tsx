'use client';

import { useRouter, useSearchParams } from 'next/navigation';

import CloudOff from '@material-symbols/svg-400/rounded/cloud_off.svg?svgr';
import ReceiptLong from '@material-symbols/svg-400/rounded/receipt_long.svg?svgr';
import { keepPreviousData, useInfiniteQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';

import type { SessionUser } from '@/app/lib/firebase/client';
import { invoicesQueryOptions } from '@/app/lib/queries/billing';
import { routes } from '@/app/lib/routes';
import {
  invoiceFilters,
  parseInvoiceFilter,
  type InvoiceFilter,
} from '@/app/lib/schemas/billing';
import { cn } from '@/app/lib/utils';

import { BackLink } from '@/app/ui/back-link';
import { Button } from '@/app/ui/button';
import { EmptyState } from '@/app/ui/empty-state';
import { FilterChips } from '@/app/ui/filter-chips';
import { useSkeletonHold } from '@/app/ui/motion/skeleton-hold';
import { Skeleton } from '@/app/ui/skeleton';

import { useSession } from '@/app/hooks/use-session';

import { InvoiceCard, InvoiceCardSkeleton } from './invoice-card';
import { PagedListFoot } from './paged-list-foot';

/** The receipts before the person is known: the way back, the title, the chips, the rows. No words. */
export function InvoicesSkeleton() {
  return (
    <div aria-busy="true" className="flex w-full flex-col gap-4">
      <Skeleton className="h-touch w-36" />
      <Skeleton className="h-8 w-32" />
      <Skeleton className="h-touch w-full rounded-full" />
      <div className="flex flex-col gap-3">
        <InvoiceCardSkeleton />
        <InvoiceCardSkeleton />
        <InvoiceCardSkeleton />
      </div>
    </div>
  );
}

/*
 * `/panel/subscription/invoices` (the app's InvoicesScreen): every receipt,
 * the newest first, with the app's status chips — the one chosen in the
 * address (`?status=`) —, the next page coming by itself as the list's end
 * comes into view. Each opens its receipt.
 */
export function InvoicesFlow() {
  const { user } = useSession();
  if (user === null) return <InvoicesSkeleton />;
  return <InvoicesList user={user} />;
}

function InvoicesList({ user }: { user: SessionUser }) {
  const t = useTranslations('billing');
  const tRoot = useTranslations();
  const router = useRouter();
  const searchParams = useSearchParams();
  const filter = parseInvoiceFilter(searchParams.get('status'));
  const invoices = useInfiniteQuery({
    ...invoicesQueryOptions(user, filter),
    // Another chip keeps the list on screen, faded, until its own arrives.
    placeholderData: keepPreviousData,
  });
  const items = invoices.data?.pages.flatMap((page) => page.items) ?? [];
  // The skeleton crossfades into what arrives (AGENTS.md §8, rule 13).
  const holding = useSkeletonHold(invoices.isPending);

  const choose = (next: InvoiceFilter | null) => {
    router.replace(routes.subscriptionInvoices(next ?? undefined), {
      scroll: false,
    });
  };

  return (
    <div className="flex w-full flex-col gap-4">
      <BackLink
        href={routes.subscription()}
        label={t('mySubscription.title')}
      />
      <h1 className="text-headline-sm text-text-primary">
        {t('invoices.title')}
      </h1>
      <FilterChips
        legend={t('invoices.filter.label')}
        hideLegend
        options={[
          { key: 'all', value: null, label: t('invoices.filter.all') },
          ...(Object.keys(invoiceFilters) as InvoiceFilter[]).map((key) => ({
            key,
            value: key,
            label: t(`invoices.filter.${key}`),
          })),
        ]}
        value={filter}
        onChange={choose}
      />
      {list()}
    </div>
  );

  function list() {
    if (invoices.isPending || holding) {
      return (
        <div aria-busy="true" className="flex flex-col gap-3">
          <InvoiceCardSkeleton />
          <InvoiceCardSkeleton />
          <InvoiceCardSkeleton />
        </div>
      );
    }
    // Only when there is nothing to show: a failed re-read keeps the list.
    if (invoices.isLoadingError) {
      return (
        <EmptyState
          tone="error"
          icon={CloudOff}
          title={t('invoices.loadErrorTitle')}
          description={t('invoices.loadErrorDescription')}
          action={
            <Button
              shape="soft"
              loading={invoices.isFetching}
              onClick={() => {
                void invoices.refetch();
              }}
            >
              {tRoot('retry')}
            </Button>
          }
        />
      );
    }
    if (items.length === 0) {
      return (
        <EmptyState
          key={`empty-${filter ?? 'all'}`}
          icon={ReceiptLong}
          title={t('invoices.emptyTitle')}
          description={t('invoices.emptyDescription')}
        />
      );
    }
    return (
      <section
        aria-busy={invoices.isFetching}
        className={cn(
          'flex flex-col gap-3 transition-opacity duration-base ease-house',
          invoices.isPlaceholderData && 'opacity-60',
        )}
      >
        <ul className="flex flex-col gap-3">
          {items.map((invoice) => (
            <InvoiceCard key={invoice.id} invoice={invoice} />
          ))}
        </ul>
        <PagedListFoot
          loaded={items.length}
          loadingMore={invoices.isFetchingNextPage}
          failed={invoices.isFetchNextPageError}
          hasMore={invoices.hasNextPage}
          onMore={() => {
            // Never twice at once: a second ask waits for the first.
            void invoices.fetchNextPage({ cancelRefetch: false });
          }}
          labels={{
            failed: t('invoices.loadMoreError'),
            end: t('invoices.end'),
          }}
          skeleton={<InvoiceCardSkeleton />}
        />
      </section>
    );
  }
}
