'use client';

import { useState } from 'react';

import Link from 'next/link';

import CalendarMonth from '@material-symbols/svg-400/rounded/calendar_month.svg?svgr';
import ChevronLeft from '@material-symbols/svg-400/rounded/chevron_left.svg?svgr';
import ChevronRight from '@material-symbols/svg-400/rounded/chevron_right.svg?svgr';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';

import type { SessionUser } from '@/app/lib/firebase/client';
import { formatAppointmentDay } from '@/app/lib/format/appointment-time';
import { todayInCaracas } from '@/app/lib/format/date-of-birth';
import { specialistAppointmentsQueryOptions } from '@/app/lib/queries/appointments';
import { addDays } from '@/app/lib/reports/period';
import { routes } from '@/app/lib/routes';
import {
  toAppointmentSummary,
  type AppointmentSummary,
} from '@/app/lib/schemas/appointments';

import { AppointmentCard } from '@/app/ui/appointments/appointment-card';
import { Button } from '@/app/ui/button';
import { EmptyState } from '@/app/ui/empty-state';
import { Icon } from '@/app/ui/icons';
import { useSkeletonHold } from '@/app/ui/motion/skeleton-hold';
import { navBack, navForward } from '@/app/ui/motion/view-transitions';

import { useFocusHeading } from '@/app/hooks/use-focus-heading';
import { useSession } from '@/app/hooks/use-session';

import { AgendaHeader } from './agenda-header';
import { byStart } from './agenda-order';
import { AgendaSkeleton, AppointmentListSkeleton } from './agenda-skeleton';
import { PanelLoadError } from './panel-load-error';

type AgendaDayProps = {
  /** The day the address names (YYYY-MM-DD); null for today. */
  day: string | null;
};

/*
 * `/panel/agenda[/{YYYY-MM-DD}]` (M14): one day of the specialist's agenda,
 * the web's side of the app's day view — the daily summary's «Ver mi
 * agenda» (email 10) leads here. Read only: each appointment opens its own
 * page, and acting on it stays in the app. The days before and after are
 * one tap away, each with its own address.
 */
export function AgendaDay({ day }: AgendaDayProps) {
  const { user } = useSession();
  if (user === null) return <AgendaSkeleton />;
  return <Agenda user={user} day={day} />;
}

function Agenda({ user, day }: { user: SessionUser; day: string | null }) {
  const t = useTranslations();
  // Today is fixed once per visit, as the appointment page fixes its moment.
  const [today] = useState(() => todayInCaracas());
  const date = day ?? today;
  const query = useQuery(
    specialistAppointmentsQueryOptions(user, { from: date, to: date }),
  );
  // The skeleton crossfades into what arrives (AGENTS.md §8, rule 13).
  const holding = useSkeletonHold(query.isPending);
  // The day's title takes the focus when the person moves to another day.
  const frame = useFocusHeading(date);

  return (
    <div ref={frame} className="flex flex-col gap-4">
      <AgendaHeader active="day" />
      <DayNavigator date={date} today={today} />
      {content()}
    </div>
  );

  function content() {
    if (query.isPending || holding) return <AppointmentListSkeleton />;

    if (query.isLoadingError) {
      return (
        <PanelLoadError
          error={query.error}
          title={t('appointments.hub.loadError')}
          description={t('panel.agenda.loadErrorDescription')}
          retrying={query.isFetching}
          onRetry={() => {
            void query.refetch();
          }}
        />
      );
    }

    const appointments = query.data.map(toAppointmentSummary).sort(byStart);
    if (appointments.length === 0) {
      return (
        <EmptyState
          headingLevel={3}
          icon={CalendarMonth}
          title={t('appointments.noAppointmentsForDay')}
          description={t('panel.agenda.emptyDescription')}
        />
      );
    }

    return (
      <section className="flex flex-col gap-3">
        <DayTally appointments={appointments} />
        <ul className="flex flex-col gap-3">
          {appointments.map((appointment) => (
            <AppointmentCard
              key={appointment.id}
              appointment={appointment}
              viewer="specialist"
              showDay={false}
            />
          ))}
        </ul>
      </section>
    );
  }
}

/** The day on screen, the days around it, and the way back to today. */
function DayNavigator({ date, today }: { date: string; today: string }) {
  const t = useTranslations('panel.agenda');
  const step =
    'flex size-touch shrink-0 items-center justify-center rounded-full text-primary outline-none transition-colors duration-fast ease-house hover:bg-info-light focus-visible:ring-3 focus-visible:ring-ring/50';

  return (
    <div className="flex flex-col gap-2 rounded-2xl bg-pure-white p-2 shadow-md">
      <div className="flex items-center gap-2">
        {/* The days go sideways, like turning a calendar's page (AGENTS.md
            §8, rule 13). */}
        <Link
          href={{ pathname: routes.agenda(addDays(date, -1)) }}
          transitionTypes={[navBack]}
          aria-label={t('previousDay')}
          className={step}
        >
          <Icon icon={ChevronLeft} size={24} />
        </Link>
        <h2
          data-view-heading
          className="flex-1 text-center text-title-md text-text-primary first-letter:uppercase"
        >
          {formatAppointmentDay(date)}
        </h2>
        <Link
          href={{ pathname: routes.agenda(addDays(date, 1)) }}
          transitionTypes={[navForward]}
          aria-label={t('nextDay')}
          className={step}
        >
          <Icon icon={ChevronRight} size={24} />
        </Link>
      </div>
      {date === today ? null : (
        <Button
          asChild
          size="small"
          variant="white"
          shape="soft"
          className="animate-fade-in self-center"
        >
          <Link
            href={{ pathname: routes.agenda() }}
            transitionTypes={[date > today ? navBack : navForward]}
          >
            {t('backToToday')}
          </Link>
        </Button>
      )}
    </div>
  );
}

/** «3 citas · 1 atendida · 1 canceladas», as the app's day view counts it. */
function DayTally({ appointments }: { appointments: AppointmentSummary[] }) {
  const t = useTranslations();
  const count = (status: AppointmentSummary['status']) =>
    appointments.filter((appointment) => appointment.status === status).length;
  const parts = [
    t('panel.agenda.count', { count: appointments.length }),
    ...(count('COMPLETED') > 0
      ? [t('appointments.hub.attended', { count: count('COMPLETED') })]
      : []),
    ...(count('NO_SHOW') > 0
      ? [t('appointments.hub.noShows', { count: count('NO_SHOW') })]
      : []),
    ...(count('CANCELLED') > 0
      ? [t('appointments.hub.cancelled', { count: count('CANCELLED') })]
      : []),
  ];

  return (
    <p className="text-body-md text-text-secondary">{parts.join(' · ')}</p>
  );
}
