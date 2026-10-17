'use client';

import { useId, useState } from 'react';

import Link from 'next/link';

import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';

import type { SessionUser } from '@/app/lib/firebase/client';
import {
  payableInvoiceQueryOptions,
  subscriptionQueryOptions,
} from '@/app/lib/queries/billing';
import { routes } from '@/app/lib/routes';
import {
  mayOwe,
  subscriptionNotice,
  subscriptionStatusChips,
} from '@/app/lib/schemas/billing';

import { NoticePanel } from '@/app/ui/billing/notice-panel';
import { PlanEmblem } from '@/app/ui/billing/plan-emblem';
import { Button } from '@/app/ui/button';
import { useSkeletonHold } from '@/app/ui/motion/skeleton-hold';
import { Skeleton } from '@/app/ui/skeleton';
import { StateChip } from '@/app/ui/state-chip';

import { useSession } from '@/app/hooks/use-session';

import { PanelCardError } from './panel-card-error';

/*
 * The plan on the panel's home, as the app's home puts it first: the
 * notice with what to do when there is one (a receipt to pay, a payment in
 * review or rejected), then the plan with its state and the way to «Mi
 * suscripción». Without a plan, the app's «¡Llega a más pacientes desde
 * hoy!» and the plans.
 */
export function PanelPlanCard() {
  const { user } = useSession();
  if (user === null) return null;
  return <PlanCard user={user} />;
}

function PlanCard({ user }: { user: SessionUser }) {
  const t = useTranslations('panel.home.plan');
  const tBilling = useTranslations('billing');
  const headingId = useId();
  const current = useQuery(subscriptionQueryOptions(user));
  const subscription = current.data?.subscription ?? null;
  const payable = useQuery(payableInvoiceQueryOptions(user, subscription));
  // What the deadlines count from is decided once, like on «Mi suscripción».
  const [now] = useState(() => new Date());
  // The skeleton crossfades into what arrives (AGENTS.md §8, rule 13).
  const holding = useSkeletonHold(current.isPending || payable.isLoading);

  if (current.isPending || payable.isLoading || holding) {
    return <Skeleton className="h-36 rounded-2xl" />;
  }

  if (current.isLoadingError) {
    return (
      <PanelCardError
        message={t('loadError')}
        retrying={current.isFetching}
        onRetry={() => {
          void current.refetch();
        }}
      />
    );
  }

  if (subscription === null || subscription.status === 'INCOMPLETE_EXPIRED') {
    return (
      <section
        aria-labelledby={headingId}
        className="flex animate-fade-up flex-col gap-3 rounded-2xl bg-pure-white p-5 shadow-md"
      >
        <h2 id={headingId} className="text-title-md text-text-primary">
          {t('noPlanTitle')}
        </h2>
        <p className="text-body-md text-text-secondary">
          {t('noPlanDescription')}
        </p>
        <Button asChild shape="soft" className="self-start">
          <Link href={routes.subscriptionPay()}>{t('seePlans')}</Link>
        </Button>
      </section>
    );
  }

  const chip = subscriptionStatusChips[subscription.status];
  const notice = subscriptionNotice({
    subscription,
    payable: mayOwe(subscription) ? (payable.data ?? null) : null,
    now,
  });

  return (
    <div className="flex flex-col gap-3">
      {notice ? (
        <NoticePanel notice={notice} payHref={routes.subscriptionPay()} />
      ) : null}
      <section
        aria-labelledby={headingId}
        className="flex animate-fade-up flex-col gap-4 rounded-2xl bg-pure-white p-5 shadow-md"
      >
        <div className="flex items-center gap-4">
          <PlanEmblem slug={subscription.plan.slug} size="sm" />
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <p className="text-label-md text-text-secondary">{t('title')}</p>
            <div className="flex flex-wrap items-center gap-2">
              <h2
                id={headingId}
                className="text-title-md break-words text-text-primary"
              >
                {subscription.plan.name}
              </h2>
              <StateChip tone={chip.tone}>
                {tBilling(`billingStatus.${chip.label}`)}
              </StateChip>
            </div>
          </div>
        </div>
        {/* Under the plan, never over its name in a narrow column. */}
        <Button
          asChild
          variant="white"
          shape="soft"
          size="small"
          className="self-start"
        >
          <Link href={routes.subscription()}>{t('see')}</Link>
        </Button>
      </section>
    </div>
  );
}
