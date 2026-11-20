import { http, HttpResponse } from 'msw';

import {
  buildPublicDaySlots,
  buildSpecialistAvailability,
} from '@/tests/factories/public-availability';
import {
  buildSearchResponse,
  buildSearchResult,
} from '@/tests/factories/search';
import {
  buildFeaturedSpecialistsResponse,
  buildPopularSpecialtiesResponse,
} from '@/tests/factories/search-highlights';

import { apiUrl } from '../api-url';

/*
 * The search, on both sides of the web's server:
 * - the API's `GET /search/specialists` (public): one specialist near
 *   Caracas for any search that names something, two pages when asked
 *   for «dos», nobody for «nadie»; the API's own refusal when nothing is
 *   asked or the point is missing, as it answers it (ERR_1001); a `name=`
 *   search answers the specialist when the name fits, nobody otherwise;
 * - the web's own `/api/search` and `/api/search/suggestions`, which the
 *   browser calls (app/api/search): the same answers, from the same
 *   factory, so the browser's reading is tested against the contract.
 */

const secondSpecialistId = 'b1b2b3b4-0000-4000-8000-000000000002';

function answer(params: URLSearchParams) {
  const page = Number(params.get('page') ?? '1');
  const limit = Number(params.get('limit') ?? '10');
  const radius = params.get('radiusMeters') ?? params.get('radius');
  const text = params.get('search') ?? params.get('q');
  const twoPages = text === 'dos';
  const nobody = text === 'nadie';
  const data = nobody
    ? []
    : page === 2
      ? [
          buildSearchResult({
            specialistId: secondSpecialistId,
            displayName: 'Luis Rojas',
            rating: null,
            reviewCount: 0,
            minPrice: null,
          }),
        ]
      : [buildSearchResult()];
  return HttpResponse.json(
    buildSearchResponse({
      data,
      meta: {
        total: nobody ? 0 : twoPages ? 2 : 1,
        page,
        limit,
        totalPages: nobody ? 0 : twoPages ? 2 : 1,
        radiusMeters:
          radius === null || radius === 'all'
            ? null
            : params.has('radiusMeters')
              ? Number(radius)
              : Number(radius) * 1000,
      },
    }),
  );
}

function suggest(name: string | null, limit: number) {
  const data =
    name !== null && 'ana pérez'.includes(name.toLocaleLowerCase('es'))
      ? [buildSearchResult()]
      : [];
  return HttpResponse.json(
    buildSearchResponse({
      data,
      meta: {
        total: data.length,
        page: 1,
        limit,
        totalPages: data.length === 0 ? 0 : 1,
        radiusMeters: null,
      },
    }),
  );
}

/** The API's refusal of a malformed request, as it answers it. */
function invalid(path: string) {
  return HttpResponse.json(
    {
      code: 'ERR_1001',
      message: 'Validation failed',
      timestamp: '2026-11-16T12:00:00.000Z',
      path: `/api/v1${path}`,
      traceId: 'test-trace',
    },
    { status: 400 },
  );
}

/** The highlights' `limit`: 10 by default, from 1 to 20 (REDOC-177). */
function highlightsLimit(params: URLSearchParams): number | null {
  const limit = Number(params.get('limit') ?? '10');
  return Number.isInteger(limit) && limit >= 1 && limit <= 20 ? limit : null;
}

export const searchHandlers = [
  // The public agenda (no session): each office's next twelve days with
  // hours from `fromDate`, and a day's hours with the booked ones taken.
  http.get(
    apiUrl('/search/specialists/:specialistId/availability'),
    ({ request, params }) => {
      const fromDate =
        new URL(request.url).searchParams.get('fromDate') ??
        new Date().toISOString().slice(0, 10);
      return HttpResponse.json(
        buildSpecialistAvailability({
          specialistId: String(params.specialistId),
          fromDate,
        }),
      );
    },
  ),
  http.get(apiUrl('/search/offices/:officeId/slots'), ({ request, params }) => {
    const date = new URL(request.url).searchParams.get('date') ?? '';
    return HttpResponse.json(
      buildPublicDaySlots(String(params.officeId), date),
    );
  }),
  // The highlights (REDOC-177), public: the best rated two, the nearest
  // first around a point (`lat` and `lng` together or neither), and the
  // most booked specialties.
  http.get(apiUrl('/search/specialists/featured'), ({ request }) => {
    const params = new URL(request.url).searchParams;
    const limit = highlightsLimit(params);
    if (params.has('lat') !== params.has('lng') || limit === null) {
      return invalid('/search/specialists/featured');
    }
    return HttpResponse.json(
      buildFeaturedSpecialistsResponse({ near: params.has('lat'), limit }),
    );
  }),
  http.get(apiUrl('/search/specialties/popular'), ({ request }) => {
    const limit = highlightsLimit(new URL(request.url).searchParams);
    if (limit === null) return invalid('/search/specialties/popular');
    return HttpResponse.json(buildPopularSpecialtiesResponse({ count: limit }));
  }),
  http.get(apiUrl('/search/specialists'), ({ request }) => {
    const params = new URL(request.url).searchParams;
    const criteria = ['search', 'specialtyId', 'name', 'specialistId'].filter(
      (key) => params.has(key),
    );
    if (!params.has('lat') || !params.has('lng') || criteria.length === 0) {
      return HttpResponse.json(
        {
          code: 'ERR_1001',
          message: 'Validation failed',
          timestamp: '2026-10-14T12:00:00.000Z',
          path: '/api/v1/search/specialists',
          traceId: 'test-trace',
        },
        { status: 400 },
      );
    }
    if (params.has('name')) {
      return suggest(params.get('name'), Number(params.get('limit') ?? '5'));
    }
    return answer(params);
  }),
  // The web's own, as the browser asks it (app/lib/queries/search.ts).
  http.get('*/api/search/suggestions', ({ request }) => {
    const params = new URL(request.url).searchParams;
    return suggest(params.get('name'), 5);
  }),
  http.get('*/api/search', ({ request }) => {
    const params = new URL(request.url).searchParams;
    if (!params.has('q') && !params.has('specialty')) {
      return HttpResponse.json(
        { code: 'ERR_SEARCH_CRITERIA' },
        { status: 400 },
      );
    }
    return answer(params);
  }),
];
