'use client';

import CloudOff from '@material-symbols/svg-400/rounded/cloud_off.svg?svgr';
import { useTranslations } from 'next-intl';

import { Button } from '@/app/ui/button';
import { Icon } from '@/app/ui/icons';

type PanelCardErrorProps = {
  /** What could not be read, already translated. */
  message: string;
  retrying: boolean;
  onRetry: () => void;
};

/*
 * A card of the panel's home whose data could not be read: it says so in
 * its own place and offers to try again, while the rest of the home stands.
 */
export function PanelCardError({
  message,
  retrying,
  onRetry,
}: PanelCardErrorProps) {
  const t = useTranslations();

  return (
    <div
      role="status"
      className="flex animate-fade-in flex-col items-start gap-3 rounded-2xl bg-pure-white p-5 shadow-md sm:flex-row sm:items-center"
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
