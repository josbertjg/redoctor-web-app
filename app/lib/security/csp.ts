/*
 * The Content Security Policy, built per request with a fresh nonce
 * (proxy.ts, AGENTS.md §11).
 *
 * - Scripts: only those carrying the nonce, and what they load
 *   ('strict-dynamic'). Next.js stamps the nonce on its own scripts.
 * - Styles allow inline: Radix, Sonner and next/image set style attributes
 *   and inject <style> at runtime, and CSS cannot run code. Scripts are where
 *   the strictness matters.
 * - Network: the API, Firebase Auth and, only when configured, PostHog and
 *   Sentry.
 */

export type ContentSecurityPolicyOptions = {
  nonce: string;
  isDevelopment: boolean;
  /**
   * Whether the page itself is served over HTTPS. Only then may the browser
   * upgrade subresources: on http://localhost WebKit would upgrade the
   * stylesheets to https and lose them.
   */
  isSecureRequest: boolean;
  apiUrl: string;
  firebaseAuthDomain: string;
  posthogHost?: string | undefined;
  sentryDsn?: string | undefined;
};

const firebaseAuthApis = [
  'https://identitytoolkit.googleapis.com',
  'https://securetoken.googleapis.com',
];

const originOf = (url: string) => new URL(url).origin;

function posthogOrigins(host: string): string[] {
  const origin = originOf(host);
  // PostHog serves its lazily loaded bundles from a sibling assets host.
  const assets = origin.replace(
    /^https:\/\/(\w+)\.i\.posthog\.com$/,
    'https://$1-assets.i.posthog.com',
  );
  return assets === origin ? [origin] : [origin, assets];
}

export function buildContentSecurityPolicy(
  options: ContentSecurityPolicyOptions,
): string {
  const { nonce, isDevelopment } = options;
  const firebaseAuthOrigin = `https://${options.firebaseAuthDomain}`;

  const connect = [
    "'self'",
    originOf(options.apiUrl),
    firebaseAuthOrigin,
    ...firebaseAuthApis,
    ...(options.posthogHost ? posthogOrigins(options.posthogHost) : []),
    ...(options.sentryDsn ? [originOf(options.sentryDsn)] : []),
    // Fast Refresh talks over a websocket in development.
    ...(isDevelopment ? ['ws:'] : []),
  ];

  const directives: Record<string, string[]> = {
    'default-src': ["'self'"],
    'script-src': [
      "'self'",
      `'nonce-${nonce}'`,
      "'strict-dynamic'",
      // React reconstructs server error stacks with eval in development only.
      ...(isDevelopment ? ["'unsafe-eval'"] : []),
    ],
    'style-src': ["'self'", "'unsafe-inline'"],
    // Photos and gallery images are URLs the API stores, on hosts this web
    // does not choose (Google, Firebase Storage…). An image cannot run code.
    'img-src': ["'self'", 'data:', 'blob:', 'https:'],
    'font-src': ["'self'", 'data:', 'https://fonts.gstatic.com'],
    'connect-src': [...new Set(connect)],
    // Firebase Auth completes Google and Apple sign-in through its iframe.
    'frame-src': ["'self'", firebaseAuthOrigin],
    'worker-src': ["'self'", 'blob:'],
    'manifest-src': ["'self'"],
    'object-src': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
    'frame-ancestors': ["'none'"],
  };

  const policy = Object.entries(directives).map(
    ([name, values]) => `${name} ${values.join(' ')}`,
  );
  if (options.isSecureRequest) policy.push('upgrade-insecure-requests');

  return policy.join('; ');
}

/** A fresh, unguessable nonce for one response. */
export function createNonce(): string {
  return btoa(crypto.randomUUID());
}
