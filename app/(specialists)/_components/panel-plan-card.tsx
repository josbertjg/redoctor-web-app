'use client';

import { useId } from 'react';

import Image from 'next/image';
import Link from 'next/link';

import { useTranslations } from 'next-intl';

import { routes } from '@/app/lib/routes';
import {
  subscriptionStatusChips,
  type Subscription,
} from '@/app/lib/schemas/billing';

import { PlanEmblem } from '@/app/ui/billing/plan-emblem';
import { Button } from '@/app/ui/button';
import { StateChip } from '@/app/ui/state-chip';

/*
 * The app's «¡Llega a más pacientes desde hoy!» (its home's ChoosePlanCard)
 * as the designer drew it: green, the figure of a checklist taking its
 * last tick, and the way to the plans. Shown when a plan can be taken: none
 * yet or none in force, the sign-up done and a specialty verified.
 */
export function ChoosePlanCard() {
  const t = useTranslations('home.choosePlanCard');
  const headingId = useId();

  return (
    <section
      aria-labelledby={headingId}
      className="relative isolate flex min-h-51 animate-fade-up overflow-hidden rounded-xl bg-green-500 px-6 py-6 shadow-md sm:px-7"
    >
      <div className="relative z-10 flex max-w-64 flex-col items-start gap-4">
        <div className="flex flex-col gap-1.5">
          <h2
            id={headingId}
            className="text-subtitle-s font-bold text-balance text-pure-white"
          >
            {t('title')}
          </h2>
          <p className="text-body-md text-pure-white">{t('description')}</p>
        </div>
        <Button asChild shape="soft" size="small">
          <Link href={routes.subscriptionPay()}>{t('button')}</Link>
        </Button>
      </div>
      <Image
        src="/illustrations/panel/plans.svg"
        alt=""
        aria-hidden="true"
        width={285}
        height={196}
        className="pointer-events-none absolute right-0 -bottom-2 hidden w-56 sm:block lg:w-62"
      />
    </section>
  );
}

/*
 * The plan in force, as the panel's home showed it: its crown, its name,
 * its state and the way to «Mi suscripción».
 */
export function CurrentPlanCard({
  subscription,
}: {
  subscription: Subscription;
}) {
  const t = useTranslations('panel.home.plan');
  const tBilling = useTranslations('billing');
  const headingId = useId();
  const chip = subscriptionStatusChips[subscription.status];

  return (
    <section
      aria-labelledby={headingId}
      className="flex animate-fade-up flex-col gap-4 rounded-xl bg-pure-white px-6 py-6 shadow-md sm:px-7"
    >
      <div className="flex items-center gap-4">
        <PlanEmblem slug={subscription.plan.slug} size="sm" />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <p className="text-label-md text-text-secondary">{t('title')}</p>
          <div className="flex flex-wrap items-center gap-2">
            <h2
              id={headingId}
              className="text-title-md break-words text-text-primary"
            >
              {subscription.plan.name}
            </h2>
            <StateChip tone={chip.tone}>
              {tBilling(`billingStatus.${chip.label}`)}
            </StateChip>
          </div>
        </div>
      </div>
      <Button
        asChild
        variant="white"
        shape="soft"
        size="small"
        className="self-start"
      >
        <Link href={routes.subscription()}>{t('see')}</Link>
      </Button>
    </section>
  );
}
