import { compareMatches, findMatch, type TextMatch } from './text';

import type { SearchResponse } from '../schemas/search';

/*
 * What the search box offers as a person types, as the app's sheet does:
 * the specialties of the catalog that match, found here at once, and the
 * specialists whose name matches, asked of the API after a pause (`name=`,
 * five of them, wherever they are). The web shows the letters that matched
 * and groups the two; the app lists them plain, specialists first.
 */

/** Under two characters the box offers the catalog instead (the app's rule). */
export const suggestionsMinLength = 2;

/** The app's five of each. */
export const suggestionsLimit = 5;

export type SpecialtySuggestion = {
  kind: 'specialty';
  id: string;
  name: string;
  match: TextMatch | null;
};

export type SpecialistSuggestion = {
  kind: 'specialist';
  id: string;
  name: string;
  photoUrl: string | null;
  verified: boolean;
  /** The first specialty, as the app's row shows it beside the name. */
  specialty: string | null;
  match: TextMatch | null;
};

export type SearchSuggestion = SpecialtySuggestion | SpecialistSuggestion;

/** A specialty as the suggestions need it: the catalog flattened (`flattenSpecialties`). */
export type SuggestibleSpecialty = { id: string; name: string };

/** Whether a text is long enough to look for suggestions. */
export function canSuggest(typed: string): boolean {
  return typed.trim().length >= suggestionsMinLength;
}

/**
 * The specialties a typed text names, the best matches first: a word's
 * start before its middle, and the shorter name before the longer when
 * both match the same way («Cardiología» before «Cardiología Pediátrica»).
 */
export function matchSpecialties(
  specialties: readonly SuggestibleSpecialty[],
  typed: string,
  limit = suggestionsLimit,
): SpecialtySuggestion[] {
  if (!canSuggest(typed)) return [];
  return specialties
    .flatMap((specialty) => {
      const match = findMatch(specialty.name, typed);
      return match ? [{ ...specialty, match, text: specialty.name }] : [];
    })
    .sort(compareMatches)
    .slice(0, limit)
    .map(({ id, name, match }) => ({ kind: 'specialty', id, name, match }));
}

/** The API's answer to `name=` as suggestion rows, each with the letters that matched. */
export function toSpecialistSuggestions(
  response: SearchResponse,
  typed: string,
  limit = suggestionsLimit,
): SpecialistSuggestion[] {
  return response.data.slice(0, limit).map((item) => ({
    kind: 'specialist',
    id: item.specialistId,
    name: item.displayName,
    photoUrl: item.photoUrl,
    verified: item.isVerified,
    specialty: item.specialties[0]?.name ?? null,
    match: findMatch(item.displayName, typed),
  }));
}
