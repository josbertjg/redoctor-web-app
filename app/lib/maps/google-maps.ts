import 'client-only';

import { publicEnv } from '../public-env';

/*
 * The Maps JavaScript API, loaded once and only when a page needs it (the
 * search's map, the places a person names): nothing of it is in any
 * bundle. Its script carries the page's nonce, read from one of Next's own
 * scripts as Google's loader does, so the strict policy lets it run, and
 * the API stamps the same nonce on what it inserts (AGENTS.md §11). Spanish
 * words and Venezuela's region for every label and answer.
 */

/** Google's own map id for development: Advanced Markers need one. */
const demoMapId = 'DEMO_MAP_ID';

const mapsScriptUrl = 'https://maps.googleapis.com/maps/api/js';

const callbackName = '__redoctorGoogleMapsReady';

type MapsWindow = Window & {
  google?: { maps?: typeof google.maps };
  [callbackName]?: (() => void) | undefined;
  /** Google calls it when the key is refused for the Maps JavaScript API. */
  gm_authFailure?: (() => void) | undefined;
};

const authFailureListeners = new Set<() => void>();
let authFailed = false;

/**
 * Tells when Google refuses the key for the Maps JavaScript API (a key
 * restricted to other APIs, or an invalid one): the API loads, the map
 * draws, and then Google covers it with its own error panel and calls
 * `gm_authFailure` — the one signal there is. A listener added after the
 * refusal hears it at once.
 */
export function onMapsAuthFailure(listener: () => void): () => void {
  if (authFailed) listener();
  authFailureListeners.add(listener);
  return () => {
    authFailureListeners.delete(listener);
  };
}

const mapsWindow = () => window as MapsWindow;

/** Whether the web has a key: without one there is no map and no Google places. */
export function googleMapsAvailable(): boolean {
  return publicEnv.googleMaps.apiKey !== undefined;
}

/** The map id the search's map draws with. */
export function googleMapId(): string {
  return publicEnv.googleMaps.mapId ?? demoMapId;
}

let loading: Promise<typeof google.maps> | undefined;

/** The nonce the page's scripts carry (the attribute is hidden; the property is not). */
function pageNonce(): string {
  const script = document.querySelector<HTMLScriptElement>('script[nonce]');
  return script?.nonce ?? '';
}

/**
 * The API, ready for `importLibrary`. One load per page; a second caller
 * waits for the first. Rejects without a key, or when Google's script
 * cannot be fetched (offline, blocked), so the page can go on without it.
 */
export function loadGoogleMaps(): Promise<typeof google.maps> {
  const apiKey = publicEnv.googleMaps.apiKey;
  if (apiKey === undefined) {
    return Promise.reject(new Error('Google Maps is not configured'));
  }
  loading ??= new Promise<typeof google.maps>((resolve, reject) => {
    const already = mapsWindow().google?.maps;
    if (already?.importLibrary) {
      resolve(already);
      return;
    }
    mapsWindow().gm_authFailure = () => {
      authFailed = true;
      authFailureListeners.forEach((listener) => {
        listener();
      });
    };
    mapsWindow()[callbackName] = () => {
      mapsWindow()[callbackName] = undefined;
      const maps = mapsWindow().google?.maps;
      if (maps) resolve(maps);
      else reject(new Error('Google Maps did not load'));
    };
    const url = new URL(mapsScriptUrl);
    url.searchParams.set('key', apiKey);
    url.searchParams.set('v', 'weekly');
    url.searchParams.set('language', 'es');
    url.searchParams.set('region', 'VE');
    url.searchParams.set('loading', 'async');
    url.searchParams.set('callback', callbackName);
    const script = document.createElement('script');
    script.src = url.toString();
    script.async = true;
    script.nonce = pageNonce();
    script.onerror = () => {
      mapsWindow()[callbackName] = undefined;
      script.remove();
      loading = undefined;
      reject(new Error('Google Maps could not be fetched'));
    };
    document.head.append(script);
  });
  return loading;
}

/** One of the API's libraries, loading the API first when needed. */
export async function importMapsLibrary(
  name: 'maps',
): Promise<google.maps.MapsLibrary>;
export async function importMapsLibrary(
  name: 'marker',
): Promise<google.maps.MarkerLibrary>;
export async function importMapsLibrary(
  name: 'places',
): Promise<google.maps.PlacesLibrary>;
export async function importMapsLibrary(
  name: 'core',
): Promise<google.maps.CoreLibrary>;
export async function importMapsLibrary(name: string) {
  const maps = await loadGoogleMaps();
  return maps.importLibrary(name);
}
