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
  hasEnded,
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
  /** `changing`: from the plan in force, marked; else to take one. */
  | { kind: 'plans'; changing: boolean }
  | { kind: 'change'; planSlug: string; fromPlans: boolean }
  | { kind: 'pay'; mode: PayMode; fromPlans: boolean }
  | { kind: 'upToDate' };

/**
 * What a link asks the page for: a plan to change to (`?plan=`), the plans
 * (`?view=plans`), or one receipt to pay, from its page (`?invoice=`).
 */
export type PayRequest = {
  plan: string | null;
  plans: boolean;
  invoice: string | null;
};

/**
 * Where the page starts, from where the plan stands and what the link
 * asks for; null while that is not known.
 */
function startingView(
  subscription: Subscription | null,
  payable: { isLoading: boolean; hasInvoice: boolean },
  request: PayRequest,
): View | null {
  // No plan, one that expired unpaid, or one cancelled: the plans, to take one.
  if (
    subscription === null ||
    subscription.status === 'INCOMPLETE_EXPIRED' ||
    subscription.status === 'CANCELED'
  ) {
    return { kind: 'plans', changing: false };
  }
  // A receipt chosen on its page: that one, whatever else is owed.
  if (request.invoice !== null) {
    return {
      kind: 'pay',
      mode: { kind: 'invoice', subscription, invoiceId: request.invoice },
      fromPlans: false,
    };
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
    request.plan !== null &&
    request.plan !== subscription.plan.slug &&
    canChangePlan(subscription)
  ) {
    return { kind: 'change', planSlug: request.plan, fromPlans: false };
  }
  // «Cambiar de plan»: the plans, the one in force marked.
  if (request.plans) return { kind: 'plans', changing: true };
  return { kind: 'upToDate' };
}

/*
 * `/pay` (M13, apart from «Mi suscripción» since 2026-10-13): paying,
 * choosing a plan and changing it. Where the plan stands decides where it
 * starts — the plans when there is none to pay, the receipt a receipt's
 * page asks to pay (`?invoice=`), the receipt owed when there is one, the
 * change to the plan a link asks for (`?plan=`, a feature the current one
 * lacks), the plans to change to (`?view=plans`, «Cambiar de plan») — and
 * the steps follow in place. That start is kept
 * once taken: paying changes the subscription underneath, and the person
 * must still see how the payment ended. The app never opens this page
 * (AGENTS.md §6): a link to pay reaches the web even on a phone where the
 * app is installed.
 */
export function PayFlow({ request }: { request: PayRequest }) {
  const { user } = useSession();
  if (user === null) return <PaySkeleton />;
  return <SpecialistPayment user={user} request={request} />;
}

function SpecialistPayment({
  user,
  request,
}: {
  user: SessionUser;
  request: PayRequest;
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
      request,
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
  // A receipt paid from its page goes back to it, where the payment shows.
  const toOrigin =
    request.invoice === null
      ? toSubscription
      : () => {
          router.push(routes.subscriptionInvoice(request.invoice ?? ''));
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
            current={
              view.changing && subscription !== null && !hasEnded(subscription)
                ? subscription
                : null
            }
            preferredSlug={request.plan}
            onSelect={(plan) => {
              setView(
                view.changing
                  ? { kind: 'change', planSlug: plan.slug, fromPlans: true }
                  : {
                      kind: 'pay',
                      mode: { kind: 'contract', plan },
                      fromPlans: true,
                    },
              );
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
            backToPlans={view.fromPlans}
            onPay={(changed) => {
              setView({
                kind: 'pay',
                mode: { kind: 'invoice', subscription: changed },
                fromPlans: false,
              });
            }}
            onBack={
              view.fromPlans
                ? () => {
                    setView({ kind: 'plans', changing: true });
                  }
                : toSubscription
            }
            onKeep={toSubscription}
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
                    setView({ kind: 'plans', changing: false });
                  }
                : toOrigin
            }
            onExit={toOrigin}
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
              <>
                <Button asChild shape="soft">
                  <Link href={routes.subscription()}>
                    {t('payPage.upToDate.action')}
                  </Link>
                </Button>
                {subscription !== null && canChangePlan(subscription) ? (
                  <Button
                    variant="white"
                    shape="soft"
                    onClick={() => {
                      setView({ kind: 'plans', changing: true });
                    }}
                  >
                    {t('mySubscription.changePlan.title')}
                  </Button>
                ) : null}
              </>
            }
          />
        );
    }
  }
}
