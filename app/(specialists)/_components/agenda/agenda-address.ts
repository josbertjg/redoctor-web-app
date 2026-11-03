import { isCalendarDay } from '@/app/lib/reports/period';
import { routes } from '@/app/lib/routes';
import {
  appointmentStatuses,
  type AppointmentStatus,
} from '@/app/lib/schemas/appointments';

export type AgendaView = 'day' | 'week';

/** «Citas» as its address holds it: the one state of the page (back, forward and a reload keep it). */
export type AgendaAddress = {
  /** The day on screen, or the day the week is shown around (YYYY-MM-DD). */
  date: string;
  view: AgendaView;
  status: AppointmentStatus | null;
  officeId: string | null;
  /** The appointment open over the agenda («Ver cita»). */
  appointmentId: string | null;
  /** «Nueva cita» open over the agenda (`?new=1`). */
  newAppointment: boolean;
};

/** An id as the API writes them; anything else is not looked for. */
const idPattern = /^[\w-]{1,64}$/;

const idOrNull = (value: string | null) =>
  value !== null && idPattern.test(value) ? value : null;

/*
 * The agenda's address, read: `/panel/agenda` is today and
 * `/panel/agenda/{YYYY-MM-DD}` a day (the daily summary's «Ver mi agenda»,
 * email 10; a malformed day is today, as the app reads it). Without
 * `?view=`, a day in the path or a phone means the day's list, otherwise
 * the week; a phone never has the room for the week. The filters and the
 * open appointment ride in the query, and what cannot be read is left out.
 */
export function agendaAddress(
  pathDate: string | null,
  search: URLSearchParams,
  wide: boolean,
  today: string,
): AgendaAddress {
  const asked = search.get('view');
  const status = search.get('status') ?? '';
  return {
    date: pathDate !== null && isCalendarDay(pathDate) ? pathDate : today,
    view: !wide
      ? 'day'
      : asked === 'day' || asked === 'week'
        ? asked
        : pathDate === null
          ? 'week'
          : 'day',
    status: (appointmentStatuses as readonly string[]).includes(status)
      ? (status as AppointmentStatus)
      : null,
    officeId: idOrNull(search.get('office')),
    appointmentId: idOrNull(search.get('appointment')),
    newAppointment: search.get('new') === '1',
  };
}

/** An agenda state's query, past what its path already implies (`implied`: the view the path opens alone). */
function agendaQuery(address: AgendaAddress, implied: AgendaView): string {
  const params = new URLSearchParams();
  if (address.view !== implied) params.set('view', address.view);
  if (address.status) params.set('status', address.status);
  if (address.officeId) params.set('office', address.officeId);
  if (address.appointmentId) params.set('appointment', address.appointmentId);
  if (address.newAppointment) params.set('new', '1');
  const query = params.toString();
  return query ? `?${query}` : '';
}

/** The address of an agenda state, writing only what the address does not already imply. */
export function agendaHref(address: AgendaAddress, today: string): string {
  return address.date === today
    ? `${routes.agenda()}${agendaQuery(address, 'week')}`
    : `${routes.agenda(address.date)}${agendaQuery(address, 'day')}`;
}

/**
 * The same page in another state — a filter, «Ver cita» — its path kept as
 * the page received it (`pathDate`), so what the path implies stays true:
 * today named in the path still opens the day.
 */
export function agendaInPlaceHref(
  address: AgendaAddress,
  pathDate: string | null,
): string {
  return pathDate === null
    ? `${routes.agenda()}${agendaQuery(address, 'week')}`
    : `${routes.agenda(pathDate)}${agendaQuery(address, 'day')}`;
}
