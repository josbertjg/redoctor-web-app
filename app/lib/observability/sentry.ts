import * as Sentry from '@sentry/nextjs';

import { setApiErrorReporter, setErrorReporter } from './report';
import { scrubBreadcrumb, scrubEvent } from './scrub';

/*
 * Sentry for the browser and the server (AGENTS.md §11): errors only, no
 * tracing, no replays, no screenshots, no personal data. Loaded only when
 * NEXT_PUBLIC_SENTRY_DSN is set (instrumentation.ts and
 * instrumentation-client.ts). The person, once signed in (M2), is their id
 * and role, nothing else.
 */
export function initSentry({
  dsn,
  environment,
}: {
  dsn: string;
  environment: string;
}): void {
  Sentry.init({
    dsn,
    environment,
    // v11's successor of `sendDefaultPii: false`: collect none of the
    // person's data, request data or local variables, whatever the default.
    dataCollection: {
      userInfo: false,
      cookies: false,
      httpHeaders: false,
      httpBodies: [],
      urlQueryParams: false,
      graphQL: { document: false, variables: false },
      genAI: { inputs: false, outputs: false },
      databaseQueryData: false,
      queues: false,
      stackFrameVariables: false,
    },
    tracesSampleRate: 0,
    beforeSend: (event) => scrubEvent(event),
    beforeBreadcrumb: (breadcrumb) => scrubBreadcrumb(breadcrumb),
  });

  setApiErrorReporter((report) => {
    const outcome = [report.kind, report.status, report.code]
      .filter((part) => part !== undefined)
      .join(' ');
    Sentry.captureMessage(
      `API ${report.method} ${report.path} failed (${outcome})`,
      {
        level: 'error',
        tags: {
          'api.method': report.method,
          'api.path': report.path,
          'api.status':
            report.status === undefined ? 'none' : String(report.status),
          'api.code': report.code ?? 'none',
          'api.kind': report.kind,
        },
        // One issue per endpoint and code, however many times it happens.
        fingerprint: [
          'api-error',
          report.method,
          report.path,
          report.code ?? report.kind,
        ],
      },
    );
  });

  setErrorReporter((error) => {
    Sentry.captureException(error);
  });
}
