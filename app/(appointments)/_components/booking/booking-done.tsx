'use client';

import { useId } from 'react';

import Link from 'next/link';

import EventAvailable from '@material-symbols/svg-400/rounded/event_available.svg?svgr';
import { useTranslations } from 'next-intl';

import {
  formatAppointmentDay,
  formatAppointmentTime,
  hourAgreement,
} from '@/app/lib/format/appointment-time';
import { routes } from '@/app/lib/routes';
import type { AppointmentResponse } from '@/app/lib/schemas/appointments';

import { Button } from '@/app/ui/button';
import { Icon } from '@/app/ui/icons';

/*
 * The app's «¡Todo listo!» once the API has the appointment: whom it is
 * with, the day and the hour. The appointment is born pending, and its page
 * is where it is confirmed from 24 h before: «Ver mi cita» goes there, and
 * «Ver mis citas» to the list, as the app's button does.
 */
export function BookingDone({
  appointment,
  specialistName,
}: {
  appointment: AppointmentResponse;
  specialistName: string;
}) {
  const t = useTranslations();
  const headingId = useId();
  const { slot } = appointment;
  // The API's name for the specialist, or the profile's when it sends none.
  const apiName = appointment.specialistName?.trim() ?? '';
  const name = apiName === '' ? specialistName : apiName;
  // «a las 3:30 p. m.» closes the sentence: the abbreviation's own period
  // is its full stop, so the message's period is not doubled («p. m..»).
  const time = formatAppointmentTime(slot.startTime).replace(/\.$/, '');

  return (
    <section
      aria-labelledby={headingId}
      className="flex animate-fade-up flex-col items-center gap-3 rounded-2xl bg-pure-white p-6 text-center shadow-md sm:p-8"
    >
      <span className="flex size-16 items-center justify-center rounded-full bg-green-50 text-green-700">
        <Icon icon={EventAvailable} className="size-8" />
      </span>
      <h2
        id={headingId}
        data-view-heading
        className="mt-1 text-headline-sm text-text-primary"
      >
        {t('search.booked.title')}
      </h2>
      <p className="text-title-md text-text-primary">
        {t('search.booked.subtitle')}
      </p>
      <p className="text-body-md text-text-secondary">
        {t.rich('search.booked.description', {
          name,
          date: formatAppointmentDay(slot.date),
          hour: hourAgreement(slot.startTime),
          time,
          strong: (chunks) => (
            <strong className="font-semibold text-text-primary">
              {chunks}
            </strong>
          ),
        })}
      </p>
      <div className="mt-3 flex w-full flex-col gap-2 sm:flex-row-reverse">
        <Button asChild shape="soft" className="sm:flex-1">
          <Link href={routes.appointment(appointment.id)}>
            {t('appointments.invitation.seeAppointment')}
          </Link>
        </Button>
        <Button asChild variant="white" shape="soft" className="sm:flex-1">
          <Link href={routes.appointments()}>
            {t('search.booked.seeMyAppointments')}
          </Link>
        </Button>
      </div>
    </section>
  );
}
