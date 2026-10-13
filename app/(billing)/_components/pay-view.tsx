'use client';

import { useEffect, useState } from 'react';

import ArrowBack from '@material-symbols/svg-400/rounded/arrow_back.svg?svgr';
import CloudOff from '@material-symbols/svg-400/rounded/cloud_off.svg?svgr';
import HourglassTop from '@material-symbols/svg-400/rounded/hourglass_top.svg?svgr';
import TaskAlt from '@material-symbols/svg-400/rounded/task_alt.svg?svgr';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';

import { track } from '@/app/lib/analytics/track';
import { failureMessageKey, isApiError } from '@/app/lib/api/errors';
import type { SessionUser } from '@/app/lib/firebase/client';
import {
  billingKeys,
  subscriptionQueryOptions,
  couponRejectionKey,
  payableInvoiceQueryOptions,
  startPayment,
  subscribe,
  type Subscribed,
} from '@/app/lib/queries/billing';
import {
  coversFully,
  intentInReview,
  isPayable,
  type InvoiceDetail,
  type OfferedPlan,
  type PaymentMethod,
  type StartedPayment,
  type Subscription,
} from '@/app/lib/schemas/billing';

import { Button } from '@/app/ui/button';
import { EmptyState } from '@/app/ui/empty-state';
import { Icon } from '@/app/ui/icons';
import { StateChip } from '@/app/ui/state-chip';
import { toast } from '@/app/ui/toast';

import { useFocusHeading } from '@/app/hooks/use-focus-heading';

import { CouponSheet } from './coupon-sheet';
import { MethodStep } from './method-step';
import { PaySkeleton } from './pay-skeleton';
import { PaymentDone } from './payment-done';
import { PaymentStep } from './payment-step';

import type { AppliedCoupon, PaymentOutcome } from './payment-types';

/** Taking a plan, or paying the receipt a subscription owes. */
export type PayMode =
  | { kind: 'contract'; plan: OfferedPlan }
  | { kind: 'invoice'; subscription: Subscription };

type PayViewProps = {
  user: SessionUser;
  mode: PayMode;
  /** To the plans, or to the subscription: where the person came from. */
  onBack: () => void;
  /** The flow stopped making sense here — a plan already taken, a payment in review: the subscription says it. */
  onExit: () => void;
};

type Step = 'method' | 'pay' | 'done';

type StartResult =
  | { kind: 'started'; method: PaymentMethod; started: StartedPayment }
  | { kind: 'activated'; created: Subscribed };

/*
 * The payment, in two steps (the app's seven pages, one transaction): how
 * to pay, then pay and report. Taking a plan creates the subscription when
 * the method is chosen — the latest the API allows: without a subscription
 * there is no receipt, and without a receipt no amount in bolívares nor
 * accounts to pay into. Until then the plan and the coupons can be looked
 * at without leaving anything created. Paying a receipt that exists starts
 * from the same first step.
 */
export function PayView({ user, mode, onBack, onExit }: PayViewProps) {
  const t = useTranslations('billing');
  const tRoot = useTranslations();
  const queryClient = useQueryClient();
  const [step, setStep] = useState<Step>('method');
  const [subscribed, setSubscribed] = useState<Subscribed | null>(null);
  const [coupon, setCoupon] = useState<AppliedCoupon | null>(null);
  const [couponOpen, setCouponOpen] = useState(false);
  const [payment, setPayment] = useState<{
    method: PaymentMethod;
    started: StartedPayment;
  } | null>(null);
  const [outcome, setOutcome] = useState<PaymentOutcome | null>(null);

  const payable = useQuery(
    payableInvoiceQueryOptions(
      user,
      mode.kind === 'invoice' ? mode.subscription : null,
    ),
  );

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [step]);
  // Each step's title takes the focus: the button that led there is gone.
  const frame = useFocusHeading(step);

  const plan = mode.kind === 'contract' ? mode.plan : null;
  const invoice: InvoiceDetail | null =
    mode.kind === 'contract'
      ? (subscribed?.invoice ?? null)
      : (payable.data ?? null);
  const canUseCoupon = plan !== null && subscribed === null;
  const free =
    canUseCoupon &&
    coupon !== null &&
    coversFully(coupon.terms, plan.price.amount);

  const refreshBilling = () => {
    void queryClient.invalidateQueries({
      queryKey: billingKeys.subscription(user.id),
    });
    void queryClient.invalidateQueries({
      queryKey: billingKeys.payables(user.id),
    });
  };

  /*
   * A subscription is already on its way (ERR_5071) and it is not this one:
   * back to the subscription, read again, and the app's words — the plan of
   * one still unpaid is named, since it must be paid or dropped first.
   */
  const leaveForTheSubscription = () => {
    refreshBilling();
    onExit();
    void queryClient
      .query(subscriptionQueryOptions(user))
      .then(({ subscription }) => {
        toast(
          subscription?.status === 'INCOMPLETE'
            ? t('acquire.otherUnpaid', { plan: subscription.plan.name })
            : t('acquire.alreadySubscribed'),
        );
      })
      .catch(() => {
        toast(t('acquire.alreadySubscribed'));
      });
  };

  const planName = (() => {
    if (plan) return plan.name;
    if (mode.kind !== 'invoice') return '';
    const upgrade = mode.subscription.pendingUpgrade;
    return upgrade != null && invoice?.id === upgrade.invoiceId
      ? upgrade.plan.name
      : mode.subscription.plan.name;
  })();

  /** The coupon no longer serves: it is taken off and the reason told; taking the plan without it is one tap away. */
  const dropCoupon = (error: unknown): boolean => {
    const key = couponRejectionKey(error);
    if (!key || coupon === null) return false;
    setCoupon(null);
    toast.warning(t('acquire.couponDropped'), { description: tRoot(key) });
    return true;
  };

  const onCreated = (created: Subscribed, wasFree: boolean) => {
    setSubscribed(created);
    refreshBilling();
    track('web_subscription_created', {
      coupon: coupon !== null,
      free: wasFree && created.invoice === null,
    });
  };

  // What a result does to the page goes in each `mutate` call, not here:
  // those callbacks do not run once the person has left the step.
  const start = useMutation({
    mutationFn: async (method: PaymentMethod): Promise<StartResult> => {
      let detail = invoice;
      if (detail === null) {
        if (plan === null) throw new Error('Nothing to pay');
        const created = await subscribe(user, {
          plan,
          coupon: coupon?.choice ?? null,
          free: false,
        });
        // Kept at once: if fixing the amount fails next, the subscription exists.
        onCreated(created, false);
        if (created.invoice === null) return { kind: 'activated', created };
        detail = created.invoice;
      }
      const started = await startPayment(user, detail.id, method);
      return { kind: 'started', method, started };
    },
  });

  const onStarted = (result: StartResult) => {
    if (result.kind === 'activated') {
      setOutcome({
        kind: 'activated',
        planName,
        couponCode: coupon?.terms.code ?? null,
      });
      setStep('done');
      return;
    }
    setPayment({ method: result.method, started: result.started });
    setStep('pay');
  };

  const onStartFailed = (error: unknown) => {
    if (dropCoupon(error)) return;
    if (!isApiError(error)) return;
    if (error.code === 'ERR_5074') {
      // The plan is no longer offered: back to the catalog, refreshed.
      void queryClient.invalidateQueries({ queryKey: billingKeys.plans() });
      toast(t('acquire.planUnavailable'));
      onBack();
    } else if (error.code === 'ERR_5071') {
      leaveForTheSubscription();
    }
  };

  const activate = useMutation({
    mutationFn: () => {
      if (plan === null || coupon === null)
        throw new Error('Nothing to activate');
      return subscribe(user, { plan, coupon: coupon.choice, free: true });
    },
    // The subscription exists whatever the page does next.
    onSuccess: (created) => {
      onCreated(created, true);
    },
  });

  const onActivated = (created: Subscribed) => {
    if (created.invoice === null) {
      setOutcome({
        kind: 'activated',
        planName,
        couponCode: coupon?.terms.code ?? null,
      });
      setStep('done');
    }
    // Else the API charged something after all: the receipt's totals take over and the methods show.
  };

  const onActivateFailed = (error: unknown) => {
    if (dropCoupon(error)) return;
    if (isApiError(error) && error.code === 'ERR_5071') {
      leaveForTheSubscription();
    }
  };

  const startError = start.error ?? activate.error;
  const noRate =
    isApiError(startError) && startError.code === 'ERR_5085'
      ? subscribed
        ? 'subscribed'
        : 'fresh'
      : null;
  const startFailureKey =
    startError && noRate === null && couponRejectionKey(startError) === null
      ? failureMessageKey(startError, 'billing.acquire.method.failed')
      : null;

  return (
    // `contents`: a handle for the focus, no box of its own.
    <div ref={frame} className="contents">
      {content()}
    </div>
  );

  function content() {
    if (step === 'done' && outcome) return <PaymentDone outcome={outcome} />;

    if (mode.kind === 'invoice') {
      if (payable.isPending) return <PaySkeleton />;
      // Only when there is nothing to show: a failed re-read keeps the receipt.
      if (payable.isLoadingError) {
        return (
          <EmptyState
            tone="error"
            headingLevel={1}
            icon={CloudOff}
            title={t('pay.loadErrorTitle')}
            description={t('pay.loadErrorDescription')}
            action={
              <Button
                shape="soft"
                loading={payable.isFetching}
                onClick={() => {
                  void payable.refetch();
                }}
              >
                {tRoot('retry')}
              </Button>
            }
          />
        );
      }
      if (invoice === null || !isPayable(invoice)) {
        return (
          <EmptyState
            headingLevel={1}
            icon={TaskAlt}
            title={t('report.nothingTitle')}
            description={t('report.nothingDescription')}
            action={
              <Button shape="soft" onClick={onBack}>
                {t('report.nothingAction')}
              </Button>
            }
          />
        );
      }
      if (intentInReview(invoice)) {
        // A payment already waits for an admin: reporting another would double it.
        return (
          <EmptyState
            headingLevel={1}
            icon={HourglassTop}
            title={t('pay.inReviewTitle')}
            description={t('pay.inReviewDescription')}
            action={
              <Button shape="soft" onClick={onBack}>
                {t('report.nothingAction')}
              </Button>
            }
          />
        );
      }
    }

    const paying = step === 'pay' && payment !== null && invoice !== null;

    return (
      <div className="flex w-full flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={
              paying
                ? () => {
                    setStep('method');
                  }
                : onBack
            }
            className="inline-flex min-h-touch items-center gap-1 rounded-lg pr-2 text-label-lg text-primary outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <Icon icon={ArrowBack} size={20} />
            {paying ? t('pay.changeMethod') : tRoot('back')}
          </button>
          {planName ? (
            <StateChip tone="info">
              {t('acquire.planBadge', { plan: planName })}
            </StateChip>
          ) : null}
        </div>

        <header className="flex flex-col gap-1">
          <p className="text-label-md text-text-secondary">
            {t('acquire.step', { current: paying ? 2 : 1, total: 2 })}
          </p>
          <h1 className="text-headline-sm text-text-primary">
            {paying
              ? t('acquire.instructions.title')
              : t('acquire.method.title')}
          </h1>
          <p className="text-body-md text-text-secondary">
            {paying
              ? t('acquire.instructions.description')
              : t('acquire.method.description')}
          </p>
        </header>

        {paying ? (
          <PaymentStep
            user={user}
            invoice={invoice}
            method={payment.method}
            payment={payment.started}
            onPaymentRefreshed={(started) => {
              setPayment({ method: payment.method, started });
            }}
            onReported={(result) => {
              setOutcome(result);
              setStep('done');
              refreshBilling();
            }}
            onInReview={() => {
              refreshBilling();
              onExit();
            }}
          />
        ) : (
          <MethodStep
            plan={plan}
            coupon={canUseCoupon ? coupon : null}
            invoice={invoice}
            free={free}
            startingMethod={start.isPending ? start.variables : null}
            activating={activate.isPending}
            noRate={noRate}
            failure={startFailureKey ? tRoot(startFailureKey) : null}
            onSelect={(method) => {
              if (start.isPending || activate.isPending) return;
              start.mutate(method, {
                onSuccess: onStarted,
                onError: onStartFailed,
              });
            }}
            onActivateFree={() => {
              if (start.isPending || activate.isPending) return;
              activate.mutate(undefined, {
                onSuccess: onActivated,
                onError: onActivateFailed,
              });
            }}
            onCoupon={
              canUseCoupon
                ? () => {
                    setCouponOpen(true);
                  }
                : null
            }
          />
        )}

        {plan ? (
          <CouponSheet
            open={couponOpen}
            onOpenChange={setCouponOpen}
            user={user}
            plan={plan}
            applied={coupon}
            onApply={setCoupon}
            onRemove={() => {
              setCoupon(null);
            }}
          />
        ) : null}
      </div>
    );
  }
}
