import type { ReactNode } from 'react';

import Link from 'next/link';

import { cn } from '@/app/lib/utils';

import { Logo } from '@/app/ui/logo';

type SiteHeaderProps = {
  /** Accessible name of the logo link (i18n: `common.homeLabel`). */
  homeLabel: string;
  /** `inverse` on a blue background (the public profile's header). */
  tone?: 'default' | 'inverse';
  /** Actions on the right, e.g. «Abrir en la app». */
  children?: ReactNode;
  className?: string;
};

/*
 * The slim header of utility pages (profile, bridges, 404): the logo back to
 * the home page and room for one action. The landing has its own (M9).
 */
export function SiteHeader({
  homeLabel,
  tone = 'default',
  children,
  className,
}: SiteHeaderProps) {
  return (
    <header
      className={cn(
        'mx-auto flex w-full max-w-content items-center justify-between gap-4 px-gutter py-3 print:hidden',
        // Holds still while the page under it changes (AGENTS.md §8, rule
        // 13); the profile's white-on-blue bar is another bar, and fades.
        tone === 'inverse' ? 'vt-site-header-inverse' : 'vt-site-header',
        className,
      )}
    >
      <Link
        href="/"
        aria-label={homeLabel}
        className={cn(
          '-mx-2 inline-flex min-h-touch items-center rounded-lg px-2 outline-none focus-visible:ring-3',
          tone === 'inverse'
            ? 'focus-visible:ring-white-50/70'
            : 'focus-visible:ring-ring/50',
        )}
      >
        <Logo preload tone={tone === 'inverse' ? 'inverse' : 'brand'} />
      </Link>
      {children}
    </header>
  );
}
