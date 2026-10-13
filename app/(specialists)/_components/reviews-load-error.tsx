'use client';

import { useTransition } from 'react';

import { useRouter } from 'next/navigation';

import { Button } from '@/app/ui/button';

/*
 * The reviews could not load (the rest of the profile did): say so and offer
 * «Reintentar», which renders the page again on the server. The button stays
 * live and shows its busy state meanwhile (AGENTS.md §8.3).
 */
export function ReviewsLoadError({
  message,
  refreshLabel,
}: {
  message: string;
  refreshLabel: string;
}) {
  const router = useRouter();
  const [isRefreshing, startRefresh] = useTransition();

  return (
    <div className="flex animate-fade-in flex-col items-center gap-3 py-4 text-center">
      <p role="alert" className="text-body-xxs text-text-secondary">
        {message}
      </p>
      <Button
        variant="white"
        size="small"
        loading={isRefreshing}
        onClick={() => {
          startRefresh(() => {
            router.refresh();
          });
        }}
      >
        {refreshLabel}
      </Button>
    </div>
  );
}
