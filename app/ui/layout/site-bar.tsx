import type { ReactNode } from 'react';

import Link from 'next/link';

import { routes } from '@/app/lib/routes';

import { SessionButton } from '@/app/ui/auth/session-button';
import { Logo } from '@/app/ui/logo';
import { NotificationsBell } from '@/app/ui/notifications/notifications-bell';

type SiteBarProps = {
  /** Already translated on the server (`common.homeLabel`). */
  homeLabel: string;
  /** The bar's specialist search (`SearchBar` with `variant="bar"`). */
  search: ReactNode;
};

/*
 * The site's bar on the blue (the public profile): a white pill floating
 * over the page with the logo (compact mark on phones, wordmark from
 * tablets up), the specialist search box carrying the active search in
 * hand, the bell, and «Entrar» or the account at the end. It
 * shares the landing bar's transition name, so going from one to the
 * other the bar holds still (AGENTS.md §8.13).
 */
export function SiteBar({ homeLabel, search }: SiteBarProps) {
  return (
    <header className="relative z-20 px-gutter pt-3 vt-landing-header sm:pt-5 print:hidden">
      <div className="relative mx-auto flex max-w-landing items-center gap-2.5 rounded-2xl bg-pure-white px-3 py-2.5 shadow-md sm:gap-4 sm:pr-3 sm:pl-5 lg:py-4 lg:pr-7 lg:pl-8">
        <Link
          href={routes.home()}
          prefetch={false}
          aria-label={homeLabel}
          className="-mx-1 inline-flex min-h-touch min-w-touch shrink-0 items-center justify-center rounded-lg px-1 outline-none focus-visible:ring-3 focus-visible:ring-ring/50 sm:min-w-0 sm:justify-start"
        >
          <Logo tone="mark" className="h-7 w-auto sm:hidden" />
          <Logo preload className="hidden h-7 w-auto sm:block lg:h-9" />
        </Link>
        {search}
        <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
          <NotificationsBell />
          <SessionButton />
        </div>
      </div>
    </header>
  );
}
