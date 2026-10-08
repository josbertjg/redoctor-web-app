import Link from 'next/link';

import { useTranslations } from 'next-intl';

import { routes } from '@/app/lib/routes';

import { Button } from '@/app/ui/button';
import { Logo } from '@/app/ui/logo';

import { AfterSplash } from './after-splash';
import { beats } from './choreography';
import { LandingNav } from './landing-nav';
import { landingSections } from '../_data/landing-content';

/*
 * The landing's bar (Figma): a white pill that floats over the page and
 * stays while scrolling, with the logo, the section links and «Entrar». It
 * slides down into place when the page starts (after the splash, when there
 * is one); the sticky box that holds it is there from the first frame, so
 * nothing below moves.
 */
export function LandingHeader({ waitForSplash }: { waitForSplash: boolean }) {
  const t = useTranslations('landing.nav');
  const common = useTranslations('common');
  const links = [
    { href: `#${landingSections.howItWorks}`, label: t('specialists') },
    { href: `#${landingSections.pricing}`, label: t('plans') },
    { href: `#${landingSections.faq}`, label: t('faq') },
  ];

  return (
    <header className="sticky top-3 z-20 px-gutter sm:top-5">
      <AfterSplash
        waitForSplash={waitForSplash}
        from="top"
        delay={beats.bar}
        className="relative mx-auto flex max-w-landing items-center justify-between gap-4 rounded-2xl bg-pure-white py-2.5 pr-3 pl-5 shadow-md lg:py-4 lg:pr-7 lg:pl-8"
      >
        <Link
          href={routes.home()}
          aria-label={common('homeLabel')}
          className="inline-flex min-h-touch items-center rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <Logo preload className="h-7 lg:h-9" />
        </Link>
        <nav aria-label={t('label')} className="hidden lg:block">
          <ul className="flex items-center gap-12">
            {links.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  className="inline-flex min-h-touch items-center rounded-sm text-body-xs font-medium text-pure-black transition-colors duration-fast ease-house outline-none hover:text-primary focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <div className="flex items-center gap-2">
          {/* TODO(M2): routes.signIn() once /entrar exists. */}
          <Button size="small" shape="soft" className="hidden sm:inline-flex">
            {t('signIn')}
          </Button>
          <LandingNav
            links={links}
            labels={{
              open: t('openMenu'),
              close: t('closeMenu'),
              signIn: t('signIn'),
            }}
          />
        </div>
      </AfterSplash>
    </header>
  );
}
