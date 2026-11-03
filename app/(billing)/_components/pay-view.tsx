'use client';

import { useEffect, useLayoutEffect, useState, type ReactNode } from 'react';

import ArrowBack from '@material-symbols/svg-400/rounded/arrow_back.svg?svgr';
import CloudOff from '@material-symbols/svg-400/rounded/cloud_off.svg?svgr';
import HourglassTop from '@material-symbols/svg-400/rounded/hourglass_top.svg?svgr';
import TaskAlt from '@material-symbols/svg-400/rounded/task_alt.svg?svgr';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';

import { track } from '@/app/lib/analytics/track';
import { failureMessageKey, isApiError } from '@/app/lib/api/errors';
import { bankByCode } from '@/app/lib/billing/banks';
import type { SessionUser } from '@/app/lib/firebase/client';
import {
  billingKeys,
  couponRejectionKey,
  invoiceQueryOptions,
  payableInvoiceQueryOptions,
  startPayment,
  subscriptionQueryOptions,
  type Confirmed,
} from '@/app/lib/queries/billing';
import {
  intentInReview,
  isPayable,
  offeredMethods,
  paymentMethods,
  type InvoiceDetail,
  type OfferedPlan,
  type PaymentMethod,
  type PaymentQuote,
  type PaymentReportBody,
  type StartedPayment,
  type Subscription,
} from '@/app/lib/schemas/billing';

import { Button } from '@/app/ui/button';
import { EmptyState } from '@/app/ui/empty-state';
import { Icon } from '@/app/ui/icons';
import { moveStep } from '@/app/ui/motion/directions';
import { wipeScreen } from '@/app/ui/motion/screen-wipe';
import { useSkeletonHold } from '@/app/ui/motion/skeleton-hold';
import { StepTransition } from '@/app/ui/motion/view-transitions';
import { StateChip } from '@/app/ui/state-chip';
import { toast } from '@/app/ui/toast';

import { useFocusHeading } from '@/app/hooks/use-focus-heading';

import { CouponSheet } from './coupon-sheet';
import { InvoicePaymentStep } from './invoice-payment-step';
import { MethodStep } from './method-step';
import { PaySkeleton } from './pay-skeleton';
import { PaymentDone } from './payment-done';
import { PaymentStep } from './payment-step';
import { QuoteChangedSheet } from './quote-changed-sheet';
import { useQuotedPayment, type QuotedKind } from './use-quoted-payment';

import type { PaymentOutcome } from './payment-types';

/**
 * Taking a plan, upgrading to one — both on a quote, nothing created
 * until «Confirmar» (REDOC-363) —, or paying a receipt that exists: the one
 * the subscription owes, or the one its page chose (`invoiceId`).
 */
export type PayMode =
  | { kind: 'contract'; plan: OfferedPlan }
  | {
      kind: 'upgrade';
      plan: OfferedPlan;
      /** The preview's quote, as the change's page read it. */
      quote: PaymentQuote;
      acceptDiscountLoss: boolean;
    }
  | { kind: 'invoice'; subscription: Subscription; invoiceId?: string };

type PayViewProps = {
  user: SessionUser;
  mode: PayMode;
  /** To the plans, the change, or the subscription: where the person came from. */
  onBack: () => void;
  /** The flow stopped making sense here — a plan already taken, a payment in review: the subscription says it. */
  onExit: () => void;
};

type Step = 'method' | 'pay' | 'done';

/** Every read of the billing a payment leaves old: the subscription, its receipts, the balance. */
function useRefreshBilling(user: SessionUser) {
  const queryClient = useQueryClient();
  return () => {
    for (const key of [
      billingKeys.subscription(user.id),
      billingKeys.payables(user.id),
      billingKeys.invoices(user.id),
      billingKeys.balance(user.id),
    ]) {
      void queryClient.invalidateQueries({ queryKey: key });
    }
  };
}

/*
 * The payment, in two steps (the app's seven pages): how to pay, then pay
 * and report. Its end is a big moment: the outcome arrives under the green
 * wipe (AGENTS.md §8, rule 13), with the billing read again under the
 * colour — read before, it would change the page around the colour's first
 * frames. The button pressed stays busy until then.
 */
export function PayView(props: PayViewProps) {
  return props.mode.kind === 'invoice' ? (
    <InvoicePayView {...props} mode={props.mode} />
  ) : (
    <QuotedPayView
      {...props}
      kind={props.mode.kind}
      plan={props.mode.plan}
      initialQuote={props.mode.kind === 'upgrade' ? props.mode.quote : null}
      acceptDiscountLoss={
        props.mode.kind === 'upgrade' ? props.mode.acceptDiscountLoss : false
      }
    />
  );
}

/** Where the person goes on and how the page reads: the back button, the plan, the step's count and title. */
function PayFrame({
  step,
  planName,
  onBack,
  onChangeMethod,
  children,
}: {
  step: 'method' | 'pay';
  planName: string;
  onBack: () => void;
  onChangeMethod: () => void;
  children: ReactNode;
}) {
  const t = useTranslations('billing');
  const tRoot = useTranslations();
  const paying = step === 'pay';

  return (
    <div className="flex w-full flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={paying ? onChangeMethod : onBack}
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
        {/* The step's title and its content go sideways together; the
            count above them stays. */}
        <StepTransition step={step}>
          <div className="flex flex-col gap-1">
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
          </div>
        </StepTransition>
      </header>

      <StepTransition step={step}>
        <div className="flex flex-col">{children}</div>
      </StepTransition>
    </div>
  );
}

/** The payment's end under the green wipe, the billing read again under the colour. */
function useFinish(
  user: SessionUser,
  setDone: (outcome: PaymentOutcome) => void,
) {
  const refreshBilling = useRefreshBilling(user);
  return (outcome: PaymentOutcome) => {
    void wipeScreen({
      tone: 'success',
      whileCovered: () => {
        refreshBilling();
        setDone(outcome);
      },
    });
  };
}

/*
 * Taking or upgrading a plan on its quote (REDOC-363): the quote is read as
 * the payment opens and creates nothing; choosing how to pay only picks the
 * account; «Confirmar» takes the plan — or the upgrade — and reports the
 * payment in one call. A coupon covering it all, or the balance, leaves
 * only «Activar mi plan».
 */
function QuotedPayView({
  user,
  kind,
  plan,
  initialQuote,
  acceptDiscountLoss,
  onBack,
  onExit,
}: Omit<PayViewProps, 'mode'> & {
  kind: QuotedKind;
  plan: OfferedPlan;
  initialQuote: PaymentQuote | null;
  acceptDiscountLoss: boolean;
}) {
  const t = useTranslations('billing');
  const tRoot = useTranslations();
  const queryClient = useQueryClient();
  const payment = useQuotedPayment({
    user,
    kind,
    plan,
    acceptDiscountLoss,
    initialQuote,
  });
  const [couponOpen, setCouponOpen] = useState(false);
  const [outcome, setOutcome] = useState<PaymentOutcome | null>(null);
  const finish = useFinish(user, setOutcome);
  const { quote, fresh, coupon, step, method, exit } = payment;

  // Before the step paints (a layout effect), so its transition starts at the top.
  const shownStep: Step = outcome ? 'done' : step;
  useLayoutEffect(() => {
    window.scrollTo({ top: 0 });
  }, [shownStep]);
  // Each step's title takes the focus: the button that led there is gone.
  const frame = useFocusHeading(shownStep);
  // The skeleton crossfades into the first quote (AGENTS.md §8, rule 13).
  const holding = useSkeletonHold(payment.resuming);

  // The plan gone, or a subscription already on its way: the page leaves,
  // with the app's words — the plan of one still unpaid is named, since it
  // must be paid or dropped first.
  useEffect(() => {
    if (exit === null) return;
    if (exit === 'planUnavailable') {
      void queryClient.invalidateQueries({ queryKey: billingKeys.plans() });
      toast(t('acquire.planUnavailable'));
      onBack();
      return;
    }
    onExit();
    void queryClient
      .query({ ...subscriptionQueryOptions(user), staleTime: 0 })
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
    // Once per exit: the page is leaving.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exit]);

  const onConfirmed = (
    confirmed: Confirmed,
    body: PaymentReportBody | null,
  ) => {
    if (kind === 'contract') {
      track('web_subscription_created', {
        coupon: coupon !== null,
        free: body === null,
      });
    } else {
      track('web_subscription_plan_changed', { kind: 'upgrade' });
    }
    if (body !== null && method !== null) {
      track('web_payment_reported', {
        method:
          method === 'MOBILE_PAYMENT' ? 'mobile_payment' : 'bank_transfer',
      });
      finish({
        kind: 'reported',
        method,
        amountVes: body.amountVes,
        bank: bankByCode(body.bankCode) ?? {
          code: body.bankCode,
          name: body.bankCode,
        },
        paidOn: body.paidOn,
      });
      return;
    }
    finish({
      kind: 'activated',
      planName: confirmed.subscription.plan.name || plan.name,
      couponCode: coupon?.terms.code ?? null,
    });
  };

  const confirmError = payment.confirm.error;
  const handled = new Set([
    'ERR_5125',
    'ERR_5124',
    'ERR_5126',
    'ERR_5127',
    'ERR_5074',
    'ERR_5071',
  ]);
  const failureKey = payment.requoteFailed
    ? 'billing.acquire.method.quoteError'
    : confirmError &&
        !(isApiError(confirmError) && handled.has(confirmError.code ?? ''))
      ? failureMessageKey(confirmError, 'billing.acquire.confirm.failed')
      : null;
  const failure = failureKey ? tRoot(failureKey) : null;
  // Busy from the tap until the page moves on under the colour.
  const busy =
    payment.confirm.isPending || payment.confirm.isSuccess || payment.finished;

  if (outcome) {
    return (
      <div ref={frame} className="contents">
        <PaymentDone outcome={outcome} />
      </div>
    );
  }
  if (payment.resuming || holding) return <PaySkeleton />;

  const quoteError = fresh.isError && quote === null ? fresh.error : null;
  const quoteFailure =
    quoteError === null ||
    (isApiError(quoteError) &&
      (quoteError.code === 'ERR_5074' || quoteError.code === 'ERR_5071'))
      ? null
      : isApiError(quoteError) &&
          (quoteError.code === 'ERR_5128' || quoteError.status === 429)
        ? {
            message: tRoot(
              failureMessageKey(
                quoteError,
                'billing.acquire.method.quoteError',
              ) ?? 'billing.acquire.method.quoteError',
            ),
            retrying: fresh.isFetching,
            onRetry: () => {
              void fresh.refetch();
            },
          }
        : {
            message:
              isApiError(quoteError) && quoteError.code === 'ERR_5085'
                ? t('pay.noRate')
                : t('acquire.method.quoteError'),
            retrying: fresh.isFetching,
            onRetry: () => {
              void fresh.refetch();
            },
          };

  return (
    // `contents`: a handle for the focus, no box of its own.
    <div ref={frame} className="contents">
      <PayFrame
        step={step}
        planName={plan.name}
        onBack={onBack}
        onChangeMethod={() => {
          moveStep('back', () => {
            payment.setStep('method');
          });
        }}
      >
        {step === 'pay' && quote !== null && method !== null ? (
          <PaymentStep
            method={method}
            amountVes={quote.payableVes}
            amountUsd={quote.payable}
            rate={quote.rate}
            validUntil={null}
            destination={quote.destination}
            initial={payment.report}
            expectedAmounts={[
              quote.payableVes.amount,
              ...payment.held.map((held) => held.payableVes.amount),
            ]}
            busy={busy}
            failure={failure}
            onSubmit={(body) => {
              payment.submit(body, { onConfirmed });
            }}
            onReportChange={payment.setReport}
          />
        ) : (
          <MethodStep
            totals={
              quote !== null ? { kind: 'quote', quote } : { kind: 'quoting' }
            }
            coupon={kind === 'contract' ? coupon : null}
            methods={quote !== null ? offeredMethods(quote.destination) : []}
            free={
              quote !== null && !quote.requiresPayment
                ? quote.balanceApplied.amount > 0 &&
                  !quote.lines.some((line) => line.type === 'DISCOUNT')
                  ? 'balance'
                  : 'coupon'
                : null
            }
            startingMethod={null}
            activating={busy}
            noRate={null}
            quoteFailure={quoteFailure}
            failure={
              payment.couponDropped
                ? `${t('acquire.couponDropped')} ${tRoot(payment.couponDropped)}`
                : failure
            }
            onSelect={(chosen) => {
              if (busy || quote === null) return;
              payment.chooseMethod(chosen);
              moveStep('forward', () => {
                payment.setStep('pay');
              });
            }}
            onActivateFree={() => {
              payment.submit(null, { onConfirmed });
            }}
            onCoupon={
              kind === 'contract'
                ? () => {
                    setCouponOpen(true);
                  }
                : null
            }
          />
        )}
      </PayFrame>

      {kind === 'contract' ? (
        <CouponSheet
          open={couponOpen}
          onOpenChange={setCouponOpen}
          user={user}
          plan={plan}
          applied={coupon}
          onApply={payment.setCoupon}
          onRemove={() => {
            payment.setCoupon(null);
          }}
        />
      ) : null}
      <QuoteChangedSheet
        notice={payment.notice}
        onClose={payment.closeNotice}
      />
    </div>
  );
}

/*
 * Paying a receipt that exists — a renewal, the first one of an unpaid
 * subscription, an upgrade asked before the quotes, or the one chosen on
 * its page: choosing the method fixes the amount in bolívares with the
 * day's rate and brings the accounts (`POST …/payment-intents`), then the
 * report. A receipt the balance settled meanwhile (ERR_5081) is read again.
 */
function InvoicePayView({
  user,
  mode,
  onBack,
  onExit,
}: Omit<PayViewProps, 'mode'> & {
  mode: Extract<PayMode, { kind: 'invoice' }>;
}) {
  const t = useTranslations('billing');
  const tRoot = useTranslations();
  const refreshBilling = useRefreshBilling(user);
  const [step, setStep] = useState<Step>('method');
  const [payment, setPayment] = useState<{
    method: PaymentMethod;
    started: StartedPayment;
  } | null>(null);
  const [outcome, setOutcome] = useState<PaymentOutcome | null>(null);
  const finish = useFinish(user, (result) => {
    setOutcome(result);
    setStep('done');
  });

  const receiptId = mode.invoiceId ?? null;
  const receipt = useQuery({
    ...invoiceQueryOptions(user, receiptId ?? ''),
    enabled: receiptId !== null,
  });
  const owedBySubscription = useQuery(
    payableInvoiceQueryOptions(
      user,
      receiptId === null ? mode.subscription : null,
    ),
  );
  // The receipt to pay: the one chosen on its page, or the one owed.
  const payable = receiptId === null ? owedBySubscription : receipt;
  // The skeleton crossfades into what arrives (AGENTS.md §8, rule 13).
  const holdingReceipt = useSkeletonHold(payable.isPending);

  // Before the step paints (a layout effect), so its transition starts at the top.
  useLayoutEffect(() => {
    window.scrollTo({ top: 0 });
  }, [step]);
  // Each step's title takes the focus: the button that led there is gone.
  const frame = useFocusHeading(step);

  const invoice: InvoiceDetail | null = payable.data ?? null;

  const planName = (() => {
    const upgrade = mode.subscription.pendingUpgrade;
    if (upgrade != null && invoice?.id === upgrade.invoiceId) {
      return upgrade.plan.name;
    }
    // A receipt of an earlier subscription names no plan here.
    return invoice === null || invoice.subscriptionId === mode.subscription.id
      ? mode.subscription.plan.name
      : '';
  })();

  // What a result does to the page goes in each `mutate` call, not here:
  // those callbacks do not run once the person has left the step.
  const start = useMutation({
    mutationFn: async (method: PaymentMethod) => {
      if (invoice === null) throw new Error('Nothing to pay');
      return { method, started: await startPayment(user, invoice.id, method) };
    },
  });

  const onStartFailed = (error: unknown) => {
    if (!isApiError(error)) return;
    // The balance settled it meanwhile (ERR_5081): read again, not an error.
    if (error.code === 'ERR_5081') {
      refreshBilling();
      void payable.refetch();
    }
  };

  const startError = start.error;
  const noRate =
    isApiError(startError) && startError.code === 'ERR_5085'
      ? 'subscribed'
      : null;
  const startFailureKey =
    startError &&
    noRate === null &&
    couponRejectionKey(startError) === null &&
    !(isApiError(startError) && startError.code === 'ERR_5081')
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

    if (payable.isPending || holdingReceipt) return <PaySkeleton />;
    // A receipt chosen by a link that leads nowhere: nothing to pay here.
    const missing =
      receiptId !== null &&
      payable.isLoadingError &&
      isApiError(payable.error) &&
      (payable.error.status === 404 || payable.error.status === 400);
    // Only when there is nothing to show: a failed re-read keeps the receipt.
    if (payable.isLoadingError && !missing) {
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

    const paying = step === 'pay' && payment !== null;

    return (
      <PayFrame
        step={paying ? 'pay' : 'method'}
        planName={planName}
        onBack={onBack}
        onChangeMethod={() => {
          moveStep('back', () => {
            setStep('method');
          });
        }}
      >
        {paying ? (
          <InvoicePaymentStep
            user={user}
            invoice={invoice}
            method={payment.method}
            payment={payment.started}
            onPaymentRefreshed={(started) => {
              setPayment({ method: payment.method, started });
            }}
            onReported={finish}
            onInReview={() => {
              refreshBilling();
              onExit();
            }}
          />
        ) : (
          <MethodStep
            totals={{ kind: 'invoice', invoice }}
            coupon={null}
            methods={paymentMethods}
            free={null}
            startingMethod={start.isPending ? start.variables : null}
            activating={false}
            noRate={noRate}
            quoteFailure={null}
            failure={startFailureKey ? tRoot(startFailureKey) : null}
            onSelect={(method) => {
              if (start.isPending) return;
              start.mutate(method, {
                onSuccess: (started) => {
                  moveStep('forward', () => {
                    setPayment(started);
                    setStep('pay');
                  });
                },
                onError: onStartFailed,
              });
            }}
            onActivateFree={() => undefined}
            onCoupon={null}
          />
        )}
      </PayFrame>
    );
  }
}
