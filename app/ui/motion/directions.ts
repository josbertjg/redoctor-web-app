import { addTransitionType, startTransition } from 'react';

import { navBack, navForward } from './view-transitions';

/** Which way a step goes: the next one, or the one before. */
export type StepDirection = 'forward' | 'back';

/**
 * Changes a flow's step inside a transition marked with its direction, so
 * its `StepTransition` slides that way (AGENTS.md §8, rule 13): the state
 * that shows the step, or the address that holds it — a `pushState` joins
 * this same transition, since Next.js syncs it inside one of its own.
 */
export function moveStep(direction: StepDirection, change: () => void) {
  startTransition(() => {
    addTransitionType(direction === 'forward' ? navForward : navBack);
    change();
  });
}
