import { useSyncExternalStore } from 'react';

/** The same screens the `touch:` variant styles (globals.css). */
const query = '(hover: none) and (pointer: coarse)';

function subscribe(onChange: () => void): () => void {
  const media = window.matchMedia(query);
  media.addEventListener('change', onChange);
  return () => {
    media.removeEventListener('change', onChange);
  };
}

/**
 * Whether a finger, not a pointer, drives the screen: what moves by itself
 * should then scroll by hand, and a drag gesture would fight the scroll.
 * Hydration-safe like `useReducedMotion`: `false` until the client knows.
 */
export function useCoarsePointer(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  );
}
