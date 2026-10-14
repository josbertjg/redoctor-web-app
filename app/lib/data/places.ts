import 'server-only';

import { env } from '../env';
import { reportError } from '../observability/report';
import {
  googleAutocompleteSchema,
  googleDetailsSchema,
  toPlaceSuggestions,
  type PlaceSuggestion,
} from '../schemas/places';
import {
  isInVenezuela,
  roundCoordinates,
  type Coordinates,
} from '../search/location';

import type { RateLimit } from '../security/rate-limit';
import type { z } from 'zod';

/*
 * Google Places from the web's server (M16): the places a typed text
 * names, Venezuela only, and the point of the one chosen — the Place
 * Autocomplete and Place Details web services the app calls, with the
 * same session token joining the typing and the pick, so Google bills
 * them as one. The key is the server's (AGENTS.md §11); the browser asks
 * app/api/places, which asks here.
 */

const placesBase = 'https://maps.googleapis.com/maps/api/place';

/** Google's own budget here is the app's: 8 s. */
const timeoutMs = 8000;

/** What each address may ask of the web's places in a minute. */
export const placesRequestLimit: RateLimit = { limit: 60, windowMs: 60_000 };

export type PlacesFailure =
  /** No key: the web offers no places. */
  | 'off'
  /** Google refused the key or the request (misconfigured, over quota). */
  | 'refused'
  /** Google did not answer, or answered something else. */
  | 'unavailable';

export class PlacesError extends Error {
  readonly reason: PlacesFailure;

  constructor(reason: PlacesFailure, message?: string, cause?: unknown) {
    super(
      message ?? `Google Places ${reason}`,
      cause === undefined ? {} : { cause },
    );
    this.name = 'PlacesError';
    this.reason = reason;
  }
}

export function placesConfigured(): boolean {
  return env.GOOGLE_PLACES_API_KEY !== undefined;
}

async function askGoogle<T>(
  service: 'autocomplete' | 'details',
  params: Record<string, string>,
  schema: z.ZodType<T>,
): Promise<T> {
  const key = env.GOOGLE_PLACES_API_KEY;
  if (key === undefined) throw new PlacesError('off');
  const url = new URL(`${placesBase}/${service}/json`);
  for (const [name, value] of Object.entries(params)) {
    url.searchParams.set(name, value);
  }
  url.searchParams.set('language', 'es');
  url.searchParams.set('key', key);

  let response: Response;
  try {
    response = await fetch(url, {
      signal: AbortSignal.timeout(timeoutMs),
      cache: 'no-store',
    });
  } catch (cause) {
    throw new PlacesError('unavailable', 'Google Places did not answer', cause);
  }
  if (!response.ok) {
    throw new PlacesError(
      'unavailable',
      `Google Places answered ${String(response.status)}`,
    );
  }
  const parsed = schema.safeParse(await response.json());
  if (!parsed.success) {
    throw new PlacesError('unavailable', 'Google Places broke its shape');
  }
  return parsed.data;
}

/** A status that is neither an answer nor «nothing»: the key, the quota. */
function refusal(status: string, message: string | undefined): PlacesError {
  const error = new PlacesError(
    status === 'REQUEST_DENIED' || status === 'OVER_QUERY_LIMIT'
      ? 'refused'
      : 'unavailable',
    `Google Places answered ${status}${message ? `: ${message}` : ''}`,
  );
  reportError(error);
  return error;
}

/** The places a text names inside Venezuela, as Google suggests them. */
export async function suggestPlaces(
  input: string,
  session: string,
): Promise<PlaceSuggestion[]> {
  const answer = await askGoogle(
    'autocomplete',
    { input, components: 'country:ve', sessiontoken: session },
    googleAutocompleteSchema,
  );
  if (answer.status === 'ZERO_RESULTS') return [];
  if (answer.status !== 'OK')
    throw refusal(answer.status, answer.error_message);
  return toPlaceSuggestions(answer);
}

/**
 * Where a chosen place is, rounded as every point the search keeps; null
 * when Google knows no point for it or it lies outside Venezuela. This
 * spends the session.
 */
export async function resolvePlace(
  placeId: string,
  session: string,
): Promise<Coordinates | null> {
  const answer = await askGoogle(
    'details',
    { place_id: placeId, fields: 'geometry', sessiontoken: session },
    googleDetailsSchema,
  );
  if (answer.status === 'ZERO_RESULTS' || answer.status === 'NOT_FOUND') {
    return null;
  }
  if (answer.status !== 'OK')
    throw refusal(answer.status, answer.error_message);
  const location = answer.result?.geometry?.location;
  if (!location || !isInVenezuela(location)) return null;
  return roundCoordinates(location);
}
