import type { MetadataRoute } from 'next';

import { routes } from '@/app/lib/routes';
import { absoluteUrl } from '@/app/lib/site';

/*
 * Public pages only. The legal pages join when their texts exist (M10);
 * specialist profiles have no listing endpoint yet.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: absoluteUrl(routes.home()),
      changeFrequency: 'weekly',
      priority: 1,
    },
  ];
}
