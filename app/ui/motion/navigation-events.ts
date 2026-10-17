/*
 * The moment a navigation lands — the address on screen changed —, told by
 * NavigationProgress (app/ui/motion/navigation-progress.tsx) to whoever
 * waits for it: the colour wipe opens once the page under it has changed.
 */

const listeners = new Set<() => void>();

/** Called by NavigationProgress when the address changes. */
export function announceNavigation() {
  for (const listener of [...listeners]) listener();
}

/**
 * Resolves `true` when the next navigation lands, `false` when `timeoutMs`
 * pass first (the page never moved, or took too long to: whatever waited
 * goes on).
 */
export function nextNavigation(timeoutMs: number): Promise<boolean> {
  return new Promise((resolve) => {
    const settle = (landed: boolean) => {
      listeners.delete(onLanded);
      clearTimeout(timer);
      resolve(landed);
    };
    const onLanded = () => {
      settle(true);
    };
    listeners.add(onLanded);
    const timer = setTimeout(() => {
      settle(false);
    }, timeoutMs);
  });
}
