'use client';

import { useId } from 'react';

import type { Route } from 'next';

import Link from 'next/link';

import ChevronLeft from '@material-symbols/svg-400/rounded/chevron_left.svg?svgr';
import ChevronRight from '@material-symbols/svg-400/rounded/chevron_right.svg?svgr';
import Stethoscope from '@material-symbols/svg-400/rounded/stethoscope.svg?svgr';
import { useTranslations } from 'next-intl';

import {
  formatAppointmentDay,
  formatAppointmentTime,
  formatWeekdayLong,
} from '@/app/lib/format/appointment-time';
import { formatDayRange, formatHour } from '@/app/lib/format/figures';
import { addDays } from '@/app/lib/reports/period';
import {
  statusChips,
  type AppointmentSummary,
} from '@/app/lib/schemas/appointments';
import { cn } from '@/app/lib/utils';

import { statusTones } from '@/app/ui/appointments/status-tones';
import { Icon } from '@/app/ui/icons';
import { navBack, navForward } from '@/app/ui/motion/view-transitions';

import { agendaHref, type AgendaAddress } from './agenda-address';
import { weekLayout } from './week-layout';

type AgendaWeekProps = {
  address: AgendaAddress;
  today: string;
  /** The week's seven days, Monday first. */
  days: readonly string[];
  appointments: readonly AppointmentSummary[];
  /** «Ver cita» over the agenda, its id in the address. */
  openAppointment: (appointmentId: string) => void;
};

/**
 * One hour of the grid, in rem: tall enough for a half-hour appointment to
 * show who and when, as the frame's blocks do (`4647:2160`).
 */
const hourRem = 6;

/** «Ana P.», as the frame's blocks name a patient. */
export function shortName(appointment: AppointmentSummary): string {
  const { firstName, lastName } = appointment.attendee;
  const initial = lastName.trim().charAt(0);
  return initial ? `${firstName} ${initial}.` : firstName;
}

/*
 * «Citas» by week, as the designer drew it (`4647:2160`): the days as
 * columns, Monday first, the hours as rows, each appointment a block by
 * its start and length in its status's colours (`statusTones`), the ones
 * that overlap side by side. A day's name opens that day; a block opens
 * «Ver cita». The weeks around are one tap away.
 */
export function AgendaWeek({
  address,
  today,
  days,
  appointments,
  openAppointment,
}: AgendaWeekProps) {
  const t = useTranslations();
  const headingId = useId();
  const { hours, blocks } = weekLayout(appointments, days);
  const rows = Array.from(
    { length: hours.to - hours.from },
    (_, index) => hours.from + index,
  );
  const span = (hours.to - hours.from) * 60;
  const first = days[0] ?? address.date;
  const last = days[6] ?? address.date;
  const count = blocks.length;

  const step = (by: number, label: string, icon: typeof ChevronLeft) => (
    <Link
      href={
        agendaHref(
          { ...address, date: addDays(address.date, by), appointmentId: null },
          today,
        ) as Route
      }
      transitionTypes={[by < 0 ? navBack : navForward]}
      scroll={false}
      // Dates are many here: each day is read when chosen, never ahead.
      prefetch={false}
      aria-label={label}
      className="flex size-touch shrink-0 items-center justify-center rounded-full text-primary transition-colors duration-fast ease-house outline-none hover:bg-blue-50 focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <Icon icon={icon} size={24} />
    </Link>
  );

  return (
    <section
      aria-labelledby={headingId}
      className="flex min-w-0 flex-col overflow-hidden rounded-2xl bg-pure-white shadow-md"
    >
      <header className="flex items-center gap-2 px-4 pt-4 pb-3 sm:px-5">
        <div className="flex min-w-0 flex-1 flex-col">
          <h2
            id={headingId}
            data-view-heading
            className="text-title-lg text-text-primary"
          >
            {formatDayRange(first, last)}
          </h2>
          <p className="text-label-lg text-text-secondary">
            {t('panel.agenda.weekCount', { count })}
          </p>
        </div>
        {step(-7, t('panel.agenda.previousWeek'), ChevronLeft)}
        {step(7, t('panel.agenda.nextWeek'), ChevronRight)}
      </header>
      {/* The grid scrolls inside its card: its hours down, its days across
          when the screen is narrow. */}
      <div className="max-h-[70dvh] overflow-auto overscroll-contain border-t border-divider">
        <div className="grid min-w-[44rem] grid-cols-[4.5rem_repeat(7,minmax(0,1fr))]">
          <div
            aria-hidden="true"
            className="sticky top-0 left-0 z-20 border-r border-b border-divider bg-surface"
          />
          {days.map((day) => (
            <Link
              key={day}
              href={
                agendaHref(
                  { ...address, date: day, view: 'day', appointmentId: null },
                  today,
                ) as Route
              }
              scroll={false}
              prefetch={false}
              aria-label={t('panel.agenda.openDay', {
                day: formatAppointmentDay(day),
              })}
              aria-current={day === today ? 'date' : undefined}
              className={cn(
                'sticky top-0 z-10 flex min-h-touch items-center justify-center border-b border-l border-divider bg-surface px-1 text-center text-body-xxs transition-colors duration-fast ease-house outline-none hover:text-primary focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset',
                day === today
                  ? 'font-bold text-primary'
                  : 'font-medium text-text-primary',
              )}
            >
              {/* A flex box takes no ::first-letter: its text does, in a block. */}
              <span className="inline-block first-letter:uppercase">
                {formatWeekdayLong(day)} {Number(day.slice(8))}
              </span>
            </Link>
          ))}
          <div
            aria-hidden="true"
            className="sticky left-0 z-10 flex flex-col border-r border-divider bg-pure-white"
          >
            {rows.map((hour) => (
              <span
                key={hour}
                style={{ height: `${String(hourRem)}rem` }}
                className="flex items-start justify-center border-b border-divider pt-2 text-label-lg text-grey-800"
              >
                {formatHour(hour)}
              </span>
            ))}
          </div>
          {days.map((day) => {
            const ofDay = blocks.filter((block) => block.day === day);
            return (
              <div
                key={day}
                className={cn(
                  'relative border-l border-divider',
                  day === today && 'bg-blue-50/40',
                )}
                style={{ height: `${String(rows.length * hourRem)}rem` }}
              >
                {rows.map((hour) => (
                  <span
                    key={hour}
                    aria-hidden="true"
                    style={{ height: `${String(hourRem)}rem` }}
                    className="block border-b border-divider"
                  />
                ))}
                <ul
                  aria-label={formatAppointmentDay(day)}
                  // Over the hour lines, the same size as the column: the blocks are placed in it.
                  className="absolute inset-0"
                >
                  {ofDay.map((block) => (
                    <li
                      key={block.appointment.id}
                      className="absolute px-0.5 py-px"
                      style={{
                        top: `${String((block.top / span) * 100)}%`,
                        height: `${String((block.height / span) * 100)}%`,
                        left: `${String((block.column / block.columns) * 100)}%`,
                        width: `${String(100 / block.columns)}%`,
                      }}
                    >
                      <WeekBlockButton
                        appointment={block.appointment}
                        roomy={block.height >= 30}
                        onOpen={openAppointment}
                      />
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/** One appointment on the grid: the frame's tinted block, its bar, who and when. */
function WeekBlockButton({
  appointment,
  roomy,
  onOpen,
}: {
  appointment: AppointmentSummary;
  /** Room for the hour under the name (half an hour or more). */
  roomy: boolean;
  onOpen: (appointmentId: string) => void;
}) {
  const t = useTranslations();
  const tone = statusTones[appointment.status];
  const time = formatAppointmentTime(appointment.startTime);
  return (
    <button
      type="button"
      onClick={() => {
        onOpen(appointment.id);
      }}
      aria-label={t('panel.agenda.blockLabel', {
        name: `${appointment.attendee.firstName} ${appointment.attendee.lastName}`.trim(),
        day: formatAppointmentDay(appointment.date),
        time,
        status: t(
          `appointments.status.${statusChips[appointment.status].label}`,
        ),
      })}
      className={cn(
        'flex size-full items-stretch gap-2 overflow-hidden rounded-lg px-2 py-1.5 text-left shadow-xs transition-[translate,box-shadow] duration-fast ease-house outline-none hover:-translate-y-px hover:shadow-md focus-visible:ring-3 focus-visible:ring-ring/50',
        tone.fill,
      )}
    >
      <span
        aria-hidden="true"
        className={cn('w-1 shrink-0 rounded-full', tone.bar)}
      />
      <span className="flex min-w-0 flex-col justify-center">
        <span className="truncate text-label-lg font-bold text-text-primary">
          {shortName(appointment)}
        </span>
        {roomy ? (
          <span className="flex items-center gap-1 text-label-md text-text-primary">
            <Icon
              icon={Stethoscope}
              size={16}
              className="shrink-0 text-green-500"
            />
            <span className="truncate">{time}</span>
          </span>
        ) : null}
      </span>
    </button>
  );
}
