'use client';

import { useTranslations } from 'next-intl';

import { Button } from '@/app/ui/button';

/** A read that failed inside a step or a sheet: said in place, with the way to try again. */
export function LoadFailure({
  message,
  retrying,
  onRetry,
}: {
  message: string;
  retrying: boolean;
  onRetry: () => void;
}) {
  const t = useTranslations();
  return (
    <div
      role="alert"
      className="flex animate-fade-in flex-col items-start gap-2 rounded-lg bg-error-50 px-4 py-3"
    >
      <p className="text-body-md text-error-700">{message}</p>
      <Button
        variant="white"
        size="small"
        shape="soft"
        loading={retrying}
        onClick={onRetry}
      >
        {t('retry')}
      </Button>
    </div>
  );
}
