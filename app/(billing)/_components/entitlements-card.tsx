'use client';

import { useId } from 'react';

import CheckCircleFill from '@material-symbols/svg-400/rounded/check_circle-fill.svg?svgr';
import DoNotDisturbOn from '@material-symbols/svg-400/rounded/do_not_disturb_on.svg?svgr';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';

import type { SessionUser } from '@/app/lib/firebase/client';
import { plansQueryOptions } from '@/app/lib/queries/billing';
import type { Subscription } from '@/app/lib/schemas/billing';
import { cn } from '@/app/lib/utils';

import { Icon } from '@/app/ui/icons';
import { Skeleton } from '@/app/ui/skeleton';

type Entitlement = { key: string; label: string; on: boolean };

/*
 * «¿Qué incluye tu plan?» on «Mi suscripción» (the app's
 * SubscriptionEntitlementsSection): what the plan includes, from the
 * catalog, and whether it is on now, from the API's access rule — with a
 * renewal unpaid but still in time it is all on, and deriving it from the
 * status would cut the service early. Without the plan in the catalog (an
 * archived one) only what does not depend on it is told. Each row says
 * whether it is included in words too, not only by its mark.
 */
export function EntitlementsCard({
  user,
  subscription,
  hasAccess,
}: {
  user: SessionUser;
  subscription: Subscription;
  /** The API's access rule (`access.hasAccess`). */
  hasAccess: boolean;
}) {
  const t = useTranslations('billing');
  const headingId = useId();
  const plans = useQuery(plansQueryOptions(user));
  const plan =
    plans.data?.find((candidate) => candidate.id === subscription.plan.id) ??
    null;

  const rows: Entitlement[] = [
    { key: 'search', label: t('plans.benefits.search'), on: hasAccess },
  ];
  if (plan) {
    rows.push(
      {
        key: 'clinics',
        label:
          plan.maxActiveClinics == null
            ? t('plans.benefits.unlimitedClinics')
            : t('mySubscription.entitlements.clinics', {
                count: plan.maxActiveClinics,
              }),
        on: hasAccess,
      },
      {
        key: 'reports',
        label: t('plans.benefits.exportReports'),
        on: hasAccess && plan.canExportReports,
      },
    );
  }

  return (
    <section
      aria-labelledby={headingId}
      className="flex animate-fade-up flex-col gap-3 rounded-2xl bg-pure-white p-5 shadow-md"
    >
      <h2 id={headingId} className="text-title-md text-text-primary">
        {t('mySubscription.entitlements.title')}
      </h2>
      <ul className="flex flex-col gap-2.5">
        {rows.map((row) => (
          <li
            key={row.key}
            className={cn(
              'flex animate-fade-in items-start gap-2.5 text-body-md',
              row.on ? 'text-text-primary' : 'text-text-secondary',
            )}
          >
            <Icon
              icon={row.on ? CheckCircleFill : DoNotDisturbOn}
              size={18}
              label={
                row.on
                  ? t('mySubscription.entitlements.included')
                  : t('mySubscription.entitlements.notIncluded')
              }
              className={cn(
                'mt-0.5 shrink-0',
                row.on ? 'text-success' : 'text-grey-500',
              )}
            />
            {row.label}
          </li>
        ))}
        {/* What the plan gives arrives with the catalog: its rows' room, no words. */}
        {plans.isPending ? (
          <li aria-hidden="true" className="flex flex-col gap-2.5">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-5 w-2/3" />
          </li>
        ) : null}
      </ul>
    </section>
  );
}
