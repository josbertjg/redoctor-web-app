import { NextResponse, type NextRequest } from 'next/server';

import { z } from 'zod';

import {
  PlacesError,
  placesRequestLimit,
  suggestPlaces,
} from '@/app/lib/data/places';
import { searchTextMaxLength } from '@/app/lib/search/query';
import { suggestionsMinLength } from '@/app/lib/search/suggestions';
import {
  allowRequest,
  rateLimited,
  requestAddress,
} from '@/app/lib/security/rate-limit';

/*
 * The places the search box offers (M16): Google's Place Autocomplete,
 * Venezuela only, through the web's server — the key stays here, and the
 * browser's session token joins the typing and the pick for Google's
 * billing. Never cached: each answer belongs to its session. So many a
 * minute per address: the quota is someone's money.
 */

const inputSchema = z
  .string()
  .transform((value) => value.replace(/\s+/g, ' ').trim())
  .pipe(z.string().min(suggestionsMinLength).max(searchTextMaxLength));

/** The token the browser made for this typing (a UUID, or close to it). */
export const sessionSchema = z.string().regex(/^[A-Za-z0-9-]{8,64}$/);

const noStore = { 'Cache-Control': 'no-store' };

/** The answer when Google could not: the box says it, the person types on. */
export function placesFailure(error: unknown) {
  if (!(error instanceof PlacesError)) throw error;
  return NextResponse.json(
    { code: error.reason === 'off' ? 'ERR_PLACES_OFF' : 'ERR_PLACES' },
    { status: error.reason === 'off' ? 503 : 502, headers: noStore },
  );
}

export async function GET(request: NextRequest) {
  if (!allowRequest(requestAddress(request.headers), placesRequestLimit)) {
    return rateLimited();
  }
  const params = request.nextUrl.searchParams;
  const input = inputSchema.safeParse(params.get('input') ?? undefined);
  const session = sessionSchema.safeParse(params.get('session') ?? undefined);
  if (!input.success || !session.success) {
    return NextResponse.json(
      { code: 'ERR_PLACES_INPUT' },
      { status: 400, headers: noStore },
    );
  }
  try {
    const places = await suggestPlaces(input.data, session.data);
    return NextResponse.json({ places }, { headers: noStore });
  } catch (error) {
    return placesFailure(error);
  }
}
