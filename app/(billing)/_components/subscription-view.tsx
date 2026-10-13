'use client';

import { useId } from 'react';

import Link from 'next/link';

import { useTranslations } from 'next-intl';

import {
  formatDate,
  formatDateTime,
  formatPeriod,
} from '@/app/lib/format/dates';
import { formatBillingAmount } from '@/app/lib/format/money';
import { routes } from '@/app/lib/routes';
import {
  activeDiscount,
  subscriptionStatusChips,
  type Subscription,
  type SubscriptionNotice,
} from '@/app/lib/schemas/billing';
import { cn } from '@/app/lib/utils';

import { NoticePanel } from '@/app/ui/billing/notice-panel';
import { PlanEmblem } from '@/app/ui/billing/plan-emblem';
import { Button } from '@/app/ui/button';
import { StateChip } from '@/app/ui/state-chip';

import { couponDiscountLabel } from './coupon-words';
import { DetailList, type DetailItem } from './detail-list';

type SubscriptionViewProps = {
  subscription: Subscription;
  /** What to tell about the billing, already resolved; null when the plan is simply at its stage. */
  notice: SubscriptionNotice | null;
};

type Translate = ReturnType<typeof useTranslations<'billing'>>;

/** What the state means for the person, with the deadline that runs. */
function statusMessage(t: Translate, subscription: Subscription): string {
  switch (subscription.status) {
    case 'ACTIVE': {
      if (subscription.cancelAtPeriodEnd) {
        const ends = subscription.endsAt ?? subscription.currentPeriod?.end;
        const date = ends ? formatDate(ends) : null;
        return date
          ? t('mySubscription.status.canceling.withDate', { date })
          : t('mySubscription.status.canceling.noDate');
      }
      const end = subscription.currentPeriod?.end;
      const date = end ? formatDate(end) : null;
      return date
        ? t('mySubscription.status.active.withDate', { date })
        : t('mySubscription.status.active.noDate');
    }
    case 'PAST_DUE': {
      const date = subscription.graceEndsAt
        ? formatDate(subscription.graceEndsAt)
        : null;
      return date
        ? t('mySubscription.status.pastDue.withDate', { date })
        : t('mySubscription.status.pastDue.noDate');
    }
    case 'INCOMPLETE': {
      // The 72 h: the hour counts as much as the day.
      const date = subscription.incompleteExpiresAt
        ? formatDateTime(subscription.incompleteExpiresAt)
        : null;
      return date
        ? t('mySubscription.status.incomplete.withDate', { date })
        : t('mySubscription.status.incomplete.noDate');
    }
    default:
      return t('mySubscription.status.canceled');
  }
}

/** The period under way and what hangs from it: a scheduled change, the coupon, the free months. */
function periodRows(t: Translate, subscription: Subscription): DetailItem[] {
  const rows: DetailItem[] = [];
  const period = formatPeriod(
    subscription.currentPeriod?.start,
    subscription.currentPeriod?.end,
  );
  if (period) {
    rows.push({
      key: 'period',
      label: t('mySubscription.rows.period'),
      value: period,
    });
  }
  const scheduled = subscription.scheduledChange;
  if (scheduled) {
    const date = scheduled.effectiveAt
      ? formatDate(scheduled.effectiveAt)
      : null;
    const plan = scheduled.plan.name;
    const price = formatBillingAmount(scheduled.price);
    rows.push({
      key: 'nextPlan',
      label: t('mySubscription.rows.nextPlan'),
      value: date
        ? t('mySubscription.rows.nextPlanValue', { plan, price, date })
        : t('mySubscription.rows.nextPlanValueNoDate', { plan, price }),
    });
  }
  const discount = activeDiscount(subscription);
  if (discount) {
    rows.push({
      key: 'coupon',
      label: t('mySubscription.rows.coupon', { code: discount.code }),
      value: couponDiscountLabel(t, discount),
    });
    rows.push({
      key: 'couponLeft',
      label: t('mySubscription.rows.couponLeft'),
      value:
        discount.duration === 'FOREVER' || discount.remainingCycles == null
          ? t('couponTerms.allMonths')
          : String(discount.remainingCycles),
    });
  }
  const courtesy = subscription.courtesy;
  if (courtesy && courtesy.monthsLeft > 0) {
    rows.push({
      key: 'freeMonths',
      label: t('mySubscription.rows.freeMonths'),
      value: t('months', { count: courtesy.monthsLeft }),
    });
  }
  return rows;
}

/*
 * «Mi suscripción», as the app's screen heads it: which plan, what it
 * costs, where it stands and what that means — then the notice with what
 * to do, when there is one. Paying, or taking a plan again, is the payment
 * page's (`/panel/subscription/pay`); changing plan, cancelling or resuming
 * stay in the app for now.
 */
export function SubscriptionView({
  subscription,
  notice,
}: SubscriptionViewProps) {
  const t = useTranslations('billing');
  const headingId = useId();
  const chip = subscriptionStatusChips[subscription.status];
  const canceled = subscription.status === 'CANCELED';
  const rows = canceled ? [] : periodRows(t, subscription);
  const messageClass =
    subscription.status === 'PAST_DUE'
      ? 'text-error-700'
      : subscription.status === 'INCOMPLETE'
        ? 'text-warning-800'
        : 'text-text-secondary';

  return (
    <div className="flex w-full flex-col gap-4">
      <h1 className="text-headline-sm text-text-primary">
        {t('mySubscription.title')}
      </h1>

      <section
        aria-labelledby={headingId}
        className="flex animate-fade-up flex-col gap-4 rounded-2xl bg-pure-white p-5 shadow-md"
      >
        <div className="flex items-center gap-4">
          <PlanEmblem slug={subscription.plan.slug} />
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <div className="flex items-start justify-between gap-3">
              <h2 id={headingId} className="text-title-md text-text-primary">
                {subscription.plan.name}
              </h2>
              <StateChip tone={chip.tone}>
                {t(`billingStatus.${chip.label}`)}
              </StateChip>
            </div>
            <p className="text-text-primary">
              <span className="text-subtitle-l font-bold">
                {formatBillingAmount(subscription.price)}
              </span>{' '}
              <span className="text-body-md">{t('plans.perMonth')}</span>
            </p>
          </div>
        </div>
        {/* With a notice in front, the notice tells the state and its deadline: the card does not repeat it. */}
        {notice === null ? (
          <p className={cn('text-body-md', messageClass)}>
            {statusMessage(t, subscription)}
          </p>
        ) : null}
        {rows.length > 0 ? (
          <DetailList items={rows} className="border-t border-divider pt-4" />
        ) : null}
      </section>

      {notice ? (
        <NoticePanel notice={notice} payHref={routes.subscriptionPay()} />
      ) : null}

      {canceled ? (
        <Button asChild block shape="soft">
          <Link href={routes.subscriptionPay()}>
            {t('mySubscription.subscribeAgain')}
          </Link>
        </Button>
      ) : null}
    </div>
  );
}
