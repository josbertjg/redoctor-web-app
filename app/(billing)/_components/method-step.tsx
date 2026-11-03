'use client';

import { useId } from 'react';

import Celebration from '@material-symbols/svg-400/rounded/celebration.svg?svgr';
import ChevronRight from '@material-symbols/svg-400/rounded/chevron_right.svg?svgr';
import CloudOff from '@material-symbols/svg-400/rounded/cloud_off.svg?svgr';
import Mobile from '@material-symbols/svg-400/rounded/mobile.svg?svgr';
import ProgressActivity from '@material-symbols/svg-400/rounded/progress_activity.svg?svgr';
import Schedule from '@material-symbols/svg-400/rounded/schedule.svg?svgr';
import SwapHoriz from '@material-symbols/svg-400/rounded/swap_horiz.svg?svgr';
import { useTranslations } from 'next-intl';

import type { PaymentMethod } from '@/app/lib/schemas/billing';

import { Button } from '@/app/ui/button';
import { FieldError } from '@/app/ui/field-error';
import { Icon, type IconComponent } from '@/app/ui/icons';
import { SupportLinks } from '@/app/ui/support/support-links';

import { useSupportChannels } from '@/app/hooks/use-support-channels';

import { PaymentTotals, type TotalsSource } from './payment-totals';

import type { AppliedCoupon } from './payment-types';

type MethodStepProps = {
  totals: TotalsSource;
  coupon: AppliedCoupon | null;
  /** The ways to pay there is an account for; a receipt's attempt brings its accounts after the choice. */
  methods: readonly PaymentMethod[];
  /** Nothing to pay: a coupon (`coupon`) or the balance (`balance`) covers it, only to activate. */
  free: 'coupon' | 'balance' | null;
  /** A receipt's method whose payment is being started (the amount is fixed in the same tap). */
  startingMethod: PaymentMethod | null;
  activating: boolean;
  /** No rate of the day: said here, with a way to try again. */
  noRate: 'fresh' | 'subscribed' | null;
  /** The quote could not be read: said here, with «Reintentar». */
  quoteFailure: {
    message: string;
    retrying: boolean;
    onRetry: () => void;
  } | null;
  /** Any other failure, already translated. */
  failure: string | null;
  onSelect: (method: PaymentMethod) => void;
  onActivateFree: () => void;
  onCoupon: (() => void) | null;
};

const methodIcons: Record<PaymentMethod, IconComponent> = {
  MOBILE_PAYMENT: Mobile,
  BANK_TRANSFER: SwapHoriz,
};

/*
 * Step 1, how to pay (the app's PaymentMethodPage): the totals and, when
 * taking a plan, the coupon; then the ways to pay there is an account for —
 * Pago móvil, Transferencia —, chosen with no call to the API: the quote
 * already brought the accounts (REDOC-363). Nothing has been created until
 * «Confirmar». A receipt that exists fixes its amount when the method is
 * chosen, as before. With no way to pay configured, support.
 */
export function MethodStep({
  totals,
  coupon,
  methods,
  free,
  startingMethod,
  activating,
  noRate,
  quoteFailure,
  failure,
  onSelect,
  onActivateFree,
  onCoupon,
}: MethodStepProps) {
  const t = useTranslations('billing');
  const tRoot = useTranslations();
  const failureId = useId();
  const freeHeadingId = useId();
  const channels = useSupportChannels(t('pay.supportMessage'));
  const quoting = totals.kind === 'quoting';

  return (
    <div className="flex flex-col gap-4">
      <PaymentTotals source={totals} coupon={coupon} onCoupon={onCoupon} />

      {quoteFailure ? (
        <div
          role="status"
          className="flex animate-fade-in flex-col items-start gap-3 rounded-2xl bg-pure-white p-5 shadow-md"
        >
          <p className="flex items-start gap-3 text-body-md text-text-primary">
            <Icon
              icon={CloudOff}
              size={24}
              className="shrink-0 text-text-secondary"
            />
            {quoteFailure.message}
          </p>
          <Button
            variant="white"
            size="small"
            shape="soft"
            loading={quoteFailure.retrying}
            onClick={quoteFailure.onRetry}
          >
            {tRoot('retry')}
          </Button>
        </div>
      ) : noRate ? (
        // Said aloud as it appears: the tap that raised it gave no other answer.
        <p
          role="status"
          className="flex animate-fade-in items-start gap-3 rounded-lg bg-warning-50 p-3 text-body-md text-warning-800"
        >
          <Icon icon={Schedule} size={24} className="shrink-0" />
          {t(noRate === 'subscribed' ? 'pay.noRateSubscribed' : 'pay.noRate')}
        </p>
      ) : null}

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
            {t(
              free === 'balance'
                ? 'acquire.method.freeTitleBalance'
                : 'acquire.method.freeTitle',
            )}
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
          <FieldError
            id={failureId}
            message={failure ?? undefined}
            className="text-center"
          />
        </section>
      ) : quoting || quoteFailure ? null : methods.length === 0 ? (
        <section className="flex animate-fade-up flex-col gap-4 rounded-2xl bg-pure-white p-5 shadow-md">
          <p className="text-body-md text-text-primary">
            {t('acquire.method.noneAvailable')}
          </p>
          <SupportLinks channels={channels} headingLevel={null} />
        </section>
      ) : (
        <>
          <ul className="flex animate-fade-in flex-col gap-3">
            {methods.map((method) => {
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
                      <Icon icon={methodIcons[method]} size={24} />
                    </span>
                    <span className="flex-1 text-title-md text-text-primary">
                      {t(
                        method === 'MOBILE_PAYMENT'
                          ? 'acquire.methods.mobile'
                          : 'acquire.methods.transfer',
                      )}
                    </span>
                    {/* A receipt's amount is fixed in the same tap: the spin says it landed, where the arrow was. */}
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
