import { useQuery } from '@tanstack/react-query';

import {
  placeSuggestionsQueryOptions,
  resolvePlace,
  type ResolvedPlace,
} from '@/app/lib/queries/places';
import { suggestionsMinLength } from '@/app/lib/search/suggestions';
import { findMatch, type TextMatch } from '@/app/lib/search/text';

import { useDebouncedValue } from '@/app/hooks/use-debounced-value';

/*
 * The places a typed text names, as Google suggests them through the web's
 * server, after the app's pause (400 ms): each with the letters that
 * matched and the way to its point. Nothing under two letters.
 */

export type LocationSuggestion = {
  id: string;
  mainText: string;
  secondaryText: string | null;
  match: TextMatch | null;
  /** Where it is, fetched on the pick (which spends the session). */
  resolve: () => Promise<ResolvedPlace | null>;
};

export type LocationSuggestions = {
  items: LocationSuggestion[];
  /** Google is still answering this text. */
  loading: boolean;
  /** Google could not answer this text. */
  failed: boolean;
};

const placesDebounceMs = 400;

export function useLocationSuggestions(typed: string): LocationSuggestions {
  const text = typed.trim();
  const settled = useDebouncedValue(text, placesDebounceMs);
  const places = useQuery(placeSuggestionsQueryOptions(settled));

  if (text.length < suggestionsMinLength) {
    return { items: [], loading: false, failed: false };
  }
  const current = settled === text;
  return {
    items: current
      ? (places.data ?? []).map((place) => ({
          ...place,
          match: findMatch(place.mainText, text),
          resolve: () => resolvePlace(place),
        }))
      : [],
    loading: !current || places.isPending,
    failed: current && places.isError,
  };
}
