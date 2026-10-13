'use client';

import Image from 'next/image';
import Link from 'next/link';

import { useTranslations } from 'next-intl';

import { bankLabel } from '@/app/lib/billing/banks';
import { formatCalendarDate } from '@/app/lib/format/dates';
import { formatBillingAmount } from '@/app/lib/format/money';
import { routes } from '@/app/lib/routes';

import { Button } from '@/app/ui/button';

import { DetailList } from './detail-list';

import type { PaymentOutcome } from './payment-types';

/*
 * The close of the flow (the app's PaymentDonePage). A reported payment is
 * **in review** — it activates nothing by itself — while a 100 % coupon
 * activates the plan at once: saying it wrong in either case leaves the
 * specialist waiting for something that will not happen. «Ir al inicio»
 * leads to their page, not back to the plans they have just taken.
 */
export function PaymentDone({ outcome }: { outcome: PaymentOutcome }) {
  const t = useTranslations('billing.acquire');

  return (
    <div className="flex w-full animate-fade-up flex-col items-center gap-5 text-center">
      <div className="flex flex-col gap-2">
        <h1 className="text-headline-sm text-text-primary">
          {outcome.kind === 'reported'
            ? t('done.pendingTitle')
            : t('done.activatedTitle')}
        </h1>
        <p className="text-body-md text-text-secondary">
          {outcome.kind === 'reported'
            ? t('done.pendingDescription')
            : t('done.activatedDescription', {
                code: outcome.couponCode ?? '',
                plan: outcome.planName,
              })}
        </p>
      </div>
      {outcome.kind === 'reported' ? (
        <Image
          src="/illustrations/verifying-payment.svg"
          alt=""
          width={158}
          height={176}
          className="h-40 w-auto"
        />
      ) : (
        <Image
          src="/illustrations/plan-activated.svg"
          alt=""
          width={339}
          height={152}
          className="h-36 w-auto"
        />
      )}
      {outcome.kind === 'reported' ? (
        <DetailList
          className="w-full rounded-2xl bg-pure-white p-5 text-left shadow-md"
          items={[
            {
              key: 'amount',
              label: t('fields.amount'),
              value: formatBillingAmount({
                amount: outcome.amountVes,
                currency: 'VES',
              }),
            },
            {
              key: 'bank',
              label: t('fields.usedBank'),
              value: bankLabel(outcome.bank),
            },
            {
              key: 'method',
              label: t('fields.method'),
              value: t(
                outcome.method === 'MOBILE_PAYMENT'
                  ? 'methods.mobile'
                  : 'methods.transfer',
              ),
            },
            {
              key: 'date',
              label: t('fields.date'),
              value: formatCalendarDate(outcome.paidOn),
            },
          ]}
        />
      ) : null}
      <Button asChild block shape="soft">
        <Link href={routes.specialistHome()}>{t('done.goHome')}</Link>
      </Button>
    </div>
  );
}
