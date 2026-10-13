import Link from 'next/link';

import LocationOn from '@material-symbols/svg-400/rounded/location_on.svg?svgr';
import Stethoscope from '@material-symbols/svg-400/rounded/stethoscope.svg?svgr';
import { useTranslations } from 'next-intl';

import {
  formatAppointmentDayShort,
  formatAppointmentTime,
} from '@/app/lib/format/appointment-time';
import { routes } from '@/app/lib/routes';
import {
  statusChips,
  type AppointmentStatus,
  type AppointmentSummary,
} from '@/app/lib/schemas/appointments';
import { cn } from '@/app/lib/utils';

import { Icon } from '@/app/ui/icons';
import { StateChip } from '@/app/ui/state-chip';

/** The app's coloured bar beside each card: one shade of the status's tone. */
const statusBars: Record<AppointmentStatus, string> = {
  PENDING_CONFIRMATION: 'bg-warning-300',
  CONFIRMED: 'bg-green-300',
  RESCHEDULE_PROPOSED: 'bg-orange-300',
  CANCELLED: 'bg-error-400',
  COMPLETED: 'bg-blue-300',
  NO_SHOW: 'bg-grey-300',
};

/*
 * One appointment in the patient's list, as the app's card: when, the
 * state, who, why and where. The whole card opens the appointment
 * (`/a/{id}`); the reason is the patient's own, on their own page.
 */
export function AppointmentCard({
  appointment,
}: {
  appointment: AppointmentSummary;
}) {
  const t = useTranslations();
  const chip = statusChips[appointment.status];
  const name =
    appointment.specialist.name ?? t('appointments.detail.specialist');

  return (
    <li>
      <Link
        href={routes.appointment(appointment.id)}
        className="flex overflow-hidden rounded-2xl bg-pure-white shadow-md transition-[box-shadow,transform] duration-fast ease-house outline-none hover:shadow-lg focus-visible:ring-3 focus-visible:ring-ring/50 active:translate-y-px"
      >
        <span
          aria-hidden="true"
          className={cn('w-1.5 shrink-0', statusBars[appointment.status])}
        />
        <span className="flex min-w-0 flex-1 flex-col gap-2 p-4">
          <span className="flex items-start justify-between gap-3">
            <span className="flex flex-col">
              <span className="text-label-lg text-text-primary first-letter:uppercase">
                {formatAppointmentDayShort(appointment.date)}
              </span>
              <span className="text-body-md text-text-secondary">
                {formatAppointmentTime(appointment.startTime)}
              </span>
            </span>
            <StateChip tone={chip.tone}>
              {t(`appointments.status.${chip.label}`)}
            </StateChip>
          </span>
          <span className="text-title-md text-text-primary">{name}</span>
          {appointment.reason ? (
            <span className="flex items-center gap-2 text-body-md text-text-secondary">
              <Icon
                icon={Stethoscope}
                size={18}
                className="shrink-0 text-primary"
              />
              {appointment.reason}
            </span>
          ) : null}
          {appointment.office.name ? (
            <span className="flex items-center gap-2 text-body-md text-text-secondary">
              <Icon
                icon={LocationOn}
                size={18}
                className="shrink-0 text-primary"
              />
              {appointment.office.name}
            </span>
          ) : null}
        </span>
      </Link>
    </li>
  );
}
