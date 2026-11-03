import { useId } from 'react';

import Mobile from '@material-symbols/svg-400/rounded/mobile.svg?svgr';
import { useTranslations } from 'next-intl';

import { appStoreUrl, playStoreUrl } from '@/app/lib/deep-links';
import { publicEnv } from '@/app/lib/public-env';
import { supportChannels, type SupportContact } from '@/app/lib/support';
import { cn } from '@/app/lib/utils';

import { StoreBadges } from '@/app/ui/app-bridge/store-badges';
import { Icon } from '@/app/ui/icons';
import { SupportLinks } from '@/app/ui/support/support-links';

import { StoreQr } from './store-qr';

type StoreListings = {
  appStore?: string | undefined;
  playStore?: string | undefined;
};

type AppAccessProps = {
  /** `join`: a specialist with no account yet; `finish`: one whose sign-up is still open. */
  variant: 'join' | 'finish';
  headingLevel?: 1 | 2;
  /** The published listings; from the environment by default (empty in the pilot). */
  stores?: StoreListings;
  /** Redoctor's support lines, as the server read them (app/lib/data/support.ts). */
  support: SupportContact;
  className?: string;
};

/*
 * Where a specialist signs up: in the app, never on the web (owner's
 * decision, 2026-10-12). While the app is in testing, the way in is
 * support — WhatsApp or a call — who gives them access; once it is in the
 * stores, the store itself: a QR code on a computer, the store's button on
 * a phone (a phone cannot scan its own screen). Rendered on the server.
 */
export function AppAccess({
  variant,
  headingLevel = 1,
  stores,
  support,
  className,
}: AppAccessProps) {
  const t = useTranslations('appAccess');
  const bridge = useTranslations('appBridge');
  const headingId = useId();
  const listings = stores ?? {
    appStore: appStoreUrl(publicEnv.appStoreId),
    playStore: playStoreUrl(publicEnv.playStoreId),
  };
  const published =
    listings.appStore !== undefined || listings.playStore !== undefined;
  const channels = supportChannels(support, t('whatsappMessage'));
  const Heading = headingLevel === 1 ? 'h1' : 'h2';

  return (
    <section
      aria-labelledby={headingId}
      className={cn(
        'w-full max-w-md animate-fade-up rounded-2xl bg-pure-white p-6 text-center shadow-md sm:p-8',
        className,
      )}
    >
      <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-info-light text-primary">
        <Icon icon={Mobile} className="size-8" />
      </span>
      <Heading
        id={headingId}
        className="mt-4 text-headline-sm text-text-primary"
      >
        {t(`${variant}.title`)}
      </Heading>
      <p className="mt-2 text-body-md text-text-secondary">
        {t(published ? `${variant}.store` : `${variant}.testing`)}
      </p>

      {published ? (
        <div className="mt-6 flex flex-col items-center gap-4">
          <div className="flex flex-wrap justify-center gap-6 touch:hidden">
            {listings.appStore === undefined ? null : (
              <figure className="flex flex-col items-center gap-2">
                <StoreQr
                  url={listings.appStore}
                  label={t('qrLabel', { store: t('appStore') })}
                />
                <figcaption className="text-label-md text-text-secondary">
                  {t('appStore')}
                </figcaption>
              </figure>
            )}
            {listings.playStore === undefined ? null : (
              <figure className="flex flex-col items-center gap-2">
                <StoreQr
                  url={listings.playStore}
                  label={t('qrLabel', { store: t('playStore') })}
                />
                <figcaption className="text-label-md text-text-secondary">
                  {t('playStore')}
                </figcaption>
              </figure>
            )}
          </div>
          <p className="text-body-sm text-text-secondary touch:hidden">
            {t('scan')}
          </p>
          <StoreBadges
            appStoreUrl={listings.appStore}
            playStoreUrl={listings.playStore}
            labels={{
              appStore: bridge('appStore'),
              playStore: bridge('playStore'),
            }}
            className="w-full"
          />
        </div>
      ) : (
        <SupportLinks
          channels={channels}
          headingLevel={headingLevel === 1 ? 2 : 3}
          className="mt-6 text-left"
        />
      )}
    </section>
  );
}
