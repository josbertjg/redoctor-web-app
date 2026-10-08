import { useSyncExternalStore } from 'react';

import { detectDevice, type Device } from '@/app/lib/platform';

let cached: { key: string; device: Device } | undefined;

/** The same object while the signals do not change (a stable snapshot). */
function readDevice(): Device {
  const { userAgent, maxTouchPoints } = navigator;
  const key = `${userAgent}|${String(maxTouchPoints)}`;
  if (cached?.key !== key) {
    cached = { key, device: detectDevice({ userAgent, maxTouchPoints }) };
  }
  return cached.device;
}

// The device does not change while the page is open: nothing to listen to.
const subscribe = () => () => undefined;

const onServer = () => null;

/**
 * The device that opened the page, or null on the server and while hydrating:
 * the server cannot know it (an iPad says it is a Mac), so whatever depends
 * on it renders right after hydration, without a mismatch.
 */
export function useDevice(): Device | null {
  return useSyncExternalStore<Device | null>(subscribe, readDevice, onServer);
}
