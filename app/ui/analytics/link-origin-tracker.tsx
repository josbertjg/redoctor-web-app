'use client';

import type { LinkKind } from '@/app/lib/analytics/events';

import { useLinkOrigin } from '@/app/hooks/use-link-origin';

/*
 * Drop it in a page reached from a shared link (`/s`, `/i`, `/a`): it tags
 * the funnel with the link's `?origin=` and removes the tag from the URL.
 * Renders nothing; the page stays a Server Component.
 */
export function LinkOriginTracker({ link }: { link: LinkKind }) {
  useLinkOrigin(link);
  return null;
}
