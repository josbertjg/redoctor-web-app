import { http, HttpResponse } from 'msw';
import { z } from 'zod';

import {
  buildAppointment,
  slotAt,
  takenStartTime,
} from '../../factories/appointments';
import {
  bookingIds,
  buildOfficeServices,
  buildTerceros,
} from '../../factories/booking';
import { apiUrl, errorEnvelope } from '../api-url';
import { badRequest, isStranger, unauthorized } from './identity';

const inactive = () =>
  HttpResponse.json(errorEnvelope('ERR_3030', 'SpecialistProfile not found'), {
    status: 404,
  });

/** The booking's body as the API's contract takes it: nothing else. */
const bookingBody = z.strictObject({
  specialistId: z.uuid(),
  officeId: z.uuid(),
  date: z.iso.date(),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  forSelf: z.boolean(),
  specialtyId: z.uuid(),
  terceroId: z.uuid().optional(),
  tercero: z
    .strictObject({
      firstName: z.string().min(1).max(120),
      lastName: z.string().min(1).max(120),
      dateOfBirth: z.iso.date(),
      sex: z.enum(['MALE', 'FEMALE']),
      documentType: z.enum(['V', 'E', 'P', 'J', 'G']).optional(),
      documentNumber: z.string().min(1).max(40).optional(),
    })
    .optional(),
  consultationReasonId: z.uuid().optional(),
  notes: z.string().max(1000).optional(),
});

/*
 * Booking from a profile (M15): an office's reasons and prices, the people
 * in the patient's care, and the booking itself — a slot someone else just
 * took (ERR_4002), a specialist who is not active (404) —. The office's
 * days and slots are the appointments' handlers.
 */
export const bookingHandlers = [
  http.get(
    apiUrl('/scheduling/offices/:officeId/services'),
    ({ request, params }) => {
      if (isStranger(request)) return unauthorized();
      if (params.officeId === bookingIds.inactiveOffice) return inactive();
      return HttpResponse.json(buildOfficeServices());
    },
  ),

  http.get(apiUrl('/scheduling/terceros'), ({ request }) => {
    if (isStranger(request)) return unauthorized();
    return HttpResponse.json(buildTerceros());
  }),

  http.post(apiUrl('/scheduling/appointments'), async ({ request }) => {
    if (isStranger(request)) return unauthorized();
    const body = bookingBody.safeParse(await request.json());
    if (!body.success) return badRequest();
    const { data } = body;
    if (data.officeId === bookingIds.inactiveOffice) return inactive();
    if (data.startTime === takenStartTime) {
      return HttpResponse.json(errorEnvelope('ERR_4002', 'Slot taken'), {
        status: 409,
      });
    }
    const start = new Date(`${data.date}T${data.startTime}:00-04:00`);
    const attendee = data.tercero ?? { firstName: 'Ana', lastName: 'Pérez' };
    return HttpResponse.json(
      {
        appointment: buildAppointment(
          {
            id: bookingIds.booked,
            specialistId: data.specialistId,
            officeId: data.officeId,
            forSelf: data.forSelf,
            terceroId: data.terceroId ?? null,
            attendee,
            slot: slotAt(start),
            status: 'PENDING_CONFIRMATION',
            canConfirmNow: false,
          },
          start,
        ),
      },
      { status: 201 },
    );
  }),
];
