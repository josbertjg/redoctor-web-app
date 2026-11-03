'use client';

import { useId } from 'react';

import type { Route } from 'next';

import Link from 'next/link';

import CalendarMonth from '@material-symbols/svg-400/rounded/calendar_month.svg?svgr';
import ChevronLeft from '@material-symbols/svg-400/rounded/chevron_left.svg?svgr';
import ChevronRight from '@material-symbols/svg-400/rounded/chevron_right.svg?svgr';
import LocationOn from '@material-symbols/svg-400/rounded/location_on.svg?svgr';
import Stethoscope from '@material-symbols/svg-400/rounded/stethoscope.svg?svgr';
import { useTranslations } from 'next-intl';

import {
  formatAppointmentDay,
  formatAppointmentTime,
  formatWeekdayShort,
} from '@/app/lib/format/appointment-time';
import { addDays } from '@/app/lib/reports/period';
import {
  statusChips,
  type AppointmentSummary,
} from '@/app/lib/schemas/appointments';
import { cn } from '@/app/lib/utils';

import { statusTones } from '@/app/ui/appointments/status-tones';
import { EmptyState } from '@/app/ui/empty-state';
import { Icon } from '@/app/ui/icons';
import { navBack, navForward } from '@/app/ui/motion/view-transitions';
import { StateChip } from '@/app/ui/state-chip';

import { agendaHref, type AgendaAddress } from './agenda-address';

type AgendaDayListProps = {
  address: AgendaAddress;
  today: string;
  /** The week around the day, Monday first: the strip of days on phones. */
  days: readonly string[];
  /** The week's appointments, by their start. */
  appointments: readonly AppointmentSummary[];
  /** The strip of days: on phones, where the month does not fit beside. */
  showStrip: boolean;
  openAppointment: (appointmentId: string) => void;
};

const stepClass =
  'flex size-touch shrink-0 items-center justify-center rounded-full text-primary outline-none transition-colors duration-fast ease-house hover:bg-blue-50 focus-visible:ring-3 focus-visible:ring-ring/50';

/*
 * «Citas» by day, as the designer drew it (`4669:2956`): «Agenda de hoy»
 * (or of the day on screen) with its count, and the appointments as cards
 * — the hour, the status's bar, who, why, where and the status — each one
 * opening «Ver cita». The days around are one tap away; on phones, the
 * week's days run across the top.
 */
export function AgendaDayList({
  address,
  today,
  days,
  appointments,
  showStrip,
  openAppointment,
}: AgendaDayListProps) {
  const t = useTranslations();
  const headingId = useId();
  const ofDay = appointments.filter(
    (appointment) => appointment.date === address.date,
  );
  const href = (date: string) =>
    agendaHref({ ...address, date, appointmentId: null }, today) as Route;

  return (
    <section
      aria-labelledby={headingId}
      className="flex min-w-0 flex-col gap-4 rounded-2xl bg-pure-white p-4 shadow-md sm:p-6"
    >
      {showStrip ? (
        <WeekStrip
          days={days}
          date={address.date}
          today={today}
          appointments={appointments}
          href={href}
        />
      ) : null}
      <header className="flex items-start gap-2">
        <div className="flex min-w-0 flex-1 flex-col">
          <h2
            id={headingId}
            data-view-heading
            className="text-subtitle-m font-medium text-text-primary"
          >
            {address.date === today
              ? t('panel.agenda.dayTitleToday')
              : t('panel.agenda.dayTitle', {
                  day: formatAppointmentDay(address.date),
                })}
          </h2>
          <p className="text-label-lg text-grey-500">
            {t('panel.agenda.count', { count: ofDay.length })}
          </p>
        </div>
        <Link
          href={href(addDays(address.date, -1))}
          transitionTypes={[navBack]}
          scroll={false}
          // Dates are many here: each day is read when chosen, never ahead.
          prefetch={false}
          aria-label={t('panel.agenda.previousDay')}
          className={stepClass}
        >
          <Icon icon={ChevronLeft} size={24} />
        </Link>
        <Link
          href={href(addDays(address.date, 1))}
          transitionTypes={[navForward]}
          scroll={false}
          prefetch={false}
          aria-label={t('panel.agenda.nextDay')}
          className={stepClass}
        >
          <Icon icon={ChevronRight} size={24} />
        </Link>
      </header>
      {ofDay.length === 0 ? (
        <EmptyState
          headingLevel={3}
          icon={CalendarMonth}
          title={t('appointments.noAppointmentsForDay')}
          description={t('panel.agenda.emptyDescription')}
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {ofDay.map((appointment) => (
            <li key={appointment.id}>
              <AgendaCard appointment={appointment} onOpen={openAppointment} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** One appointment of the day, as the frame's card: the hour, the bar, who, why, where. */
export function AgendaCard({
  appointment,
  onOpen,
  trailing,
}: {
  appointment: AppointmentSummary;
  onOpen: (appointmentId: string) => void;
  /** What closes the card on its right: «Próxima cita»'s chevron. */
  trailing?: React.ReactNode;
}) {
  const t = useTranslations();
  const chip = statusChips[appointment.status];
  return (
    <button
      type="button"
      onClick={() => {
        onOpen(appointment.id);
      }}
      className="group flex w-full items-stretch gap-3 rounded-xl bg-pure-white p-4 text-left shadow-md transition-[translate,box-shadow] duration-base ease-house outline-none hover:-translate-y-0.5 hover:shadow-lg focus-visible:ring-3 focus-visible:ring-ring/50 sm:gap-4"
    >
      {/* The hour on one line: «10:00 a. m.» never breaks. */}
      <span className="w-21 shrink-0 text-body-md whitespace-nowrap text-text-primary sm:w-24 sm:text-body-lg">
        {formatAppointmentTime(appointment.startTime)}
      </span>
      <span
        aria-hidden="true"
        className={cn(
          'w-1 shrink-0 rounded-full',
          statusTones[appointment.status].bar,
        )}
      />
      <span className="flex min-w-0 flex-1 flex-col items-start gap-1.5">
        <span className="text-body-lg font-semibold break-words text-text-primary">
          {`${appointment.attendee.firstName} ${appointment.attendee.lastName}`.trim()}
        </span>
        {appointment.reason ? (
          <span className="flex items-center gap-2 text-body-md text-text-primary">
            <Icon
              icon={Stethoscope}
              size={18}
              className="shrink-0 text-green-500"
            />
            {appointment.reason}
          </span>
        ) : null}
        {appointment.office.name ? (
          <span className="flex items-center gap-2 text-body-md text-grey-600">
            <Icon icon={LocationOn} size={18} className="shrink-0" />
            {appointment.office.name}
          </span>
        ) : null}
        <StateChip tone={chip.tone}>
          {t(`appointments.status.${chip.label}`)}
        </StateChip>
      </span>
      {trailing}
    </button>
  );
}

/** The week's days across the top (phones): each opens its day, with how many it holds. */
function WeekStrip({
  days,
  date,
  today,
  appointments,
  href,
}: {
  days: readonly string[];
  date: string;
  today: string;
  appointments: readonly AppointmentSummary[];
  href: (date: string) => Route;
}) {
  const t = useTranslations('panel.agenda');
  return (
    <nav aria-label={t('weekDays')}>
      {/* Seven columns: the whole week in view, on the narrowest phone too. */}
      <ul className="grid grid-cols-7 gap-1 sm:gap-2">
        {days.map((day) => {
          const current = day === date;
          const count = appointments.filter(
            (appointment) => appointment.date === day,
          ).length;
          return (
            <li key={day} className="min-w-0">
              <Link
                href={href(day)}
                transitionTypes={[day < date ? navBack : navForward]}
                scroll={false}
                prefetch={false}
                aria-current={current ? 'date' : undefined}
                aria-label={t('dayCount', {
                  day: formatAppointmentDay(day),
                  count,
                })}
                className={cn(
                  'flex flex-col items-center gap-1 rounded-xl py-2 text-center shadow-md transition-colors duration-base ease-house outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
                  current ? 'bg-primary text-on-primary' : 'bg-pure-white',
                )}
              >
                <span
                  className={cn(
                    'text-label-md first-letter:uppercase',
                    current
                      ? 'text-blue-100'
                      : day === today
                        ? 'font-semibold text-primary'
                        : 'text-text-secondary',
                  )}
                >
                  {formatWeekdayShort(day)}
                </span>
                <span
                  className={cn(
                    'text-title-md',
                    current ? 'text-on-primary' : 'text-text-primary',
                  )}
                >
                  {Number(day.slice(8))}
                </span>
                <span
                  aria-hidden="true"
                  className={cn(
                    'size-1.5 rounded-full',
                    count === 0
                      ? 'bg-transparent'
                      : current
                        ? 'bg-pure-white'
                        : 'bg-primary',
                  )}
                />
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
