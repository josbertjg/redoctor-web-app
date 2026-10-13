import { useTranslations } from 'next-intl';

import { appVersion } from '@/app/lib/app-version';
import { routes } from '@/app/lib/routes';

import { Logo } from '@/app/ui/logo';

import { footerContacts } from '../_data/landing-content';

const linkClass =
  'rounded-sm underline-offset-4 transition-colors duration-fast ease-house outline-none hover:underline focus-visible:ring-3 focus-visible:ring-white-50/70';

/*
 * The footer (Figma): the brand line, the contact channels and the legal
 * links on the darker blue, and at the foot the web's version (the
 * owner's ask, 2026-10-13: it tells which one is live), written as the
 * app writes its own. The channels are the mockup's placeholders until
 * REDOC-357; the legal pages arrive with M10.
 */
export function LandingFooter() {
  const t = useTranslations('landing.footer');
  const tRoot = useTranslations();
  const year = new Date().getFullYear();

  return (
    <footer className="bg-blue-600 px-gutter py-12 text-pure-white lg:py-14">
      <div className="mx-auto max-w-landing">
        <Logo tone="inverse" className="h-5" />
        <p className="mt-3 text-body-xxs font-medium">{t('tagline')}</p>
        <hr className="my-8 border-blue-300" />
        <p className="text-body-xxs font-medium">{t('contact')}</p>
        <ul className="mt-2 flex flex-col gap-2 text-title-lg font-bold sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-5 sm:text-subtitle-m">
          <li>
            <a href={`mailto:${footerContacts.email}`} className={linkClass}>
              {footerContacts.email}
            </a>
          </li>
          <li
            aria-hidden="true"
            className="hidden size-1.5 rounded-full bg-pure-white sm:block"
          />
          <li>
            <a
              href={`tel:${footerContacts.phone.replace(/\D/g, '')}`}
              className={linkClass}
            >
              {footerContacts.phone}
            </a>
          </li>
          <li
            aria-hidden="true"
            className="hidden size-1.5 rounded-full bg-pure-white sm:block"
          />
          <li>
            <a
              href={`https://www.instagram.com/${footerContacts.instagram}`}
              target="_blank"
              rel="noopener noreferrer"
              className={linkClass}
            >
              @{footerContacts.instagram}
            </a>
          </li>
        </ul>
        <hr className="my-8 border-blue-300" />
        <nav aria-label={t('legalLabel')}>
          <ul className="flex flex-wrap gap-x-6 gap-y-2 text-body-xxs font-medium">
            <li>
              <a href={routes.terms()} className={linkClass}>
                {t('terms')}
              </a>
            </li>
            <li>
              <a href={routes.privacy()} className={linkClass}>
                {t('privacy')}
              </a>
            </li>
            <li>
              <a href={routes.deleteAccount()} className={linkClass}>
                {t('deleteAccount')}
              </a>
            </li>
          </ul>
        </nav>
        <div className="mt-10 flex flex-col gap-1 text-body-xxxs text-blue-100 sm:flex-row sm:items-center sm:justify-between">
          <p>{t('copyright', { year })}</p>
          <p>{tRoot('version', { version: appVersion })}</p>
        </div>
      </div>
    </footer>
  );
}
