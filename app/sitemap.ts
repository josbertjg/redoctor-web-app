import type { MetadataRoute } from 'next';

import { routes } from '@/app/lib/routes';
import { absoluteUrl } from '@/app/lib/site';

/*
 * Public pages only: the landing and the legal pages (M10). Specialist
 * profiles have no listing endpoint yet, and a search is not indexed.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: absoluteUrl(routes.home()),
      changeFrequency: 'weekly',
      priority: 1,
    },
    ...[routes.terms(), routes.privacy(), routes.deleteAccount()].map(
      (path) => ({
        url: absoluteUrl(path),
        changeFrequency: 'yearly' as const,
        priority: 0.3,
      }),
    ),
  ];
}
