import { useCallback, useRef, useState } from 'react';

import { roundCoordinates, type Coordinates } from '@/app/lib/search/location';

/*
 * The device's position, asked for only when the person taps «Usar mi
 * ubicación» (the browser then asks them): a fresh fix within ten seconds,
 * or one up to five minutes old, as the app does. What comes back is
 * rounded to about a kilometre before anything keeps it (AGENTS.md §11).
 */

export type DeviceLocationStatus =
  | 'idle'
  | 'locating'
  | 'located'
  /** The person said no, or the browser's settings say no for this site. */
  | 'denied'
  /** No fix in time, or the device has no way to know. */
  | 'unavailable'
  /** A browser without geolocation at all. */
  | 'unsupported';

export type DeviceLocation = {
  status: DeviceLocationStatus;
  coordinates: Coordinates | null;
};

const fixTimeoutMs = 6_000;
const fixGuardMs = fixTimeoutMs + 500;
const fixMaxAgeMs = 300_000;

const idle: DeviceLocation = { status: 'idle', coordinates: null };

/** The browser's refusal, with its reason: 1 is the person's or the settings' no. */
class DeviceLocationError extends Error {
  readonly denied: boolean;

  constructor(error: GeolocationPositionError) {
    super(error.message);
    this.name = 'DeviceLocationError';
    this.denied = error.code === error.PERMISSION_DENIED;
  }
}

function askBrowser(): Promise<Coordinates> {
  return new Promise((resolve, reject) => {
    let settled = false;
    // Some desktop/headless browsers never fire Geolocation's error callback
    // when no network location provider is configured: guard the wait in JS.
    const guard = setTimeout(() => {
      if (settled) return;
      settled = true;
      reject(new Error('Geolocation timed out'));
    }, fixGuardMs);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (settled) return;
        settled = true;
        clearTimeout(guard);
        resolve(
          roundCoordinates({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          }),
        );
      },
      (error: GeolocationPositionError) => {
        if (settled) return;
        settled = true;
        clearTimeout(guard);
        reject(new DeviceLocationError(error));
      },
      {
        enableHighAccuracy: false,
        timeout: fixTimeoutMs,
        maximumAge: fixMaxAgeMs,
      },
    );
  });
}

export function useDeviceLocation(): DeviceLocation & {
  /** Asks the device; resolves with the point, or null when it could not. */
  locate: () => Promise<Coordinates | null>;
  reset: () => void;
} {
  const [state, setState] = useState<DeviceLocation>(idle);
  const pending = useRef<Promise<Coordinates | null> | null>(null);

  const locate = useCallback(() => {
    // Two taps while the browser asks share one answer.
    if (pending.current) return pending.current;
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      setState({ status: 'unsupported', coordinates: null });
      return Promise.resolve(null);
    }
    setState((current) => ({
      status: 'locating',
      coordinates: current.coordinates,
    }));
    const request = askBrowser()
      .then((coordinates) => {
        setState({ status: 'located', coordinates });
        return coordinates;
      })
      .catch((error: unknown) => {
        const denied = error instanceof DeviceLocationError && error.denied;
        setState({
          status: denied ? 'denied' : 'unavailable',
          coordinates: null,
        });
        return null;
      })
      .finally(() => {
        pending.current = null;
      });
    pending.current = request;
    return request;
  }, []);

  const reset = useCallback(() => {
    setState(idle);
  }, []);

  return { ...state, locate, reset };
}
