/*
 * Where a search looks: the API wants a point (`lat`, `lng`) and, at most,
 * a radius around it. The point is the person's device, a place they named
 * (a city, an address), the middle of the map they moved, or the whole
 * country — Venezuela for now (AGENTS.md §1).
 */

export type Coordinates = { lat: number; lng: number };

/** Venezuela's middle: the point of a search over the whole country. */
export const venezuelaCenter: Coordinates = { lat: 7.9, lng: -66.1 };

/** The box that holds Venezuela; a place outside it is not one to search from. */
export const venezuelaBounds = {
  north: 12.3,
  south: 0.6,
  west: -73.4,
  east: -59.8,
} as const;

export function isInVenezuela({ lat, lng }: Coordinates): boolean {
  return (
    lat >= venezuelaBounds.south &&
    lat <= venezuelaBounds.north &&
    lng >= venezuelaBounds.west &&
    lng <= venezuelaBounds.east
  );
}

/**
 * Two decimals, about a kilometre: enough to search near someone, too
 * little to say where they are. Nothing finer travels in an address, to
 * the API or to the server's logs (AGENTS.md §11).
 */
export function roundCoordinates({ lat, lng }: Coordinates): Coordinates {
  return { lat: Math.round(lat * 100) / 100, lng: Math.round(lng * 100) / 100 };
}

export type SearchLocation =
  /** The device's own position («Ubicación actual»). */
  | { kind: 'device'; coordinates: Coordinates }
  /** A place the person named: a city, an address. */
  | { kind: 'place'; coordinates: Coordinates; label: string }
  /** The middle of the map, after the person moved it («Buscar en esta zona»). */
  | { kind: 'area'; coordinates: Coordinates }
  /** The whole country, no point of the person's own. */
  | { kind: 'country' };

export const wholeCountry: SearchLocation = { kind: 'country' };

export function locationCoordinates(location: SearchLocation): Coordinates {
  return location.kind === 'country' ? venezuelaCenter : location.coordinates;
}

/** Whether two locations are the same search point. */
export function sameLocation(a: SearchLocation, b: SearchLocation): boolean {
  if (a.kind !== b.kind) return false;
  if (a.kind === 'country' || b.kind === 'country') return true;
  return (
    a.coordinates.lat === b.coordinates.lat &&
    a.coordinates.lng === b.coordinates.lng &&
    (a.kind !== 'place' || b.kind !== 'place' || a.label === b.label)
  );
}

/* ---------- The radius: the app's «Distancia» filter ---------------------- */

/** The app's stops, in kilometres; `all` is its «Todo el país», the default. */
export const searchRadiiKm = [15, 60, 150, 300] as const;

export type SearchRadius = (typeof searchRadiiKm)[number] | 'all';

export const defaultSearchRadius: SearchRadius = 'all';

export function isSearchRadius(value: unknown): value is SearchRadius {
  return (
    value === 'all' || (searchRadiiKm as readonly unknown[]).includes(value)
  );
}

/** The API's `radiusMeters`, or none for the whole country. */
export function radiusMeters(radius: SearchRadius): number | undefined {
  return radius === 'all' ? undefined : radius * 1000;
}

const earthRadiusMeters = 6_371_000;
const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

/** The distance between two points on the ground, in metres (haversine). */
export function distanceBetween(a: Coordinates, b: Coordinates): number {
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(a.lat)) *
      Math.cos(toRadians(b.lat)) *
      Math.sin(dLng / 2) ** 2;
  return 2 * earthRadiusMeters * Math.asin(Math.sqrt(h));
}

/**
 * The narrowest of the app's stops that covers a distance — what a map
 * showing that much around its middle should search —, or the whole
 * country when none does.
 */
export function radiusCovering(meters: number): SearchRadius {
  return searchRadiiKm.find((km) => km * 1000 >= meters) ?? 'all';
}
