import { useSyncExternalStore } from 'react';

/** Tailwind's `lg`: where the panel shows its sidebar and the agenda its week. */
const query = '(min-width: 64rem)';

function subscribe(onChange: () => void): () => void {
  const media = window.matchMedia(query);
  media.addEventListener('change', onChange);
  return () => {
    media.removeEventListener('change', onChange);
  };
}

/**
 * Whether the screen is a laptop's or wider. Hydration-safe like
 * `useCoarsePointer`: `false` until the client knows.
 */
export function useWideScreen(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  );
}
