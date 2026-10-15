import type { MetadataRoute } from 'next';

import { connection } from 'next/server';

import { listPublicProfileIds } from '@/app/lib/data/public-profiles';
import { routes } from '@/app/lib/routes';
import { absoluteUrl } from '@/app/lib/site';

/*
 * The public pages: the landing, the legal pages (M10) and every public
 * profile (M8) the API lists — the one way a crawler finds a profile, since
 * a search is not indexed (AGENTS.md §4). Built per request, never at build
 * time (`connection()`): the profiles come from the Data Cache a day at a
 * time (app/lib/data/public-profiles.ts), and a build calls no API.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  await connection();
  const profiles = await listPublicProfileIds();

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
    ...profiles.map((specialistId) => ({
      url: absoluteUrl(routes.specialist(specialistId)),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    })),
  ];
}
