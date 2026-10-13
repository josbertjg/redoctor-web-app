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
import {
  canChangePlan,
  mayOwe,
  type Subscription,
} from '@/app/lib/schemas/billing';

import { Button } from '@/app/ui/button';
import { EmptyState } from '@/app/ui/empty-state';

import { useFocusHeading } from '@/app/hooks/use-focus-heading';
import { useSession } from '@/app/hooks/use-session';

import { ChangePlanView } from './change-plan-view';
import { PaySkeleton } from './pay-skeleton';
import { PayView, type PayMode } from './pay-view';
import { PlansView } from './plans-view';
import { SubscriptionLoadError } from './subscription-load-error';

type View =
  | { kind: 'plans' }
  | { kind: 'change'; planSlug: string }
  | { kind: 'pay'; mode: PayMode; fromPlans: boolean }
  | { kind: 'upToDate' };

/**
 * Where the page starts, from where the plan stands and the plan a link
 * asks for; null while that is not known.
 */
function startingView(
  subscription: Subscription | null,
  payable: { isLoading: boolean; hasInvoice: boolean },
  wantedPlan: string | null,
): View | null {
  // No plan, one that expired unpaid, or one cancelled: the plans, to take one.
  if (
    subscription === null ||
    subscription.status === 'INCOMPLETE_EXPIRED' ||
    subscription.status === 'CANCELED'
  ) {
    return { kind: 'plans' };
  }
  // What is owed comes first: the API changes no plan with debt.
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
  // Another plan asked for (a feature this one lacks): the change to it,
  // when the plan can change (the app's rule).
  if (
    wantedPlan !== null &&
    wantedPlan !== subscription.plan.slug &&
    canChangePlan(subscription)
  ) {
    return { kind: 'change', planSlug: wantedPlan };
  }
  return { kind: 'upToDate' };
}

/*
 * `/panel/subscription/pay` (M13, the owner's split of 2026-10-13): only to
 * pay. Where the plan stands decides where it starts — the plans when there
 * is none to pay, the receipt owed when there is one, the change to the
 * plan a link asks for (`?plan=`, a feature the current one lacks) — and
 * the steps follow in place. That start is kept once taken: paying changes
 * the subscription underneath, and the person must still see how the
 * payment ended. The app never opens this page (AGENTS.md §6): a link to
 * pay reaches the web even on a phone where the app is installed.
 */
export function PayFlow({ wantedPlan }: { wantedPlan: string | null }) {
  const { user } = useSession();
  if (user === null) return <PaySkeleton />;
  return <SpecialistPayment user={user} wantedPlan={wantedPlan} />;
}

function SpecialistPayment({
  user,
  wantedPlan,
}: {
  user: SessionUser;
  wantedPlan: string | null;
}) {
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
    const start = startingView(
      subscription,
      { isLoading: payable.isLoading, hasInvoice: payable.data != null },
      wantedPlan,
    );
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
            preferredSlug={wantedPlan}
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
      case 'change':
        return subscription === null ? (
          <PaySkeleton />
        ) : (
          <ChangePlanView
            user={user}
            subscription={subscription}
            planSlug={view.planSlug}
            onPay={(changed) => {
              setView({
                kind: 'pay',
                mode: { kind: 'invoice', subscription: changed },
                fromPlans: false,
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
