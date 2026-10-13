'use client';

import { useId } from 'react';

import CrownFill from '@material-symbols/svg-400/rounded/crown-fill.svg?svgr';
import { useTranslations } from 'next-intl';

import {
  formatDate,
  formatDateTime,
  formatPeriod,
} from '@/app/lib/format/dates';
import { formatBillingAmount } from '@/app/lib/format/money';
import {
  activeDiscount,
  planTier,
  subscriptionStatusChips,
  type PlanTier,
  type Subscription,
  type SubscriptionDiscount,
  type SubscriptionNotice,
} from '@/app/lib/schemas/billing';
import { cn } from '@/app/lib/utils';

import { Button } from '@/app/ui/button';
import { Icon } from '@/app/ui/icons';
import { StateChip } from '@/app/ui/state-chip';

import { DetailList, type DetailItem } from './detail-list';
import { NoticePanel } from './notice-panel';

type SubscriptionViewProps = {
  subscription: Subscription;
  /** What to tell about the billing, already resolved; null when the plan is simply at its stage. */
  notice: SubscriptionNotice | null;
  onPay: () => void;
  onSeePlans: () => void;
};

/** The crown's metal: bronze, silver and gold, from less to more. */
const emblems: Record<PlanTier, string> = {
  bronze: 'bg-orange-50 text-orange-500',
  silver: 'bg-silver-50 text-silver-600',
  gold: 'bg-warning-50 text-warning-500',
};

type Translate = ReturnType<typeof useTranslations<'billing'>>;

/** «20 % de descuento» or «$ 5 de descuento». */
function discountLabel(t: Translate, discount: SubscriptionDiscount): string {
  return discount.discountType === 'PERCENT'
    ? t('couponTerms.percent', { percent: discount.percentOff ?? 0 })
    : t('couponTerms.amount', {
        amount: discount.amountOff
          ? formatBillingAmount(discount.amountOff)
          : '',
      });
}

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
      value: discountLabel(t, discount),
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
 * to do, when there is one. The web shows the state and the way to pay;
 * changing plan, cancelling or resuming stay in the app for now.
 */
export function SubscriptionView({
  subscription,
  notice,
  onPay,
  onSeePlans,
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
          <span
            className={cn(
              'flex size-14 shrink-0 items-center justify-center rounded-full',
              emblems[planTier(subscription.plan.slug)],
            )}
          >
            <Icon icon={CrownFill} className="size-7" />
          </span>
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

      {notice ? <NoticePanel notice={notice} onPay={onPay} /> : null}

      {canceled ? (
        <Button block shape="soft" onClick={onSeePlans}>
          {t('mySubscription.subscribeAgain')}
        </Button>
      ) : null}
    </div>
  );
}
