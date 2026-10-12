import type { AnalyticsEventName, AnalyticsEvents } from './events';

/*
 * The seam between the web and the analytics service. app/lib/analytics/
 * posthog.ts registers a sink when NEXT_PUBLIC_POSTHOG_KEY is set; without
 * one, events go nowhere.
 *
 * A page can track before the sink registers (PostHog loads in its own
 * chunk), so the first few events wait in a short queue. The state lives on
 * globalThis so every bundle of the page shares it.
 */

export type AnalyticsSink = <E extends AnalyticsEventName>(
  event: E,
  properties: AnalyticsEvents[E],
) => void;

type QueuedEvent = {
  [E in AnalyticsEventName]: { event: E; properties: AnalyticsEvents[E] };
}[AnalyticsEventName];

type AnalyticsState = {
  sink?: AnalyticsSink | undefined;
  queue: QueuedEvent[];
};

const MAX_QUEUED_EVENTS = 20;

const key: unique symbol = Symbol.for('redoctor.analytics');
const registry = globalThis as unknown as {
  [key]?: AnalyticsState | undefined;
};

function state(): AnalyticsState {
  registry[key] ??= { queue: [] };
  return registry[key];
}

export function setAnalyticsSink(next: AnalyticsSink | undefined): void {
  const current = state();
  current.sink = next;
  if (!next) return;
  const pending = current.queue;
  current.queue = [];
  for (const { event, properties } of pending) next(event, properties);
}

export function track<E extends AnalyticsEventName>(
  event: E,
  properties: AnalyticsEvents[E],
): void {
  const current = state();
  if (current.sink) {
    current.sink(event, properties);
    return;
  }
  if (current.queue.length < MAX_QUEUED_EVENTS) {
    // The pair is one of the union's members; TypeScript cannot tie the two
    // generics together by itself.
    current.queue.push({ event, properties } as QueuedEvent);
  }
}
