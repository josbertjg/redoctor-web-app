'use client';

import { useId, useState } from 'react';

import ChevronRight from '@material-symbols/svg-400/rounded/chevron_right.svg?svgr';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';

import type { SessionUser } from '@/app/lib/firebase/client';
import { formatAppointmentDayShort } from '@/app/lib/format/appointment-time';
import { specialistAppointmentsQueryOptions } from '@/app/lib/queries/appointments';
import { addDays } from '@/app/lib/reports/period';
import {
  isAppointmentAhead,
  toAppointmentSummary,
  type AppointmentStatus,
} from '@/app/lib/schemas/appointments';

import {
  MonthCalendar,
  shiftMonth,
} from '@/app/ui/appointments/month-calendar';
import { Icon } from '@/app/ui/icons';
import { Skeleton } from '@/app/ui/skeleton';

import { byStart } from '../agenda-order';
import { AgendaCard } from './agenda-day-list';

/** The last day of a month (YYYY-MM). */
const monthEnd = (month: string) => addDays(`${shiftMonth(month, 1)}-01`, -1);

/** How far ahead «Próxima cita» looks: a pilot's next appointment is within a month. */
const nextHorizonDays = 31;

type Filters = { status: AppointmentStatus | null; officeId: string | null };

/*
 * The month beside the day (`4669:2956`, from laptops up): the day on
 * screen chosen, a dot under the days with appointments (the same filters
 * as the list), any month a tap away; choosing a day opens it.
 */
export function AgendaMonth({
  user,
  date,
  today,
  filters,
  onSelect,
}: {
  user: SessionUser;
  date: string;
  today: string;
  filters: Filters;
  onSelect: (date: string) => void;
}) {
  const t = useTranslations('panel.agenda');
  const [month, setMonth] = useState(date.slice(0, 7));
  // Another day chosen elsewhere (the list's arrows): the month follows it.
  const [followed, setFollowed] = useState(date);
  if (followed !== date) {
    setFollowed(date);
    setMonth(date.slice(0, 7));
  }
  const query = useQuery(
    specialistAppointmentsQueryOptions(user, {
      from: `${month}-01`,
      to: monthEnd(month),
      status: filters.status ?? undefined,
      officeId: filters.officeId ?? undefined,
    }),
  );
  const marked = new Set(
    (query.data ?? []).map((appointment) => appointment.slot.date),
  );

  return (
    <section
      aria-label={t('monthLabel')}
      className="rounded-2xl bg-pure-white p-4 shadow-md sm:p-6"
    >
      <MonthCalendar
        variant="agenda"
        month={month}
        today={today}
        freeDays={marked}
        loading={false}
        selected={date}
        onMonthChange={setMonth}
        onSelect={onSelect}
      />
    </section>
  );
}

/*
 * «Próxima cita» (`4669:2956`): the first appointment still to attend —
 * not closed, not over — within the month ahead, in the office the list
 * shows; it opens «Ver cita».
 */
export function AgendaNext({
  user,
  today,
  now,
  officeId,
  openAppointment,
}: {
  user: SessionUser;
  today: string;
  now: Date;
  officeId: string | null;
  openAppointment: (appointmentId: string) => void;
}) {
  const t = useTranslations('panel.agenda');
  const headingId = useId();
  const query = useQuery(
    specialistAppointmentsQueryOptions(user, {
      from: today,
      to: addDays(today, nextHorizonDays),
      officeId: officeId ?? undefined,
    }),
  );
  const next = (query.data ?? [])
    .map(toAppointmentSummary)
    .filter((appointment) => isAppointmentAhead(appointment, now))
    .sort(byStart)[0];

  return (
    <section
      aria-labelledby={headingId}
      className="flex flex-col gap-3 rounded-2xl bg-pure-white p-4 shadow-md sm:p-5"
    >
      <h2
        id={headingId}
        className="flex items-center gap-2 text-body-lg font-medium text-text-primary"
      >
        <span
          aria-hidden="true"
          className="size-2 rounded-full bg-warning-500"
        />
        {t('nextAppointment')}
      </h2>
      {query.isPending ? (
        <Skeleton className="h-24 rounded-xl" />
      ) : next === undefined ? (
        <p className="animate-fade-in text-body-md text-text-secondary">
          {t('noNextAppointment')}
        </p>
      ) : (
        <div className="flex animate-fade-in flex-col gap-1.5">
          {next.date === today ? null : (
            <p className="text-label-lg text-text-secondary first-letter:uppercase">
              {formatAppointmentDayShort(next.date)}
            </p>
          )}
          <AgendaCard
            appointment={next}
            onOpen={openAppointment}
            trailing={
              <Icon
                icon={ChevronRight}
                size={24}
                className="shrink-0 self-center text-text-secondary transition-[translate] duration-base ease-house group-hover:translate-x-0.5"
              />
            }
          />
        </div>
      )}
    </section>
  );
}
