'use client';

import { useId } from 'react';

import { useTranslations } from 'next-intl';

import { formatBillingAmount } from '@/app/lib/format/money';
import {
  couponDiscount,
  type InvoiceDetail,
  type OfferedPlan,
} from '@/app/lib/schemas/billing';

import { couponShortDiscount } from './coupon-words';
import { DetailList, type DetailItem } from './detail-list';

import type { AppliedCoupon } from './payment-types';

type PaymentTotalsProps = {
  /** Taking a plan: the price and the coupon decide, until the receipt exists. */
  plan: OfferedPlan | null;
  coupon: AppliedCoupon | null;
  /** The receipt, once it exists: its lines are the good figure. */
  invoice: InvoiceDetail | null;
  /** Opens the coupon sheet; null once a coupon can no longer be added. */
  onCoupon: (() => void) | null;
};

const linkClass =
  'rounded-sm text-label-lg text-primary outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50';

/*
 * What is being paid, in dollars (the app's PaymentTotals). Before taking a
 * plan: its price, the coupon and the total. With the receipt issued: its
 * lines, what was already settled — payments, balance or adjustments — and
 * what is left to pay.
 */
export function PaymentTotals({
  plan,
  coupon,
  invoice,
  onCoupon,
}: PaymentTotalsProps) {
  const t = useTranslations('billing.acquire.totals');
  const headingId = useId();

  let items: DetailItem[] = [];
  if (invoice) {
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
  } else if (plan) {
    const price = plan.price.amount;
    const discount = coupon ? couponDiscount(coupon.terms, price) : null;
    items = [
      {
        key: 'subtotal',
        label: t('subtotal'),
        value: formatBillingAmount(price),
      },
      ...(onCoupon
        ? [
            {
              key: 'coupons',
              label: t('coupons'),
              value:
                coupon && discount ? (
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
                    <span className="font-normal text-text-secondary">
                      {formatBillingAmount({
                        amount: -discount.amount,
                        currency: discount.currency,
                      })}
                    </span>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={onCoupon}
                    className={linkClass}
                  >
                    {t('addCoupon')}
                  </button>
                ),
            },
          ]
        : []),
      {
        key: 'total',
        label: t('total'),
        value: formatBillingAmount({
          amount: price.amount - (discount?.amount ?? 0),
          currency: price.currency,
        }),
        strong: true,
      },
    ];
  }

  return (
    <section
      aria-labelledby={headingId}
      className="animate-fade-up rounded-2xl bg-pure-white p-5 shadow-md"
    >
      <h2 id={headingId} className="mb-3 text-title-sm text-text-primary">
        {t('title')}
      </h2>
      <DetailList items={items} />
    </section>
  );
}
