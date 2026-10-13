'use client';

import { useId, useState } from 'react';

import Link from 'next/link';

import Badge from '@material-symbols/svg-400/rounded/badge.svg?svgr';
import ConfirmationNumber from '@material-symbols/svg-400/rounded/confirmation_number.svg?svgr';
import EventBusy from '@material-symbols/svg-400/rounded/event_busy.svg?svgr';
import LocalActivity from '@material-symbols/svg-400/rounded/local_activity.svg?svgr';
import SwapVert from '@material-symbols/svg-400/rounded/swap_vert.svg?svgr';
import { useTranslations } from 'next-intl';

import type { SessionUser } from '@/app/lib/firebase/client';
import {
  formatDate,
  formatDateTime,
  formatPeriod,
} from '@/app/lib/format/dates';
import { formatBillingAmount } from '@/app/lib/format/money';
import { routes } from '@/app/lib/routes';
import {
  activeDiscount,
  canAbandon,
  canApplyCoupon,
  canCancel,
  canChangePlan,
  canResume,
  subscriptionStatusChips,
  type InvoiceDetail,
  type Subscription,
  type SubscriptionAction,
  type SubscriptionNotice,
} from '@/app/lib/schemas/billing';
import { cn } from '@/app/lib/utils';

import { NoticePanel } from '@/app/ui/billing/notice-panel';
import { PlanEmblem } from '@/app/ui/billing/plan-emblem';
import { Button } from '@/app/ui/button';
import { LinkCard } from '@/app/ui/link-card';
import { StateChip } from '@/app/ui/state-chip';
import { StatusCard } from '@/app/ui/status-card';

import { ApplyCouponSheet } from './apply-coupon-sheet';
import { BillingAccountSheet } from './billing-account-sheet';
import { Collapse } from './collapse';
import { couponDiscountLabel } from './coupon-words';
import { DetailList, type DetailItem } from './detail-list';
import { EntitlementsCard } from './entitlements-card';
import {
  askAbout,
  SubscriptionActionSheet,
  type AskedAction,
} from './subscription-action-sheet';
import { BalanceSection, RecentInvoices } from './subscription-sections';

type SubscriptionViewProps = {
  user: SessionUser;
  subscription: Subscription;
  /** What to tell about the billing, already resolved; null when the plan is simply at its stage. */
  notice: SubscriptionNotice | null;
  /** The receipt it owes, when one is owed and could be read: a payment in review keeps it from being dropped. */
  payable: InvoiceDetail | null;
  /** What the deadlines count from, decided once for the page. */
  now: Date;
  /** The API's access rule: whether what the plan includes is on now. */
  hasAccess: boolean;
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

/** The sheets «Mi suscripción» opens, one at a time. */
type SheetKind = 'action' | 'coupon' | 'account';

/*
 * «Mi suscripción», as the app's screen: which plan, what it costs, where
 * it stands and what that means — the notice with what to do, when there
 * is one —, what the plan includes, and from there everything about it:
 * resuming a plan asked to end, changing plan, a coupon on the plan in force, «Mis cupones», whom
 * the receipts are issued to, undoing a scheduled change, dropping a
 * subscription never paid, cancelling; then the balance and the latest
 * receipts. Paying, taking a plan again or choosing the new one is the
 * payment page's (`/pay`). What comes and goes as the subscription moves
 * unfolds and folds in place.
 */
export function SubscriptionView({
  user,
  subscription,
  notice,
  payable,
  now,
  hasAccess,
}: SubscriptionViewProps) {
  const t = useTranslations('billing');
  const headingId = useId();
  const [sheet, setSheet] = useState<SheetKind | null>(null);
  const [asked, setAsked] = useState<AskedAction | null>(null);

  const chip = subscriptionStatusChips[subscription.status];
  const canceled = subscription.status === 'CANCELED';
  const rows = canceled ? [] : periodRows(t, subscription);
  const messageClass =
    subscription.status === 'PAST_DUE'
      ? 'text-error-700'
      : subscription.status === 'INCOMPLETE'
        ? 'text-warning-800'
        : 'text-text-secondary';

  const ask = (action: SubscriptionAction) => {
    setAsked(askAbout(action, subscription));
    setSheet('action');
  };
  const sheetProps = (kind: SheetKind) => ({
    open: sheet === kind,
    onOpenChange: (open: boolean) => {
      setSheet(open ? kind : null);
    },
  });

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

      {/* Asked to end and still in time: it can be taken back. */}
      <Collapse open={canResume(subscription, now)}>
        <StatusCard
          icon={EventBusy}
          title={t('mySubscription.resumeTitle')}
          description={t('mySubscription.resumePrompt')}
        >
          <Button
            block
            shape="soft"
            aria-haspopup="dialog"
            onClick={() => {
              ask('resume');
            }}
          >
            {t('actions.resume.entry')}
          </Button>
        </StatusCard>
      </Collapse>

      {canceled ? null : (
        <EntitlementsCard
          user={user}
          subscription={subscription}
          hasAccess={hasAccess}
        />
      )}

      {canceled ? (
        <Button asChild block shape="soft">
          <Link href={routes.subscriptionPay()}>
            {t('mySubscription.subscribeAgain')}
          </Link>
        </Button>
      ) : null}

      <Collapse open={canChangePlan(subscription)}>
        <LinkCard
          href={routes.subscriptionPlans()}
          icon={SwapVert}
          title={t('mySubscription.changePlan.title')}
          description={t('mySubscription.changePlan.description')}
        />
      </Collapse>
      <Collapse open={canApplyCoupon(subscription)}>
        <LinkCard
          onClick={() => {
            setSheet('coupon');
          }}
          icon={ConfirmationNumber}
          title={t('manage.coupon.entry')}
          description={t('manage.coupon.sectionDescription')}
        />
      </Collapse>
      <LinkCard
        href={routes.subscriptionCoupons()}
        icon={LocalActivity}
        title={t('myCoupons.title')}
        description={t('myCoupons.entryDescription')}
      />
      <LinkCard
        onClick={() => {
          setSheet('account');
        }}
        icon={Badge}
        title={t('account.title')}
        description={t('account.entry')}
      />

      {/* What changes the subscription's course, at the foot. */}
      <Collapse open={subscription.scheduledChange != null}>
        <Button
          block
          variant="white"
          shape="soft"
          aria-haspopup="dialog"
          onClick={() => {
            ask('undoPlanChange');
          }}
        >
          {t('actions.undoPlanChange.entry')}
        </Button>
      </Collapse>
      <Collapse open={canAbandon(subscription, payable)}>
        <TextAction
          onClick={() => {
            ask('abandon');
          }}
        >
          {t('actions.abandon.entry')}
        </TextAction>
      </Collapse>
      {/* Loose and in words: the last thing to touch by accident, but hiding it would be worse. */}
      <Collapse open={canCancel(subscription)}>
        <TextAction
          onClick={() => {
            ask('cancel');
          }}
        >
          {t('actions.cancel.entry')}
        </TextAction>
      </Collapse>

      <BalanceSection user={user} />
      <RecentInvoices user={user} />

      <SubscriptionActionSheet
        user={user}
        asked={asked}
        {...sheetProps('action')}
      />
      <ApplyCouponSheet
        user={user}
        subscription={subscription}
        {...sheetProps('coupon')}
      />
      <BillingAccountSheet user={user} {...sheetProps('account')} />
    </div>
  );
}

/** An action that loses something, in words and in the error's color (the app's text buttons). */
function TextAction({
  onClick,
  children,
}: {
  onClick: () => void;
  children: string;
}) {
  return (
    <div className="flex justify-center">
      <button
        type="button"
        aria-haspopup="dialog"
        onClick={onClick}
        className="inline-flex min-h-touch items-center rounded-lg px-3 text-label-lg text-error-700 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        {children}
      </button>
    </div>
  );
}
