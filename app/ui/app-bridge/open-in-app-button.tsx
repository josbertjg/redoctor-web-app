'use client';

import { useEffect, useState } from 'react';

import { useTranslations } from 'next-intl';

import { appBridgeConfig } from '@/app/lib/app-bridge-config';
import { appBridgeLinks } from '@/app/lib/deep-links';
import { publicEnv } from '@/app/lib/public-env';
import { scheduleStoreRedirect } from '@/app/lib/store-redirect';
import { cn } from '@/app/lib/utils';

import { StoreBadges } from '@/app/ui/app-bridge/store-badges';
import { Button } from '@/app/ui/button';

import { useDevice } from '@/app/hooks/use-device';

type OpenInAppButtonProps = {
  /** The site path the app should open: the page's own (`routes.*`). */
  path: string;
  /** How the link reached the person, for the note shown on a computer. */
  source?: 'link' | 'email';
  /** On a computer: the note to open it from the phone, or nothing (a page that already does what the app would). */
  desktop?: 'note' | 'none';
  className?: string;
};

/*
 * «Abrir en la app» (AGENTS.md §6): the page's URL with the app's scheme, or
 * an intent:// link on Android Chrome so a missing app falls back to this
 * page. Always a button, never an automatic redirect: iOS asks first and
 * Chrome blocks schemes without a tap. On a computer there is no app: a note
 * says to open it from the phone. Reads nothing from the API, no session.
 *
 * The device is only known in the browser, so the button fades in right
 * after hydration in a space already reserved for it.
 */
export function OpenInAppButton({
  path,
  source = 'link',
  desktop = 'note',
  className,
}: OpenInAppButtonProps) {
  const t = useTranslations('appBridge');
  const device = useDevice();
  const [appChosen, setAppChosen] = useState(false);

  const links =
    device === null
      ? null
      : appBridgeLinks(
          new URL(path, publicEnv.siteUrl).toString(),
          device,
          appBridgeConfig,
        );
  const storeRedirect = links?.storeRedirect;
  const onComputer = links !== null && links.openApp === undefined;

  useEffect(() => {
    if (storeRedirect === undefined || appChosen) return;
    return scheduleStoreRedirect(storeRedirect);
  }, [storeRedirect, appChosen]);

  if (onComputer && desktop === 'none') return null;

  return (
    <div
      className={cn(
        'flex min-h-control-lg w-full flex-col items-stretch justify-center gap-3 sm:w-auto sm:items-center',
        className,
      )}
    >
      {links === null ? null : links.openApp === undefined ? (
        <p className="animate-fade-in text-body-md text-text-secondary">
          {t(`desktopNote.${source}`)}
        </p>
      ) : (
        <Button asChild block className="animate-fade-in sm:w-auto">
          <a
            href={links.openApp}
            onClick={() => {
              setAppChosen(true);
            }}
          >
            {t('openInApp')}
          </a>
        </Button>
      )}
      {links === null ? null : (
        <StoreBadges
          appStoreUrl={links.appStore}
          playStoreUrl={links.playStore}
          labels={{ appStore: t('appStore'), playStore: t('playStore') }}
          className="animate-fade-in"
        />
      )}
    </div>
  );
}
