/*
 * Browser-side observability, before the app becomes interactive (Next.js
 * instrumentation-client). Sentry and PostHog exist only when their
 * variables are set (AGENTS.md §11, §12), each in its own chunk: a build
 * without them ships neither. A failure here never breaks the page.
 *
 * The variables are read as Next.js inlines them. next.config.ts validated
 * them with app/lib/env.ts before this was compiled; importing env.ts here
 * would ship zod to every page just to read three strings.
 */

/*
 * zod checks once, on its first parse, whether it may compile parsers with
 * `new Function`. The CSP refuses eval (AGENTS.md §11), so the check could
 * only fail, and each failure left a `securitypolicyviolation` on the page.
 * `jitless` skips the check, as zod advises for strict CSPs; parsing works
 * as it already did. zod shares its configuration through this global, so
 * setting it here needs no import of zod (whichever loads first, the object
 * is the same one).
 */
const zodConfig = globalThis as { __zod_globalConfig?: { jitless?: boolean } };
(zodConfig.__zod_globalConfig ??= {}).jitless = true;

const sentryDsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
const environment = process.env.NEXT_PUBLIC_APP_ENV ?? 'development';

if (sentryDsn) {
  import('./app/lib/observability/sentry')
    .then(({ initSentry }) => {
      initSentry({ dsn: sentryDsn, environment });
    })
    .catch(() => undefined);
}

const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
// Same default as app/lib/env.ts, which also takes an empty value as unset:
// an empty host would send the events to this site instead.
const configuredHost = process.env.NEXT_PUBLIC_POSTHOG_HOST;
const posthogHost =
  configuredHost === undefined || configuredHost === ''
    ? 'https://us.i.posthog.com'
    : configuredHost;

if (posthogKey) {
  import('./app/lib/analytics/posthog')
    .then(({ initPosthog }) => {
      initPosthog({ key: posthogKey, host: posthogHost });
    })
    .catch(() => undefined);
}
