import { formatBillingAmount } from '@/app/lib/format/money';
import type { Coupon } from '@/app/lib/schemas/billing';

import type { useTranslations } from 'next-intl';

type Translate = ReturnType<typeof useTranslations<'billing'>>;

/** What a discount takes off: a coupon's, or the one running on the subscription. */
type DiscountTerms = Pick<Coupon, 'discountType' | 'percentOff' | 'amountOff'>;

/** «20 % de descuento» or «$ 5 de descuento»; nothing for a kind this version does not know. */
export function couponDiscountLabel(
  t: Translate,
  coupon: DiscountTerms,
): string {
  if (coupon.discountType === 'PERCENT') {
    return t('couponTerms.percent', { percent: coupon.percentOff ?? 0 });
  }
  if (coupon.discountType === 'AMOUNT' && coupon.amountOff) {
    return t('couponTerms.amount', {
      amount: formatBillingAmount(coupon.amountOff),
    });
  }
  return '';
}

/** «20 %» or «$ 5»: what it takes off, no more words. */
export function couponShortDiscount(coupon: Coupon): string {
  if (coupon.discountType === 'PERCENT') {
    return `${String(coupon.percentOff ?? 0)}\u00a0%`;
  }
  return coupon.discountType === 'AMOUNT' && coupon.amountOff
    ? formatBillingAmount(coupon.amountOff)
    : '';
}

/** «en tu primera mensualidad», «durante 3 meses» or «en todas tus mensualidades». */
export function couponDurationLabel(t: Translate, coupon: Coupon): string {
  switch (coupon.duration) {
    case 'ONCE':
      return t('couponTerms.once');
    case 'REPEATING':
      return t('couponTerms.repeating', { count: coupon.durationMonths ?? 1 });
    case 'FOREVER':
      return t('couponTerms.forever');
    default:
      return '';
  }
}

/** «20 % de descuento en tu primera mensualidad». */
export function couponSummary(t: Translate, coupon: Coupon): string {
  return `${couponDiscountLabel(t, coupon)} ${couponDurationLabel(t, coupon)}`;
}
