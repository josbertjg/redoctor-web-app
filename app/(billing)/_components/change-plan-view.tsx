'use client';

import { useId, useState } from 'react';

import Link from 'next/link';

import ArrowBack from '@material-symbols/svg-400/rounded/arrow_back.svg?svgr';
import CheckCircleFill from '@material-symbols/svg-400/rounded/check_circle-fill.svg?svgr';
import CloudOff from '@material-symbols/svg-400/rounded/cloud_off.svg?svgr';
import EventRepeat from '@material-symbols/svg-400/rounded/event_repeat.svg?svgr';
import TaskAlt from '@material-symbols/svg-400/rounded/task_alt.svg?svgr';
import WorkspacePremium from '@material-symbols/svg-400/rounded/workspace_premium.svg?svgr';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';

import { track } from '@/app/lib/analytics/track';
import { failureMessageKey, isApiError } from '@/app/lib/api/errors';
import type { SessionUser } from '@/app/lib/firebase/client';
import { formatDate } from '@/app/lib/format/dates';
import { formatBillingAmount, formatRate } from '@/app/lib/format/money';
import {
  billingKeys,
  changePlan,
  planChangePreviewQueryOptions,
  plansQueryOptions,
  type PlanChanged,
} from '@/app/lib/queries/billing';
import { routes } from '@/app/lib/routes';
import {
  activeDiscount,
  previewQuote,
  type OfferedPlan,
  type PaymentQuote,
  type PlanChangePreview,
  type Subscription,
} from '@/app/lib/schemas/billing';

import { PlanEmblem } from '@/app/ui/billing/plan-emblem';
import { Button } from '@/app/ui/button';
import { Checkbox } from '@/app/ui/checkbox';
import { EmptyState } from '@/app/ui/empty-state';
import { FieldError } from '@/app/ui/field-error';
import { Icon } from '@/app/ui/icons';
import { useSkeletonHold } from '@/app/ui/motion/skeleton-hold';

import { useFocusHeading } from '@/app/hooks/use-focus-heading';

import { DetailList, type DetailItem } from './detail-list';
import { PaySkeleton } from './pay-skeleton';
import { planBenefitWords } from './plan-benefits';

type ChangePlanViewProps = {
  user: SessionUser;
  /** An active subscription that can change (`canChangePlan`). */
  subscription: Subscription;
  /** The plan asked for, by its slug (`?plan=`, or the plans' choice). */
  planSlug: string;
  /** Reached from the plans: the way back returns there. */
  backToPlans: boolean;
  /**
   * An upgrade with something to pay: the payment's steps take over with
   * the preview's quote (REDOC-363). Nothing is written until «Confirmar».
   */
  onPay: (upgrade: {
    plan: OfferedPlan;
    quote: PaymentQuote;
    acceptDiscountLoss: boolean;
  }) => void;
  /** To the plans, or to «Mi suscripción»: where the person came from. */
  onBack: () => void;
  /** «Mantener mi plan»: to «Mi suscripción». */
  onKeep: () => void;
};

/** A refusal the API explains in its own words (a receipt owed, a limit): no retry changes it. */
const isRefusal = (error: unknown) =>
  isApiError(error) &&
  error.kind === 'http' &&
  error.status !== undefined &&
  error.status >= 400 &&
  error.status < 500 &&
  error.messageKey.startsWith('apiErrors.billingErrors.');

/*
 * Changing the plan of an active subscription, before paying it (the app's
 * PlanChangeSheet; the owner's rule of 2026-10-13: a feature the plan lacks
 * invites here, `?plan=`). The API's preview says what the change does: an
 * upgrade pays now the part of the month left with the new plan — the
 * receipt's lines, less the balance — and applies once that payment is
 * approved; its quote goes on to the payment's two steps, and the change
 * and its payment are sent together at «Confirmar» (REDOC-363). A downgrade
 * costs nothing and applies at the period's end; when the active offices do
 * not fit the new plan, the preview names the ones that turn off then (the
 * newest; the owner's call of 2026-10-02) and the person accepts it. A
 * coupon the change ends is said, and its loss accepted, before anything
 * is written.
 */
export function ChangePlanView({
  user,
  subscription,
  planSlug,
  backToPlans,
  onPay,
  onBack,
  onKeep,
}: ChangePlanViewProps) {
  const t = useTranslations('billing');
  const tRoot = useTranslations();
  const queryClient = useQueryClient();
  const plans = useQuery(plansQueryOptions(user));
  const plan = plans.data?.find((offered) => offered.slug === planSlug) ?? null;
  const preview = useQuery({
    ...planChangePreviewQueryOptions(user, plan?.id ?? ''),
    enabled: plan !== null,
  });
  const [accepted, setAccepted] = useState(false);
  const [acceptedOffices, setAcceptedOffices] = useState(false);
  // The skeleton crossfades into what arrives (AGENTS.md §8, rule 13).
  const holdingPlans = useSkeletonHold(plans.isPending);
  const holdingPreview = useSkeletonHold(preview.isPending);
  const [askedToAccept, setAskedToAccept] = useState(false);
  const [askedOffices, setAskedOffices] = useState(false);
  const [done, setDone] = useState<PlanChanged | null>(null);
  const change = useMutation({
    mutationFn: (body: Parameters<typeof changePlan>[1]) =>
      changePlan(user, body),
  });

  // The outcome's title takes the focus: the button that led there is gone.
  const frame = useFocusHeading(done === null ? 'change' : 'done');
  const failureKey = change.error
    ? failureMessageKey(change.error, 'billing.planChange.failed')
    : null;

  const onChanged = (changed: PlanChanged) => {
    track('web_subscription_plan_changed', {
      kind: changed.kind === 'DOWNGRADE' ? 'downgrade' : 'upgrade',
    });
    void queryClient.invalidateQueries({
      queryKey: billingKeys.subscription(user.id),
    });
    void queryClient.invalidateQueries({
      queryKey: billingKeys.payables(user.id),
    });
    setDone(changed);
  };

  const onChangeFailed = (error: unknown) => {
    // The coupon's fate changed since the preview: read it again, so the
    // page says it and asks to accept its loss.
    if (isApiError(error) && error.code === 'ERR_5108') {
      void preview.refetch();
    }
  };

  return (
    // `contents`: a handle for the focus, no box of its own.
    <div ref={frame} className="contents">
      {content()}
    </div>
  );

  function content() {
    if (done) return <ChangeDone changed={done} planName={plan?.name ?? ''} />;

    if (plans.isPending || holdingPlans) return <PaySkeleton />;
    if (plans.isError) {
      return (
        <LoadError
          retrying={plans.isFetching}
          onRetry={() => {
            void plans.refetch();
          }}
        />
      );
    }

    if (plan === null) {
      return (
        <EmptyState
          headingLevel={1}
          icon={WorkspacePremium}
          title={t('planChange.unavailableTitle')}
          description={t('planChange.unavailableDescription')}
          action={<SubscriptionLink />}
        />
      );
    }

    if (preview.isPending || holdingPreview) return <PaySkeleton />;
    if (preview.isError) {
      return isRefusal(preview.error) ? (
        <EmptyState
          headingLevel={1}
          icon={WorkspacePremium}
          title={t('planChange.refusedTitle')}
          description={tRoot(
            failureMessageKey(preview.error, 'billing.planChange.failed') ??
              'billing.planChange.failed',
          )}
          action={<SubscriptionLink />}
        />
      ) : (
        <LoadError
          retrying={preview.isFetching}
          onRetry={() => {
            void preview.refetch();
          }}
        />
      );
    }

    const data = preview.data;
    return (
      <ChangeSummary
        subscription={subscription}
        plan={plan}
        preview={data}
        accepted={accepted}
        askedToAccept={askedToAccept}
        onAccepted={setAccepted}
        acceptedOffices={acceptedOffices}
        askedOffices={askedOffices}
        onAcceptedOffices={setAcceptedOffices}
        changing={change.isPending}
        failure={failureKey ? tRoot(failureKey) : null}
        retrying={preview.isFetching}
        onRetry={() => {
          void preview.refetch();
        }}
        backToPlans={backToPlans}
        onBack={onBack}
        onKeep={onKeep}
        onConfirm={() => {
          if (change.isPending) return;
          const losesCoupon = data.discountEffect === 'ENDS';
          if (losesCoupon && !accepted) {
            setAskedToAccept(true);
            return;
          }
          if (data.kind === 'DOWNGRADE') {
            const turnsOff = data.officesToDeactivate.length > 0;
            if (turnsOff && !acceptedOffices) {
              setAskedOffices(true);
              return;
            }
            change.mutate(
              {
                planId: plan.id,
                acceptDiscountLoss: losesCoupon,
                acceptOfficeDeactivation: turnsOff,
              },
              { onSuccess: onChanged, onError: onChangeFailed },
            );
            return;
          }
          const quote = previewQuote(data);
          // Something to pay: the payment's steps, with the change sent at «Confirmar».
          if (quote?.requiresPayment) {
            onPay({ plan, quote, acceptDiscountLoss: losesCoupon });
            return;
          }
          // Without a rate of the day there is no figure to pay yet.
          if (quote === null && upgradeToPay(data).amount > 0) return;
          // Nothing to pay (the balance covers it): changed at once.
          change.mutate(
            {
              planId: plan.id,
              acceptDiscountLoss: losesCoupon,
              quoted: quote
                ? { quoteId: quote.id, method: null, payment: null }
                : null,
            },
            { onSuccess: onChanged, onError: onChangeFailed },
          );
        }}
      />
    );
  }
}

type ChangeSummaryProps = {
  subscription: Subscription;
  plan: OfferedPlan;
  preview: PlanChangePreview;
  accepted: boolean;
  askedToAccept: boolean;
  onAccepted: (accepted: boolean) => void;
  /** A downgrade that turns offices off: the person accepted it. */
  acceptedOffices: boolean;
  askedOffices: boolean;
  onAcceptedOffices: (accepted: boolean) => void;
  changing: boolean;
  /** Why the change failed, in words; null when there is nothing to add (no connection: the global notice says it). */
  failure: string | null;
  /** The preview read again, for a rate of the day that was missing. */
  retrying: boolean;
  onRetry: () => void;
  backToPlans: boolean;
  onBack: () => void;
  onKeep: () => void;
  onConfirm: () => void;
};

/** What an upgrade leaves to pay now: the difference less the balance. */
function upgradeToPay(preview: PlanChangePreview) {
  return preview.payableUsd ?? preview.total;
}

/** The change before it is made: the plan, what it costs now and from the renewal, the coupon's fate. */
function ChangeSummary({
  subscription,
  plan,
  preview,
  accepted,
  askedToAccept,
  onAccepted,
  acceptedOffices,
  askedOffices,
  onAcceptedOffices,
  changing,
  failure,
  retrying,
  onRetry,
  backToPlans,
  onBack,
  onKeep,
  onConfirm,
}: ChangeSummaryProps) {
  const t = useTranslations('billing');
  const tRoot = useTranslations();
  const planHeadingId = useId();
  const todayHeadingId = useId();
  const failureId = useId();

  const downgrade = preview.kind === 'DOWNGRADE';
  const toPay = upgradeToPay(preview);
  const payNow = !downgrade && toPay.amount > 0;
  const quote = downgrade ? null : previewQuote(preview);
  // An upgrade to pay, and no rate of the day to put it in bolívares.
  const noRate = payNow && quote === null;
  const officesOff = downgrade ? preview.officesToDeactivate : [];
  const effective = preview.effectiveAt
    ? formatDate(preview.effectiveAt)
    : null;
  const code = activeDiscount(subscription)?.code ?? null;

  const intro = downgrade
    ? effective
      ? t('planChange.downgradeIntro', { plan: plan.name, date: effective })
      : t('planChange.downgradeIntroNoDate', { plan: plan.name })
    : preview.courtesyCovered
      ? t('planChange.upgradeCourtesy')
      : t('planChange.upgradeIntro');

  const balance = preview.balanceApplied;
  const today: DetailItem[] = [
    ...preview.lines.map((line, index) => ({
      key: `line-${String(index)}`,
      label: line.description,
      value: formatBillingAmount(line.amount),
    })),
    ...(balance && balance.amount > 0
      ? [
          {
            key: 'balance',
            label: t('acquire.totals.balance'),
            value: formatBillingAmount({
              amount: -balance.amount,
              currency: balance.currency,
            }),
          },
        ]
      : []),
    {
      key: 'total',
      label: t('planChange.toPayNow'),
      value: formatBillingAmount(toPay),
      strong: true,
    },
  ];

  return (
    <div className="flex w-full flex-col gap-4">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex min-h-touch w-fit items-center gap-1 rounded-lg pr-2 text-label-lg text-primary outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <Icon icon={ArrowBack} size={20} />
        {backToPlans ? tRoot('back') : t('mySubscription.title')}
      </button>

      <header className="flex flex-col gap-2">
        <h1 className="text-headline-sm text-text-primary">
          {t('planChange.title', { plan: plan.name })}
        </h1>
        <p className="text-body-md text-text-secondary">{intro}</p>
      </header>

      <section
        aria-labelledby={planHeadingId}
        className="flex animate-fade-up flex-col gap-3 rounded-2xl bg-pure-white p-5 shadow-md"
      >
        <div className="flex items-center gap-3">
          <PlanEmblem slug={plan.slug} size="sm" />
          <div className="flex min-w-0 flex-col">
            <h2 id={planHeadingId} className="text-title-md text-text-primary">
              {plan.name}
            </h2>
            <p>
              <span className="text-subtitle-s font-bold text-text-primary">
                {formatBillingAmount(plan.price.amount)}
              </span>{' '}
              <span className="text-body-md text-text-secondary">
                {t('plans.perMonth')}
              </span>
            </p>
          </div>
        </div>
        <ul className="flex flex-col gap-1.5">
          {planBenefitWords(t, plan).map((benefit) => (
            <li
              key={benefit}
              className="flex items-start gap-2 text-body-sm text-text-primary"
            >
              <Icon
                icon={CheckCircleFill}
                size={16}
                className="mt-0.5 shrink-0 text-primary"
              />
              {benefit}
            </li>
          ))}
        </ul>
        <p className="text-body-sm text-text-secondary">
          {t('planChange.currentPlan', { plan: subscription.plan.name })}{' '}
          {t('planChange.monthlyPrice', {
            price: formatBillingAmount(plan.price.amount),
          })}
          {preview.discountEffect === 'KEEPS' && code
            ? ` ${t('planChange.discountKeeps', { code })}`
            : null}
        </p>
      </section>

      {downgrade ? null : (
        <section
          aria-labelledby={todayHeadingId}
          className="animate-fade-up rounded-2xl bg-pure-white p-5 shadow-md"
        >
          <h2
            id={todayHeadingId}
            className="mb-3 text-title-sm text-text-primary"
          >
            {t('acquire.totals.title')}
          </h2>
          <DetailList items={today} />
          {quote?.requiresPayment ? (
            <p className="mt-2 text-right text-body-sm text-text-secondary">
              {t('acquire.totals.inBolivars', {
                amount: formatBillingAmount(quote.payableVes),
                rate: formatRate(quote.rate),
              })}
            </p>
          ) : null}
        </section>
      )}

      {noRate ? (
        <div
          role="status"
          className="flex animate-fade-in flex-col items-start gap-3 rounded-2xl bg-warning-50 p-4"
        >
          <p className="text-body-md text-warning-800">{t('pay.noRate')}</p>
          <Button
            variant="white"
            size="small"
            shape="soft"
            loading={retrying}
            onClick={onRetry}
          >
            {tRoot('retry')}
          </Button>
        </div>
      ) : null}

      {preview.discountEffect === 'ENDS' ? (
        <div className="flex animate-fade-up flex-col gap-1 rounded-2xl bg-warning-light p-4">
          <p className="text-body-md text-text-primary">
            {code
              ? t('planChange.discountEnds', { code })
              : t('planChange.discountEndsNoCode')}
          </p>
          <Checkbox
            label={t('planChange.acceptDiscountLoss')}
            checked={accepted}
            onChange={(event) => {
              onAccepted(event.target.checked);
            }}
            error={
              askedToAccept && !accepted
                ? t('planChange.acceptDiscountLossError')
                : undefined
            }
          />
        </div>
      ) : null}

      {officesOff.length > 0 ? (
        <div className="flex animate-fade-up flex-col gap-2 rounded-2xl bg-warning-light p-4">
          <p className="text-title-sm text-text-primary">
            {t('planChange.officesOff.title', { count: officesOff.length })}
          </p>
          <p className="text-body-md text-text-primary">
            {t('planChange.officesOff.description', {
              plan: plan.name,
              limit: plan.maxActiveClinics ?? 0,
              count: officesOff.length,
            })}
          </p>
          <ul className="flex list-disc flex-col gap-1 pl-6 text-body-md text-text-primary">
            {officesOff.map((office) => (
              <li key={office.id}>{office.name}</li>
            ))}
          </ul>
          <Checkbox
            label={t('planChange.officesOff.accept', { plan: plan.name })}
            checked={acceptedOffices}
            onChange={(event) => {
              onAcceptedOffices(event.target.checked);
            }}
            error={
              askedOffices && !acceptedOffices
                ? t('planChange.officesOff.acceptError')
                : undefined
            }
          />
        </div>
      ) : null}

      <div className="flex flex-col gap-3">
        {noRate ? null : (
          <Button
            block
            shape="soft"
            loading={changing}
            aria-describedby={failure ? failureId : undefined}
            onClick={onConfirm}
          >
            {downgrade
              ? t('planChange.confirmDowngrade')
              : payNow
                ? t('planChange.confirmUpgrade')
                : t('planChange.confirmUpgradeFree')}
          </Button>
        )}
        <Button block variant="white" shape="soft" onClick={onKeep}>
          {t('planChange.keep')}
        </Button>
        <FieldError
          id={failureId}
          message={failure ?? undefined}
          className="text-center"
        />
      </div>
    </div>
  );
}

/** How the change ended when nothing is left to pay: scheduled, or already applied. */
function ChangeDone({
  changed,
  planName,
}: {
  changed: PlanChanged;
  planName: string;
}) {
  const t = useTranslations('billing');

  if (changed.kind === 'DOWNGRADE') {
    const scheduled = changed.subscription.scheduledChange;
    const effective = changed.effectiveAt ?? scheduled?.effectiveAt ?? null;
    const date = effective ? formatDate(effective) : null;
    const plan = scheduled?.plan.name ?? planName;
    return (
      <EmptyState
        headingLevel={1}
        icon={EventRepeat}
        title={
          date
            ? t('planChange.scheduled', { plan, date })
            : t('planChange.scheduledNoDate', { plan })
        }
        action={<SubscriptionLink />}
      />
    );
  }

  return (
    <EmptyState
      headingLevel={1}
      icon={TaskAlt}
      title={t('planChange.changed', {
        plan: changed.subscription.plan.name,
      })}
      action={<SubscriptionLink />}
    />
  );
}

function SubscriptionLink() {
  const t = useTranslations('billing');
  return (
    <Button asChild shape="soft">
      <Link href={routes.subscription()}>{t('payPage.upToDate.action')}</Link>
    </Button>
  );
}

function LoadError({
  retrying,
  onRetry,
}: {
  retrying: boolean;
  onRetry: () => void;
}) {
  const t = useTranslations('billing');
  const tRoot = useTranslations();
  return (
    <EmptyState
      tone="error"
      headingLevel={1}
      icon={CloudOff}
      title={t('planChange.loadErrorTitle')}
      description={t('planChange.loadErrorDescription')}
      action={
        <Button shape="soft" loading={retrying} onClick={onRetry}>
          {tRoot('retry')}
        </Button>
      }
    />
  );
}
