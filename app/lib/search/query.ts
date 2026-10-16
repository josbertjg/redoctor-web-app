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
 *
 * No zod here, on purpose: the landing's search box imports this module,
 * and zod would add some 30 KB to every visitor's first load for checks a
 * few lines do as well.
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

/** The longest place name the address keeps. */
const labelMaxLength = 120;

/** A catalog id: an RFC 9562 UUID, as zod's `z.uuid()` reads it. */
const uuidPattern =
  /^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$/;

function first(input: SearchParamsInput, name: string): string | undefined {
  if (input instanceof URLSearchParams) return input.get(name) ?? undefined;
  const value = input[name];
  return Array.isArray(value) ? value[0] : value;
}

/** A text with its spaces collapsed, or null when nothing or too much is left. */
function cleanText(
  value: string | undefined,
  maxLength: number,
): string | null {
  if (value === undefined) return null;
  const text = value.replace(/\s+/g, ' ').trim();
  return text.length > 0 && text.length <= maxLength ? text : null;
}

/** A coordinate within ±limit; an empty value is no coordinate (not 0). */
function coordinate(value: string | undefined, limit: number): number | null {
  if (value === undefined || value.trim() === '') return null;
  const number = Number(value);
  return Number.isFinite(number) && Math.abs(number) <= limit ? number : null;
}

function parseLocation(input: SearchParamsInput): SearchLocation {
  const lat = coordinate(first(input, searchParamNames.lat), 90);
  const lng = coordinate(first(input, searchParamNames.lng), 180);
  if (lat === null || lng === null) return wholeCountry;
  const coordinates = roundCoordinates({ lat, lng });
  const by = first(input, searchParamNames.by);
  if (by === 'device') return { kind: 'device', coordinates };
  const label = cleanText(first(input, searchParamNames.near), labelMaxLength);
  if (label !== null) return { kind: 'place', coordinates, label };
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
  const text = cleanText(
    first(input, searchParamNames.text),
    searchTextMaxLength,
  );
  const specialty = first(input, searchParamNames.specialty);
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
    text,
    specialtyId:
      specialty !== undefined && uuidPattern.test(specialty) ? specialty : null,
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
