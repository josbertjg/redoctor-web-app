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
import { formatBillingAmount } from '@/app/lib/format/money';
import {
  billingKeys,
  changePlan,
  planChangePreviewQueryOptions,
  plansQueryOptions,
  type PlanChanged,
} from '@/app/lib/queries/billing';
import { myOfficesQueryOptions } from '@/app/lib/queries/offices';
import { routes } from '@/app/lib/routes';
import {
  activeDiscount,
  type OfferedPlan,
  type PlanChangePreview,
  type Subscription,
} from '@/app/lib/schemas/billing';

import { PlanEmblem } from '@/app/ui/billing/plan-emblem';
import { Button } from '@/app/ui/button';
import { Checkbox } from '@/app/ui/checkbox';
import { EmptyState } from '@/app/ui/empty-state';
import { FieldError } from '@/app/ui/field-error';
import { Icon } from '@/app/ui/icons';

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
  /** An upgrade left the receipt of the difference: the payment's steps take over. */
  onPay: (subscription: Subscription) => void;
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
 * receipt's lines — and applies once that payment is approved, through the
 * payment's two steps; a downgrade costs nothing and applies at the
 * period's end. A coupon the change ends is said, and its loss accepted,
 * before anything is written.
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
  // A downgrade the active offices do not fit is refused before it is
  // asked (the app's check): only the app turns offices off.
  const limit = plan?.maxActiveClinics ?? null;
  const offices = useQuery({
    ...myOfficesQueryOptions(user),
    enabled: preview.data?.kind === 'DOWNGRADE' && limit !== null,
  });
  const activeOffices =
    offices.data?.filter((office) => office.isActive).length ?? 0;
  const officesOver =
    preview.data?.kind === 'DOWNGRADE' &&
    limit !== null &&
    activeOffices > limit
      ? { active: activeOffices, count: limit }
      : null;
  const [accepted, setAccepted] = useState(false);
  const [askedToAccept, setAskedToAccept] = useState(false);
  const [done, setDone] = useState<PlanChanged | null>(null);
  const change = useMutation({
    mutationFn: (body: { planId: string; acceptDiscountLoss: boolean }) =>
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
    if (changed.invoice) {
      // The receipt the payment reads: no second trip for it.
      queryClient.setQueryData(
        billingKeys.payable(user.id, changed.subscription.id),
        changed.invoice,
      );
      onPay(changed.subscription);
      return;
    }
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

    if (plans.isPending) return <PaySkeleton />;
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

    if (preview.isPending) return <PaySkeleton />;
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

    // A downgrade waits for the offices it is checked against (a failure
    // to read them leaves the check to the API: ERR_5076).
    if (
      preview.data.kind === 'DOWNGRADE' &&
      limit !== null &&
      offices.isPending
    ) {
      return <PaySkeleton />;
    }

    return (
      <ChangeSummary
        subscription={subscription}
        plan={plan}
        preview={preview.data}
        accepted={accepted}
        askedToAccept={askedToAccept}
        onAccepted={setAccepted}
        changing={change.isPending}
        failure={failureKey ? tRoot(failureKey) : null}
        officesOver={officesOver}
        backToPlans={backToPlans}
        onBack={onBack}
        onKeep={onKeep}
        onConfirm={() => {
          if (change.isPending) return;
          const losesCoupon = preview.data.discountEffect === 'ENDS';
          if (losesCoupon && !accepted) {
            setAskedToAccept(true);
            return;
          }
          change.mutate(
            { planId: plan.id, acceptDiscountLoss: losesCoupon },
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
  changing: boolean;
  /** Why the change failed, in words; null when there is nothing to add (no connection: the global notice says it). */
  failure: string | null;
  /** A downgrade the active offices do not fit: it cannot be asked. */
  officesOver: { active: number; count: number } | null;
  backToPlans: boolean;
  onBack: () => void;
  onKeep: () => void;
  onConfirm: () => void;
};

/** The change before it is made: the plan, what it costs now and from the renewal, the coupon's fate. */
function ChangeSummary({
  subscription,
  plan,
  preview,
  accepted,
  askedToAccept,
  onAccepted,
  changing,
  failure,
  officesOver,
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
  const payNow = !downgrade && preview.total.amount > 0;
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

  const today: DetailItem[] = [
    ...preview.lines.map((line, index) => ({
      key: `line-${String(index)}`,
      label: line.description,
      value: formatBillingAmount(line.amount),
    })),
    {
      key: 'total',
      label: t('planChange.toPayNow'),
      value: formatBillingAmount(preview.total),
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
        </section>
      )}

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

      {officesOver ? (
        <p className="animate-fade-up rounded-2xl bg-warning-light p-4 text-body-md text-text-primary">
          {t('planChange.officesBlocked', {
            active: officesOver.active,
            plan: plan.name,
            count: officesOver.count,
          })}
        </p>
      ) : null}

      <div className="flex flex-col gap-3">
        {officesOver ? null : (
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
