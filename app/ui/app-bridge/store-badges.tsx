import { cn } from '@/app/lib/utils';

import { Button } from '@/app/ui/button';

type StoreBadgesProps = {
  appStoreUrl?: string | undefined;
  playStoreUrl?: string | undefined;
  labels: { appStore: string; playStore: string };
  className?: string;
};

/*
 * Links to the app's store listings. Renders nothing while none exists: the
 * pilot runs on TestFlight and Play internal testing (AGENTS.md §6).
 */
export function StoreBadges({
  appStoreUrl,
  playStoreUrl,
  labels,
  className,
}: StoreBadgesProps) {
  if (appStoreUrl === undefined && playStoreUrl === undefined) return null;

  return (
    <div
      className={cn(
        'flex flex-col items-stretch gap-2 sm:flex-row sm:justify-center',
        className,
      )}
    >
      {appStoreUrl === undefined ? null : (
        <Button asChild variant="white">
          <a href={appStoreUrl}>{labels.appStore}</a>
        </Button>
      )}
      {playStoreUrl === undefined ? null : (
        <Button asChild variant="white">
          <a href={playStoreUrl}>{labels.playStore}</a>
        </Button>
      )}
    </div>
  );
}
