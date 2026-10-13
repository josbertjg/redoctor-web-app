'use client';

import { useEffect, useState } from 'react';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import TaskAlt from '@material-symbols/svg-400/rounded/task_alt.svg?svgr';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';

import type { SessionUser } from '@/app/lib/firebase/client';
import {
  payableInvoiceQueryOptions,
  subscriptionQueryOptions,
} from '@/app/lib/queries/billing';
import { routes } from '@/app/lib/routes';
import { mayOwe, type Subscription } from '@/app/lib/schemas/billing';

import { Button } from '@/app/ui/button';
import { EmptyState } from '@/app/ui/empty-state';

import { useFocusHeading } from '@/app/hooks/use-focus-heading';
import { useSession } from '@/app/hooks/use-session';

import { PaySkeleton } from './pay-skeleton';
import { PayView, type PayMode } from './pay-view';
import { PlansView } from './plans-view';
import { SubscriptionLoadError } from './subscription-load-error';

type View =
  | { kind: 'plans' }
  | { kind: 'pay'; mode: PayMode; fromPlans: boolean }
  | { kind: 'upToDate' };

/** Where the page starts, from where the plan stands; null while that is not known. */
function startingView(
  subscription: Subscription | null,
  payable: { isLoading: boolean; hasInvoice: boolean },
): View | null {
  // No plan, one that expired unpaid, or one cancelled: the plans, to take one.
  if (
    subscription === null ||
    subscription.status === 'INCOMPLETE_EXPIRED' ||
    subscription.status === 'CANCELED'
  ) {
    return { kind: 'plans' };
  }
  if (mayOwe(subscription)) {
    if (payable.isLoading) return null;
    if (payable.hasInvoice) {
      return {
        kind: 'pay',
        mode: { kind: 'invoice', subscription },
        fromPlans: false,
      };
    }
  }
  return { kind: 'upToDate' };
}

/*
 * `/panel/subscription/pay` (M13, the owner's split of 2026-10-13): only to
 * pay. Where the plan stands decides where it starts — the plans when there
 * is none to pay, the receipt owed when there is one — and the steps follow
 * in place. That start is kept once taken: paying changes the subscription
 * underneath, and the person must still see how the payment ended. The app
 * never opens this page (AGENTS.md §6): a link to pay reaches the web even
 * on a phone where the app is installed.
 */
export function PayFlow() {
  const { user } = useSession();
  if (user === null) return <PaySkeleton />;
  return <SpecialistPayment user={user} />;
}

function SpecialistPayment({ user }: { user: SessionUser }) {
  const t = useTranslations('billing');
  const router = useRouter();
  const current = useQuery(subscriptionQueryOptions(user));
  const subscription = current.data?.subscription ?? null;
  const payable = useQuery(payableInvoiceQueryOptions(user, subscription));
  const [view, setView] = useState<View | null>(null);

  // The start, decided once from the first answers (React's "adjusting state
  // while rendering": no effect, no frame of the wrong step). A receipt that
  // could not be read decides nothing: it may be owed.
  if (view === null && current.isSuccess && !payable.isError) {
    const start = startingView(subscription, {
      isLoading: payable.isLoading,
      hasInvoice: payable.data != null,
    });
    if (start !== null) setView(start);
  }

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [view?.kind]);
  // The view's title takes the focus when the person moves between them.
  const frame = useFocusHeading(view?.kind ?? 'loading');

  const toSubscription = () => {
    router.push(routes.subscription());
  };

  return (
    // `contents`: a handle for the focus, no box of its own.
    <div ref={frame} className="contents">
      {content()}
    </div>
  );

  function content() {
    if (view === null) {
      // Only when there is nothing to show: a failed re-read keeps the page.
      if (current.isLoadingError) {
        return (
          <SubscriptionLoadError
            error={current.error}
            retrying={current.isFetching}
            onRetry={() => {
              void current.refetch();
            }}
          />
        );
      }
      if (payable.isError) {
        return (
          <SubscriptionLoadError
            error={payable.error}
            retrying={payable.isFetching}
            onRetry={() => {
              void payable.refetch();
            }}
          />
        );
      }
      return <PaySkeleton />;
    }

    switch (view.kind) {
      case 'plans':
        return (
          <PlansView
            user={user}
            onSelect={(plan) => {
              setView({
                kind: 'pay',
                mode: { kind: 'contract', plan },
                fromPlans: true,
              });
            }}
            onBack={toSubscription}
          />
        );
      case 'pay':
        return (
          <PayView
            user={user}
            mode={view.mode}
            onBack={
              view.fromPlans
                ? () => {
                    setView({ kind: 'plans' });
                  }
                : toSubscription
            }
            onExit={toSubscription}
          />
        );
      case 'upToDate':
        return (
          <EmptyState
            headingLevel={1}
            icon={TaskAlt}
            title={t('payPage.upToDate.title')}
            description={t('payPage.upToDate.description')}
            action={
              <Button asChild shape="soft">
                <Link href={routes.subscription()}>
                  {t('payPage.upToDate.action')}
                </Link>
              </Button>
            }
          />
        );
    }
  }
}
