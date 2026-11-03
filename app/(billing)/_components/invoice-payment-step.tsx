'use client';

import { useMutation } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';

import { track } from '@/app/lib/analytics/track';
import { failureMessageKey, isApiError } from '@/app/lib/api/errors';
import { bankByCode } from '@/app/lib/billing/banks';
import type { SessionUser } from '@/app/lib/firebase/client';
import { reportPayment, startPayment } from '@/app/lib/queries/billing';
import type {
  InvoiceDetail,
  PaymentIntent,
  PaymentMethod,
  PaymentReportBody,
  StartedPayment,
} from '@/app/lib/schemas/billing';

import { toast } from '@/app/ui/toast';

import { PaymentStep } from './payment-step';

import type { PaymentOutcome } from './payment-types';

type InvoicePaymentStepProps = {
  user: SessionUser;
  invoice: InvoiceDetail;
  method: PaymentMethod;
  payment: StartedPayment;
  /** The amount in bolívares expired and a new one was fixed: the page shows it. */
  onPaymentRefreshed: (payment: StartedPayment) => void;
  /** The report was taken: the page moves on, and the button stays busy until it has. */
  onReported: (outcome: PaymentOutcome) => void;
  /** Another report is already in review — another phone, a lost answer: the page shows the subscription. */
  onInReview: () => void;
};

/** Codes the step answers by itself, not with the line under the button. */
const handledCodes = new Set(['ERR_5083', 'ERR_5084']);

/*
 * Paying a receipt that exists (a renewal, one owed, one chosen on its
 * page): its attempt fixed the amount in bolívares and the accounts, and
 * the report goes on that attempt through the write-once guard. An amount
 * that expired with the rate (ERR_5083) is fixed again and what was typed
 * kept; a report already in review (ERR_5084) sends the person back.
 */
export function InvoicePaymentStep({
  user,
  invoice,
  method,
  payment,
  onPaymentRefreshed,
  onReported,
  onInReview,
}: InvoicePaymentStepProps) {
  const t = useTranslations('billing');
  const tRoot = useTranslations();
  const { intent, destination } = payment;

  const refresh = useMutation({
    mutationFn: () => startPayment(user, invoice.id, method),
  });

  const report = useMutation({
    // The attempt travels with the report: after a renewal it is a new one.
    mutationFn: ({
      body,
      attempt,
    }: {
      body: PaymentReportBody;
      attempt: PaymentIntent;
    }) => reportPayment(user, attempt, body),
    onSuccess: (_reported: PaymentIntent, { body }) => {
      track('web_payment_reported', {
        method:
          method === 'MOBILE_PAYMENT' ? 'mobile_payment' : 'bank_transfer',
      });
      onReported({
        kind: 'reported',
        method,
        amountVes: body.amountVes,
        bank: bankByCode(body.bankCode) ?? {
          code: body.bankCode,
          name: body.bankCode,
        },
        paidOn: body.paidOn,
      });
    },
    onError: (error, { body, attempt }) => {
      if (!isApiError(error) || error.status !== 409) return;
      if (error.code === 'ERR_5083') {
        refresh.mutate(undefined, {
          onSuccess: (started) => {
            onPaymentRefreshed(started);
            if (started.intent.amountVes.amount === attempt.amountVes.amount) {
              // The same figure: the report goes again with the fresh
              // attempt, there is nothing for the person to review.
              report.mutate({ body, attempt: started.intent });
            } else {
              toast.warning(t('pay.intentExpired'));
            }
          },
        });
      } else if (error.code === 'ERR_5084') {
        // Someone else's — another phone: nothing more is sent.
        toast(t('pay.alreadyInReview'));
        onInReview();
      }
    },
  });

  // A renewal that failed says why — no rate of the day yet, mostly —;
  // else the report's own failure, unless the step answered it already.
  const refreshFailureKey =
    refresh.error === null
      ? null
      : isApiError(refresh.error) && refresh.error.code === 'ERR_5085'
        ? 'billing.pay.noRate'
        : failureMessageKey(refresh.error, 'billing.acquire.method.failed');
  const failureKey =
    refreshFailureKey ??
    (report.error &&
    !(isApiError(report.error) && handledCodes.has(report.error.code ?? ''))
      ? failureMessageKey(report.error, 'billing.acquire.confirm.failed')
      : null);

  return (
    <PaymentStep
      method={method}
      amountVes={intent.amountVes}
      amountUsd={intent.amountUsd}
      rate={intent.rate}
      validUntil={intent.expiresAt ?? null}
      destination={destination}
      expectedAmounts={[intent.amountVes.amount]}
      busy={report.isPending || report.isSuccess || refresh.isPending}
      failure={failureKey ? tRoot(failureKey) : null}
      onSubmit={(body) => {
        if (report.isPending || refresh.isPending) return;
        refresh.reset();
        report.mutate({ body, attempt: intent });
      }}
    />
  );
}
