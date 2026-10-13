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
 * as the API's emails write them (AGENTS.md §5). The specialist reading
 * their own appointment (M14) looks for the patient instead.
 */
export function AppointmentHeadline({
  appointment,
  viewer = 'patient',
}: {
  appointment: AppointmentSummary;
  viewer?: 'patient' | 'specialist';
}) {
  const t = useTranslations('appointments.detail');
  const headingId = useId();
  const { specialist, attendee } = appointment;
  const forSpecialist = viewer === 'specialist';
  const name = forSpecialist
    ? `${attendee.firstName} ${attendee.lastName}`
    : (specialist.name ?? t('specialist'));

  return (
    <section
      aria-labelledby={headingId}
      className="flex animate-fade-up flex-col gap-4 rounded-2xl bg-pure-white p-5 shadow-md"
    >
      <div className="flex items-center gap-3">
        <Avatar
          name={name}
          src={forSpecialist ? null : specialist.photo}
          size="lg"
          decorative
        />
        <div className="flex min-w-0 flex-col gap-0.5">
          {forSpecialist ? (
            <p className="text-label-md text-text-secondary">{t('patient')}</p>
          ) : null}
          <h2
            id={headingId}
            className="text-title-md break-words text-text-primary"
          >
            {name}
          </h2>
          {!forSpecialist && specialist.specialties.length > 0 ? (
            <p className="text-body-sm text-text-secondary">
              {specialist.specialties.join(' · ')}
            </p>
          ) : null}
          {forSpecialist ? null : (
            // A touch target tall (§8.5); the negative margin keeps the line where it was.
            <Link
              href={routes.specialist(specialist.id)}
              className="-my-3 inline-flex min-h-touch items-center self-start rounded-sm text-label-lg text-primary outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              {t('seeProfile')}
            </Link>
          )}
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
