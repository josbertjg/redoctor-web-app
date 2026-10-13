'use client';

import CheckCircleFill from '@material-symbols/svg-400/rounded/check_circle-fill.svg?svgr';
import { useTranslations } from 'next-intl';

import type { SavedCoupon } from '@/app/lib/schemas/billing';

import { Icon } from '@/app/ui/icons';

import { couponSummary } from './coupon-words';

/*
 * What both coupon sheets show — taking a plan, and putting a coupon on
 * the plan in force: the discount a code would give, and the saved coupons
 * to pick one without typing it (the app's CouponPreviewCard and
 * SavedCouponsPicker).
 */

/** The discount seen, not applied yet: what it takes off, what the month would cost, and a note. */
export function CouponPreview({
  summary,
  amount,
  note,
}: {
  summary: string;
  amount: string;
  note?: string;
}) {
  return (
    <div className="animate-fade-in rounded-lg bg-success-light p-3">
      <p className="flex items-start gap-2 text-label-lg text-green-800">
        <Icon
          icon={CheckCircleFill}
          size={18}
          className="mt-0.5 shrink-0 text-success"
        />
        {summary}
      </p>
      <p className="mt-1 text-body-md font-semibold text-green-800">{amount}</p>
      {note ? <p className="mt-1 text-body-sm text-green-800">{note}</p> : null}
    </div>
  );
}

/** The saved coupons that serve here; one tap sees its discount. */
export function SavedCouponsPicker({
  coupons,
  onPick,
}: {
  coupons: readonly SavedCoupon[];
  onPick: (coupon: SavedCoupon) => void;
}) {
  const t = useTranslations('billing');
  if (coupons.length === 0) return null;
  return (
    <div className="flex animate-fade-in flex-col gap-2">
      <p className="text-label-md text-text-secondary">
        {t('acquire.coupon.saved')}
      </p>
      <ul className="flex flex-col divide-y divide-divider">
        {coupons.map((coupon) => (
          <li key={coupon.savedCouponId}>
            <button
              type="button"
              onClick={() => {
                onPick(coupon);
              }}
              className="flex min-h-touch w-full flex-col items-start gap-0.5 rounded-lg py-2 text-left outline-none hover:bg-white-200 focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <span className="text-label-lg text-text-primary">
                {coupon.code}
              </span>
              <span className="text-body-sm text-text-secondary">
                {couponSummary(t, coupon)}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
