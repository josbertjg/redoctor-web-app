import Link from 'next/link';

import Badge from '@material-symbols/svg-400/rounded/badge.svg?svgr';
import LocationOn from '@material-symbols/svg-400/rounded/location_on.svg?svgr';
import Stethoscope from '@material-symbols/svg-400/rounded/stethoscope.svg?svgr';
import { useTranslations } from 'next-intl';

import {
  formatAppointmentDayShort,
  formatAppointmentTime,
} from '@/app/lib/format/appointment-time';
import { formatIdentityDocument } from '@/app/lib/format/identity-document';
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

type AppointmentCardProps = {
  appointment: AppointmentSummary;
  /**
   * Whose list it is: the patient's names the specialist (M6); the
   * specialist's names who attends, with their document (M14), as the
   * app's agenda tile does.
   */
  viewer?: 'patient' | 'specialist';
  /** Without the day: one day's list (the agenda) says it once, above. */
  showDay?: boolean;
};

/*
 * One appointment in a list, as the app's card: when, the state, who, why
 * and where. The whole card opens the appointment (`/a/{id}`): its patient
 * acts on it there; its specialist reads it there.
 */
export function AppointmentCard({
  appointment,
  viewer = 'patient',
  showDay = true,
}: AppointmentCardProps) {
  const t = useTranslations();
  const chip = statusChips[appointment.status];
  const { attendee } = appointment;
  const name =
    viewer === 'specialist'
      ? `${attendee.firstName} ${attendee.lastName}`
      : (appointment.specialist.name ?? t('appointments.detail.specialist'));
  const time = showDay
    ? formatAppointmentTime(appointment.startTime)
    : `${formatAppointmentTime(appointment.startTime)} – ${formatAppointmentTime(appointment.endTime)}`;

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
              {showDay ? (
                <span className="text-label-lg text-text-primary first-letter:uppercase">
                  {formatAppointmentDayShort(appointment.date)}
                </span>
              ) : null}
              <span
                className={
                  showDay
                    ? 'text-body-md text-text-secondary'
                    : 'text-label-lg text-text-primary'
                }
              >
                {time}
              </span>
            </span>
            <StateChip tone={chip.tone}>
              {t(`appointments.status.${chip.label}`)}
            </StateChip>
          </span>
          <span className="text-title-md break-words text-text-primary">
            {name}
          </span>
          {viewer === 'specialist' && attendee.document ? (
            <span className="flex items-center gap-2 text-body-md text-text-secondary">
              <Icon icon={Badge} size={18} className="shrink-0 text-primary" />
              {formatIdentityDocument(
                attendee.document.type,
                attendee.document.number,
              )}
            </span>
          ) : null}
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
