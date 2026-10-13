import { formatBillingAmount } from '@/app/lib/format/money';
import type { Coupon } from '@/app/lib/schemas/billing';

import type { useTranslations } from 'next-intl';

type Translate = ReturnType<typeof useTranslations<'billing'>>;

/** «20 % de descuento» or «$ 5 de descuento». */
export function couponDiscountLabel(t: Translate, coupon: Coupon): string {
  return coupon.discountType === 'PERCENT'
    ? t('couponTerms.percent', { percent: coupon.percentOff ?? 0 })
    : t('couponTerms.amount', {
        amount: coupon.amountOff ? formatBillingAmount(coupon.amountOff) : '',
      });
}

/** «20 %» or «$ 5»: what it takes off, no more words. */
export function couponShortDiscount(coupon: Coupon): string {
  return coupon.discountType === 'PERCENT'
    ? `${String(coupon.percentOff ?? 0)}\u00a0%`
    : coupon.amountOff
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
  }
}

/** «20 % de descuento en tu primera mensualidad». */
export function couponSummary(t: Translate, coupon: Coupon): string {
  return `${couponDiscountLabel(t, coupon)} ${couponDurationLabel(t, coupon)}`;
}
