import type { MetadataRoute } from 'next';

import { absoluteUrl, isIndexable } from '@/app/lib/site';

/*
 * Production lets crawlers in except where a person's data lives (the
 * patient area, the specialist's panel and its payment) and where a page
 * only opens the app. Those pages are also noindex. Previews and local
 * builds are closed.
 *
 * The links whose URL carries a credential or a person's appointment (/i,
 * /a, the opt-out, and sign-in and sign-up, whose `redirect` can name them)
 * are NOT disallowed here: a crawler that may not fetch a page never reads its
 * noindex, and Google may still list the bare URL — token included — if the
 * link appears somewhere public. They answer `X-Robots-Tag: noindex` instead
 * (next.config.ts).
 */
const privatePaths = ['/appointments', '/account', '/panel', '/pay', '/home/'];

export default function robots(): MetadataRoute.Robots {
  if (!isIndexable) {
    return { rules: { userAgent: '*', disallow: '/' } };
  }
  return {
    rules: { userAgent: '*', allow: '/', disallow: privatePaths },
    sitemap: absoluteUrl('/sitemap.xml'),
  };
}
