import { useEffect } from 'react';

import type { LinkKind } from '@/app/lib/analytics/events';
import { track } from '@/app/lib/analytics/track';
import { originParameter, parseLinkOrigin } from '@/app/lib/deep-links';

/**
 * Reads the link's `?origin=` once, tags the funnel with it
 * (`web_link_opened`) and takes it off the address bar, so the tag never
 * travels further if the person copies the link (AGENTS.md §6). A value that
 * is not a known origin is removed without being sent anywhere.
 */
export function useLinkOrigin(link: LinkKind): void {
  useEffect(() => {
    const url = new URL(window.location.href);
    const raw = url.searchParams.get(originParameter);
    if (raw === null) return;

    url.searchParams.delete(originParameter);
    // Next.js syncs its router with replaceState calls through the method it
    // patches — in its own effect, which on a first load runs after this one.
    // Waiting a tick lets it learn the clean URL (and keep its state for this
    // history entry, which Back needs) instead of being bypassed.
    const timer = window.setTimeout(() => {
      const origin = parseLinkOrigin(raw);
      if (origin) track('web_link_opened', { origin, link });
      window.history.replaceState(
        null,
        '',
        url.pathname + url.search + url.hash,
      );
    }, 0);
    return () => {
      window.clearTimeout(timer);
    };
  }, [link]);
}
