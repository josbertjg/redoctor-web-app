import type { Instrumentation } from 'next';

/*
 * Server-side observability (Next.js instrumentation): Sentry starts only
 * when NEXT_PUBLIC_SENTRY_DSN is set, and errors Next.js catches while
 * rendering go to it. Without the DSN, capturing does nothing.
 */
export async function register() {
  const { env } = await import('./app/lib/env');
  if (!env.NEXT_PUBLIC_SENTRY_DSN) return;

  const { initSentry } = await import('./app/lib/observability/sentry');
  initSentry({
    dsn: env.NEXT_PUBLIC_SENTRY_DSN,
    environment: env.NEXT_PUBLIC_APP_ENV,
  });
}

export const onRequestError: Instrumentation.onRequestError = async (
  ...args
) => {
  const { captureRequestError } = await import('@sentry/nextjs');
  captureRequestError(...args);
};
