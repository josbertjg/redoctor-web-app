'use client';

import { useEffect, useTransition } from 'react';

import CloudOff from '@material-symbols/svg-400/rounded/cloud_off.svg?svgr';
import { useTranslations } from 'next-intl';

import { reportError } from '@/app/lib/observability/report';

import { Button } from '@/app/ui/button';
import { EmptyState } from '@/app/ui/empty-state';

export type PageErrorProps = {
  error: Error & { digest?: string };
  retry: () => void;
};

/*
 * A page that failed to render: what happened and a way to try again. The
 * retry keeps the button live and shows its busy state while the segment
 * renders again (AGENTS.md §8.3). The error goes to Sentry when it is on;
 * a server error already went there through instrumentation.ts.
 *
 * No landmark of its own: the root error puts it in a `main`, and a segment
 * whose layout already frames the page (`/pay`, `/panel`) shows it inside
 * that frame, under the bar.
 */
export function PageError({ error, retry }: PageErrorProps) {
  const t = useTranslations();
  const [isRetrying, startRetry] = useTransition();

  useEffect(() => {
    // Server errors arrive with a digest: instrumentation.ts reported them.
    if (error.digest === undefined) reportError(error);
  }, [error]);

  return (
    <EmptyState
      headingLevel={1}
      tone="error"
      icon={CloudOff}
      title={t('errors.page.title')}
      description={t('errors.page.description')}
      action={
        <Button
          loading={isRetrying}
          onClick={() => {
            startRetry(() => {
              retry();
            });
          }}
        >
          {t('retry')}
        </Button>
      }
    />
  );
}
