import { NextResponse, type NextRequest } from 'next/server';

import { z } from 'zod';

import { isApiError } from '@/app/lib/api/errors';
import { searchSpecialists } from '@/app/lib/data/search';
import { todayInCaracas } from '@/app/lib/format/date-of-birth';
import {
  hasCriteria,
  parseSearchQuery,
  toSearchRequest,
} from '@/app/lib/search/query';

/*
 * The web's own search endpoint (M16): the browser asks it for a page of
 * results with the same query the page's address carries, plus `page`,
 * and gets the API's answer back. It exists because the browser cannot
 * call the API itself (its CORS is closed, REDOC-362) and because the
 * server caches each search for every visitor (app/lib/data/search.ts):
 * the one route handler of the web, for a read the browser must not do
 * itself (AGENTS.md §4). No session, no token: the search is public.
 */

const pageSchema = z.coerce.number().int().min(1).max(100).catch(1);

/** A page of results may be shared a minute at the edge: the same for everyone. */
const cacheControl =
  'public, max-age=0, s-maxage=60, stale-while-revalidate=300';

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const query = parseSearchQuery(params, todayInCaracas());
  if (!hasCriteria(query)) {
    return NextResponse.json({ code: 'ERR_SEARCH_CRITERIA' }, { status: 400 });
  }
  const page = pageSchema.parse(params.get('page') ?? undefined);

  try {
    const response = await searchSpecialists(toSearchRequest(query, page));
    return NextResponse.json(response, {
      headers: { 'Cache-Control': cacheControl },
    });
  } catch (error) {
    return upstreamFailure(error);
  }
}

/** The API refused or did not answer: the browser shows «No pudimos buscar». */
export function upstreamFailure(error: unknown) {
  if (!isApiError(error)) throw error;
  const status = error.status === 429 ? 429 : 502;
  return NextResponse.json(
    { code: error.code ?? 'ERR_UPSTREAM' },
    { status, headers: { 'Cache-Control': 'no-store' } },
  );
}
