import 'client-only';

import { useSyncExternalStore } from 'react';

/*
 * Whether the splash has left, for the pieces that wait for it (the hero's
 * entrance). A tiny external store: no provider, no re-render of the tree.
 */

let done = false;
const listeners = new Set<() => void>();

export function markSplashDone(): void {
  if (done) return;
  done = true;
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useSplashDone(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => done,
    () => false,
  );
}
