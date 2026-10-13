'use client';

import Link from 'next/link';

import ShieldPerson from '@material-symbols/svg-400/rounded/admin_panel_settings.svg?svgr';
import CloudOff from '@material-symbols/svg-400/rounded/cloud_off.svg?svgr';
import { useTranslations } from 'next-intl';

import { isApiError } from '@/app/lib/api/errors';
import { routes } from '@/app/lib/routes';

import { Button } from '@/app/ui/button';
import { EmptyState } from '@/app/ui/empty-state';

type PanelLoadErrorProps = {
  error: unknown;
  /** What could not be read, already translated (the title of the error). */
  title: string;
  description: string;
  retrying: boolean;
  onRetry: () => void;
  /** `1` when the error stands for the whole page; `2` under the page's own title. */
  headingLevel?: 1 | 2;
};

/*
 * A section of the panel that could not be read. An account the API does
 * not take for a specialist's (an admin's, 403) is told the section is not
 * for it, with the way back to the panel; anything else offers to try again.
 */
export function PanelLoadError({
  error,
  title,
  description,
  retrying,
  onRetry,
  headingLevel = 2,
}: PanelLoadErrorProps) {
  const t = useTranslations();

  if (isApiError(error) && error.status === 403) {
    return (
      <EmptyState
        headingLevel={headingLevel}
        icon={ShieldPerson}
        title={t('panel.forbidden.title')}
        description={t('panel.forbidden.description')}
        action={
          <Button asChild shape="soft">
            <Link href={routes.specialistHome()}>
              {t('panel.forbidden.action')}
            </Link>
          </Button>
        }
      />
    );
  }

  return (
    <EmptyState
      tone="error"
      headingLevel={headingLevel}
      icon={CloudOff}
      title={title}
      description={description}
      action={
        <Button shape="soft" loading={retrying} onClick={onRetry}>
          {t('retry')}
        </Button>
      }
    />
  );
}
