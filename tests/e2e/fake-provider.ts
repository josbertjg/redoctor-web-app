import type { BrowserContext, Route } from '@playwright/test';

/*
 * Signing in under Playwright (AGENTS.md §10). Firebase's SDK runs whole in
 * the page, through the same popup flow a person goes through; only the far
 * ends are ours: Google's or Apple's window, which answers a moment after
 * it opens as if the person had picked their account, and Firebase's
 * endpoints (Identity Toolkit, Secure Token), which answer as they would
 * for that person. Nothing reaches Google or Apple.
 */

/** A Google or Apple account a test signs in with. */
export type Person = { uid: string; name: string; email: string };

export type Provider = 'google.com' | 'apple.com';

const projectId = 'redoctor-3acf8';

const cors = (route: Route) => ({
  'access-control-allow-origin': route.request().headers().origin ?? '*',
  'access-control-allow-headers': '*',
  'access-control-allow-methods': 'GET,POST,OPTIONS',
});

const encode = (value: unknown) =>
  Buffer.from(JSON.stringify(value)).toString('base64url');

/**
 * An ID token as Firebase hands it over: a JWT whose claims name the person.
 * Unsigned, since nothing here checks a signature; the fake API reads who
 * it is from it.
 */
export function idTokenFor(person: Person, provider: Provider): string {
  const now = Math.floor(Date.now() / 1000);
  return [
    encode({ alg: 'RS256', kid: 'e2e', typ: 'JWT' }),
    encode({
      iss: `https://securetoken.google.com/${projectId}`,
      aud: projectId,
      auth_time: now,
      user_id: person.uid,
      sub: person.uid,
      iat: now,
      exp: now + 3600,
      email: person.email,
      email_verified: true,
      name: person.name,
      firebase: {
        identities: { [provider]: [person.uid], email: [person.email] },
        sign_in_provider: provider,
      },
    }),
    'e2e',
  ].join('.');
}

/** The Firebase account an ID token names, or null for anything else. */
export function uidOfToken(token: string): string | null {
  const [, claims] = token.split('.');
  if (claims === undefined) return null;
  try {
    const parsed: unknown = JSON.parse(
      Buffer.from(claims, 'base64url').toString('utf8'),
    );
    if (typeof parsed !== 'object' || parsed === null) return null;
    const uid = (parsed as { user_id?: unknown }).user_id;
    return typeof uid === 'string' ? uid : null;
  } catch {
    return null;
  }
}

/**
 * The provider's window and Firebase's half of the popup flow, inside the
 * page: gapi's channel to Firebase's frame, and `window.open`, whose window
 * reports the sign-in back through that channel. Runs before any script of
 * the page, so Firebase finds gapi there and loads nothing from Google.
 * Serialized into the page: it can use nothing from this module.
 */
function fakeProviderWindows() {
  type Handler = (event: unknown) => unknown;
  let onAuthEvent: Handler | null = null;
  const frame = {
    restyle: () => Promise.resolve(),
    ping: () => Promise.resolve(),
    register: (name: string, handler: Handler) => {
      if (name === 'authEvent') onAuthEvent = handler;
    },
    send: (
      key: string,
      _data: unknown,
      callback: (answer: unknown) => void,
    ) => {
      setTimeout(() => {
        try {
          callback([{ [key]: true }]);
        } catch {
          // Firebase throws after reading the answer; gapi swallows it.
        }
      }, 0);
    },
  };
  const frames = {
    open: (_options: unknown, onOpen: (opened: typeof frame) => unknown) =>
      onOpen(frame),
  };
  Object.assign(window, {
    gapi: {
      iframes: {
        Iframe: function Iframe() {
          // Firebase only checks that it exists.
        },
        CROSS_ORIGIN_IFRAMES_FILTER: {},
        getContext: () => frames,
      },
    },
  });
  window.open = (url?: string | URL) => {
    const address = new URL(String(url));
    const eventId = address.searchParams.get('eventId');
    const providerId = address.searchParams.get('providerId') ?? 'google.com';
    const popup = {
      closed: false,
      close() {
        popup.closed = true;
      },
      focus() {
        // A window of its own, as far as the page can tell.
      },
    };
    // The person picks their account; the window answers and closes.
    setTimeout(() => {
      onAuthEvent?.({
        authEvent: {
          type: 'signInViaPopup',
          eventId,
          urlResponse: `https://redoctor-3acf8.firebaseapp.com/__/auth/handler?providerId=${providerId}#state=e2e`,
          sessionId: 'e2e-session',
          postBody: null,
          tenantId: null,
          error: null,
        },
      });
      popup.closed = true;
    }, 300);
    return popup as unknown as Window;
  };
}

type SignedIn = { person: Person; provider: Provider };

/**
 * Google and Apple for one browser context: whoever `next` names is the
 * account the next window signs in, whichever button was tapped.
 */
export class FakeProviders {
  next: Person;
  /** Every sign-in the windows made, in order: who, and with what. */
  readonly signIns: SignedIn[] = [];
  private readonly accounts = new Map<string, SignedIn>();

  constructor(first: Person) {
    this.next = first;
  }

  async install(context: BrowserContext): Promise<void> {
    await context.route('https://identitytoolkit.googleapis.com/**', (route) =>
      this.identityToolkit(route),
    );
    await context.route('https://securetoken.googleapis.com/**', (route) =>
      this.secureToken(route),
    );
    // Firebase's own pages never load: the window is ours.
    await context.route('**/__/auth/**', (route) => route.abort());
    await context.addInitScript(fakeProviderWindows);
  }

  private async identityToolkit(route: Route) {
    const request = route.request();
    const headers = cors(route);
    if (request.method() === 'OPTIONS') {
      await route.fulfill({ status: 204, headers });
      return;
    }
    const url = request.url();
    if (url.includes('/v1/projects')) {
      const origin = request.headers().origin;
      await route.fulfill({
        headers,
        json: {
          projectId: '640755008477',
          authorizedDomains: [
            'localhost',
            ...(origin ? [new URL(origin).hostname] : []),
          ],
        },
      });
      return;
    }
    const body = (request.postDataJSON() ?? {}) as {
      requestUri?: string;
      idToken?: string;
    };
    if (url.includes('accounts:signInWithIdp')) {
      const requested = new URL(
        body.requestUri ?? 'https://e2e.invalid/',
      ).searchParams.get('providerId');
      const provider: Provider =
        requested === 'apple.com' ? 'apple.com' : 'google.com';
      const person = this.next;
      this.accounts.set(person.uid, { person, provider });
      this.signIns.push({ person, provider });
      await route.fulfill({
        headers,
        json: {
          kind: 'identitytoolkit#VerifyAssertionResponse',
          federatedId: `https://e2e.invalid/${provider}/${person.uid}`,
          providerId: provider,
          localId: person.uid,
          email: person.email,
          emailVerified: true,
          displayName: person.name,
          idToken: idTokenFor(person, provider),
          refreshToken: `e2e-refresh.${person.uid}`,
          expiresIn: '3600',
          rawUserInfo: '{}',
          isNewUser: false,
        },
      });
      return;
    }
    if (url.includes('accounts:lookup')) {
      const known = this.accounts.get(uidOfToken(body.idToken ?? '') ?? '');
      if (!known) {
        await route.fulfill({
          status: 400,
          headers,
          json: { error: { code: 400, message: 'INVALID_ID_TOKEN' } },
        });
        return;
      }
      await route.fulfill({ headers, json: { users: [lookupUser(known)] } });
      return;
    }
    await route.fulfill({
      status: 400,
      headers,
      json: { error: { code: 400, message: 'OPERATION_NOT_ALLOWED' } },
    });
  }

  /** A fresh ID token for the account its refresh token names. */
  private async secureToken(route: Route) {
    const request = route.request();
    const headers = cors(route);
    if (request.method() === 'OPTIONS') {
      await route.fulfill({ status: 204, headers });
      return;
    }
    const refresh =
      new URLSearchParams(request.postData() ?? '').get('refresh_token') ?? '';
    const known = this.accounts.get(refresh.replace(/^e2e-refresh\./, ''));
    if (!known) {
      await route.fulfill({
        status: 400,
        headers,
        json: { error: { code: 400, message: 'INVALID_REFRESH_TOKEN' } },
      });
      return;
    }
    const token = idTokenFor(known.person, known.provider);
    await route.fulfill({
      headers,
      json: {
        access_token: token,
        id_token: token,
        expires_in: '3600',
        token_type: 'Bearer',
        refresh_token: refresh,
        user_id: known.person.uid,
        project_id: projectId,
      },
    });
  }
}

function lookupUser({ person, provider }: SignedIn) {
  return {
    localId: person.uid,
    email: person.email,
    emailVerified: true,
    displayName: person.name,
    providerUserInfo: [
      {
        providerId: provider,
        rawId: person.uid,
        email: person.email,
        displayName: person.name,
      },
    ],
    lastLoginAt: String(Date.now()),
    createdAt: '1760000000000',
  };
}
