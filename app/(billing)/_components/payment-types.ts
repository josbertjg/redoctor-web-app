import type { VenezuelanBank } from '@/app/lib/billing/banks';
import type {
  Coupon,
  CouponChoice,
  PaymentMethod,
} from '@/app/lib/schemas/billing';

/** The coupon applied to the plan being taken: what travels with the subscription, and its terms. */
export type AppliedCoupon = {
  choice: CouponChoice;
  terms: Coupon;
};

/** How the payment ended: reported and in review, or a plan a coupon activated at once. */
export type PaymentOutcome =
  | {
      kind: 'reported';
      method: PaymentMethod;
      /** Céntimos the person said they paid. */
      amountVes: number;
      bank: VenezuelanBank;
      /** `YYYY-MM-DD`. */
      paidOn: string;
    }
  | { kind: 'activated'; planName: string; couponCode: string | null };
