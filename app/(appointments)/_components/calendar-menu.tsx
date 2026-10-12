'use client';

import CalendarAddOn from '@material-symbols/svg-400/rounded/calendar_add_on.svg?svgr';
import { useTranslations } from 'next-intl';
import { DropdownMenu } from 'radix-ui';

import { track } from '@/app/lib/analytics/track';
import {
  googleCalendarUrl,
  toIcs,
  type CalendarEvent,
} from '@/app/lib/calendar';
import { publicEnv } from '@/app/lib/public-env';
import { routes } from '@/app/lib/routes';
import type { AppointmentSummary } from '@/app/lib/schemas/appointments';

import { Button } from '@/app/ui/button';
import { Icon } from '@/app/ui/icons';

/** How long the .ics stays downloadable: some browsers read it after the click returns. */
const ICS_URL_LIFETIME_MS = 40_000;

const itemClass =
  'flex min-h-touch cursor-pointer items-center rounded-lg px-3 text-body-md text-text-primary outline-none data-highlighted:bg-white-200';

/*
 * «Agregar al calendario» (M5): Google Calendar's own form, or an .ics file
 * for the iPhone, Outlook and the rest. The event carries who, when, where
 * and the way back to this page — never the reason (app/lib/calendar.ts).
 */
export function CalendarMenu({
  appointment,
}: {
  appointment: AppointmentSummary;
}) {
  const t = useTranslations('appointments.detail');
  const url = new URL(
    routes.appointment(appointment.id),
    publicEnv.siteUrl || 'https://redoctorapp.com',
  ).toString();
  const { office } = appointment;
  const event: CalendarEvent = {
    uid: `${appointment.id}@redoctorapp.com`,
    title: t('calendarEventTitle', {
      name: appointment.specialist.name ?? t('specialist'),
    }),
    startsAt: appointment.startsAt,
    endsAt: appointment.endsAt,
    location: [office.name, office.address].filter(Boolean).join(', ') || null,
    url,
    description: t('calendarEventDescription', { url }),
  };
  const google = googleCalendarUrl(event);

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <Button variant="white" block shape="soft">
          <Icon icon={CalendarAddOn} size={20} />
          {t('addToCalendar')}
        </Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="center"
          sideOffset={8}
          className="z-30 min-w-64 rounded-2xl bg-pure-white p-2 shadow-lg data-[state=closed]:animate-fade-out data-[state=open]:animate-scale-in"
        >
          {google ? (
            <DropdownMenu.Item asChild className={itemClass}>
              <a
                href={google}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => {
                  track('web_appointment_calendar_added', {
                    calendar: 'google',
                  });
                }}
              >
                {t('googleCalendar')}
              </a>
            </DropdownMenu.Item>
          ) : null}
          <DropdownMenu.Item
            className={itemClass}
            onSelect={() => {
              const ics = toIcs(event);
              if (ics === null) return;
              const file = URL.createObjectURL(
                new Blob([ics], { type: 'text/calendar;charset=utf-8' }),
              );
              const link = document.createElement('a');
              link.href = file;
              link.download = 'cita-redoctor.ics';
              link.click();
              setTimeout(() => {
                URL.revokeObjectURL(file);
              }, ICS_URL_LIFETIME_MS);
              track('web_appointment_calendar_added', { calendar: 'ics' });
            }}
          >
            {t('otherCalendar')}
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
