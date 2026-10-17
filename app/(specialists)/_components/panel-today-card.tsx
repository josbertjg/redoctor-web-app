'use client';

import { useId, useState } from 'react';

import Link from 'next/link';

import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';

import type { SessionUser } from '@/app/lib/firebase/client';
import { todayInCaracas } from '@/app/lib/format/date-of-birth';
import { specialistAppointmentsQueryOptions } from '@/app/lib/queries/appointments';
import { routes } from '@/app/lib/routes';
import {
  isAppointmentAhead,
  toAppointmentSummary,
} from '@/app/lib/schemas/appointments';

import { AppointmentCard } from '@/app/ui/appointments/appointment-card';
import { Button } from '@/app/ui/button';
import { useSkeletonHold } from '@/app/ui/motion/skeleton-hold';
import { Skeleton } from '@/app/ui/skeleton';

import { useSession } from '@/app/hooks/use-session';

import { byStart } from './agenda-order';
import { PanelCardError } from './panel-card-error';

/*
 * Today on the panel's home, as the app's home card: how many patients the
 * day has (the cancelled ones do not come) and the next appointment still
 * ahead, with the way to the whole agenda.
 */
export function PanelTodayCard() {
  const { user } = useSession();
  if (user === null) return null;
  return <TodayCard user={user} />;
}

function TodayCard({ user }: { user: SessionUser }) {
  const t = useTranslations('panel.home.today');
  const headingId = useId();
  // The day and the moment are fixed once per visit, as on the appointment page.
  const [today] = useState(() => todayInCaracas());
  const [now] = useState(() => new Date());
  const query = useQuery(
    specialistAppointmentsQueryOptions(user, { from: today, to: today }),
  );
  // The skeleton crossfades into what arrives (AGENTS.md §8, rule 13).
  const holding = useSkeletonHold(query.isPending);

  if (query.isPending || holding) {
    return <Skeleton className="h-48 rounded-2xl" />;
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
  const coming = appointments.filter(
    (appointment) => appointment.status !== 'CANCELLED',
  );
  const next = appointments.find((appointment) =>
    isAppointmentAhead(appointment, now),
  );

  return (
    <section
      aria-labelledby={headingId}
      className="flex animate-fade-up flex-col gap-4 rounded-2xl bg-pure-white p-5 shadow-md"
    >
      <div className="flex flex-col gap-1">
        <h2 id={headingId} className="text-title-md text-text-primary">
          {t('title')}
        </h2>
        <p className="text-body-md text-text-secondary">
          {t('patients', { count: coming.length })}
        </p>
      </div>
      {next ? (
        <div className="flex flex-col gap-2">
          <p className="text-label-md text-text-secondary">{t('next')}</p>
          <ul>
            <AppointmentCard
              appointment={next}
              viewer="specialist"
              showDay={false}
            />
          </ul>
        </div>
      ) : coming.length > 0 ? (
        <p className="text-body-md text-text-secondary">{t('noneLeft')}</p>
      ) : null}
      <Button asChild variant="white" shape="soft" className="self-start">
        <Link href={{ pathname: routes.agenda() }}>{t('seeAgenda')}</Link>
      </Button>
    </section>
  );
}
