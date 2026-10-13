import { env } from './env';

/** The canonical origin: links, Open Graph tags and sitemaps are built from it. */
export const siteUrl = new URL(env.NEXT_PUBLIC_SITE_URL);

/** An absolute URL on the canonical origin for a site path. */
export function absoluteUrl(path: string): string {
  return new URL(path, siteUrl).toString();
}

/** Only production is indexed; previews and local builds stay out of search. */
export const isIndexable = env.NEXT_PUBLIC_APP_ENV === 'production';

/**
 * The Open Graph tags of a page that names no one — a private link (/i, /a)
 * previews as the site's own card, with the page's words. A page that sets
 * `openGraph` replaces the root's whole object, image included, so it is
 * rebuilt here whole (the image is the root's app/opengraph-image.tsx).
 */
export function brandOpenGraph(words: {
  title: string;
  description: string;
  siteName: string;
  imageAlt: string;
}) {
  return {
    type: 'website' as const,
    locale: 'es_VE',
    siteName: words.siteName,
    title: words.title,
    description: words.description,
    images: [
      {
        url: '/opengraph-image',
        width: 1200,
        height: 630,
        alt: words.imageAlt,
      },
    ],
  };
}
