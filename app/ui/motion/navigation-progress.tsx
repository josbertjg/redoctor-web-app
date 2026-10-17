'use client';

import { useEffect, useRef, useState } from 'react';

import { usePathname, useSearchParams } from 'next/navigation';

import { announceNavigation } from './navigation-events';
import { readDuration } from './tokens';

/** A page that lands this fast shows no line at all. */
const SHOW_AFTER_MS = 150;
/** A navigation that never lands (the same address, a failed one) leaves no line behind. */
const GIVE_UP_AFTER_MS = 10_000;
/** Safari's own swipe back is over well within this. */
const NATIVE_TRANSITION_MS = 1000;

/**
 * A link to another page of the web, followed in this tab: what Next.js
 * navigates to without reloading.
 */
function pageLinkOf(event: MouseEvent): boolean {
  if (
    event.defaultPrevented ||
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey
  ) {
    return false;
  }
  const anchor =
    event.target instanceof Element ? event.target.closest('a[href]') : null;
  if (!(anchor instanceof HTMLAnchorElement)) return false;
  if (anchor.hasAttribute('download')) return false;
  if (anchor.target !== '' && anchor.target !== '_self') return false;
  const url = new URL(anchor.href, window.location.href);
  return (
    url.origin === window.location.origin &&
    (url.pathname !== window.location.pathname ||
      url.search !== window.location.search)
  );
}

/** The line's states, written on the element: no render of React's. */
function createLine() {
  let node: HTMLElement | null = null;
  let show: ReturnType<typeof setTimeout> | undefined;
  let giveUp: ReturnType<typeof setTimeout> | undefined;
  let settle: ReturnType<typeof setTimeout> | undefined;

  const clear = () => {
    clearTimeout(show);
    clearTimeout(giveUp);
    clearTimeout(settle);
  };
  const set = (state: 'idle' | 'loading' | 'done') => {
    if (node) node.dataset.state = state;
  };

  return {
    attach(element: HTMLElement | null) {
      node = element;
    },
    start() {
      clear();
      set('idle');
      show = setTimeout(() => {
        set('loading');
      }, SHOW_AFTER_MS);
      giveUp = setTimeout(() => {
        clear();
        set('idle');
      }, GIVE_UP_AFTER_MS);
    },
    finish() {
      const shown = node?.dataset.state === 'loading';
      clear();
      if (!shown) {
        set('idle');
        return;
      }
      // Fills the rest, then fades (page-transitions.css), then rests.
      set('done');
      settle = setTimeout(
        () => {
          set('idle');
        },
        (readDuration('fast') + readDuration('base')) * 1000,
      );
    },
    stop() {
      clear();
      node = null;
    },
  };
}

/**
 * Says a page is on its way while the server answers (AGENTS.md §8, rule
 * 13): after a tap on a link, a thin line along the top of the screen, if
 * the page takes long enough to need one — the search's own pending line,
 * for the whole web. It also tells the colour wipe when a page lands
 * (navigation-events.ts), and keeps the web's page transition out of the
 * way of Safari's own swipe back, which already animated the page.
 */
export function NavigationProgress() {
  const node = useRef<HTMLDivElement>(null);
  const [line] = useState(createLine);
  const pathname = usePathname();
  // Null outside the App Router, whatever its type says.
  const search =
    (useSearchParams() as URLSearchParams | null)?.toString() ?? '';
  const address = `${pathname}?${search}`;

  useEffect(() => {
    line.attach(node.current);
    const root = document.documentElement;
    const onClick = (event: MouseEvent) => {
      if (!pageLinkOf(event)) return;
      // A tap, not a swipe: this page's transition is the one to run.
      delete root.dataset.nativeTransition;
      line.start();
    };
    const onPopState = (event: PopStateEvent) => {
      if (
        (event as { hasUAVisualTransition?: boolean }).hasUAVisualTransition
      ) {
        root.dataset.nativeTransition = '';
      }
    };
    document.addEventListener('click', onClick, true);
    window.addEventListener('popstate', onPopState);
    return () => {
      document.removeEventListener('click', onClick, true);
      window.removeEventListener('popstate', onPopState);
      line.stop();
    };
  }, [line]);

  // The address changed: the page landed.
  useEffect(() => {
    announceNavigation();
    line.finish();
    const native = setTimeout(() => {
      delete document.documentElement.dataset.nativeTransition;
    }, NATIVE_TRANSITION_MS);
    return () => {
      clearTimeout(native);
    };
  }, [address, line]);

  return (
    <div
      ref={node}
      aria-hidden="true"
      data-state="idle"
      className="nav-progress vt-nav-progress"
    />
  );
}
