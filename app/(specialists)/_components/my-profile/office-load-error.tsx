'use client';

import CloudOff from '@material-symbols/svg-400/rounded/cloud_off.svg?svgr';
import { useTranslations } from 'next-intl';

import { Button } from '@/app/ui/button';
import { Icon } from '@/app/ui/icons';

/*
 * One office's rates or hours that could not be read: said in their place,
 * with the way to try again, while the rest of the profile stands.
 */
export function OfficeLoadError({
  message,
  retrying,
  onRetry,
}: {
  /** What could not be read, already translated. */
  message: string;
  retrying: boolean;
  onRetry: () => void;
}) {
  const t = useTranslations();

  return (
    <div
      role="status"
      className="flex animate-fade-in flex-col items-start gap-3 rounded-xl border border-divider p-4 sm:flex-row sm:items-center"
    >
      <p className="flex flex-1 items-center gap-2 text-body-md text-text-secondary">
        <Icon icon={CloudOff} size={20} className="shrink-0 text-error" />
        {message}
      </p>
      <Button
        size="small"
        variant="white"
        shape="soft"
        loading={retrying}
        onClick={onRetry}
      >
        {t('retry')}
      </Button>
    </div>
  );
}
