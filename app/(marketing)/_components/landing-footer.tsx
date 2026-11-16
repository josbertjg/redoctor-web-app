import { Fragment, type ReactNode } from 'react';

import Link from 'next/link';

import { useTranslations } from 'next-intl';

import { appVersion } from '@/app/lib/app-version';
import { routes } from '@/app/lib/routes';
import { instagramUrl, siteContacts } from '@/app/lib/site';
import { supportChannels, type SupportContact } from '@/app/lib/support';

import { Logo } from '@/app/ui/logo';

const linkClass =
  'rounded-sm underline-offset-4 transition-colors duration-fast ease-house outline-none hover:underline focus-visible:ring-3 focus-visible:ring-white-50/70';

const contactId = 'footer-contact';

type Contact = {
  key: string;
  href: string;
  /** Opens elsewhere (WhatsApp, Instagram): a new tab. */
  external: boolean;
  content: ReactNode;
};

/*
 * The footer (Figma): the brand line, the contact channels and the legal
 * links on the darker blue, and at the foot the web's version (the
 * owner's ask, 2026-10-13: it tells which one is live), written as the
 * app writes its own. The channels are Redoctor's own (the owner's,
 * 2026-11-16): the management email, the WhatsApp and call lines an admin
 * keeps in the API (REDOC-357, read with the page; none, and no phone
 * shows) and the Instagram.
 */
export function LandingFooter({ support }: { support: SupportContact }) {
  const t = useTranslations('landing.footer');
  const tRoot = useTranslations();
  const year = new Date().getFullYear();
  // The message says nothing about the person: the link passes through wa.me.
  const channels = supportChannels(support, t('whatsappMessage'));
  const contacts: Contact[] = [
    {
      key: 'email',
      href: `mailto:${siteContacts.email}`,
      external: false,
      content: siteContacts.email,
    },
    ...channels.whatsapp.map((channel) => ({
      key: `whatsapp:${channel.number}`,
      href: channel.href,
      external: true,
      content: (
        <>
          <span className="font-medium">{t('whatsapp')}</span> {channel.number}
        </>
      ),
    })),
    ...channels.phones.map((channel) => ({
      key: `call:${channel.number}`,
      href: channel.href,
      external: false,
      content: channel.number,
    })),
    {
      key: 'instagram',
      href: instagramUrl(siteContacts.instagram),
      external: true,
      content: `@${siteContacts.instagram}`,
    },
  ];

  return (
    <footer className="bg-blue-600 px-gutter py-12 text-pure-white lg:py-14">
      <div className="mx-auto max-w-landing">
        <Logo tone="inverse" className="h-5" />
        <p className="mt-3 text-body-xxs font-medium">{t('tagline')}</p>
        <hr className="my-8 border-blue-300" />
        <p id={contactId} className="text-body-xxs font-medium">
          {t('contact')}
        </p>
        <ul
          aria-labelledby={contactId}
          className="mt-2 flex flex-col gap-2 text-title-lg font-bold sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-5 sm:text-subtitle-m"
        >
          {contacts.map((contact, index) => (
            <Fragment key={contact.key}>
              {index > 0 ? (
                <li
                  aria-hidden="true"
                  className="hidden size-1.5 rounded-full bg-pure-white sm:block"
                />
              ) : null}
              <li>
                <a
                  href={contact.href}
                  {...(contact.external
                    ? { target: '_blank', rel: 'noopener noreferrer' }
                    : {})}
                  className={linkClass}
                >
                  {contact.content}
                </a>
              </li>
            </Fragment>
          ))}
        </ul>
        <hr className="my-8 border-blue-300" />
        {/* The web's own pages: they open without reloading, with the page
            transition (AGENTS.md §8, rule 13). */}
        <nav aria-label={t('legalLabel')}>
          <ul className="flex flex-wrap gap-x-6 gap-y-2 text-body-xxs font-medium">
            <li>
              <Link href={routes.terms()} className={linkClass}>
                {t('terms')}
              </Link>
            </li>
            <li>
              <Link href={routes.privacy()} className={linkClass}>
                {t('privacy')}
              </Link>
            </li>
            <li>
              <Link href={routes.deleteAccount()} className={linkClass}>
                {t('deleteAccount')}
              </Link>
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
