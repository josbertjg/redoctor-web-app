'use client';

import { useId, useState } from 'react';

import Link from 'next/link';

import ChevronRight from '@material-symbols/svg-400/rounded/chevron_right.svg?svgr';
import LocationOn from '@material-symbols/svg-400/rounded/location_on.svg?svgr';
import { useTranslations } from 'next-intl';

import {
  formatAppointmentTime,
  formatDayMonthShort,
  formatWeekdayLong,
  formatWeekdayShort,
} from '@/app/lib/format/appointment-time';
import { addDays } from '@/app/lib/reports/period';
import { routes } from '@/app/lib/routes';
import {
  isOpenAppointment,
  type AppointmentSummary,
} from '@/app/lib/schemas/appointments';
import { cn } from '@/app/lib/utils';

import { Avatar } from '@/app/ui/avatar';
import { fadingEdgesClass } from '@/app/ui/fading-edges';
import { Icon } from '@/app/ui/icons';

import { useFadingEdges } from '@/app/hooks/use-fading-edges';

type PanelWeekAgendaProps = {
  /** The week's seven days, Monday first. */
  days: readonly string[];
  today: string;
  /** The week's appointments, by their start. */
  appointments: readonly AppointmentSummary[];
};

/*
 * The week's appointments on the panel's home, as the app's home card: a
 * shortcut, not the agenda. Each day says how many appointments are still
 * open (finished, missed and cancelled ones ask nothing more), the day
 * chosen shows its first open one, and «Ver todas» opens that day in the
 * agenda. Days already past stay: an appointment nobody closed is seen
 * here.
 */
export function PanelWeekAgenda({
  days,
  today,
  appointments,
}: PanelWeekAgendaProps) {
  const t = useTranslations();
  const headingId = useId();
  const [chosen, setChosen] = useState(today);
  const { ref: row, fade } = useFadingEdges<HTMLUListElement>();
  const openOn = (day: string) =>
    appointments.filter(
      (appointment) =>
        appointment.date === day && isOpenAppointment(appointment),
    );
  const open = openOn(chosen);
  const first = open[0];
  const dayPhrase =
    chosen === today
      ? t('home.dayPhrase.today')
      : chosen === addDays(today, 1)
        ? t('home.dayPhrase.tomorrow')
        : t('home.dayPhrase.weekday', { weekday: formatWeekdayLong(chosen) });

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-4">
      <div className="flex items-end justify-between gap-4">
        <div className="flex flex-col gap-0.5">
          <h2
            id={headingId}
            className="text-subtitle-m font-semibold text-pure-white"
          >
            {t('home.myAppointments')}
          </h2>
          <p className="text-label-lg text-blue-100">
            {t('home.patientsOnDay', { count: open.length, day: dayPhrase })}
          </p>
        </div>
        <Link
          href={routes.agenda(chosen)}
          className="rounded-sm text-label-lg font-bold text-blue-100 outline-none hover:text-pure-white focus-visible:ring-3 focus-visible:ring-white-50/70"
        >
          {t('home.seeAll')}
        </Link>
      </div>
      <div className="flex flex-col gap-6 rounded-xl bg-pure-white px-4 py-6 shadow-md sm:px-7">
        <ul
          ref={row}
          data-fade={fade}
          className={cn(
            '-mx-1 flex gap-2.5 overflow-x-auto px-1 py-1',
            fadingEdgesClass,
          )}
        >
          {days.map((day) => {
            const isChosen = day === chosen;
            const count = openOn(day).length;
            const weekday = formatWeekdayShort(day);
            const date = formatDayMonthShort(day);
            return (
              <li key={day} className="shrink-0">
                <button
                  type="button"
                  aria-pressed={isChosen}
                  aria-label={t('panel.home.week.choose', {
                    weekday,
                    day: date,
                    count,
                  })}
                  onClick={() => {
                    setChosen(day);
                  }}
                  className={cn(
                    'flex w-14 flex-col items-center gap-2.5 rounded-xl px-2 py-2.5 text-center shadow-md transition-[background-color,translate] duration-base ease-house outline-none hover:-translate-y-0.5 focus-visible:ring-3 focus-visible:ring-ring/50',
                    isChosen ? 'bg-primary' : 'bg-pure-white',
                  )}
                >
                  <span
                    className={cn(
                      'text-body-sm',
                      isChosen ? 'text-blue-200' : 'text-blue-300',
                    )}
                  >
                    <span className="block first-letter:uppercase">
                      {weekday}
                    </span>
                    {date}
                  </span>
                  <span
                    className={cn(
                      'flex size-6.5 items-center justify-center rounded-full text-body-lg font-medium text-primary',
                      isChosen ? 'bg-pure-white' : 'bg-blue-50',
                    )}
                  >
                    {count}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        {first === undefined ? (
          <p className="text-body-md text-text-secondary">
            {t('home.noAppointmentsThisDay')}
          </p>
        ) : (
          <WeekAppointment
            appointment={first}
            dayLabel={
              chosen === today
                ? t('home.dayPhrase.today')
                : formatWeekdayShort(chosen)
            }
          />
        )}
      </div>
    </section>
  );
}

/** The chosen day's first open appointment: who, when, where. */
function WeekAppointment({
  appointment,
  dayLabel,
}: {
  appointment: AppointmentSummary;
  dayLabel: string;
}) {
  const name =
    `${appointment.attendee.firstName} ${appointment.attendee.lastName}`.trim();
  return (
    <Link
      href={routes.appointment(appointment.id)}
      className="group flex items-center gap-4 rounded-xl bg-pure-white px-4 py-3.5 shadow-md transition-[translate,box-shadow] duration-base ease-house outline-none hover:-translate-y-0.5 hover:shadow-lg focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <Avatar name={name} src={null} size="md" decorative />
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="text-label-md text-grey-500 first-letter:uppercase">
          {dayLabel}, {formatAppointmentTime(appointment.startTime)}
        </span>
        <span className="truncate text-body-lg font-medium text-text-primary">
          {name}
        </span>
        {appointment.office.name ? (
          <span className="flex items-center gap-1 text-label-md text-grey-500">
            <Icon icon={LocationOn} size={16} className="shrink-0" />
            <span className="truncate">{appointment.office.name}</span>
          </span>
        ) : null}
      </span>
      <Icon
        icon={ChevronRight}
        size={24}
        className="shrink-0 text-grey-500 transition-[translate] duration-base ease-house group-hover:translate-x-0.5"
      />
    </Link>
  );
}
