/*
 * The Content Security Policy, built per request with a fresh nonce
 * (proxy.ts, AGENTS.md §11).
 *
 * - Scripts: only those carrying the nonce, and what they load
 *   ('strict-dynamic'). Next.js stamps the nonce on its own scripts.
 * - Styles allow inline: Radix, Sonner and next/image set style attributes
 *   and inject <style> at runtime, and CSS cannot run code. Scripts are where
 *   the strictness matters.
 * - Network: the API (over HTTPS and, for the notifications' live channel,
 *   over WebSocket), Firebase Auth and, only when configured, PostHog and
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
  /** The search's map and places (M16): only with a Google Maps key. */
  googleMaps?: boolean | undefined;
  /** The notifications' web push: only with the VAPID key. */
  webPush?: boolean | undefined;
};

/*
 * What the Maps JavaScript API needs under a strict policy, as Google
 * documents it: its own scripts come through 'strict-dynamic' (our loader
 * inserts them with the page's nonce), the tiles and glyphs are images, the
 * Places and tile data travel over connect, Roboto comes from Google Fonts,
 * and a few of its panes are frames.
 */
const googleMapsOrigins = {
  connect: [
    'https://*.googleapis.com',
    'https://*.google.com',
    'https://*.gstatic.com',
  ],
  style: ['https://fonts.googleapis.com'],
  frame: ['https://*.google.com'],
};

const firebaseAuthApis = [
  'https://identitytoolkit.googleapis.com',
  'https://securetoken.googleapis.com',
];

/**
 * What Cloud Messaging needs to register this browser for the push
 * (app/lib/firebase/messaging.ts): an installation id, then the device token.
 */
const firebaseMessagingApis = [
  'https://firebaseinstallations.googleapis.com',
  'https://fcmregistrations.googleapis.com',
];

const originOf = (url: string) => new URL(url).origin;

/**
 * The same origin over WebSocket: the notifications' live channel is
 * Socket.IO on the API's host (app/lib/notifications/socket.ts), and a
 * `wss:` connection is only covered by a `wss:` source.
 */
const websocketOriginOf = (url: string) => originOf(url).replace(/^http/, 'ws');

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
    websocketOriginOf(options.apiUrl),
    firebaseAuthOrigin,
    ...firebaseAuthApis,
    ...(options.posthogHost ? posthogOrigins(options.posthogHost) : []),
    ...(options.sentryDsn ? [originOf(options.sentryDsn)] : []),
    ...(options.googleMaps ? googleMapsOrigins.connect : []),
    ...(options.webPush ? firebaseMessagingApis : []),
    // Fast Refresh talks over a websocket in development.
    ...(isDevelopment ? ['ws:'] : []),
  ];

  const directives: Record<string, string[]> = {
    'default-src': ["'self'"],
    'script-src': [
      "'self'",
      `'nonce-${nonce}'`,
      "'strict-dynamic'",
      // The landing's splash runs the app's logo through Rive, which compiles
      // WebAssembly: this allows that compilation and nothing else (no eval).
      "'wasm-unsafe-eval'",
      // React reconstructs server error stacks with eval in development only.
      ...(isDevelopment ? ["'unsafe-eval'"] : []),
    ],
    'style-src': [
      "'self'",
      "'unsafe-inline'",
      ...(options.googleMaps ? googleMapsOrigins.style : []),
    ],
    // Photos and gallery images are URLs the API stores, on hosts this web
    // does not choose (Google, Firebase Storage…). An image cannot run code.
    'img-src': ["'self'", 'data:', 'blob:', 'https:'],
    'font-src': ["'self'", 'data:', 'https://fonts.gstatic.com'],
    'connect-src': [...new Set(connect)],
    // Firebase Auth completes Google and Apple sign-in through its iframe.
    'frame-src': [
      "'self'",
      firebaseAuthOrigin,
      ...(options.googleMaps ? googleMapsOrigins.frame : []),
    ],
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
