import { NextResponse, type NextRequest } from 'next/server';

import { env } from '@/app/lib/env';
import {
  buildContentSecurityPolicy,
  createNonce,
} from '@/app/lib/security/csp';

/*
 * Next 16's name for middleware. It does one thing: a Content Security Policy
 * with a fresh nonce per request (AGENTS.md §3, §11). Next.js reads the nonce
 * from the request's CSP header and stamps it on its own scripts. Everything
 * else (auth, redirects, i18n) lives elsewhere.
 */
export function proxy(request: NextRequest) {
  const nonce = createNonce();
  const policy = buildContentSecurityPolicy({
    nonce,
    isDevelopment: process.env.NODE_ENV === 'development',
    isSecureRequest: request.nextUrl.protocol === 'https:',
    apiUrl: env.NEXT_PUBLIC_API_URL,
    firebaseAuthDomain: env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    posthogHost: env.NEXT_PUBLIC_POSTHOG_KEY
      ? env.NEXT_PUBLIC_POSTHOG_HOST
      : undefined,
    sentryDsn: env.NEXT_PUBLIC_SENTRY_DSN,
    googleMaps: env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY !== undefined,
  });

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('Content-Security-Policy', policy);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set('Content-Security-Policy', policy);
  return response;
}

export const config = {
  matcher: [
    {
      /*
       * Pages only. Never /.well-known (the app's link files must be served
       * untouched), static files, images or metadata files with an extension.
       */
      source:
        '/((?!_next/static|_next/image|\\.well-known/|.*\\.(?:ico|png|jpg|jpeg|gif|svg|webp|avif|txt|xml|json|webmanifest|ttf|woff2?)$).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
};
