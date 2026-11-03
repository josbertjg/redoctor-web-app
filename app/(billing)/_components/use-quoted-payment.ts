'use client';

import { useEffect, useRef, useState } from 'react';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { isApiError, type CouponRejectionKey } from '@/app/lib/api/errors';
import {
  forgetPaymentDraft,
  readPaymentDraft,
  savePaymentDraft,
  type DraftReport,
  type PaymentDraft,
} from '@/app/lib/billing/payment-draft';
import type { SessionUser } from '@/app/lib/firebase/client';
import {
  changePlan,
  checkoutQuoteQueryOptions,
  confirmCheckout,
  couponRejectionKey,
  upgradeQuoteQueryOptions,
  type Confirmed,
} from '@/app/lib/queries/billing';
import {
  chargesTheSame,
  checkoutQuoteChangedSchema,
  offeredMethods,
  previewQuote,
  quoteExpired,
  toPaymentQuote,
  upgradeQuoteChangedSchema,
  type OfferedPlan,
  type PaymentMethod,
  type PaymentQuote,
  type PaymentReportBody,
  type QuoteChangeReason,
} from '@/app/lib/schemas/billing';

import type { AppliedCoupon } from './payment-types';
import type { QuoteChangeNotice } from './quote-changed-sheet';

/** Taking a plan, or upgrading to it: both are paid on a quote (REDOC-363). */
export type QuotedKind = 'contract' | 'upgrade';

export type QuotedStep = 'method' | 'pay';

type QuotedPaymentArgs = {
  user: SessionUser;
  kind: QuotedKind;
  plan: OfferedPlan;
  /** An upgrade: the coupon's loss accepted on the change's page. */
  acceptDiscountLoss: boolean;
  /** An upgrade's quote as the change's page read it: no second preview. */
  initialQuote: PaymentQuote | null;
};

/** What went wrong in a way the page cannot leave in place. */
export type QuotedExit =
  /** The plan is no longer offered (ERR_5074). */
  | 'planUnavailable'
  /** A subscription is on its way already and it is not this payment (ERR_5071). */
  | 'alreadySubscribed';

const blankReport: DraftReport = {
  reference: '',
  bankCode: '',
  origin: '',
  paidOn: null,
  amountVes: null,
};

/** The draft's report holds something: the person said they paid. */
const startedReporting = (report: DraftReport) =>
  report.reference !== '' || report.bankCode !== '' || report.origin !== '';

/**
 * What changed for the person since `previous` (the app's `_changeSince`).
 * An upgrade's difference shrinks by itself with the days while its quote
 * still holds: there only the rate counts.
 */
function changeSince(
  kind: QuotedKind,
  previous: PaymentQuote,
  fresh: PaymentQuote,
): QuoteChangeReason | null {
  if (fresh.rate !== previous.rate) return 'RATE';
  if (kind === 'upgrade') return null;
  if (chargesTheSame(previous, fresh)) return null;
  const discounted = (quote: PaymentQuote) =>
    quote.lines.find((line) => line.type === 'DISCOUNT')?.amount.amount ?? 0;
  if (discounted(previous) !== discounted(fresh)) return 'COUPON';
  if (previous.balanceApplied.amount !== fresh.balanceApplied.amount) {
    return 'BALANCE';
  }
  return 'PRICE';
}

/** A body's identity, its keys in order: the same body, the same key. */
function bodyText(body: Record<string, unknown>): string {
  return JSON.stringify(body, Object.keys(body).sort());
}

/*
 * Paying on a quote (REDOC-363; the owner's three decisions of 2026-11-02,
 * the app's PaymentFlowCubit): the plan is quoted when it is opened and
 * nothing is created until «Confirmar». The method only chooses the
 * account. «Confirmar» takes the plan and reports the payment in one call,
 * with a key kept while the body is the same. When something changed (409
 * ERR_5125) the quote of today is adopted — at once and in silence when it
 * charges the same, else with the sheet that says what changed, the amount
 * the person said they paid kept. A payment left halfway is kept in this
 * browser and taken up again with the price of the day: the same rate
 * keeps its quote; another shows it, and the quote from before still
 * confirms what was paid with it (the API honours it by the payment's day).
 */
export function useQuotedPayment({
  user,
  kind,
  plan,
  acceptDiscountLoss,
  initialQuote,
}: QuotedPaymentArgs) {
  const queryClient = useQueryClient();

  // The draft of this very payment, read once.
  const [draft] = useState<PaymentDraft | null>(() => {
    const found = readPaymentDraft(user.id);
    return found?.kind === kind && found.planId === plan.id ? found : null;
  });
  const [resume, setResume] = useState<PaymentDraft | null>(draft);
  const [coupon, setCoupon] = useState<AppliedCoupon | null>(
    kind === 'contract' ? (draft?.coupon ?? null) : null,
  );
  /** The draft's coupon no longer served: the resumed quote says so. */
  const [couponGone, setCouponGone] = useState(false);
  /** A coupon the quote refused while paying: said in place. */
  const [couponDropped, setCouponDropped] = useState<CouponRejectionKey | null>(
    null,
  );

  const contractOptions = checkoutQuoteQueryOptions(
    user,
    plan.id,
    coupon?.choice ?? null,
  );
  const upgradeOptions = upgradeQuoteQueryOptions(user, plan.id);
  const contractQuote = useQuery({
    ...contractOptions,
    enabled: kind === 'contract',
  });
  const upgradeQuote = useQuery({
    ...upgradeOptions,
    enabled: kind === 'upgrade',
    ...(initialQuote ? { initialData: initialQuote } : {}),
  });
  const fresh = kind === 'contract' ? contractQuote : upgradeQuote;

  /** The quote kept from the draft, or brought by a change: it wins over the one read. */
  const [override, setOverride] = useState<PaymentQuote | null>(null);
  /** Quotes from before a change of rate, still valid: one may be what was paid. */
  const [held, setHeld] = useState<PaymentQuote[]>([]);
  const [notice, setNotice] = useState<QuoteChangeNotice | null>(null);
  const [method, setMethod] = useState<PaymentMethod | null>(null);
  const [step, setStep] = useState<QuotedStep>('method');
  /**
   * The report as it stands: what its form starts with each time the step
   * opens (coming back from the method keeps what was typed), and what the
   * draft keeps.
   */
  const [report, setReport] = useState<DraftReport>(blankReport);
  const [finished, setFinished] = useState(false);
  const [requoteFailed, setRequoteFailed] = useState(false);
  const [exit, setExit] = useState<QuotedExit | null>(null);
  /** The confirmation's key and the body it went with (REDOC-363, pedido 8). */
  const keyRef = useRef(draft?.idempotency ?? null);

  const quote = override ?? (fresh.isSuccess ? fresh.data : null);

  // Taking the draft up again, once the quote of today is known (React's
  // "adjusting state while rendering": no frame of the wrong step).
  if (resume !== null) {
    if (fresh.isSuccess) {
      setResume(null);
      const shown = resume.quote;
      let reason: QuoteChangeReason | null = couponGone
        ? 'COUPON'
        : changeSince(kind, shown, fresh.data);
      let kept: PaymentQuote | null = null;
      if (reason === null) {
        // The same rate: the quote it saw while it still holds, which the
        // API honours — and with it the key of a «Confirmar» that got no answer.
        if (!quoteExpired(shown)) kept = shown;
        else if (!chargesTheSame(shown, fresh.data)) reason = 'EXPIRED';
      }
      const current = kept ?? fresh.data;
      const paid =
        resume.step === 'pay' &&
        shown.requiresPayment &&
        startedReporting(resume.report);
      setOverride(kept);
      setHeld(
        reason === 'RATE'
          ? [shown, ...resume.heldQuotes].filter(
              (candidate) => !quoteExpired(candidate),
            )
          : [],
      );
      setReport({
        ...resume.report,
        // Said «ya pagué» with the amount of then: it is what is reported.
        amountVes:
          resume.report.amountVes ??
          (reason !== null && paid ? shown.payableVes.amount : null),
      });
      const offered = offeredMethods(current.destination);
      const resumedMethod = offered.includes(resume.method)
        ? resume.method
        : null;
      setMethod(resumedMethod);
      setStep(
        resumedMethod !== null &&
          resume.step === 'pay' &&
          current.requiresPayment
          ? 'pay'
          : 'method',
      );
      if (reason !== null) {
        setNotice({
          reason,
          previous: shown.payableVes,
          current: current.payableVes,
          fromDraft: true,
          wasFree: !shown.requiresPayment,
        });
      }
    } else if (fresh.isError) {
      if (coupon !== null && couponRejectionKey(fresh.error) !== null) {
        // The draft's coupon no longer serves: quoted without it, and told.
        setCoupon(null);
        setCouponGone(true);
      } else {
        setResume(null);
      }
    }
  } else if (
    kind === 'contract' &&
    coupon !== null &&
    fresh.isError &&
    override === null
  ) {
    // A coupon the quote refused: taken off, said in place, quoted without it.
    const key = couponRejectionKey(fresh.error);
    if (key !== null) {
      setCoupon(null);
      setCouponDropped(key);
    }
  }

  // The plan gone, or a subscription already on its way: the page leaves.
  if (
    exit === null &&
    fresh.isError &&
    isApiError(fresh.error) &&
    (fresh.error.code === 'ERR_5074' || fresh.error.code === 'ERR_5071')
  ) {
    setExit(
      fresh.error.code === 'ERR_5074' ? 'planUnavailable' : 'alreadySubscribed',
    );
  }

  // The draft follows the payment from the moment a way to pay is chosen.
  useEffect(() => {
    if (finished || resume !== null || quote === null || method === null) {
      return;
    }
    savePaymentDraft({
      userId: user.id,
      kind,
      planId: plan.id,
      planName: plan.name,
      coupon,
      acceptDiscountLoss,
      quote,
      heldQuotes: held,
      method,
      step,
      report,
      idempotency: keyRef.current,
      savedAt: new Date().toISOString(),
    });
  }, [
    finished,
    resume,
    quote,
    method,
    user.id,
    kind,
    plan.id,
    plan.name,
    coupon,
    acceptDiscountLoss,
    held,
    step,
    report,
  ]);

  /** The same key while the body is the same: a second send answers the first. */
  const keyFor = (body: Record<string, unknown>): string => {
    const text = bodyText(body);
    const current = keyRef.current;
    if (current?.body === text) return current.key;
    const key = crypto.randomUUID();
    keyRef.current = { key, body: text };
    return key;
  };

  const confirm = useMutation({
    mutationFn: async ({
      target,
      body,
    }: {
      target: PaymentQuote;
      body: PaymentReportBody | null;
    }): Promise<Confirmed> => {
      const paying = body !== null && method !== null;
      const payment = paying ? body : null;
      const chosen = paying ? method : null;
      if (kind === 'contract') {
        return confirmCheckout(user, {
          planId: plan.id,
          quoteId: target.id,
          method: chosen,
          payment,
          idempotencyKey: keyFor({
            quoteId: target.id,
            method: chosen,
            payment: payment === null ? null : bodyText(payment),
          }),
        });
      }
      const changed = await changePlan(user, {
        planId: plan.id,
        acceptDiscountLoss,
        quoted: { quoteId: target.id, method: chosen, payment },
      });
      return { subscription: changed.subscription, intent: changed.intent };
    },
  });

  /** A quote of today, asked for again. */
  const requote = async (): Promise<PaymentQuote | null> => {
    setRequoteFailed(false);
    try {
      return await queryClient.query({
        ...(kind === 'contract' ? contractOptions : upgradeOptions),
        staleTime: 0,
      });
    } catch {
      setRequoteFailed(true);
      return null;
    }
  };

  /** The new quote of a 409 ERR_5125, in the payment's shape. */
  const changedQuote = (
    details: Record<string, unknown> | undefined,
  ): { reason: QuoteChangeReason; quote: PaymentQuote | null } => {
    if (kind === 'contract') {
      const parsed = checkoutQuoteChangedSchema.safeParse(details);
      return parsed.success
        ? {
            reason: parsed.data.reason,
            quote: toPaymentQuote(parsed.data.quote),
          }
        : { reason: 'PRICE', quote: null };
    }
    const parsed = upgradeQuoteChangedSchema.safeParse(details);
    return parsed.success
      ? { reason: parsed.data.reason, quote: previewQuote(parsed.data.quote) }
      : { reason: 'PRICE', quote: null };
  };

  type Callbacks = {
    onConfirmed: (confirmed: Confirmed, body: PaymentReportBody | null) => void;
  };

  /**
   * Something changed and nothing was created: the quote of today is
   * adopted. If it charges the same it is confirmed with it, once and
   * without asking; else the sheet says what changed.
   */
  const adopt = async (
    reason: QuoteChangeReason,
    given: PaymentQuote | null,
    previous: PaymentQuote,
    body: PaymentReportBody | null,
    retried: boolean,
    callbacks: Callbacks,
  ) => {
    const current = given ?? (await requote());
    if (current === null) return;
    setOverride(current);
    setHeld([]);
    if (chargesTheSame(current, previous) && !retried) {
      send(current, body, true, callbacks);
      return;
    }
    // The API quotes again without a coupon that no longer serves.
    if (
      kind === 'contract' &&
      coupon !== null &&
      !current.lines.some((line) => line.type === 'DISCOUNT')
    ) {
      setCoupon(null);
    }
    setNotice({
      reason,
      previous: previous.payableVes,
      current: current.payableVes,
      fromDraft: false,
      wasFree: !previous.requiresPayment,
    });
    // From paying to free, or the other way: the first step says how.
    if (!current.requiresPayment || !previous.requiresPayment) {
      setStep('method');
    }
  };

  const send = (
    target: PaymentQuote,
    body: PaymentReportBody | null,
    retried: boolean,
    callbacks: Callbacks,
  ) => {
    confirm.mutate(
      { target, body },
      {
        onSuccess: (confirmed) => {
          setFinished(true);
          forgetPaymentDraft();
          callbacks.onConfirmed(confirmed, body);
        },
        onError: (error) => {
          if (!isApiError(error)) return;
          switch (error.code) {
            case 'ERR_5125': {
              const changed = changedQuote(error.details);
              void adopt(
                changed.reason,
                changed.quote,
                target,
                body,
                retried,
                callbacks,
              );
              return;
            }
            // The quote gone or used: quoted again.
            case 'ERR_5124':
            case 'ERR_5126':
              void adopt('EXPIRED', null, target, body, retried, callbacks);
              return;
            // Now something is to pay: the balance no longer covers it.
            case 'ERR_5127':
              void adopt('BALANCE', null, target, body, retried, callbacks);
              return;
            case 'ERR_5074':
              setExit('planUnavailable');
              return;
            case 'ERR_5071':
              setExit('alreadySubscribed');
              return;
          }
        },
      },
    );
  };

  /**
   * «Confirmar» (or «Activar mi plan», with nothing to pay): with the quote
   * from before a change of rate when the amount reported is the one it
   * asked, else with today's.
   */
  const submit = (body: PaymentReportBody | null, callbacks: Callbacks) => {
    if (quote === null || confirm.isPending) return;
    const target =
      body === null
        ? quote
        : (held.find(
            (candidate) => candidate.payableVes.amount === body.amountVes,
          ) ?? quote);
    send(target, body, false, callbacks);
  };

  return {
    quote,
    fresh,
    held,
    coupon,
    setCoupon: (next: AppliedCoupon | null) => {
      setCouponDropped(null);
      setOverride(null);
      setCoupon(next);
    },
    couponDropped,
    method,
    chooseMethod: (next: PaymentMethod) => {
      // A phone is no account: where the payment came from goes with the method.
      if (next !== method) setReport((current) => ({ ...current, origin: '' }));
      setMethod(next);
    },
    step,
    setStep,
    report,
    setReport,
    notice,
    closeNotice: () => {
      setNotice(null);
    },
    confirm,
    submit,
    requoteFailed,
    exit,
    /** Still deciding where the draft left off. */
    resuming: resume !== null,
    finished,
  };
}
