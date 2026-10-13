'use client';

import Link from 'next/link';

import ShieldPerson from '@material-symbols/svg-400/rounded/admin_panel_settings.svg?svgr';
import CloudOff from '@material-symbols/svg-400/rounded/cloud_off.svg?svgr';
import { useTranslations } from 'next-intl';

import { isApiError } from '@/app/lib/api/errors';
import { routes } from '@/app/lib/routes';

import { Button } from '@/app/ui/button';
import { EmptyState } from '@/app/ui/empty-state';

type SubscriptionLoadErrorProps = {
  error: unknown;
  retrying: boolean;
  onRetry: () => void;
};

/*
 * The subscription could not be read, on «Mi suscripción» and on the
 * payment page alike. An account the billing API does not take for a
 * specialist's (an admin's, 403) is told the page is not for it; anything
 * else offers to try again.
 */
export function SubscriptionLoadError({
  error,
  retrying,
  onRetry,
}: SubscriptionLoadErrorProps) {
  const t = useTranslations('billing.mySubscription');
  const tRoot = useTranslations();

  if (isApiError(error) && error.status === 403) {
    return (
      <EmptyState
        headingLevel={1}
        icon={ShieldPerson}
        title={t('forbidden.title')}
        description={t('forbidden.description')}
        action={
          <Button asChild shape="soft">
            <Link href={routes.specialistHome()}>{t('forbidden.action')}</Link>
          </Button>
        }
      />
    );
  }

  return (
    <EmptyState
      tone="error"
      headingLevel={1}
      icon={CloudOff}
      title={t('loadErrorTitle')}
      description={t('loadErrorDescription')}
      action={
        <Button shape="soft" loading={retrying} onClick={onRetry}>
          {tRoot('retry')}
        </Button>
      }
    />
  );
}
