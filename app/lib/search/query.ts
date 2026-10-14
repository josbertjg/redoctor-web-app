import { z } from 'zod';

import {
  defaultSearchRadius,
  isSearchRadius,
  locationCoordinates,
  radiusMeters,
  roundCoordinates,
  wholeCountry,
  type SearchLocation,
  type SearchRadius,
} from './location';
import { isCalendarDay } from '../reports/period';

/*
 * A search as the address carries it (`/search?q=…&lat=…`): what is looked
 * for — a text, or a specialty of the catalog —, where, how far around and
 * from when. The address is the search's one state: the page renders it on
 * the server, the browser updates it as the person refines, and a shared
 * or reloaded one shows the same results. Nothing a person is (names,
 * documents) ever travels in it; a device's position goes rounded to about
 * a kilometre (AGENTS.md §11).
 */

export const searchParamNames = {
  /** Free text: a specialty's or a specialist's name. */
  text: 'q',
  /** A specialty of the catalog, by id. */
  specialty: 'specialty',
  lat: 'lat',
  lng: 'lng',
  /** The name of the place the point stands for. */
  near: 'near',
  /** How the point was found when it has no name: the device, or the map. */
  by: 'by',
  radius: 'radius',
  from: 'from',
} as const;

export type SearchQuery = {
  text: string | null;
  specialtyId: string | null;
  location: SearchLocation;
  radius: SearchRadius;
  /** The first day to look at (`YYYY-MM-DD`); null is «Lo antes posible». */
  from: string | null;
};

export const emptySearchQuery: SearchQuery = {
  text: null,
  specialtyId: null,
  location: wholeCountry,
  radius: defaultSearchRadius,
  from: null,
};

/** What a page gets from Next.js, or what the browser reads from the address. */
export type SearchParamsInput =
  URLSearchParams | Record<string, string | string[] | undefined>;

/** The most a person can type: enough for any name, too little for a story. */
export const searchTextMaxLength = 100;

const textSchema = z
  .string()
  .transform((value) => value.replace(/\s+/g, ' ').trim())
  .pipe(z.string().min(1).max(searchTextMaxLength));

const coordinatesSchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
});

const labelSchema = z
  .string()
  .transform((value) => value.replace(/\s+/g, ' ').trim())
  .pipe(z.string().min(1).max(120));

function first(input: SearchParamsInput, name: string): string | undefined {
  if (input instanceof URLSearchParams) return input.get(name) ?? undefined;
  const value = input[name];
  return Array.isArray(value) ? value[0] : value;
}

function parseLocation(input: SearchParamsInput): SearchLocation {
  const point = coordinatesSchema.safeParse({
    lat: first(input, searchParamNames.lat),
    lng: first(input, searchParamNames.lng),
  });
  if (!point.success) return wholeCountry;
  const coordinates = roundCoordinates(point.data);
  const by = first(input, searchParamNames.by);
  if (by === 'device') return { kind: 'device', coordinates };
  const near = labelSchema.safeParse(first(input, searchParamNames.near));
  if (near.success) return { kind: 'place', coordinates, label: near.data };
  return { kind: 'area', coordinates };
}

/**
 * The search an address asks for. Anything malformed falls back to the
 * default — the whole country, the app's «Todo el país», «Lo antes
 * posible» — rather than failing: an old or hand-edited link still searches.
 */
export function parseSearchQuery(
  input: SearchParamsInput,
  today: string,
): SearchQuery {
  const text = textSchema.safeParse(first(input, searchParamNames.text));
  const specialty = z
    .uuid()
    .safeParse(first(input, searchParamNames.specialty));
  const location = parseLocation(input);

  const radiusValue = first(input, searchParamNames.radius);
  const radiusNumber = Number(radiusValue);
  const radius: SearchRadius =
    location.kind === 'country'
      ? 'all'
      : isSearchRadius(radiusValue)
        ? radiusValue
        : isSearchRadius(radiusNumber)
          ? radiusNumber
          : defaultSearchRadius;

  const fromValue = first(input, searchParamNames.from);
  const from =
    fromValue !== undefined && isCalendarDay(fromValue) && fromValue >= today
      ? fromValue
      : null;

  return {
    text: text.success ? text.data : null,
    specialtyId: specialty.success ? specialty.data : null,
    location,
    radius,
    from,
  };
}

/** The address of a search, with nothing that is the default. */
export function toSearchParams(query: SearchQuery): URLSearchParams {
  const params = new URLSearchParams();
  if (query.text !== null) params.set(searchParamNames.text, query.text);
  if (query.specialtyId !== null) {
    params.set(searchParamNames.specialty, query.specialtyId);
  }
  const { location } = query;
  if (location.kind !== 'country') {
    const { lat, lng } = roundCoordinates(location.coordinates);
    params.set(searchParamNames.lat, String(lat));
    params.set(searchParamNames.lng, String(lng));
    if (location.kind === 'place') {
      params.set(searchParamNames.near, location.label);
    } else if (location.kind === 'device') {
      params.set(searchParamNames.by, 'device');
    }
    if (query.radius !== defaultSearchRadius) {
      params.set(searchParamNames.radius, String(query.radius));
    }
  }
  if (query.from !== null) params.set(searchParamNames.from, query.from);
  return params;
}

/** The API needs something to look for: a text or a specialty. */
export function hasCriteria(query: SearchQuery): boolean {
  return query.text !== null || query.specialtyId !== null;
}

/** One text in the address, one search in the cache: the same key for both. */
export function searchQueryKey(query: SearchQuery): string {
  return toSearchParams(query).toString();
}

/* ---------- What the API is asked ---------------------------------------- */

/** The app's page: ten at a time, the next as the list's end comes into view. */
export const searchPageSize = 10;

export type SearchRequest = {
  search?: string;
  specialtyId?: string;
  lat: number;
  lng: number;
  radiusMeters?: number;
  fromDate?: string;
  page: number;
  limit: number;
};

/** `GET /search/specialists` for one page of a search. */
export function toSearchRequest(
  query: SearchQuery,
  page: number,
): SearchRequest {
  const { lat, lng } = locationCoordinates(query.location);
  const radius =
    query.location.kind === 'country' ? undefined : radiusMeters(query.radius);
  return {
    ...(query.text === null ? {} : { search: query.text }),
    ...(query.specialtyId === null ? {} : { specialtyId: query.specialtyId }),
    lat,
    lng,
    ...(radius === undefined ? {} : { radiusMeters: radius }),
    ...(query.from === null ? {} : { fromDate: query.from }),
    page,
    limit: searchPageSize,
  };
}

/** The app's suggestions: five specialists by name, wherever they are. */
export const suggestionsLimit = 5;

export type SuggestionsRequest = {
  name: string;
  lat: number;
  lng: number;
  page: 1;
  limit: number;
};

export function toSuggestionsRequest(
  name: string,
  location: SearchLocation,
): SuggestionsRequest {
  const { lat, lng } = locationCoordinates(location);
  return { name, lat, lng, page: 1, limit: suggestionsLimit };
}
