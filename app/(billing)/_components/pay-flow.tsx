'use client';

import { useEffect, useState } from 'react';

import Link from 'next/link';

import ShieldPerson from '@material-symbols/svg-400/rounded/admin_panel_settings.svg?svgr';
import CloudOff from '@material-symbols/svg-400/rounded/cloud_off.svg?svgr';
import WorkspacePremium from '@material-symbols/svg-400/rounded/workspace_premium.svg?svgr';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';

import { isApiError } from '@/app/lib/api/errors';
import type { SessionUser } from '@/app/lib/firebase/client';
import {
  payableInvoiceQueryOptions,
  subscriptionQueryOptions,
} from '@/app/lib/queries/billing';
import { routes } from '@/app/lib/routes';
import { subscriptionNotice } from '@/app/lib/schemas/billing';

import { Button } from '@/app/ui/button';
import { EmptyState } from '@/app/ui/empty-state';

import { useSession } from '@/app/hooks/use-session';

import { PaySkeleton } from './pay-skeleton';
import { PayView, type PayMode } from './pay-view';
import { PlansView } from './plans-view';
import { SubscriptionView } from './subscription-view';

type View =
  { kind: 'subscription' } | { kind: 'plans' } | { kind: 'pay'; mode: PayMode };

/*
 * `/pay` (M13): the session is already there (the layout's guard). The
 * page reads the subscription and, when it owes something, the receipt with
 * its attempts, and shows where the plan stands with what to do: take a
 * plan, pay what is owed, or wait for a payment in review. The plans and
 * the payment open in place; «Ir al inicio» at the end leads to `/panel`.
 */
export function PayFlow() {
  const { user } = useSession();
  if (user === null) return <PaySkeleton />;
  return <SpecialistBilling user={user} />;
}

function SpecialistBilling({ user }: { user: SessionUser }) {
  const t = useTranslations('billing');
  const tRoot = useTranslations();
  const current = useQuery(subscriptionQueryOptions(user));
  const subscription = current.data?.subscription ?? null;
  const payable = useQuery(payableInvoiceQueryOptions(user, subscription));
  const [view, setView] = useState<View>({ kind: 'subscription' });
  // What the deadlines count from is decided once per page, like the appointment's actions.
  const [now] = useState(() => new Date());

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [view.kind]);

  const showSubscription = () => {
    setView({ kind: 'subscription' });
  };
  const showPlans = () => {
    setView({ kind: 'plans' });
  };

  if (view.kind === 'plans') {
    return (
      <PlansView
        user={user}
        onSelect={(plan) => {
          setView({ kind: 'pay', mode: { kind: 'contract', plan } });
        }}
        onBack={showSubscription}
      />
    );
  }

  if (view.kind === 'pay') {
    const { mode } = view;
    return (
      <PayView
        user={user}
        mode={mode}
        onBack={mode.kind === 'contract' ? showPlans : showSubscription}
        onExit={showSubscription}
      />
    );
  }

  if (current.isPending) return <PaySkeleton />;

  if (current.isError) {
    // An account the API does not take for a specialist's (an admin's): the
    // guard let it in, the billing does not.
    if (isApiError(current.error) && current.error.status === 403) {
      return (
        <EmptyState
          headingLevel={1}
          icon={ShieldPerson}
          title={t('mySubscription.forbidden.title')}
          description={t('mySubscription.forbidden.description')}
          action={
            <Button asChild shape="soft">
              <Link href={routes.specialistHome()}>
                {t('mySubscription.forbidden.action')}
              </Link>
            </Button>
          }
        />
      );
    }
    return (
      <EmptyState
        tone="error"
        headingLevel={1}
        icon={CloudOff}
        title={t('mySubscription.loadErrorTitle')}
        description={t('mySubscription.loadErrorDescription')}
        action={
          <Button
            shape="soft"
            loading={current.isFetching}
            onClick={() => {
              void current.refetch();
            }}
          >
            {tRoot('refresh')}
          </Button>
        }
      />
    );
  }

  // Never taken a plan, or the last one expired unpaid: for the person, no plan.
  if (subscription === null || subscription.status === 'INCOMPLETE_EXPIRED') {
    return (
      <EmptyState
        headingLevel={1}
        icon={WorkspacePremium}
        title={t('mySubscription.empty.title')}
        description={t('mySubscription.empty.description')}
        action={
          <Button shape="soft" onClick={showPlans}>
            {t('mySubscription.seePlans')}
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
      notice={subscriptionNotice({
        subscription,
        payable: payable.data ?? null,
        now,
      })}
      onPay={() => {
        setView({ kind: 'pay', mode: { kind: 'invoice', subscription } });
      }}
      onSeePlans={showPlans}
    />
  );
}
