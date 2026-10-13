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
