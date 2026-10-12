import { useId } from 'react';

import Call from '@material-symbols/svg-400/rounded/call.svg?svgr';
import Chat from '@material-symbols/svg-400/rounded/chat.svg?svgr';
import Mobile from '@material-symbols/svg-400/rounded/mobile.svg?svgr';
import { useTranslations } from 'next-intl';

import { appStoreUrl, playStoreUrl } from '@/app/lib/deep-links';
import { publicEnv } from '@/app/lib/public-env';
import { supportChannels, type SupportChannels } from '@/app/lib/support';
import { cn } from '@/app/lib/utils';

import { StoreBadges } from '@/app/ui/app-bridge/store-badges';
import { Button } from '@/app/ui/button';
import { Icon } from '@/app/ui/icons';

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
  /** Redoctor's support lines; from the environment by default. */
  support?: SupportChannels;
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
  const channels = support ?? supportChannels(t('whatsappMessage'));
  const Heading = headingLevel === 1 ? 'h1' : 'h2';
  const SubHeading = headingLevel === 1 ? 'h2' : 'h3';

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
        <div className="mt-6 flex flex-col gap-5 text-left">
          {channels.whatsapp === null ? null : (
            <div className="flex flex-col gap-2">
              <SubHeading className="text-title-sm text-text-primary">
                {t('writeSection')}
              </SubHeading>
              <Button asChild block shape="soft">
                <a
                  href={channels.whatsapp.href}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Icon icon={Chat} size={20} />
                  {t('whatsapp')}
                </a>
              </Button>
            </div>
          )}
          {channels.phones.length === 0 ? null : (
            <div className="flex flex-col gap-2">
              <SubHeading className="text-title-sm text-text-primary">
                {t('callSection')}
              </SubHeading>
              {channels.phones.map((phone) => (
                <Button
                  key={phone.href}
                  asChild
                  block
                  shape="soft"
                  variant="white"
                >
                  <a href={phone.href}>
                    <Icon icon={Call} size={20} />
                    {t('call', { label: phone.label, number: phone.number })}
                  </a>
                </Button>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
