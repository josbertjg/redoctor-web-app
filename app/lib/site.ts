import { env } from './env';

/** The canonical origin: links, Open Graph tags and sitemaps are built from it. */
export const siteUrl = new URL(env.NEXT_PUBLIC_SITE_URL);

/** An absolute URL on the canonical origin for a site path. */
export function absoluteUrl(path: string): string {
  return new URL(path, siteUrl).toString();
}

/** Only production is indexed; previews and local builds stay out of search. */
export const isIndexable = env.NEXT_PUBLIC_APP_ENV === 'production';
