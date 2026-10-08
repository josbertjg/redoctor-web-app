import type { MetadataRoute } from 'next';

import { absoluteUrl, isIndexable } from '@/app/lib/site';

/*
 * Production lets crawlers in except where a credential or a person's data
 * lives (/i, /a, the patient area, payment) and where a page only opens the
 * app. Those pages are also noindex. Previews and local builds are closed.
 */
const privatePaths = [
  '/i/',
  '/a/',
  '/citas',
  '/cuenta',
  '/entrar',
  '/pagar',
  '/resumen/',
  '/suscripcion',
  '/home/',
  '/agenda',
  '/especialidades',
  '/perfil',
];

export default function robots(): MetadataRoute.Robots {
  if (!isIndexable) {
    return { rules: { userAgent: '*', disallow: '/' } };
  }
  return {
    rules: { userAgent: '*', allow: '/', disallow: privatePaths },
    sitemap: absoluteUrl('/sitemap.xml'),
  };
}
