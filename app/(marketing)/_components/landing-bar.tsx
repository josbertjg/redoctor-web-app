'use client';

import { useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { ReactNode, RefObject } from 'react';

import Link from 'next/link';

import { routes } from '@/app/lib/routes';
import { cn } from '@/app/lib/utils';

import { SessionButton } from '@/app/ui/auth/session-button';
import { Logo } from '@/app/ui/logo';
import { houseTransition, m, useReducedMotion } from '@/app/ui/motion';
import { NotificationsBell } from '@/app/ui/notifications/notifications-bell';

import { AfterSplash } from './after-splash';
import { beats } from './choreography';
import { LandingNav } from './landing-nav';
import { heroSearchId } from '../_data/landing-content';

type LandingBarProps = {
  waitForSplash: boolean;
  links: { href: string; label: string }[];
  /** Already translated on the server (i18n: `landing.nav.*`, `common.*`). */
  labels: {
    nav: string;
    home: string;
    openMenu: string;
    closeMenu: string;
  };
  /** The bar's own search, rendered on the server (search-bar.tsx). */
  search: ReactNode;
};

/*
 * The landing's bar (Figma): a white pill that floats over the page and
 * stays while scrolling, with the logo, the section links beside it and
 * «Entrar» at the end. It slides down into place when the page starts
 * (after the splash, when there is one); the sticky box that holds it is
 * there from the first frame, so nothing below moves.
 *
 * Once the hero's search bar slips under it, the bar docks (owner's
 * request, 2026-10-08, no mockup): it rises to the top edge and widens to
 * the whole screen, keeping its height; the wordmark narrows to the «Re»
 * mark; a search of its own opens between the mark and the links, taking
 * the room there is, and the links slide over to «Entrar». Everything
 * moves on the house curve, 300 ms, through CSS on `data-docked` — the
 * logo's width through Motion, measured from the two marks. Scrolling
 * back up undoes it the same way.
 */
export function LandingBar({
  waitForSplash,
  links,
  labels,
  search,
}: LandingBarProps) {
  const bar = useRef<HTMLElement>(null);
  const docked = useDocked(bar);

  return (
    <header
      ref={bar}
      data-docked={docked || undefined}
      className="group/bar sticky top-3 z-20 px-gutter transition-[top,padding] duration-slow ease-house data-docked:top-0 data-docked:px-0 sm:top-5"
    >
      <AfterSplash
        waitForSplash={waitForSplash}
        from="top"
        delay={beats.bar}
        className="relative mx-auto flex max-w-landing items-center gap-4 rounded-2xl bg-pure-white py-2.5 pr-3 pl-5 shadow-md transition-[max-width,border-radius,padding] duration-slow ease-house group-data-docked/bar:max-w-[100vw] group-data-docked/bar:rounded-none group-data-docked/bar:px-gutter lg:py-4 lg:pr-7 lg:pl-8 lg:group-data-docked/bar:px-8"
      >
        <LogoSwitch docked={docked} label={labels.home} />
        {/* No room at rest; once docked, all the free room, which pushes
            the links over to «Entrar», with the search pill centred in it.
            Inert until then, so nothing hidden can take focus. */}
        <div
          inert={!docked || undefined}
          className="flex min-w-0 shrink grow-0 basis-0 justify-center overflow-hidden transition-[flex-grow] duration-slow ease-house group-data-docked/bar:grow"
        >
          {search}
        </div>
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
          {/* The bell at every width, for whoever is signed in; «Entrar», or
              the account, from tablets up: the phone menu holds it. */}
          <NotificationsBell />
          <SessionButton className="hidden sm:inline-flex" />
          <LandingNav
            links={links}
            labels={{ open: labels.openMenu, close: labels.closeMenu }}
          />
        </div>
      </AfterSplash>
    </header>
  );
}

/**
 * Whether the hero's search bar has slipped under the bar. An external
 * store over the layout: the server and the hydrating render say `false`,
 * the truth follows before paint, and an IntersectionObserver watching the
 * hero's search against the strip under the bar's bottom edge keeps it
 * current.
 *
 * The line is the bar's bottom edge *at rest*: docked, the bar rises to the
 * top, and a line measured then would move with it (the 20 px jump after
 * the first undock). The store is made once, so it is not subscribed again
 * — and the bar measured again — on every render.
 */
function useDocked(bar: RefObject<HTMLElement | null>): boolean {
  const [store] = useState(() => {
    let restBottom: number | null = null;
    const measure = () => {
      const box = bar.current;
      if (box && !box.hasAttribute('data-docked')) {
        restBottom = box.getBoundingClientRect().bottom;
      }
      return restBottom;
    };
    return {
      subscribe: (onChange: () => void) => {
        const search = document.getElementById(heroSearchId);
        if (!search || typeof IntersectionObserver === 'undefined') {
          return () => undefined;
        }
        let observer: IntersectionObserver | undefined;
        const observe = () => {
          observer?.disconnect();
          const line = measure() ?? 0;
          observer = new IntersectionObserver(onChange, {
            rootMargin: `-${String(Math.round(line))}px 0px 0px 0px`,
            threshold: 0,
          });
          observer.observe(search);
        };
        const onResize = () => {
          observe();
          onChange();
        };
        observe();
        window.addEventListener('resize', onResize);
        return () => {
          observer?.disconnect();
          window.removeEventListener('resize', onResize);
        };
      },
      getSnapshot: () => {
        const search = document.getElementById(heroSearchId);
        const line = restBottom ?? measure();
        if (!search || line === null) return false;
        return search.getBoundingClientRect().bottom <= line;
      },
    };
  });
  return useSyncExternalStore(store.subscribe, store.getSnapshot, () => false);
}

/*
 * The logo: the wordmark at rest, the «Re» mark once docked. The wordmark
 * is in the flow, so the HTML shows it with no JavaScript; the mark lies
 * over it, out of sight. Docking narrows the box to the mark's width and
 * cross-fades the two; the widths are measured from the images, so a
 * height change at a breakpoint is followed.
 */
function LogoSwitch({ docked, label }: { docked: boolean; label: string }) {
  const reduced = useReducedMotion();
  const box = useRef<HTMLSpanElement>(null);
  const [widths, setWidths] = useState<{ word: number; mark: number }>();

  useLayoutEffect(() => {
    const element = box.current;
    if (!element) return;
    const [word, mark] = element.querySelectorAll('img');
    if (!word || !mark) return;
    const measure = () => {
      setWidths({
        word: word.getBoundingClientRect().width,
        mark: mark.getBoundingClientRect().width,
      });
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(word);
    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <Link
      href={routes.home()}
      aria-label={label}
      className="inline-flex min-h-touch shrink-0 items-center rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <m.span
        ref={box}
        className="relative block h-7 overflow-hidden lg:h-9"
        {...(widths
          ? { animate: { width: docked ? widths.mark : widths.word } }
          : {})}
        transition={reduced ? { duration: 0 } : houseTransition('slow')}
      >
        <Logo
          preload
          className={cn(
            'h-full w-auto max-w-none transition-opacity duration-slow ease-house',
            docked && 'opacity-0',
          )}
        />
        <Logo
          tone="mark"
          className={cn(
            'absolute top-0 left-0 h-full w-auto max-w-none transition-opacity duration-slow ease-house',
            !docked && 'opacity-0',
          )}
        />
      </m.span>
    </Link>
  );
}
