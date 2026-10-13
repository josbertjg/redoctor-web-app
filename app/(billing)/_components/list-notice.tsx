'use client';

import { useTranslations } from 'next-intl';

import { Button } from '@/app/ui/button';

/*
 * A list's word in place of its rows — nothing yet, or it could not be
 * read, with «Reintentar» — inside a card the size of a row or two, so the
 * section around it keeps its shape (the app's notice under «Recibos»).
 */
export function ListNotice({
  text,
  onRetry,
  retrying = false,
}: {
  text: string;
  onRetry?: () => void;
  retrying?: boolean;
}) {
  const tRoot = useTranslations();
  return (
    <div className="flex animate-fade-in flex-col items-start gap-3 rounded-2xl bg-pure-white p-5 shadow-sm">
      <p className="text-body-md text-text-secondary">{text}</p>
      {onRetry ? (
        <Button
          variant="white"
          size="small"
          shape="soft"
          loading={retrying}
          onClick={onRetry}
        >
          {tRoot('retry')}
        </Button>
      ) : null}
    </div>
  );
}
