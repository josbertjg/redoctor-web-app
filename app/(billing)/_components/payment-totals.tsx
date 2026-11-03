'use client';

import { useId } from 'react';

import { useTranslations } from 'next-intl';

import { formatBillingAmount, formatRate } from '@/app/lib/format/money';
import type { InvoiceDetail, PaymentQuote } from '@/app/lib/schemas/billing';

import { Skeleton } from '@/app/ui/skeleton';

import { couponShortDiscount } from './coupon-words';
import { DetailList, type DetailItem } from './detail-list';

import type { AppliedCoupon } from './payment-types';

/** What is being paid: a quote (taking or upgrading a plan), a receipt that exists, or a quote on its way. */
export type TotalsSource =
  | { kind: 'quote'; quote: PaymentQuote }
  | { kind: 'invoice'; invoice: InvoiceDetail }
  | { kind: 'quoting' };

type PaymentTotalsProps = {
  source: TotalsSource;
  /** Taking a plan: the coupon riding on the quote. */
  coupon: AppliedCoupon | null;
  /** Opens the coupon sheet; null where no coupon can be added. */
  onCoupon: (() => void) | null;
};

/** A touch target tall (§8.5); the negative margin keeps the row's height. */
const linkClass =
  '-my-3 inline-flex min-h-touch items-center rounded-sm text-label-lg text-primary outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50';

/*
 * What is being paid, in dollars (the app's PaymentTotals). A quote
 * (REDOC-363): the plan, the coupon, the balance it uses and what is left
 * to pay, with its bolívares at the day's rate — or an upgrade's lines, the
 * new plan for the days left less what the current one leaves unused. A
 * receipt that exists: its lines, what was already settled and what is
 * left. While a quote is on its way the rows keep their place.
 */
export function PaymentTotals({
  source,
  coupon,
  onCoupon,
}: PaymentTotalsProps) {
  const t = useTranslations('billing.acquire.totals');
  const headingId = useId();

  let items: DetailItem[];
  let bolivares: string | null = null;

  if (source.kind === 'invoice') {
    const { invoice } = source;
    const settled = invoice.total.amount - invoice.pending.amount;
    items = [
      ...invoice.lines.map((line, index) => ({
        key: `line-${String(index)}`,
        label: line.description,
        value: formatBillingAmount(line.amount),
      })),
      ...(settled > 0
        ? [
            {
              key: 'settled',
              label: t('settled'),
              value: formatBillingAmount({
                amount: -settled,
                currency: invoice.total.currency,
              }),
            },
          ]
        : []),
      {
        key: 'toPay',
        label: t('toPay'),
        value: formatBillingAmount(invoice.pending),
        strong: true,
      },
    ];
  } else if (source.kind === 'quote') {
    const { quote } = source;
    const discount = quote.lines.find((line) => line.type === 'DISCOUNT');
    // Taking a plan: the plan's price, then the coupon's row; an upgrade
    // lists its proration lines as they are.
    const charges = onCoupon
      ? quote.lines.filter((line) => line.type !== 'DISCOUNT')
      : quote.lines;
    items = [
      ...charges.map((line, index) => ({
        key: `line-${String(index)}`,
        label: onCoupon ? t('subtotal') : line.description,
        value: formatBillingAmount(line.amount),
      })),
      ...(onCoupon
        ? [
            {
              key: 'coupons',
              label: t('coupons'),
              value: coupon ? (
                <span className="flex flex-col items-end gap-0.5">
                  <span className="flex flex-wrap items-center justify-end gap-x-2">
                    <span className="font-semibold">{coupon.terms.code}</span>
                    <span className="font-semibold text-green-700">
                      ({couponShortDiscount(coupon.terms)})
                    </span>
                    <button
                      type="button"
                      onClick={onCoupon}
                      className={linkClass}
                    >
                      {t('changeCoupon')}
                    </button>
                  </span>
                  {discount ? (
                    <span className="font-normal text-text-secondary">
                      {formatBillingAmount(discount.amount)}
                    </span>
                  ) : null}
                </span>
              ) : (
                <button type="button" onClick={onCoupon} className={linkClass}>
                  {t('addCoupon')}
                </button>
              ),
            },
          ]
        : []),
      ...(quote.balanceApplied.amount > 0
        ? [
            {
              key: 'balance',
              label: t('balance'),
              value: formatBillingAmount({
                amount: -quote.balanceApplied.amount,
                currency: quote.balanceApplied.currency,
              }),
            },
          ]
        : []),
      {
        key: 'toPay',
        label: t('toPay'),
        value: formatBillingAmount(quote.payable),
        strong: true,
      },
    ];
    bolivares = quote.requiresPayment
      ? t('inBolivars', {
          amount: formatBillingAmount(quote.payableVes),
          rate: formatRate(quote.rate),
        })
      : null;
  } else {
    // The rows the quote will fill, at their height.
    items = [t('subtotal'), t('toPay')].map((label, index) => ({
      key: `quoting-${String(index)}`,
      label,
      value: <Skeleton className="ml-auto h-5 w-20" />,
    }));
  }

  return (
    <section
      aria-labelledby={headingId}
      aria-busy={source.kind === 'quoting' || undefined}
      className="animate-fade-up rounded-2xl bg-pure-white p-5 shadow-md"
    >
      <h2 id={headingId} className="mb-3 text-title-sm text-text-primary">
        {t('title')}
      </h2>
      <DetailList items={items} />
      {bolivares ? (
        <p className="mt-2 animate-fade-in text-right text-body-sm text-text-secondary">
          {bolivares}
        </p>
      ) : null}
    </section>
  );
}
