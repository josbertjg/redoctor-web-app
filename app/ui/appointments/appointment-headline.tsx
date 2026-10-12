import { useId } from 'react';

import Link from 'next/link';

import CalendarMonth from '@material-symbols/svg-400/rounded/calendar_month.svg?svgr';
import Schedule from '@material-symbols/svg-400/rounded/schedule.svg?svgr';
import { useTranslations } from 'next-intl';

import {
  formatAppointmentDay,
  formatAppointmentTime,
} from '@/app/lib/format/appointment-time';
import { routes } from '@/app/lib/routes';
import type { AppointmentSummary } from '@/app/lib/schemas/appointments';

import { Avatar } from '@/app/ui/avatar';
import { Icon } from '@/app/ui/icons';

/*
 * Who and when, the first thing the invited person looks for: the
 * specialist, with the way to their public profile, and the day and hour
 * as the API's emails write them (AGENTS.md §5).
 */
export function AppointmentHeadline({
  appointment,
}: {
  appointment: AppointmentSummary;
}) {
  const t = useTranslations('appointments.detail');
  const headingId = useId();
  const { specialist } = appointment;
  const name = specialist.name ?? t('specialist');

  return (
    <section
      aria-labelledby={headingId}
      className="flex animate-fade-up flex-col gap-4 rounded-2xl bg-pure-white p-5 shadow-md"
    >
      <div className="flex items-center gap-3">
        <Avatar name={name} src={specialist.photo} size="lg" />
        <div className="flex min-w-0 flex-col gap-0.5">
          <h2 id={headingId} className="text-title-md text-text-primary">
            {name}
          </h2>
          {specialist.specialties.length > 0 ? (
            <p className="text-body-sm text-text-secondary">
              {specialist.specialties.join(' · ')}
            </p>
          ) : null}
          <Link
            href={routes.specialist(specialist.id)}
            className="self-start rounded-sm text-label-lg text-primary outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            {t('seeProfile')}
          </Link>
        </div>
      </div>
      <dl className="grid gap-2 border-t border-divider pt-4 text-body-md text-text-primary">
        <dt className="sr-only">{t('schedule')}</dt>
        <dd className="flex items-center gap-2">
          <Icon icon={CalendarMonth} size={20} className="text-primary" />
          <span className="first-letter:uppercase">
            {formatAppointmentDay(appointment.date)}
          </span>
        </dd>
        <dd className="flex items-center gap-2">
          <Icon icon={Schedule} size={20} className="text-primary" />
          <span>{formatAppointmentTime(appointment.startTime)}</span>
        </dd>
      </dl>
    </section>
  );
}
