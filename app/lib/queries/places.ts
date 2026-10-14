import { queryOptions } from '@tanstack/react-query';

import {
  placeDetailsResponseSchema,
  placeSuggestionsResponseSchema,
  type PlaceSuggestion,
} from '../schemas/places';
import { suggestionsMinLength } from '../search/suggestions';

import type { Coordinates } from '../search/location';

/*
 * The search box's places in the browser (M16): the places a typed text
 * names and the point of the one chosen, through the web's own
 * app/api/places. A session token, made here, joins the typing and the
 * pick: Google bills them as one; the pick ends it, the next typing
 * starts another. One session at a time on a page: the page has one box
 * in hand at a time.
 */

let session: string | null = null;

/** The session of the typing under way, started on its first letters. */
export function placesSession(): string {
  session ??= crypto.randomUUID();
  return session;
}

export function endPlacesSession(): void {
  session = null;
}

/** The web's own places answered with something other than places. */
export class PlacesUnavailableError extends Error {
  readonly status: number;

  constructor(status: number) {
    super(`The places answered ${String(status)}`);
    this.name = 'PlacesUnavailableError';
    this.status = status;
  }
}

async function readPlaces(
  path: '/api/places/suggestions' | '/api/places/details',
  params: Record<string, string>,
  signal?: AbortSignal,
): Promise<Response> {
  const url = new URL(path, window.location.origin);
  for (const [name, value] of Object.entries(params)) {
    url.searchParams.set(name, value);
  }
  const response = await fetch(url, {
    headers: { Accept: 'application/json' },
    ...(signal ? { signal } : {}),
  });
  if (!response.ok) throw new PlacesUnavailableError(response.status);
  return response;
}

export const placesKeys = {
  suggestions: (input: string) => ['places', 'suggestions', input] as const,
};

/** The places a text names, after the box's pause; nothing under two letters. */
export function placeSuggestionsQueryOptions(input: string) {
  const trimmed = input.trim();
  return queryOptions({
    queryKey: placesKeys.suggestions(trimmed),
    queryFn: async ({ signal }): Promise<PlaceSuggestion[]> => {
      const response = await readPlaces(
        '/api/places/suggestions',
        { input: trimmed, session: placesSession() },
        signal,
      );
      return placeSuggestionsResponseSchema.parse(await response.json()).places;
    },
    enabled: trimmed.length >= suggestionsMinLength,
    staleTime: 300_000,
    retry: false,
  });
}

export type ResolvedPlace = { coordinates: Coordinates; label: string };

/**
 * Where a place the box took in hand is, with its name as the label; null
 * when Google cannot place it in Venezuela. Spends the session.
 */
export async function resolvePlace(
  place: PlaceSuggestion,
): Promise<ResolvedPlace | null> {
  const current = placesSession();
  endPlacesSession();
  try {
    const response = await readPlaces('/api/places/details', {
      id: place.id,
      session: current,
    });
    const { coordinates } = placeDetailsResponseSchema.parse(
      await response.json(),
    );
    return { coordinates, label: place.mainText };
  } catch (error) {
    if (error instanceof PlacesUnavailableError && error.status === 404) {
      return null;
    }
    throw error;
  }
}

/** A place typed and never picked: the first one Google names for it. */
export async function findPlace(input: string): Promise<ResolvedPlace | null> {
  const trimmed = input.trim();
  if (trimmed.length < suggestionsMinLength) return null;
  const response = await readPlaces('/api/places/suggestions', {
    input: trimmed,
    session: placesSession(),
  });
  const [first] = placeSuggestionsResponseSchema.parse(
    await response.json(),
  ).places;
  return first ? resolvePlace(first) : null;
}
