'use client';

import { useState, type ReactNode } from 'react';

import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';

import type { Account } from '@/app/lib/auth/account';
import type { SessionUser } from '@/app/lib/firebase/client';
import { todayInCaracas } from '@/app/lib/format/date-of-birth';
import { specialistAppointmentsQueryOptions } from '@/app/lib/queries/appointments';
import {
  payableInvoiceQueryOptions,
  subscriptionQueryOptions,
} from '@/app/lib/queries/billing';
import { weekOf } from '@/app/lib/reports/period';
import { routes } from '@/app/lib/routes';
import { toAppointmentSummary } from '@/app/lib/schemas/appointments';
import {
  hasEnded,
  mayOwe,
  subscriptionNotice,
} from '@/app/lib/schemas/billing';

import { NoticePanel } from '@/app/ui/billing/notice-panel';
import { useSkeletonHold } from '@/app/ui/motion/skeleton-hold';
import { Skeleton } from '@/app/ui/skeleton';

import { useSession } from '@/app/hooks/use-session';

import { byStart } from './agenda-order';
import { PanelActivationCard } from './panel-activation-card';
import { PanelCardError } from './panel-card-error';
import { PanelGreeting } from './panel-greeting';
import { PanelProfileLinks } from './panel-links';
import { ChoosePlanCard, CurrentPlanCard } from './panel-plan-card';
import { PanelSummaryEmail } from './panel-summary-email';
import { PanelWeekAgenda } from './panel-week-agenda';
import { PanelWeekChart } from './panel-week-chart';
import { useProfileActivation } from './use-profile-activation';

/**
 * The home's two columns from laptops up, as the designer's frame sets them.
 * Their cards may shrink below their content (the strip of days scrolls).
 */
const row = 'grid items-start gap-6 *:min-w-0 lg:grid-cols-2 lg:gap-10';

/*
 * `/panel`'s home (M14, the designer's frame `4644:2329`), with the app's
 * home rules in their order: the billing notice first (the only thing with
 * a deadline), then how far the profile is from the search when it is not
 * visible and nothing is owed, the plans when one can be taken (the
 * sign-up done and a specialty verified) or the plan in force, the week's
 * appointments for whoever has a plan giving visibility, and at the foot
 * the daily summary's email and the profile.
 */
export function PanelHome({ adminNote }: { adminNote?: ReactNode }) {
  const { user, account } = useSession();

  return (
    <div className="flex flex-col gap-8 lg:gap-12">
      <div className="flex flex-col gap-3">
        <PanelGreeting />
        {adminNote}
      </div>
      {user !== null && account?.specialist.exists ? (
        <Home user={user} account={account} />
      ) : null}
    </div>
  );
}

function Home({ user, account }: { user: SessionUser; account: Account }) {
  const t = useTranslations('panel.home');
  const current = useQuery(subscriptionQueryOptions(user));
  const subscription = current.data?.subscription ?? null;
  const payable = useQuery(payableInvoiceQueryOptions(user, subscription));
  // The day and the moment are fixed once per visit, as on the agenda.
  const [now] = useState(() => new Date());
  const [today] = useState(() => todayInCaracas());
  const hasAccess = current.data?.access.hasAccess ?? null;
  const reading = useProfileActivation(user, account, hasAccess);
  // The skeletons crossfade into what arrives (AGENTS.md §8, rule 13).
  const holding = useSkeletonHold(current.isPending || payable.isLoading);

  const loading = current.isPending || payable.isLoading || holding;
  const notice =
    subscription === null
      ? null
      : subscriptionNotice({
          subscription,
          payable: mayOwe(subscription) ? (payable.data ?? null) : null,
          now,
        });
  const canSubscribe =
    current.isSuccess && (subscription === null || hasEnded(subscription));
  const canContractPlan =
    account.registration === 'completed' && reading.verifiedSpecialty === true;
  const inForce = subscription !== null && !hasEnded(subscription);

  let first: ReactNode = null;
  let second: ReactNode = null;
  if (loading) {
    first = <Skeleton className="h-51 rounded-xl" />;
    second = <Skeleton className="h-51 rounded-xl" />;
  } else if (current.isLoadingError) {
    first = (
      <PanelCardError
        message={t('plan.loadError')}
        retrying={current.isFetching}
        onRetry={() => {
          void current.refetch();
        }}
      />
    );
  } else {
    first = notice ? (
      <NoticePanel notice={notice} payHref={routes.subscriptionPay()} />
    ) : reading.activation.isVisible ? null : (
      <PanelActivationCard reading={reading} />
    );
    second =
      canSubscribe && canContractPlan ? (
        <ChoosePlanCard />
      ) : inForce ? (
        <CurrentPlanCard subscription={subscription} />
      ) : null;
  }

  return (
    <>
      {first || second ? (
        <div className={row}>
          {first}
          {second}
        </div>
      ) : null}
      {hasAccess === true ? <PanelWeek user={user} today={today} /> : null}
      <div className={row}>
        <PanelSummaryEmail />
        <PanelProfileLinks />
      </div>
    </>
  );
}

/** The week's appointments, read once for the agenda and the chart. */
function PanelWeek({ user, today }: { user: SessionUser; today: string }) {
  const t = useTranslations('panel.home.week');
  const [days] = useState(() => weekOf(today));
  const query = useQuery(
    specialistAppointmentsQueryOptions(user, {
      from: days[0] ?? today,
      to: days[6] ?? today,
    }),
  );
  const holding = useSkeletonHold(query.isPending);

  if (query.isPending || holding) {
    return (
      <div className={row}>
        <Skeleton className="h-72 rounded-xl" />
        <Skeleton className="h-72 rounded-xl" />
      </div>
    );
  }
  if (query.isLoadingError) {
    return (
      <PanelCardError
        message={t('loadError')}
        retrying={query.isFetching}
        onRetry={() => {
          void query.refetch();
        }}
      />
    );
  }

  const appointments = query.data.map(toAppointmentSummary).sort(byStart);
  return (
    <div className={row}>
      <PanelWeekAgenda days={days} today={today} appointments={appointments} />
      <PanelWeekChart days={days} today={today} appointments={appointments} />
    </div>
  );
}
