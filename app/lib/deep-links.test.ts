// @vitest-environment node
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  appBridgeLinks,
  appStoreUrl,
  isAppOwnedPath,
  parseLinkOrigin,
  playStoreUrl,
  toAndroidIntentUrl,
  toAppSchemeUrl,
  universalLinkPaths,
  withoutOrigin,
} from './deep-links';

describe('universalLinkPaths', () => {
  it('matches the paths published in the AASA file', () => {
    const aasa = JSON.parse(
      readFileSync(
        join(process.cwd(), 'public/.well-known/apple-app-site-association'),
        'utf8',
      ),
    ) as {
      applinks: { details: { components: { '/': string }[] }[] };
    };
    const published = aasa.applinks.details.flatMap((detail) =>
      detail.components.map((component) => component['/']),
    );

    expect(published).toEqual([...universalLinkPaths]);
  });
});

describe('isAppOwnedPath', () => {
  it('recognizes the segments the app owns', () => {
    expect(isAppOwnedPath('/s/123')).toBe(true);
    expect(isAppOwnedPath('/suscripcion')).toBe(true);
    expect(isAppOwnedPath('/agenda/2026-10-01')).toBe(true);
  });

  it('leaves web-only paths alone', () => {
    expect(isAppOwnedPath('/pagar')).toBe(false);
    expect(isAppOwnedPath('/citas')).toBe(false);
    expect(isAppOwnedPath('/')).toBe(false);
  });
});

describe('parseLinkOrigin', () => {
  it('accepts the origins of the app and of the emails', () => {
    expect(parseLinkOrigin('whatsapp-invitation')).toBe('whatsapp-invitation');
    expect(parseLinkOrigin('share-profile')).toBe('share-profile');
    expect(parseLinkOrigin('email-12')).toBe('email-12');
  });

  it('rejects anything else', () => {
    expect(parseLinkOrigin('email-')).toBeUndefined();
    expect(parseLinkOrigin('facebook')).toBeUndefined();
    expect(parseLinkOrigin('')).toBeUndefined();
    expect(parseLinkOrigin(null)).toBeUndefined();
  });
});

describe('withoutOrigin', () => {
  it('drops only the origin parameter', () => {
    expect(
      withoutOrigin('https://redoctorapp.com/s/1?origin=share-profile&x=1'),
    ).toBe('https://redoctorapp.com/s/1?x=1');
  });
});

describe('toAppSchemeUrl', () => {
  it('swaps the scheme and keeps the host and path', () => {
    expect(toAppSchemeUrl('https://redoctorapp.com/a/abc')).toBe(
      'redoctor://redoctorapp.com/a/abc',
    );
  });

  it('drops the fragment', () => {
    expect(toAppSchemeUrl('https://redoctorapp.com/s/1#reviews')).toBe(
      'redoctor://redoctorapp.com/s/1',
    );
  });
});

describe('toAndroidIntentUrl', () => {
  it('builds an intent with the app scheme, the package and a fallback', () => {
    expect(
      toAndroidIntentUrl(
        'https://redoctorapp.com/i/token',
        'com.redoctor.mobileapp',
        'https://redoctorapp.com/i/token',
      ),
    ).toBe(
      'intent://redoctorapp.com/i/token#Intent;scheme=redoctor;package=com.redoctor.mobileapp;' +
        'S.browser_fallback_url=https%3A%2F%2Fredoctorapp.com%2Fi%2Ftoken;end',
    );
  });
});

describe('store URLs', () => {
  it('stay off while the ids are empty', () => {
    expect(appStoreUrl(undefined)).toBeUndefined();
    expect(playStoreUrl(undefined)).toBeUndefined();
  });

  it('point at the listings once the ids exist', () => {
    expect(appStoreUrl('1234567890')).toBe(
      'https://apps.apple.com/app/id1234567890',
    );
    expect(playStoreUrl('com.redoctor.mobileapp')).toBe(
      'https://play.google.com/store/apps/details?id=com.redoctor.mobileapp',
    );
  });
});

describe('appBridgeLinks', () => {
  const page = 'https://redoctorapp.com/suscripcion';
  const iPhone = {
    isIOS: true,
    isAndroid: false,
    isAndroidChrome: false,
    isDesktop: false,
  };
  const androidChrome = {
    isIOS: false,
    isAndroid: true,
    isAndroidChrome: true,
    isDesktop: false,
  };
  const desktop = {
    isIOS: false,
    isAndroid: false,
    isAndroidChrome: false,
    isDesktop: true,
  };
  const pilot = { androidPackage: 'com.redoctor.mobileapp' };
  const published = {
    ...pilot,
    appStoreId: '1234567890',
    playStoreId: 'com.redoctor.mobileapp',
  };

  it('keeps the specialist bridges on the same path (app v0.161.0)', () => {
    expect(
      appBridgeLinks('https://redoctorapp.com/agenda/2026-10-08', iPhone, pilot)
        .openApp,
    ).toBe('redoctor://redoctorapp.com/agenda/2026-10-08');
  });

  it('opens the app through its scheme on an iPhone', () => {
    expect(appBridgeLinks(page, iPhone, pilot)).toEqual({
      openApp: 'redoctor://redoctorapp.com/suscripcion',
      appStore: undefined,
      playStore: undefined,
      storeRedirect: undefined,
    });
  });

  it('uses an intent with this page as the way back on Android Chrome', () => {
    expect(appBridgeLinks(page, androidChrome, pilot).openApp).toBe(
      toAndroidIntentUrl(page, 'com.redoctor.mobileapp', page),
    );
  });

  it('offers nothing to open on a computer', () => {
    expect(appBridgeLinks(page, desktop, pilot).openApp).toBeUndefined();
  });

  it('offers only the store of the platform once the listings exist', () => {
    expect(appBridgeLinks(page, iPhone, published)).toMatchObject({
      appStore: 'https://apps.apple.com/app/id1234567890',
      playStore: undefined,
      storeRedirect: 'https://apps.apple.com/app/id1234567890',
    });
    const android = appBridgeLinks(page, androidChrome, published);
    expect(android).toMatchObject({
      appStore: undefined,
      storeRedirect: android.playStore,
    });
    expect(android.openApp).toContain(
      `S.browser_fallback_url=${encodeURIComponent(android.playStore ?? '')}`,
    );
    expect(appBridgeLinks(page, desktop, published)).toMatchObject({
      appStore: 'https://apps.apple.com/app/id1234567890',
      playStore:
        'https://play.google.com/store/apps/details?id=com.redoctor.mobileapp',
      storeRedirect: undefined,
    });
  });
});
