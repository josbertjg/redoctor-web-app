import {
  isInVenezuela,
  type Coordinates,
  type SearchLocation,
} from './location';

/*
 * Where the person last searched from — a place they named, or their
 * device —, kept in this browser alone so the next search starts there
 * (a convenience of the device, never sent anywhere). The whole country
 * and the map's area are not worth keeping: they are the default and a
 * moment's view.
 */

const storageKey = 'redoctor-search-location';

type StoredLocation = Extract<SearchLocation, { kind: 'device' | 'place' }>;

function isCoordinates(value: unknown): value is Coordinates {
  if (typeof value !== 'object' || value === null) return false;
  const point = value as Record<string, unknown>;
  return (
    typeof point.lat === 'number' &&
    typeof point.lng === 'number' &&
    isInVenezuela({ lat: point.lat, lng: point.lng })
  );
}

function isStoredLocation(value: unknown): value is StoredLocation {
  if (typeof value !== 'object' || value === null) return false;
  const entry = value as Record<string, unknown>;
  if (!isCoordinates(entry.coordinates)) return false;
  if (entry.kind === 'device') return true;
  return (
    entry.kind === 'place' &&
    typeof entry.label === 'string' &&
    entry.label !== ''
  );
}

export function loadLastLocation(): StoredLocation | null {
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (raw === null) return null;
    const parsed: unknown = JSON.parse(raw);
    return isStoredLocation(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function saveLastLocation(location: SearchLocation): void {
  try {
    if (location.kind === 'device' || location.kind === 'place') {
      window.localStorage.setItem(storageKey, JSON.stringify(location));
    } else if (location.kind === 'country') {
      window.localStorage.removeItem(storageKey);
    }
  } catch {
    // Storage refused: the next search starts from the whole country.
  }
}
