'use client';

import Link from 'next/link';

import Share from '@material-symbols/svg-400/rounded/share.svg?svgr';
import Visibility from '@material-symbols/svg-400/rounded/visibility.svg?svgr';
import { useTranslations } from 'next-intl';

import { copyText } from '@/app/lib/clipboard';
import { publicEnv } from '@/app/lib/public-env';
import { routes } from '@/app/lib/routes';

import { Button } from '@/app/ui/button';
import { Icon } from '@/app/ui/icons';
import { toast } from '@/app/ui/toast';

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
          <ShareProfileButton
            url={new URL(
              routes.specialist(specialistId),
              publicEnv.siteUrl,
            ).toString()}
          />
        </div>
      )}
    </header>
  );
}

/*
 * The bare link to the public profile, as the app shares it — no text, no
 * channel tag: the phone's share sheet where the browser has one, and the
 * clipboard otherwise (or when the sheet itself fails).
 */
function ShareProfileButton({ url }: { url: string }) {
  const t = useTranslations();

  const share = async () => {
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ url });
        return;
      } catch (error) {
        // The person closed the sheet: nothing to say.
        if (error instanceof DOMException && error.name === 'AbortError') {
          return;
        }
      }
    }
    if (await copyText(url)) toast.success(t('profile.share.copied'));
    else toast.error(t('profile.share.copyFailed'));
  };

  return (
    <Button
      variant="white"
      size="small"
      shape="soft"
      onClick={() => {
        void share();
      }}
    >
      <Icon icon={Share} size={18} />
      {t('search.shareSpecialistTooltip')}
    </Button>
  );
}
