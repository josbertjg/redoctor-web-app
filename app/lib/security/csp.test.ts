// @vitest-environment node
import { describe, expect, it } from 'vitest';

import { buildContentSecurityPolicy, createNonce } from './csp';

const base = {
  nonce: 'bm9uY2U=',
  isDevelopment: false,
  isSecureRequest: true,
  apiUrl: 'https://api-dev.redoctorapp.com/api/v1',
  firebaseAuthDomain: 'redoctor-3acf8.firebaseapp.com',
};

function directive(policy: string, name: string): string[] {
  const entry = policy
    .split('; ')
    .find((part) => part === name || part.startsWith(`${name} `));
  return entry ? entry.split(' ').slice(1) : [];
}

describe('buildContentSecurityPolicy', () => {
  it('allows only nonce-carrying scripts in production', () => {
    const policy = buildContentSecurityPolicy(base);

    expect(directive(policy, 'script-src')).toEqual([
      "'self'",
      "'nonce-bm9uY2U='",
      "'strict-dynamic'",
    ]);
    expect(policy).toContain('upgrade-insecure-requests');
    expect(policy).not.toContain('unsafe-eval');
  });

  it('upgrades subresources only when the page itself is on HTTPS', () => {
    const policy = buildContentSecurityPolicy({
      ...base,
      isSecureRequest: false,
    });

    expect(policy).not.toContain('upgrade-insecure-requests');
  });

  it('forbids framing, plugins and foreign form targets', () => {
    const policy = buildContentSecurityPolicy(base);

    expect(directive(policy, 'frame-ancestors')).toEqual(["'none'"]);
    expect(directive(policy, 'object-src')).toEqual(["'none'"]);
    expect(directive(policy, 'form-action')).toEqual(["'self'"]);
  });

  it('loads images from any secure host, never over plain http', () => {
    const policy = buildContentSecurityPolicy(base);

    expect(directive(policy, 'img-src')).toEqual([
      "'self'",
      'data:',
      'blob:',
      'https:',
    ]);
  });

  it('lets the browser reach the API and Firebase Auth', () => {
    const policy = buildContentSecurityPolicy(base);

    expect(directive(policy, 'connect-src')).toEqual(
      expect.arrayContaining([
        'https://api-dev.redoctorapp.com',
        'https://redoctor-3acf8.firebaseapp.com',
        'https://identitytoolkit.googleapis.com',
        'https://securetoken.googleapis.com',
      ]),
    );
    expect(directive(policy, 'frame-src')).toContain(
      'https://redoctor-3acf8.firebaseapp.com',
    );
  });

  it('adds PostHog and Sentry only when they are configured', () => {
    const off = buildContentSecurityPolicy(base);
    expect(off).not.toContain('posthog');
    expect(off).not.toContain('sentry');

    const on = buildContentSecurityPolicy({
      ...base,
      posthogHost: 'https://us.i.posthog.com',
      sentryDsn: 'https://public@o123.ingest.us.sentry.io/456',
    });
    expect(directive(on, 'connect-src')).toEqual(
      expect.arrayContaining([
        'https://us.i.posthog.com',
        'https://us-assets.i.posthog.com',
        'https://o123.ingest.us.sentry.io',
      ]),
    );
  });

  it('relaxes only what development needs', () => {
    const policy = buildContentSecurityPolicy({
      ...base,
      isDevelopment: true,
      isSecureRequest: false,
    });

    expect(directive(policy, 'script-src')).toContain("'unsafe-eval'");
    expect(directive(policy, 'connect-src')).toContain('ws:');
    expect(policy).not.toContain('upgrade-insecure-requests');
  });
});

describe('createNonce', () => {
  it('is different every time', () => {
    expect(createNonce()).not.toBe(createNonce());
  });
});
