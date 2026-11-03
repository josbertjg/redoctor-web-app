import type { AppointmentStatus } from '@/app/lib/schemas/appointments';

export type StatusTone = {
  /** The coloured bar beside an appointment (its 300; the cancelled 400). */
  bar: string;
  /** The tint an appointment is painted in (its 50). */
  fill: string;
  /** Its words on that tint (its 700). */
  text: string;
};

/*
 * Each status's colours, as the app paints them (`appointment_status_ui.dart`):
 * pending in the warning's, confirmed in green, finished in blue, moved in
 * orange, missed in grey, cancelled in red — the bar, the tint and the
 * words. Shared by the lists' cards, the agenda's week and «Ver cita».
 */
export const statusTones = {
  PENDING_CONFIRMATION: {
    bar: 'bg-warning-300',
    fill: 'bg-warning-50',
    text: 'text-warning-700',
  },
  CONFIRMED: {
    bar: 'bg-green-300',
    fill: 'bg-green-50',
    text: 'text-green-700',
  },
  RESCHEDULE_PROPOSED: {
    bar: 'bg-orange-300',
    fill: 'bg-orange-50',
    text: 'text-orange-700',
  },
  CANCELLED: {
    bar: 'bg-error-400',
    fill: 'bg-error-50',
    text: 'text-error-700',
  },
  COMPLETED: { bar: 'bg-blue-300', fill: 'bg-blue-50', text: 'text-blue-700' },
  NO_SHOW: { bar: 'bg-grey-300', fill: 'bg-grey-50', text: 'text-grey-700' },
} as const satisfies Record<AppointmentStatus, StatusTone>;
