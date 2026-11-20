import Link from 'next/link';

import { routes } from '@/app/lib/routes';

import { SessionButton } from '@/app/ui/auth/session-button';
import { SiteMenu } from '@/app/ui/layout/site-menu';
import { Logo } from '@/app/ui/logo';
import { NotificationsBell } from '@/app/ui/notifications/notifications-bell';

type SiteBarProps = {
  /** Where the bar leads: the landing's sections (`/#planes`). */
  links: { href: string; label: string }[];
  /** Already translated on the server (`landing.nav.*`, `common.homeLabel`). */
  labels: { home: string; nav: string; openMenu: string; closeMenu: string };
};

/*
 * The landing's bar at rest, for the site's other pages drawn on the blue
 * (the public profile, Figma 2026-11-16): a white pill floating over the
 * page with the wordmark, the landing's sections beside it, the bell, and
 * «Entrar» or the account at the end — the phone's menu holding the links
 * and the session. It neither docks nor searches: that is the landing's
 * own (landing-bar.tsx). It shares the landing bar's transition name, so
 * going from one to the other the bar holds still (AGENTS.md §8.13).
 */
export function SiteBar({ links, labels }: SiteBarProps) {
  return (
    <header className="relative z-20 px-gutter pt-3 vt-landing-header sm:pt-5 print:hidden">
      <div className="relative mx-auto flex max-w-landing items-center gap-4 rounded-2xl bg-pure-white py-2.5 pr-3 pl-5 shadow-md lg:py-4 lg:pr-7 lg:pl-8">
        <Link
          href={routes.home()}
          aria-label={labels.home}
          className="inline-flex min-h-touch shrink-0 items-center rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <Logo preload className="h-7 w-auto lg:h-9" />
        </Link>
        <nav aria-label={labels.nav} className="hidden lg:ml-8 lg:block">
          <ul className="flex items-center gap-10">
            {links.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  className="inline-flex min-h-touch items-center rounded-sm text-body-xs font-medium whitespace-nowrap text-pure-black transition-colors duration-fast ease-house outline-none hover:text-primary focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <div className="ml-auto flex shrink-0 items-center gap-2">
          {/* The bell for whoever is signed in; «Entrar», or the account,
              from tablets up: the phone menu holds it. */}
          <NotificationsBell />
          <SessionButton className="hidden sm:inline-flex" />
          <SiteMenu
            links={links}
            labels={{ open: labels.openMenu, close: labels.closeMenu }}
          />
        </div>
      </div>
    </header>
  );
}
