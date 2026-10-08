/*
 * The seam between the web and the error-reporting service. Callers report
 * through these functions; app/lib/observability/sentry.ts registers the
 * reporters when NEXT_PUBLIC_SENTRY_DSN is set, and without it (development,
 * tests) reports go nowhere.
 *
 * A report carries the method, the route template, the status and the code.
 * Never a body, a token or a real path (AGENTS.md §5, §11).
 *
 * The reporters live on globalThis: instrumentation.ts and the app's code can
 * be separate bundles in one process, and must see the same registration.
 */

export type ApiErrorReport = {
  method: string;
  path: string;
  status: number | undefined;
  code: string | undefined;
  kind: string;
};

type Reporters = {
  apiError?: ((report: ApiErrorReport) => void) | undefined;
  error?: ((error: unknown) => void) | undefined;
};

const key: unique symbol = Symbol.for('redoctor.observability.reporters');
const registry = globalThis as unknown as { [key]?: Reporters | undefined };

function reporters(): Reporters {
  registry[key] ??= {};
  return registry[key];
}

export function setApiErrorReporter(
  next: ((report: ApiErrorReport) => void) | undefined,
): void {
  reporters().apiError = next;
}

export function setErrorReporter(
  next: ((error: unknown) => void) | undefined,
): void {
  reporters().error = next;
}

/** An API failure worth a look: unknown codes and broken contracts. */
export function reportApiError(report: ApiErrorReport): void {
  reporters().apiError?.(report);
}

/** An error a boundary caught (error.tsx, global-error.tsx). */
export function reportError(error: unknown): void {
  reporters().error?.(error);
}
