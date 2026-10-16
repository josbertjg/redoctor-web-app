import { NextResponse, type NextRequest } from 'next/server';

import { z } from 'zod';

import { placesRequestLimit, resolvePlace } from '@/app/lib/data/places';
import {
  allowRequest,
  rateLimited,
  requestAddress,
} from '@/app/lib/security/rate-limit';

import { placesFailure, sessionSchema } from '../suggestions/route';

/*
 * The point of a place the box took in hand (M16): Google's Place Details,
 * geometry alone, through the web's server with the session the typing
 * opened — which this spends. A place Google cannot place, or one outside
 * Venezuela, is none.
 */

const placeIdSchema = z.string().regex(/^[A-Za-z0-9_-]{1,300}$/);

const noStore = { 'Cache-Control': 'no-store' };

export async function GET(request: NextRequest) {
  if (!allowRequest(requestAddress(request.headers), placesRequestLimit)) {
    return rateLimited();
  }
  const params = request.nextUrl.searchParams;
  const id = placeIdSchema.safeParse(params.get('id') ?? undefined);
  const session = sessionSchema.safeParse(params.get('session') ?? undefined);
  if (!id.success || !session.success) {
    return NextResponse.json(
      { code: 'ERR_PLACES_INPUT' },
      { status: 400, headers: noStore },
    );
  }
  try {
    const coordinates = await resolvePlace(id.data, session.data);
    if (coordinates === null) {
      return NextResponse.json(
        { code: 'ERR_PLACE_NOT_FOUND' },
        { status: 404, headers: noStore },
      );
    }
    return NextResponse.json({ coordinates }, { headers: noStore });
  } catch (error) {
    return placesFailure(error);
  }
}
