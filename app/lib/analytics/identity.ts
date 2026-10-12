/*
 * Who the events belong to (AGENTS.md §9, §11): the person's id and role,
 * nothing else — never the email, never a name. Same seam as track.ts:
 * app/lib/analytics/posthog.ts registers the sink when the service is on;
 * without one, the identity goes nowhere. A sign-in can resolve before the
 * service loads, so the last identity waits for the sink.
 */

export type ObservedPerson = { id: string; role: string };

export type IdentitySink = {
  identify: (person: ObservedPerson) => void;
  reset: () => void;
};

type IdentityState = {
  sink?: IdentitySink | undefined;
  pending?: ObservedPerson | undefined;
};

const key: unique symbol = Symbol.for('redoctor.analytics.identity');
const registry = globalThis as unknown as {
  [key]?: IdentityState | undefined;
};

function state(): IdentityState {
  registry[key] ??= {};
  return registry[key];
}

export function setIdentitySink(next: IdentitySink | undefined): void {
  const current = state();
  current.sink = next;
  if (next && current.pending) {
    next.identify(current.pending);
    current.pending = undefined;
  }
}

export function identifyPerson(person: ObservedPerson): void {
  const current = state();
  if (current.sink) {
    current.sink.identify(person);
    return;
  }
  current.pending = person;
}

/** Sign-out: the next events belong to nobody. */
export function forgetPerson(): void {
  const current = state();
  current.pending = undefined;
  current.sink?.reset();
}
