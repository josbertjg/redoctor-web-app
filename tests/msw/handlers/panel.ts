import { http, HttpResponse } from 'msw';

import {
  buildOffices,
  buildSpecialistAgenda,
  buildSpecialistReport,
} from '../../factories/agenda';
import {
  buildPricingConfig,
  buildWeeklySchedule,
} from '../../factories/offices';
import { buildMyProfileResponse } from '../../factories/specialists';
import { apiUrl } from '../api-url';
import { isStranger, unauthorized } from './identity';

/** Accents and case aside, as the API's search reads names. */
const plain = (text: string) =>
  text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();

/*
 * The specialist's panel (M14), built from the factories: the agenda with
 * the API's filters and its pages, the offices with their rates and hours,
 * the statistics and the specialist's own profile.
 */
export const panelHandlers = [
  http.get(apiUrl('/scheduling/specialist/appointments'), ({ request }) => {
    if (isStranger(request)) return unauthorized();
    const params = new URL(request.url).searchParams;
    const from = params.get('from');
    const to = params.get('to');
    const status = params.get('status');
    const search = params.get('search');
    const page = Number(params.get('page') ?? '1');
    const pageSize = Number(params.get('pageSize') ?? '25');
    const matching = buildSpecialistAgenda().filter((appointment) => {
      const { attendee } = appointment;
      const words = plain(
        `${attendee.firstName} ${attendee.lastName} ${attendee.documentNumber ?? ''}`,
      );
      return (
        (from === null || appointment.slot.date >= from) &&
        (to === null || appointment.slot.date <= to) &&
        (status === null || appointment.status === status) &&
        (search === null || words.includes(plain(search)))
      );
    });
    return HttpResponse.json({
      appointments: matching.slice((page - 1) * pageSize, page * pageSize),
      total: matching.length,
      page,
      pageSize,
    });
  }),

  http.get(apiUrl('/specialists/offices'), ({ request }) => {
    if (isStranger(request)) return unauthorized();
    return HttpResponse.json(buildOffices());
  }),

  // «Mi perfil» and «Mis especialidades»: the profile, each office's rates and hours.
  http.get(apiUrl('/specialists/profile'), ({ request }) => {
    if (isStranger(request)) return unauthorized();
    return HttpResponse.json(buildMyProfileResponse());
  }),

  http.get(
    apiUrl('/specialists/offices/:officeId/pricing-config'),
    ({ request }) => {
      if (isStranger(request)) return unauthorized();
      return HttpResponse.json(buildPricingConfig());
    },
  ),

  http.get(apiUrl('/specialists/offices/:officeId/schedule'), ({ request }) => {
    if (isStranger(request)) return unauthorized();
    return HttpResponse.json(buildWeeklySchedule());
  }),

  http.get(apiUrl('/reports/specialist'), ({ request }) => {
    if (isStranger(request)) return unauthorized();
    const params = new URL(request.url).searchParams;
    return HttpResponse.json(
      buildSpecialistReport({
        range: {
          from: params.get('from'),
          to: params.get('to'),
          granularity: params.get('granularity'),
          timezone: 'America/Caracas',
        },
      }),
    );
  }),
];
