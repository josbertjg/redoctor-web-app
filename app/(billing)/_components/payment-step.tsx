'use client';

import { useId, useMemo, useState } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import ChevronRight from '@material-symbols/svg-400/rounded/chevron_right.svg?svgr';
import Schedule from '@material-symbols/svg-400/rounded/schedule.svg?svgr';
import { useMutation } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';

import { track } from '@/app/lib/analytics/track';
import { failureMessageKey, isApiError } from '@/app/lib/api/errors';
import { bankByCode, bankLabel } from '@/app/lib/billing/banks';
import type { SessionUser } from '@/app/lib/firebase/client';
import { hourAgreement } from '@/app/lib/format/appointment-time';
import { todayInCaracas, yearsBefore } from '@/app/lib/format/date-of-birth';
import { formatTime } from '@/app/lib/format/dates';
import {
  formatBillingAmount,
  formatBolivaresForBank,
  formatRate,
  parseBolivares,
} from '@/app/lib/format/money';
import {
  phoneProblem,
  toInternationalPhone,
  venezuelaCode,
} from '@/app/lib/format/phone';
import { reportPayment, startPayment } from '@/app/lib/queries/billing';
import {
  originMaxLength,
  originMinLength,
  paymentReportBodySchema,
  referenceMaxLength,
  referenceMinLength,
  type InvoiceDetail,
  type PaymentIntent,
  type PaymentMethod,
  type PaymentReportBody,
  type StartedPayment,
} from '@/app/lib/schemas/billing';
import { cn } from '@/app/lib/utils';

import { Button } from '@/app/ui/button';
import { FieldError } from '@/app/ui/field-error';
import { Icon } from '@/app/ui/icons';
import { TextField } from '@/app/ui/text-field';
import { toast } from '@/app/ui/toast';

import { BankPicker } from './bank-picker';
import { CopyButton } from './copy-button';
import { DetailList } from './detail-list';
import { DifferentAmountSheet } from './different-amount-sheet';

import type { PaymentOutcome } from './payment-types';

type PaymentStepProps = {
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

type ReportValues = {
  reference: string;
  bankCode: string;
  /** The national phone (Pago móvil) or the account's digits (Transferencia). */
  origin: string;
  paidOn: string;
  /** The amount in bolívares as typed. */
  amount: string;
};

/** Codes the step answers by itself, not with the line under the button. */
const handledCodes = new Set(['ERR_5083', 'ERR_5084']);

/** The digits alone: a reference or an account is often pasted with dashes or spaces, as the app takes it. */
const digitsOf = (value: string) => value.replace(/\D/g, '');

const accountTypeKeys = {
  CORRIENTE: 'acquire.accountType.checking',
  AHORRO: 'acquire.accountType.savings',
  UNKNOWN: 'acquire.accountType.unknown',
} as const;

/*
 * Step 2, pay and report it (the app's instructions, origin, reference,
 * bank, date and confirm pages, on one page): the amount in bolívares the
 * API fixed with the day's rate — the figure to transfer, big, with its
 * dollars and the rate —, Redoctor's account for the method chosen, each
 * datum with «Copiar», and the report: the reference, the bank, where the
 * payment came from, the day and the amount, prefilled with what was asked.
 * «Confirmar» sends it; an amount other than the one asked is explained
 * first. The report goes through the write-once guard.
 */
export function PaymentStep({
  user,
  invoice,
  method,
  payment,
  onPaymentRefreshed,
  onReported,
  onInReview,
}: PaymentStepProps) {
  const t = useTranslations('billing');
  const tRoot = useTranslations();
  const failureId = useId();
  const bankLabelId = useId();
  const bankValueId = useId();
  const bankErrorId = useId();
  const [bankOpen, setBankOpen] = useState(false);
  const [pendingBody, setPendingBody] = useState<PaymentReportBody | null>(
    null,
  );
  // What the different-amount sheet says, kept while it closes (AGENTS.md §8.2).
  const [shownBody, setShownBody] = useState(pendingBody);
  if (pendingBody !== null && pendingBody !== shownBody) {
    setShownBody(pendingBody);
  }
  // A payment is reported almost always just made: the day opens answered.
  const [today] = useState(() => todayInCaracas());
  const earliest = yearsBefore(today, 1);
  const { intent, destination } = payment;

  const schema = useMemo(
    () =>
      z.object({
        reference: z.string().refine(
          (value) =>
            new RegExp(
              `^\\d{${String(referenceMinLength)},${String(referenceMaxLength)}}$`,
            ).test(digitsOf(value)),
          t('acquire.reference.hintLength', {
            min: referenceMinLength,
            max: referenceMaxLength,
          }),
        ),
        bankCode: z.string().regex(/^\d{4}$/, t('acquire.bank.required')),
        origin:
          method === 'MOBILE_PAYMENT'
            ? z
                .string()
                .refine(
                  (value) => phoneProblem(value) === null,
                  tRoot('input.phoneNumber.invalidFormat'),
                )
            : z
                .string()
                .refine(
                  (value) =>
                    new RegExp(
                      `^\\d{${String(originMinLength)},${String(originMaxLength)}}$`,
                    ).test(digitsOf(value)),
                  t('pay.origin.accountTooShort', { min: originMinLength }),
                ),
        paidOn: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/, t('acquire.date.invalid'))
          // Today when it is sent: a page left open past midnight takes the new day.
          .refine((value) => {
            const now = todayInCaracas();
            return value <= now && value >= yearsBefore(now, 1);
          }, t('acquire.date.invalid')),
        amount: z.string().refine((value) => {
          const cents = parseBolivares(value);
          return cents !== null && cents > 0;
        }, t('pay.amount.invalid')),
      }),
    [t, tRoot, method],
  );

  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors },
  } = useForm<ReportValues>({
    resolver: zodResolver(schema),
    mode: 'onBlur',
    reValidateMode: 'onChange',
    defaultValues: {
      reference: '',
      bankCode: '',
      origin: '',
      paidOn: today,
      amount: formatBolivaresForBank(intent.amountVes.amount),
    },
  });

  const bankCode = useWatch({ control, name: 'bankCode' });
  const bank = bankCode ? bankByCode(bankCode) : undefined;

  // The amount in bolívares expired (ERR_5083): a new one is asked for and
  // what was typed is kept.
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

  const toBody = (values: ReportValues): PaymentReportBody =>
    paymentReportBodySchema.parse({
      reference: digitsOf(values.reference),
      bankCode: values.bankCode,
      origin:
        method === 'MOBILE_PAYMENT'
          ? toInternationalPhone(values.origin)
          : digitsOf(values.origin),
      paidOn: values.paidOn,
      amountVes: parseBolivares(values.amount) ?? 0,
    });

  const send = (body: PaymentReportBody) => {
    if (report.isPending || refresh.isPending) return;
    refresh.reset();
    report.mutate({ body, attempt: intent });
  };

  const bankName = (code: string, name: string) =>
    code === '' ? name : bankLabel({ code, name });
  const details =
    method === 'MOBILE_PAYMENT'
      ? [
          {
            key: 'bank',
            label: t('acquire.fields.bankName'),
            value: bankName(
              destination.mobilePayment.bankCode,
              destination.mobilePayment.bankName,
            ),
          },
          {
            key: 'phone',
            label: t('acquire.fields.phone'),
            value: destination.mobilePayment.phone,
          },
          {
            key: 'document',
            label: t('acquire.fields.document'),
            value: destination.mobilePayment.document,
          },
        ]
      : [
          {
            key: 'bank',
            label: t('acquire.fields.bankName'),
            value: bankName(
              destination.bankTransfer.bankCode,
              destination.bankTransfer.bankName,
            ),
          },
          {
            key: 'account',
            label: t('acquire.fields.account'),
            value: destination.bankTransfer.account,
          },
          {
            key: 'holder',
            label: t('acquire.fields.holder'),
            value: destination.bankTransfer.holder,
          },
          {
            key: 'document',
            label: t('acquire.fields.document'),
            value: destination.bankTransfer.document,
          },
          {
            key: 'type',
            label: t('acquire.fields.accountType'),
            value: t(accountTypeKeys[destination.bankTransfer.accountType]),
          },
        ];
  const bankFigure = formatBolivaresForBank(intent.amountVes.amount);
  // The whole block only helps with the amount inside: it is what gets pasted in the bank.
  const everything = [
    ...details.map((detail) => `${detail.label}: ${detail.value}`),
    `${t('acquire.fields.amount')}: ${bankFigure}`,
  ].join('\n');
  const validUntil = intent.expiresAt ? formatTime(intent.expiresAt) : null;

  return (
    <div className="flex flex-col gap-4">
      <section className="flex animate-fade-up flex-col gap-1 rounded-2xl bg-pure-white p-5 shadow-md">
        <h2 className="text-body-md text-text-secondary">
          {t('pay.amountToTransfer')}
        </h2>
        <div className="flex items-center justify-between gap-3">
          <p className="text-title-xl font-bold text-text-primary">
            {formatBillingAmount(intent.amountVes)}
          </p>
          <CopyButton value={bankFigure} label={t('acquire.fields.amount')} />
        </div>
        <p className="text-body-sm text-text-secondary">
          {t('pay.reference', {
            usd: formatBillingAmount(intent.amountUsd),
            rate: formatRate(intent.rate),
          })}
        </p>
        {validUntil ? (
          <p className="flex items-center gap-1.5 text-body-sm font-medium text-warning-800">
            <Icon icon={Schedule} size={16} />
            {t('pay.validUntil', {
              time: validUntil,
              hour: hourAgreement(validUntil),
            })}
          </p>
        ) : null}
      </section>

      <section className="flex animate-fade-up flex-col gap-4 rounded-2xl bg-pure-white p-5 shadow-md">
        <h2 className="sr-only">{t('acquire.instructions.title')}</h2>
        <DetailList
          items={details.map((detail) => ({
            ...detail,
            value: <span className="break-all">{detail.value}</span>,
            action: <CopyButton value={detail.value} label={detail.label} />,
          }))}
        />
        <CopyButton
          value={everything}
          label={t('acquire.instructions.title')}
          variant="outline"
        >
          {t('pay.copyAll')}
        </CopyButton>
      </section>

      <form
        noValidate
        className="flex animate-fade-up flex-col gap-4 rounded-2xl bg-pure-white p-5 shadow-md"
        onSubmit={(event) => {
          event.preventDefault();
          void handleSubmit((values) => {
            const body = toBody(values);
            if (body.amountVes !== intent.amountVes.amount) {
              setPendingBody(body);
              return;
            }
            send(body);
          })(event);
        }}
      >
        <div className="flex flex-col gap-1">
          <h2 className="text-title-md text-text-primary">
            {t('pay.report.title')}
          </h2>
          <p className="text-body-md text-text-secondary">
            {t('pay.report.description')}
          </p>
        </div>

        <TextField
          label={t('acquire.fields.reference')}
          inputMode="numeric"
          autoComplete="off"
          placeholder={t('acquire.reference.hint')}
          hint={t('acquire.reference.description')}
          error={errors.reference?.message}
          {...register('reference')}
        />

        <div className="flex flex-col gap-2">
          <span
            id={bankLabelId}
            className="text-body-xxs font-medium text-text-primary"
          >
            {t('acquire.fields.usedBank')}
          </span>
          <input type="hidden" {...register('bankCode')} />
          <button
            type="button"
            aria-labelledby={`${bankLabelId} ${bankValueId}`}
            aria-describedby={errors.bankCode ? bankErrorId : undefined}
            onClick={() => {
              setBankOpen(true);
            }}
            className={cn(
              'flex h-control items-center justify-between gap-2 rounded-md border bg-pure-white px-3 text-left text-body-xs shadow-sm transition-[border-color,box-shadow] duration-fast ease-house outline-none focus-visible:border-primary focus-visible:ring-3 focus-visible:ring-ring/30',
              errors.bankCode ? 'border-error' : 'border-transparent',
            )}
          >
            <span
              id={bankValueId}
              // Words to read, not a placeholder: grey-600 keeps them AA.
              className={bank ? 'text-text-primary' : 'text-text-secondary'}
            >
              {bank ? bankLabel(bank) : t('acquire.bank.pick')}
            </span>
            <span className="flex shrink-0 items-center gap-1 text-label-md text-primary">
              {bank ? t('acquire.bank.change') : null}
              <Icon icon={ChevronRight} size={20} />
            </span>
          </button>
          <FieldError id={bankErrorId} message={errors.bankCode?.message} />
        </div>

        {method === 'MOBILE_PAYMENT' ? (
          <TextField
            label={t('acquire.fields.payerPhone')}
            type="tel"
            inputMode="tel"
            autoComplete="tel-national"
            hint={t('acquire.payerPhone.description')}
            error={errors.origin?.message}
            leading={
              <span className="pl-3 text-body-xs text-text-secondary">
                {venezuelaCode}
              </span>
            }
            {...register('origin')}
          />
        ) : (
          <TextField
            label={t('pay.origin.accountLabel')}
            inputMode="numeric"
            autoComplete="off"
            placeholder={t('pay.origin.accountHint')}
            hint={t('pay.origin.accountDescription')}
            error={errors.origin?.message}
            {...register('origin')}
          />
        )}

        <TextField
          label={t('acquire.date.title')}
          type="date"
          min={earliest}
          max={today}
          error={errors.paidOn?.message}
          {...register('paidOn')}
        />

        <TextField
          label={t('pay.amount.label')}
          inputMode="decimal"
          autoComplete="off"
          hint={t('pay.amount.description', {
            expected: formatBillingAmount(intent.amountVes),
          })}
          error={errors.amount?.message}
          {...register('amount')}
        />

        <div className="flex flex-col gap-2">
          <FieldError
            id={failureId}
            message={failureKey ? tRoot(failureKey) : undefined}
            className="text-center"
          />
          <Button
            type="submit"
            block
            shape="soft"
            loading={report.isPending || report.isSuccess || refresh.isPending}
          >
            {t('acquire.confirm.action')}
          </Button>
        </div>
      </form>

      <BankPicker
        open={bankOpen}
        onOpenChange={setBankOpen}
        selectedCode={bankCode || null}
        onPick={(picked) => {
          setValue('bankCode', picked.code, {
            shouldValidate: true,
            shouldDirty: true,
          });
        }}
      />
      <DifferentAmountSheet
        open={pendingBody !== null}
        onOpenChange={(open) => {
          if (!open) setPendingBody(null);
        }}
        expected={intent.amountVes}
        reported={shownBody?.amountVes ?? 0}
        onSend={() => {
          if (pendingBody) send(pendingBody);
          setPendingBody(null);
        }}
      />
    </div>
  );
}
