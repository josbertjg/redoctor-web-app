'use client';

import Link from 'next/link';

import Visibility from '@material-symbols/svg-400/rounded/visibility.svg?svgr';
import { useTranslations } from 'next-intl';

import { publicEnv } from '@/app/lib/public-env';
import { routes } from '@/app/lib/routes';

import { Button } from '@/app/ui/button';
import { Icon } from '@/app/ui/icons';

import { ShareLinkButton } from '../share-link-button';

/*
 * The top of «Mi perfil», as the app's: the title, and once there is a
 * profile to show, «Vista previa» (the public profile, which tells its
 * owner «Así ven tu perfil tus pacientes») and «Compartir perfil».
 */
export function ProfileHeader({
  specialistId,
}: {
  /** `null` until the specialist has a professional profile. */
  specialistId: string | null;
}) {
  const t = useTranslations();

  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex flex-col gap-1">
        <h1 className="text-headline-sm text-text-primary">
          {t('profile.title')}
        </h1>
        <p className="text-body-md text-text-secondary">
          {t('profile.description')}
        </p>
      </div>
      {specialistId === null ? null : (
        <div className="flex animate-fade-in flex-wrap gap-2">
          <Button asChild variant="white" size="small" shape="soft">
            <Link href={routes.specialist(specialistId)}>
              <Icon icon={Visibility} size={18} />
              {t('profile.preview.button')}
            </Link>
          </Button>
          <ShareLinkButton
            url={new URL(
              routes.specialist(specialistId),
              publicEnv.siteUrl,
            ).toString()}
            label={t('search.shareSpecialistTooltip')}
            copied={t('profile.share.copied')}
            size="small"
          />
        </div>
      )}
    </header>
  );
}
