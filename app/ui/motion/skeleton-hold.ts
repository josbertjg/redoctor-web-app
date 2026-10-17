import { useDeferredValue } from 'react';

/**
 * Keeps a skeleton on screen for one render after its data arrives, so the
 * content then comes in a transition and the page's `PageTransition`
 * crossfades the skeleton into it (AGENTS.md §8, rule 13) instead of
 * swapping them at once. While the page's own transition still runs, React
 * waits for it to finish first. Data already in the cache shows at once:
 * nothing is held. The pending check stays beside it, so TypeScript still
 * knows the data is there after it:
 *
 *     const holding = useSkeletonHold(query.isPending);
 *     if (query.isPending || holding) return <AppointmentSkeleton />;
 */
export function useSkeletonHold(pending: boolean): boolean {
  const held = useDeferredValue(pending);
  return pending || held;
}
