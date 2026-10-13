'use client';

import { useState } from 'react';

import Link from 'next/link';

import WorkspacePremium from '@material-symbols/svg-400/rounded/workspace_premium.svg?svgr';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';

import type { SessionUser } from '@/app/lib/firebase/client';
import {
  payableInvoiceQueryOptions,
  subscriptionQueryOptions,
} from '@/app/lib/queries/billing';
import { routes } from '@/app/lib/routes';
import { mayOwe, subscriptionNotice } from '@/app/lib/schemas/billing';

import { Button } from '@/app/ui/button';
import { EmptyState } from '@/app/ui/empty-state';

import { useSession } from '@/app/hooks/use-session';

import { PaySkeleton } from './pay-skeleton';
import { SubscriptionLoadError } from './subscription-load-error';
import { SubscriptionView } from './subscription-view';

/*
 * `/panel/subscription` (M13, the owner's split of 2026-10-13): where the
 * specialist's plan stands and everything about it — the plan, its state,
 * the notice with what to do, the period. Paying or taking a plan is the
 * payment page's (`/panel/subscription/pay`). On a phone with the app, the
 * same link opens the app's «Mi suscripción».
 */
export function SubscriptionFlow() {
  const { user } = useSession();
  if (user === null) return <PaySkeleton />;
  return <SpecialistSubscription user={user} />;
}

function SpecialistSubscription({ user }: { user: SessionUser }) {
  const t = useTranslations('billing.mySubscription');
  const current = useQuery(subscriptionQueryOptions(user));
  const subscription = current.data?.subscription ?? null;
  const payable = useQuery(payableInvoiceQueryOptions(user, subscription));
  // What the deadlines count from is decided once per page, like the appointment's actions.
  const [now] = useState(() => new Date());

  if (current.isPending) return <PaySkeleton />;

  // Only when there is nothing to show: a failed re-read keeps the subscription.
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

  // Never taken a plan, or the last one expired unpaid: for the person, no plan.
  if (subscription === null || subscription.status === 'INCOMPLETE_EXPIRED') {
    return (
      <EmptyState
        headingLevel={1}
        icon={WorkspacePremium}
        title={t('empty.title')}
        description={t('empty.description')}
        action={
          <Button asChild shape="soft">
            <Link href={routes.subscriptionPay()}>{t('seePlans')}</Link>
          </Button>
        }
      />
    );
  }

  // The receipt owed is being read: it decides what the notice says.
  if (payable.isLoading) return <PaySkeleton />;

  return (
    <SubscriptionView
      subscription={subscription}
      // Unreadable receipt: the notice comes from the subscription alone.
      // A plan that owes nothing has no receipt to tell about, whatever an
      // earlier visit left cached (a payment in review, since approved).
      notice={subscriptionNotice({
        subscription,
        payable: mayOwe(subscription) ? (payable.data ?? null) : null,
        now,
      })}
    />
  );
}
