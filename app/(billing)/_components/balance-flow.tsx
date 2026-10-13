'use client';

import CloudOff from '@material-symbols/svg-400/rounded/cloud_off.svg?svgr';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';

import type { SessionUser } from '@/app/lib/firebase/client';
import { balanceQueryOptions } from '@/app/lib/queries/billing';
import { routes } from '@/app/lib/routes';

import { BackLink } from '@/app/ui/back-link';
import { Button } from '@/app/ui/button';
import { EmptyState } from '@/app/ui/empty-state';
import { Skeleton } from '@/app/ui/skeleton';

import { useSession } from '@/app/hooks/use-session';

import {
  BalanceMovementRow,
  BalanceMovementSkeleton,
  BalanceSummary,
} from './balance-pieces';
import { PagedListFoot } from './paged-list-foot';

/** The balance before it comes: the way back, the title, the summary and the rows. No words. */
export function BalanceSkeleton() {
  return (
    <div aria-busy="true" className="flex w-full flex-col gap-4">
      <Skeleton className="h-touch w-36" />
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-24 rounded-2xl" />
      <div className="flex flex-col gap-3">
        <BalanceMovementSkeleton />
        <BalanceMovementSkeleton />
        <BalanceMovementSkeleton />
      </div>
    </div>
  );
}

/*
 * `/panel/subscription/balance` (the app's BalanceScreen): the balance —
 * what was paid over and what an admin added, which only the next monthly
 * receipt uses — with every movement, the newest first, the next page
 * coming by itself as the list's end comes into view. A movement about a
 * receipt opens it.
 */
export function BalanceFlow() {
  const { user } = useSession();
  if (user === null) return <BalanceSkeleton />;
  return <Balance user={user} />;
}

function Balance({ user }: { user: SessionUser }) {
  const t = useTranslations('billing');
  const tRoot = useTranslations();
  const balance = useInfiniteQuery(balanceQueryOptions(user));

  if (balance.isPending) return <BalanceSkeleton />;

  const head = (
    <>
      <BackLink
        href={routes.subscription()}
        label={t('mySubscription.title')}
      />
      <h1 className="text-headline-sm text-text-primary">
        {t('balance.title')}
      </h1>
    </>
  );

  // Only when there is nothing to show: a failed re-read keeps the balance.
  if (balance.isLoadingError) {
    return (
      <div className="flex w-full flex-col gap-4">
        {head}
        <EmptyState
          tone="error"
          icon={CloudOff}
          title={t('balance.loadErrorTitle')}
          description={t('balance.loadErrorDescription')}
          action={
            <Button
              shape="soft"
              loading={balance.isFetching}
              onClick={() => {
                void balance.refetch();
              }}
            >
              {tRoot('retry')}
            </Button>
          }
        />
      </div>
    );
  }

  const pages = balance.data.pages;
  const amount = pages.at(-1)?.balance;
  const movements = pages.flatMap((page) => page.items);

  return (
    <div className="flex w-full animate-fade-up flex-col gap-4">
      {head}
      {amount ? <BalanceSummary balance={amount} /> : null}
      {movements.length > 0 ? (
        <ul
          aria-label={t('balance.movementsLabel')}
          className="flex flex-col gap-3"
        >
          {movements.map((movement) => (
            <BalanceMovementRow key={movement.id} movement={movement} />
          ))}
        </ul>
      ) : null}
      <PagedListFoot
        loaded={movements.length}
        loadingMore={balance.isFetchingNextPage}
        failed={balance.isFetchNextPageError}
        hasMore={balance.hasNextPage}
        onMore={() => {
          // Never twice at once: a second ask waits for the first.
          void balance.fetchNextPage({ cancelRefetch: false });
        }}
        labels={{
          failed: t('balance.loadMoreError'),
          end:
            movements.length === 0
              ? t('balance.emptyMovements')
              : t('balance.end'),
        }}
        skeleton={<BalanceMovementSkeleton />}
      />
    </div>
  );
}
