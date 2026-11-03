'use client';

import { useEffect, useId, useMemo, useState } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import ChevronRight from '@material-symbols/svg-400/rounded/chevron_right.svg?svgr';
import Schedule from '@material-symbols/svg-400/rounded/schedule.svg?svgr';
import { useTranslations } from 'next-intl';
import { useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';

import { bankByCode, bankLabel } from '@/app/lib/billing/banks';
import type { DraftReport } from '@/app/lib/billing/payment-draft';
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
import {
  originMaxLength,
  originMinLength,
  paymentReportBodySchema,
  referenceMaxLength,
  referenceMinLength,
  type Money,
  type PaymentDestination,
  type PaymentMethod,
  type PaymentReportBody,
} from '@/app/lib/schemas/billing';
import { cn } from '@/app/lib/utils';

import { Button } from '@/app/ui/button';
import { FieldError } from '@/app/ui/field-error';
import { Icon } from '@/app/ui/icons';
import { TextField } from '@/app/ui/text-field';

import { BankPicker } from './bank-picker';
import { CopyButton } from './copy-button';
import { DetailList } from './detail-list';
import { DifferentAmountSheet } from './different-amount-sheet';

type PaymentStepProps = {
  method: PaymentMethod;
  /** The figure to transfer, in bolívares, with its dollars and the rate it was fixed at. */
  amountVes: Money;
  amountUsd: Money;
  rate: string;
  /**
   * Until when the figure holds: an attempt's, once its rate is no longer
   * the day's. A quote's has none — confirming it late re-quotes it.
   */
  validUntil: string | null;
  destination: PaymentDestination;
  /** What the form starts with: a draft's report, or the amount kept after a change. */
  initial?: DraftReport | null;
  /**
   * The amounts that need no warning (céntimos): the one asked and, after a
   * change of rate, the one a quote from before asked.
   */
  expectedAmounts: readonly number[];
  /** Pressed and on its way: busy until the page moves on. */
  busy: boolean;
  /** Why it failed, in words; null when there is nothing to add here. */
  failure: string | null;
  onSubmit: (body: PaymentReportBody) => void;
  /** The form as it stands, for the draft. */
  onReportChange?: (report: DraftReport) => void;
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

/** The digits alone: a reference or an account is often pasted with dashes or spaces, as the app takes it. */
const digitsOf = (value: string) => value.replace(/\D/g, '');

const accountTypeKeys = {
  CORRIENTE: 'acquire.accountType.checking',
  AHORRO: 'acquire.accountType.savings',
  UNKNOWN: 'acquire.accountType.unknown',
} as const;

/*
 * Step 2, pay and report it (the app's instructions, origin, reference,
 * bank, date and confirm pages, on one page): the figure in bolívares —
 * big, with its dollars and the rate —, Redoctor's account for the method
 * chosen, each datum with «Copiar», and the report: the reference, the
 * bank, where the payment came from, the day and the amount, prefilled
 * with what was asked. «Confirmar» hands the report to whoever sends it
 * (the checkout, the upgrade, or a receipt's attempt); an amount other than
 * the one asked is explained first.
 */
export function PaymentStep({
  method,
  amountVes,
  amountUsd,
  rate,
  validUntil,
  destination,
  initial = null,
  expectedAmounts,
  busy,
  failure,
  onSubmit,
  onReportChange,
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
    formState: { errors, dirtyFields },
  } = useForm<ReportValues>({
    resolver: zodResolver(schema),
    mode: 'onBlur',
    reValidateMode: 'onChange',
    defaultValues: {
      reference: initial?.reference ?? '',
      bankCode: initial?.bankCode ?? '',
      origin: initial?.origin ?? '',
      paidOn: initial?.paidOn ?? today,
      amount: formatBolivaresForBank(initial?.amountVes ?? amountVes.amount),
    },
  });

  const values = useWatch({ control });
  const bankCode = values.bankCode ?? '';
  const bank = bankCode ? bankByCode(bankCode) : undefined;
  const paidOnChosen = initial?.paidOn != null || dirtyFields.paidOn === true;
  const typed = parseBolivares(values.amount ?? '');
  // The report as the draft keeps it, as text: it changes only when the form does.
  const reportText = JSON.stringify({
    reference: values.reference ?? '',
    bankCode,
    origin: values.origin ?? '',
    paidOn: paidOnChosen ? (values.paidOn ?? null) : null,
    // Only an amount the person typed: the one asked comes with the quote.
    amountVes: typed !== null && typed !== amountVes.amount ? typed : null,
  } satisfies DraftReport);

  // The draft follows what is typed: the person may leave to pay and come back.
  useEffect(() => {
    onReportChange?.(JSON.parse(reportText) as DraftReport);
  }, [reportText, onReportChange]);

  const toBody = (form: ReportValues): PaymentReportBody =>
    paymentReportBodySchema.parse({
      reference: digitsOf(form.reference),
      bankCode: form.bankCode,
      origin:
        method === 'MOBILE_PAYMENT'
          ? toInternationalPhone(form.origin)
          : digitsOf(form.origin),
      paidOn: form.paidOn,
      amountVes: parseBolivares(form.amount) ?? 0,
    });

  const send = (body: PaymentReportBody) => {
    if (busy) return;
    onSubmit(body);
  };

  const bankName = (code: string, name: string) =>
    code === '' ? name : bankLabel({ code, name });
  const mobile = method === 'MOBILE_PAYMENT' ? destination.mobilePayment : null;
  const transfer = method === 'BANK_TRANSFER' ? destination.bankTransfer : null;
  const details = mobile
    ? [
        {
          key: 'bank',
          label: t('acquire.fields.bankName'),
          value: bankName(mobile.bankCode, mobile.bankName),
        },
        {
          key: 'phone',
          label: t('acquire.fields.phone'),
          value: mobile.phone,
        },
        {
          key: 'document',
          label: t('acquire.fields.document'),
          value: mobile.document,
        },
      ]
    : transfer
      ? [
          {
            key: 'bank',
            label: t('acquire.fields.bankName'),
            value: bankName(transfer.bankCode, transfer.bankName),
          },
          {
            key: 'account',
            label: t('acquire.fields.account'),
            value: transfer.account,
          },
          {
            key: 'holder',
            label: t('acquire.fields.holder'),
            value: transfer.holder,
          },
          {
            key: 'document',
            label: t('acquire.fields.document'),
            value: transfer.document,
          },
          {
            key: 'type',
            label: t('acquire.fields.accountType'),
            value: t(accountTypeKeys[transfer.accountType]),
          },
        ]
      : [];
  const bankFigure = formatBolivaresForBank(amountVes.amount);
  // The whole block only helps with the amount inside: it is what gets pasted in the bank.
  const everything = [
    ...details.map((detail) => `${detail.label}: ${detail.value}`),
    `${t('acquire.fields.amount')}: ${bankFigure}`,
  ].join('\n');
  const validTime = validUntil ? formatTime(validUntil) : null;

  return (
    <div className="flex flex-col gap-4">
      <section className="flex animate-fade-up flex-col gap-1 rounded-2xl bg-pure-white p-5 shadow-md">
        <h2 className="text-body-md text-text-secondary">
          {t('pay.amountToTransfer')}
        </h2>
        <div className="flex items-center justify-between gap-3">
          <p className="text-title-xl font-bold text-text-primary">
            {formatBillingAmount(amountVes)}
          </p>
          <CopyButton value={bankFigure} label={t('acquire.fields.amount')} />
        </div>
        <p className="text-body-sm text-text-secondary">
          {t('pay.reference', {
            usd: formatBillingAmount(amountUsd),
            rate: formatRate(rate),
          })}
        </p>
        {validTime ? (
          <p className="flex items-center gap-1.5 text-body-sm font-medium text-warning-800">
            <Icon icon={Schedule} size={16} />
            {t('pay.validUntil', {
              time: validTime,
              hour: hourAgreement(validTime),
            })}
          </p>
        ) : null}
      </section>

      {details.length > 0 ? (
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
      ) : (
        // The account of this method is gone from the configuration.
        <p
          role="status"
          className="animate-fade-in rounded-lg bg-warning-50 p-3 text-body-md text-warning-800"
        >
          {tRoot('apiErrors.billingErrors.methodUnavailable')}
        </p>
      )}

      <form
        noValidate
        className="flex animate-fade-up flex-col gap-4 rounded-2xl bg-pure-white p-5 shadow-md"
        onSubmit={(event) => {
          event.preventDefault();
          void handleSubmit((form) => {
            const body = toBody(form);
            if (!expectedAmounts.includes(body.amountVes)) {
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
            expected: formatBillingAmount(amountVes),
          })}
          error={errors.amount?.message}
          {...register('amount')}
        />

        <div className="flex flex-col gap-2">
          <FieldError
            id={failureId}
            message={failure ?? undefined}
            className="text-center"
          />
          <Button type="submit" block shape="soft" loading={busy}>
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
        expected={amountVes}
        reported={shownBody?.amountVes ?? 0}
        onSend={() => {
          if (pendingBody) send(pendingBody);
          setPendingBody(null);
        }}
      />
    </div>
  );
}
