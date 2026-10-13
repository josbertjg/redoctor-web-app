'use client';

import { useEffect, useTransition } from 'react';

import CloudOff from '@material-symbols/svg-400/rounded/cloud_off.svg?svgr';

import { globalErrorMessages as messages } from '@/app/lib/i18n/global-error-messages';
import { reportError } from '@/app/lib/observability/report';
import { cn } from '@/app/lib/utils';

import { Button } from '@/app/ui/button';
import { EmptyState } from '@/app/ui/empty-state';
import { urbanist } from '@/app/ui/fonts';

import '@/app/ui/globals.css';

type GlobalErrorProps = {
  error: Error & { digest?: string };
  retry: () => void;
};

/*
 * The last resort, when the root layout itself fails: it replaces the whole
 * document, so it brings its own <html>, styles, font and copy (no next-intl
 * provider is mounted here).
 */
export default function GlobalError({ error, retry }: GlobalErrorProps) {
  const [isRetrying, startRetry] = useTransition();

  useEffect(() => {
    // Server errors arrive with a digest: instrumentation.ts reported them.
    if (error.digest === undefined) reportError(error);
  }, [error]);

  return (
    <html
      lang="es"
      data-theme="light"
      className={cn(urbanist.variable, 'h-full antialiased')}
    >
      <body className="flex min-h-full flex-col">
        <title>{messages.siteName}</title>
        <main className="flex flex-1 flex-col justify-center pb-16">
          <EmptyState
            headingLevel={1}
            tone="error"
            icon={CloudOff}
            title={messages.title}
            description={messages.description}
            action={
              <Button
                loading={isRetrying}
                onClick={() => {
                  startRetry(() => {
                    retry();
                  });
                }}
              >
                {messages.retry}
              </Button>
            }
          />
        </main>
      </body>
    </html>
  );
}
