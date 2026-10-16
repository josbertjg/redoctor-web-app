import type { NextConfig } from 'next';

import { withSentryConfig } from '@sentry/nextjs/config';
import createNextIntlPlugin from 'next-intl/plugin';

// Importing it validates every environment variable before the build starts.
import { env } from './app/lib/env';

const withNextIntl = createNextIntlPlugin('./app/lib/i18n/request.ts');

/*
 * Response headers for every path (AGENTS.md §11). The Content Security
 * Policy is not here: it carries a per-request nonce and lives in proxy.ts.
 */
const securityHeaders = [
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains',
  },
  // CSP frame-ancestors 'none' is the modern guard; this one covers old browsers.
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    // The search asks the device where it is («Usar mi ubicación», M16):
    // this origin alone may, and only when the person taps.
    value:
      'camera=(), microphone=(), geolocation=(self), payment=(), usb=(), browsing-topics=()',
  },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  typedRoutes: true,
  /*
   * Vercel bills every image its optimizer transforms (the owner's rule,
   * 2026-10-15): only our own static images, the ones shown most (the
   * landing's), go through it. A person's photo or an uploaded image is
   * always `unoptimized` (Avatar, Gallery) and SVGs never are. So the
   * optimizer takes static imports alone — hashed, cached for good — and
   * nothing remote: a request for any other image, ours or anyone's,
   * answers 400 instead of spending the quota. Few widths, one format and
   * one quality (Next's defaults: WebP, 75) keep the variants to a handful;
   * no image of ours is wider than 1920 px.
   */
  images: {
    localPatterns: [{ pathname: '/_next/static/media/**', search: '' }],
    remotePatterns: [],
    deviceSizes: [640, 828, 1080, 1200, 1920],
  },
  turbopack: {
    rules: {
      // `import Icon from '…/name.svg?svgr'` → a React component (app/ui/icons.tsx).
      '*.svg': {
        condition: { query: '?svgr' },
        loaders: [
          {
            loader: '@svgr/webpack',
            options: { icon: true, svgProps: { fill: 'currentColor' } },
          },
        ],
        as: '*.js',
      },
    },
  },
  /*
   * Dev-only proxy (AGENTS.md §4): until the API's CORS allows the web
   * (REDOC-362), the browser calls `/api-proxy/*` in `next dev` and Next
   * forwards it (app/lib/api/client.ts). It never exists in a build.
   */
  rewrites() {
    if (process.env.NODE_ENV !== 'development') return Promise.resolve([]);
    const target = (env.API_PROXY_TARGET ?? env.NEXT_PUBLIC_API_URL).replace(
      /\/$/,
      '',
    );
    return Promise.resolve([
      { source: '/api-proxy/:path*', destination: `${target}/:path*` },
    ]);
  },
  /*
   * Paths that changed name (AGENTS.md §6): the old one answers for good, so
   * no link that was ever sent breaks. The query (a token, `?origin=`)
   * travels along, and redirects run before any page.
   */
  redirects() {
    return Promise.resolve([
      // The specialist's pages moved under /panel/ (2026-10-12).
      {
        source: '/suscripcion',
        destination: '/panel/subscription',
        permanent: true,
      },
      // The bare /agenda has its own rule: Vercel writes an empty `:path*` as
      // a trailing slash (/panel/agenda/, one hop more), `next start` not.
      { source: '/agenda', destination: '/panel/agenda', permanent: true },
      {
        source: '/agenda/:path+',
        destination: '/panel/agenda/:path+',
        permanent: true,
      },
      {
        source: '/especialidades',
        destination: '/panel/specialties',
        permanent: true,
      },
      { source: '/perfil', destination: '/panel/profile', permanent: true },
      // The daily-summary opt-out took the API's own name (REDOC-359).
      {
        source: '/resumen/baja',
        destination: '/daily-summary/unsubscribe',
        permanent: true,
      },
      // The invitation link the API builds (REDOC-255): the app's is /i/{token}.
      {
        source: '/citas/invitacion/:token',
        destination: '/i/:token',
        permanent: true,
      },
      // No rule for /panel/subscription/pay, on purpose (owner, 2026-10-13):
      // the payment's address for a few hours (v0.19.0–v0.22.0) before it
      // went back to /pay, out of the app's paths. No link that leaves the
      // web ever named it, so it answers a plain 404 (AGENTS.md §6).
    ]);
  },
  headers() {
    return [
      { source: '/:path*', headers: securityHeaders },
      // Links that carry a credential or an appointment are never indexed,
      // even by a crawler that reads no HTML (robots.ts lets them be fetched);
      // nor is the booking, a flow behind a session, nor a search: its
      // address says what someone looked for and from where.
      ...[
        '/i/:path*',
        '/a/:path*',
        '/book/:path*',
        '/search',
        '/api/:path*',
        '/daily-summary/:path*',
        '/sign-in',
        '/sign-up',
      ].map((source) => ({
        source,
        headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }],
      })),
      {
        // The AASA has no extension: without this it would be served as a
        // binary stream and iOS would ignore it (AGENTS.md §6).
        source: '/.well-known/apple-app-site-association',
        headers: [{ key: 'Content-Type', value: 'application/json' }],
      },
    ];
  },
};

/*
 * Sentry's build step only uploads source maps, and only when the build has
 * SENTRY_AUTH_TOKEN (CI or Vercel, never NEXT_PUBLIC_). Without it the build
 * is the same and uploads nothing. Errors reach Sentry through
 * instrumentation.ts and the error boundaries (Turbopack builds get no
 * build-time wrappers), and there is no tracing in the pilot (AGENTS.md §11).
 */
const sentryUpload = env.SENTRY_AUTH_TOKEN
  ? {
      authToken: env.SENTRY_AUTH_TOKEN,
      ...(env.SENTRY_ORG ? { org: env.SENTRY_ORG } : {}),
      ...(env.SENTRY_PROJECT ? { project: env.SENTRY_PROJECT } : {}),
    }
  : {};

export default withSentryConfig(withNextIntl(nextConfig), {
  ...sentryUpload,
  silent: !process.env.CI,
  telemetry: false,
  sourcemaps: {
    disable: !env.SENTRY_AUTH_TOKEN,
    deleteSourcemapsAfterUpload: true,
  },
  widenClientFileUpload: true,
  suppressOnRouterTransitionStartWarning: true,
});
