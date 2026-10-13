'use client';

import Link from 'next/link';

import AddLocationAlt from '@material-symbols/svg-400/rounded/add_location_alt.svg?svgr';
import LocationOn from '@material-symbols/svg-400/rounded/location_on.svg?svgr';
import Visibility from '@material-symbols/svg-400/rounded/visibility.svg?svgr';
import VisibilityOff from '@material-symbols/svg-400/rounded/visibility_off.svg?svgr';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';

import type { SessionUser } from '@/app/lib/firebase/client';
import {
  plansQueryOptions,
  subscriptionQueryOptions,
} from '@/app/lib/queries/billing';
import { routes } from '@/app/lib/routes';
import { featureOffer, type OfferedPlan } from '@/app/lib/schemas/billing';
import type { Office } from '@/app/lib/schemas/offices';
import { cn } from '@/app/lib/utils';

import { Button } from '@/app/ui/button';
import { Icon } from '@/app/ui/icons';
import { StateChip } from '@/app/ui/state-chip';

import { PlanOfferCard } from '../plan-offer-card';
import { ProfileBlock, ProfileBlockEmpty } from './profile-block';

/**
 * How many offices the plan in force lets be active, as the app reads it:
 * only with access to the service and a cap the catalog knows (`null`
 * otherwise, unlimited included).
 */
function useOfficeCap(user: SessionUser) {
  const current = useQuery(subscriptionQueryOptions(user));
  const plans = useQuery(plansQueryOptions(user));
  const subscription = current.data?.subscription ?? null;
  const plan =
    plans.data?.find((candidate) => candidate.id === subscription?.plan.id) ??
    null;
  const cap =
    current.data?.access.hasAccess === true && plan
      ? (plan.maxActiveClinics ?? null)
      : null;
  return { cap, subscription, plans: plans.data ?? null };
}

/*
 * «Consultorios de atención», as the app's profile: each office with its
 * address and whether patients see it (active, in the brand's green), and
 * how many of the plan's cap are in use. At the cap, the plan with more
 * offices, its price and the way to it (the owner's rule: a feature the
 * plan lacks invites to a plan that has it); offices are added in the app.
 */
export function ProfileOffices({
  user,
  offices,
}: {
  user: SessionUser;
  offices: readonly Office[];
}) {
  const t = useTranslations();
  const { cap, subscription, plans } = useOfficeCap(user);
  const active = offices.filter((office) => office.isActive).length;

  const offer =
    cap !== null && active >= cap && subscription !== null && plans !== null
      ? featureOffer(
          (plan) =>
            plan.maxActiveClinics == null || plan.maxActiveClinics > cap,
          plans,
          subscription,
        )
      : null;

  return (
    <ProfileBlock
      title={t('specialistProfile.offices')}
      subtitle={
        cap === null
          ? undefined
          : t('specialistProfile.officesUsage', { active, max: cap })
      }
    >
      {offices.length === 0 ? (
        <ProfileBlockEmpty icon={AddLocationAlt}>
          {t('specialistProfile.addOffice')}
        </ProfileBlockEmpty>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {offices.map((office) => (
            <li
              key={office.id}
              className={cn(
                'flex animate-fade-in flex-col items-start gap-2 rounded-xl p-4',
                office.isActive
                  ? 'bg-secondary text-on-secondary'
                  : 'border border-divider bg-pure-white text-text-primary',
              )}
            >
              <p className="line-clamp-2 text-label-lg">{office.name}</p>
              {office.address ? (
                <p
                  className={cn(
                    'flex items-start gap-1 text-body-sm',
                    !office.isActive && 'text-text-secondary',
                  )}
                >
                  <Icon
                    icon={LocationOn}
                    size={16}
                    className="mt-0.5 shrink-0"
                  />
                  <span className="min-w-0">{office.address}</span>
                </p>
              ) : null}
              <StateChip
                tone={office.isActive ? 'positive' : 'neutral'}
                icon={office.isActive ? Visibility : VisibilityOff}
              >
                {office.isActive ? t('active') : t('inactive')}
              </StateChip>
            </li>
          ))}
        </ul>
      )}
      {offer?.kind === 'upgrade' && cap !== null ? (
        <OfficesUpgrade cap={cap} plan={offer.plan} />
      ) : null}
    </ProfileBlock>
  );
}

function OfficesUpgrade({ cap, plan }: { cap: number; plan: OfferedPlan }) {
  const t = useTranslations();

  return (
    <div className="flex animate-fade-up flex-col gap-4 rounded-xl border border-divider p-4">
      <p className="text-body-md text-text-primary">
        {t('billing.officeLimit.withPlan.changeDescription', { count: cap })}
      </p>
      <PlanOfferCard
        plan={plan}
        benefit={
          plan.maxActiveClinics == null
            ? t('billing.plans.benefits.unlimitedClinics')
            : t('billing.mySubscription.entitlements.clinics', {
                count: plan.maxActiveClinics,
              })
        }
        perMonth={t('billing.plans.perMonth')}
        className="bg-transparent p-0 shadow-none"
      />
      <Button asChild size="small" shape="soft" className="self-start">
        <Link href={routes.subscriptionPay(plan.slug)}>
          {t('billing.officeLimitReached.upgradeAction')}
        </Link>
      </Button>
    </div>
  );
}
