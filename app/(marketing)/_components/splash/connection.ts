import { useSyncExternalStore } from 'react';

/* The Network Information API, where it exists (Chrome, Android). */
type NetworkInformation = {
  saveData?: boolean;
  effectiveType?: string;
  addEventListener?: (type: 'change', listener: () => void) => void;
  removeEventListener?: (type: 'change', listener: () => void) => void;
};

function connection(): NetworkInformation | undefined {
  return (navigator as Navigator & { connection?: NetworkInformation })
    .connection;
}

function subscribe(onChange: () => void): () => void {
  const network = connection();
  network?.addEventListener?.('change', onChange);
  return () => {
    network?.removeEventListener?.('change', onChange);
  };
}

function isSlow(): boolean {
  const network = connection();
  if (!network) return false;
  return (
    network.saveData === true ||
    network.effectiveType === 'slow-2g' ||
    network.effectiveType === '2g'
  );
}

/**
 * Whether the person is on a 2G connection or asked to save data: the
 * splash's runtime weighs some 350 KB, and such a visit does without it.
 * (3G stays: the runtime is preloaded and the veil's fallback bounds the
 * wait.) Hydration-safe: `false` until the client knows.
 */
export function useSlowConnection(): boolean {
  return useSyncExternalStore(subscribe, isSlow, () => false);
}
