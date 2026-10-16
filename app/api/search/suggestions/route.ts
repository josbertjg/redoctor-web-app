import { NextResponse, type NextRequest } from 'next/server';

import { z } from 'zod';

import { searchRequestLimit, suggestSpecialists } from '@/app/lib/data/search';
import { todayInCaracas } from '@/app/lib/format/date-of-birth';
import {
  parseSearchQuery,
  searchTextMaxLength,
  toSuggestionsRequest,
} from '@/app/lib/search/query';
import { suggestionsMinLength } from '@/app/lib/search/suggestions';
import {
  allowRequest,
  rateLimited,
  requestAddress,
} from '@/app/lib/security/rate-limit';

import { upstreamFailure } from '../route';

/*
 * The search box's specialists (M16): the API's `name=` search, five of
 * them, from the point the person chose or the whole country, through the
 * web's server for the same reasons as app/api/search/route.ts. Cached
 * longer: the names that match a text seldom change.
 */

const nameSchema = z
  .string()
  .transform((value) => value.replace(/\s+/g, ' ').trim())
  .pipe(z.string().min(suggestionsMinLength).max(searchTextMaxLength));

const cacheControl =
  'public, max-age=0, s-maxage=300, stale-while-revalidate=600';

export async function GET(request: NextRequest) {
  const address = requestAddress(request.headers);
  if (!allowRequest(`suggestions:${address}`, searchRequestLimit)) {
    return rateLimited();
  }
  const params = request.nextUrl.searchParams;
  const name = nameSchema.safeParse(params.get('name') ?? undefined);
  if (!name.success) {
    return NextResponse.json({ code: 'ERR_SEARCH_NAME' }, { status: 400 });
  }
  const { location } = parseSearchQuery(params, todayInCaracas());

  try {
    const response = await suggestSpecialists(
      toSuggestionsRequest(name.data, location),
    );
    return NextResponse.json(response, {
      headers: { 'Cache-Control': cacheControl },
    });
  } catch (error) {
    return upstreamFailure(error);
  }
}
