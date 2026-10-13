'use client';

import { useId } from 'react';

import Celebration from '@material-symbols/svg-400/rounded/celebration.svg?svgr';
import ChevronRight from '@material-symbols/svg-400/rounded/chevron_right.svg?svgr';
import Mobile from '@material-symbols/svg-400/rounded/mobile.svg?svgr';
import ProgressActivity from '@material-symbols/svg-400/rounded/progress_activity.svg?svgr';
import Schedule from '@material-symbols/svg-400/rounded/schedule.svg?svgr';
import SwapHoriz from '@material-symbols/svg-400/rounded/swap_horiz.svg?svgr';
import { useTranslations } from 'next-intl';

import type {
  InvoiceDetail,
  OfferedPlan,
  PaymentMethod,
} from '@/app/lib/schemas/billing';

import { Button } from '@/app/ui/button';
import { FieldError } from '@/app/ui/field-error';
import { Icon, type IconComponent } from '@/app/ui/icons';

import { PaymentTotals } from './payment-totals';

import type { AppliedCoupon } from './payment-types';

type MethodStepProps = {
  /** Taking a plan: the plan; paying a receipt that exists: null. */
  plan: OfferedPlan | null;
  coupon: AppliedCoupon | null;
  invoice: InvoiceDetail | null;
  /** The coupon leaves the first month at zero: nothing to pay, only to activate. */
  free: boolean;
  /** The method whose payment is being started; taking the plan and fixing the amount go in the same tap. */
  startingMethod: PaymentMethod | null;
  activating: boolean;
  /** No rate of the day: said here, with a retry by tapping the method again. */
  noRate: 'fresh' | 'subscribed' | null;
  /** Any other failure, already translated. */
  failure: string | null;
  onSelect: (method: PaymentMethod) => void;
  onActivateFree: () => void;
  onCoupon: (() => void) | null;
};

const methods: { method: PaymentMethod; icon: IconComponent }[] = [
  { method: 'MOBILE_PAYMENT', icon: Mobile },
  { method: 'BANK_TRANSFER', icon: SwapHoriz },
];

/*
 * Step 1, how to pay (the app's PaymentMethodPage): the totals and, when
 * taking a plan, the coupon; then Pago móvil or Transferencia. Choosing one
 * creates the subscription when there is none and fixes the amount in
 * bolívares in the same tap: until here nothing has been created.
 */
export function MethodStep({
  plan,
  coupon,
  invoice,
  free,
  startingMethod,
  activating,
  noRate,
  failure,
  onSelect,
  onActivateFree,
  onCoupon,
}: MethodStepProps) {
  const t = useTranslations('billing');
  const failureId = useId();
  const freeHeadingId = useId();

  return (
    <div className="flex flex-col gap-4">
      <PaymentTotals
        plan={plan}
        coupon={coupon}
        invoice={invoice}
        onCoupon={onCoupon}
      />

      {free ? (
        <section
          aria-labelledby={freeHeadingId}
          className="flex animate-fade-up flex-col gap-3 rounded-2xl bg-success-light p-5"
        >
          <h2
            id={freeHeadingId}
            className="flex items-start gap-2 text-title-md text-green-800"
          >
            <Icon
              icon={Celebration}
              size={24}
              className="shrink-0 text-success"
            />
            {t('acquire.method.freeTitle')}
          </h2>
          <p className="text-body-md text-green-800">
            {t('acquire.method.freeDescription')}
          </p>
          <Button
            block
            shape="soft"
            loading={activating}
            onClick={onActivateFree}
          >
            {t('acquire.method.activateFree')}
          </Button>
        </section>
      ) : (
        <>
          {noRate ? (
            <p className="flex animate-fade-in items-start gap-3 rounded-lg bg-warning-50 p-3 text-body-md text-warning-800">
              <Icon icon={Schedule} size={24} className="shrink-0" />
              {t(
                noRate === 'subscribed' ? 'pay.noRateSubscribed' : 'pay.noRate',
              )}
            </p>
          ) : null}
          <ul className="flex flex-col gap-3">
            {methods.map(({ method, icon }) => {
              const starting = startingMethod === method;
              return (
                <li key={method}>
                  <button
                    type="button"
                    aria-busy={starting || undefined}
                    onClick={() => {
                      onSelect(method);
                    }}
                    className="flex min-h-20 w-full items-center gap-4 rounded-2xl bg-pure-white p-4 text-left shadow-md transition-[translate,box-shadow] duration-base ease-house outline-none hover:-translate-y-0.5 hover:shadow-lg focus-visible:ring-3 focus-visible:ring-ring/50 active:translate-y-px"
                  >
                    <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-green-50 text-secondary">
                      <Icon icon={icon} size={24} />
                    </span>
                    <span className="flex-1 text-title-md text-text-primary">
                      {t(
                        method === 'MOBILE_PAYMENT'
                          ? 'acquire.methods.mobile'
                          : 'acquire.methods.transfer',
                      )}
                    </span>
                    {/* Taking the plan and fixing the amount take a moment: the spin says the tap landed, where the arrow was. */}
                    <Icon
                      icon={starting ? ProgressActivity : ChevronRight}
                      size={24}
                      className={
                        starting
                          ? 'shrink-0 animate-spin text-primary motion-reduce:animate-none'
                          : 'shrink-0 text-grey-400'
                      }
                    />
                  </button>
                </li>
              );
            })}
          </ul>
          <FieldError
            id={failureId}
            message={failure ?? undefined}
            className="text-center"
          />
        </>
      )}
    </div>
  );
}
