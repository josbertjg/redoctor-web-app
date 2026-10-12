import { http, HttpResponse } from 'msw';
import { z } from 'zod';

import {
  appointmentFor,
  appointmentIds,
  slotAt,
  takenStartTime,
} from '../../factories/appointments';
import { apiUrl, errorEnvelope } from '../api-url';
import { badRequest, isStranger, unauthorized } from './identity';

const forbidden = () =>
  HttpResponse.json(errorEnvelope('ERR_1003', 'Forbidden'), { status: 403 });

const notFound = () =>
  HttpResponse.json(errorEnvelope('ERR_4003', 'Appointment not found'), {
    status: 404,
  });

const conflict = (code: string) =>
  HttpResponse.json(errorEnvelope(code, 'Conflict'), { status: 409 });

const terminal = new Set(['CANCELLED', 'COMPLETED', 'NO_SHOW']);

function halfHourAfter(time: string): string {
  const [hours = 0, minutes = 0] = time.split(':').map(Number);
  const total = hours * 60 + minutes + 30;
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${pad(Math.floor(total / 60))}:${pad(total % 60)}`;
}

const rescheduleBody = z.strictObject({
  date: z.iso.date(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
});

/** The appointment behind an id, as the API answers each case. */
function lookUp(request: Request, id: string) {
  if (isStranger(request)) return { refusal: unauthorized() } as const;
  if (id === appointmentIds.someoneElse)
    return { refusal: forbidden() } as const;
  const appointment = appointmentFor(id);
  return appointment
    ? ({ appointment } as const)
    : ({ refusal: notFound() } as const);
}

/*
 * One appointment (M5), built from the factories: the read, the three
 * writes with the API's rules — confirmation only inside its window, no
 * change to a terminal appointment, a slot someone else just took — and an
 * office's free days and slots.
 */
export const appointmentsHandlers = [
  http.get(
    apiUrl('/scheduling/appointments/:appointmentId'),
    ({ request, params }) => {
      const found = lookUp(request, String(params.appointmentId));
      return 'refusal' in found
        ? found.refusal
        : HttpResponse.json({ appointment: found.appointment });
    },
  ),

  http.post(
    apiUrl('/scheduling/appointments/:appointmentId/confirm'),
    ({ request, params }) => {
      const found = lookUp(request, String(params.appointmentId));
      if ('refusal' in found) return found.refusal;
      const { appointment } = found;
      if (!appointment.canConfirmNow) return conflict('ERR_4013');
      return HttpResponse.json({
        appointment: {
          ...appointment,
          status: 'CONFIRMED',
          canConfirmNow: false,
          confirmedAt: new Date().toISOString(),
        },
      });
    },
  ),

  http.post(
    apiUrl('/scheduling/appointments/:appointmentId/cancel'),
    async ({ request, params }) => {
      const found = lookUp(request, String(params.appointmentId));
      if ('refusal' in found) return found.refusal;
      const body = z
        .strictObject({ reason: z.string().optional() })
        .safeParse(await request.json());
      if (!body.success) return badRequest();
      const { appointment } = found;
      if (terminal.has(appointment.status)) return conflict('ERR_4005');
      return HttpResponse.json({
        appointment: {
          ...appointment,
          status: 'CANCELLED',
          cancelledBy: 'PATIENT',
          cancelReason: body.data.reason ?? null,
          cancelledAt: new Date().toISOString(),
          canConfirmNow: false,
        },
      });
    },
  ),

  http.post(
    apiUrl('/scheduling/appointments/:appointmentId/reschedule'),
    async ({ request, params }) => {
      const found = lookUp(request, String(params.appointmentId));
      if ('refusal' in found) return found.refusal;
      const body = rescheduleBody.safeParse(await request.json());
      if (!body.success) return badRequest();
      const { appointment } = found;
      if (terminal.has(appointment.status)) return conflict('ERR_4005');
      if (body.data.startTime === takenStartTime) return conflict('ERR_4002');
      const start = new Date(
        `${body.data.date}T${body.data.startTime}:00-04:00`,
      );
      return HttpResponse.json({
        appointment: {
          ...appointment,
          slot: slotAt(start),
          status: 'PENDING_CONFIRMATION',
          isRescheduled: true,
          canConfirmNow: false,
          confirmationWindowOpensAt: new Date(
            start.getTime() - 24 * 3_600_000,
          ).toISOString(),
        },
      });
    },
  ),

  http.get(
    apiUrl('/scheduling/offices/:officeId/available-days'),
    ({ request }) => {
      if (isStranger(request)) return unauthorized();
      const month = new URL(request.url).searchParams.get('month') ?? '';
      const [year, monthNumber] = month.split('-').map(Number);
      if (!year || !monthNumber) return badRequest();
      const today = new Date().toISOString().slice(0, 10);
      const length = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
      const days = Array.from({ length }, (_, index) => {
        const date = `${month}-${String(index + 1).padStart(2, '0')}`;
        const weekday = new Date(`${date}T12:00:00Z`).getUTCDay();
        const open = date > today && weekday !== 0 && weekday !== 6;
        return { date, available: open, availableCount: open ? 6 : 0 };
      });
      return HttpResponse.json({
        officeId: 'office',
        month,
        timezone: 'America/Caracas',
        days,
      });
    },
  ),

  http.get(apiUrl('/scheduling/offices/:officeId/slots'), ({ request }) => {
    if (isStranger(request)) return unauthorized();
    const date = new URL(request.url).searchParams.get('date') ?? '';
    const times = ['08:30', '09:00', takenStartTime, '14:00', '15:30', '18:30'];
    return HttpResponse.json({
      officeId: 'office',
      date,
      dayOfWeek: 'MONDAY',
      timezone: 'America/Caracas',
      // Half-hour slots; 9:00 is already booked.
      slots: times.map((startTime) => ({
        startTime,
        endTime: halfHourAfter(startTime),
        available: startTime !== '09:00',
      })),
    });
  }),
];
