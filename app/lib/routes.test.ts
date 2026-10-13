// @vitest-environment node
import { describe, expect, it } from 'vitest';

import { isAppOwnedPath } from './deep-links';
import { isSafeRedirect, routes } from './routes';

describe('routes', () => {
  it('builds the paths shared with the app', () => {
    expect(routes.specialist('a0af9566')).toBe('/s/a0af9566');
    expect(routes.invitation('tok en/1')).toBe('/i/tok%20en%2F1');
    expect(routes.appointment('abc')).toBe('/a/abc');
  });

  it('builds the panel', () => {
    expect(routes.specialistHome()).toBe('/panel');
    expect(routes.agenda()).toBe('/panel/agenda');
    expect(routes.agenda('2026-10-01')).toBe('/panel/agenda/2026-10-01');
    expect(routes.specialistAppointments()).toBe('/panel/appointments');
    expect(routes.reports()).toBe('/panel/reports');
    expect(routes.subscription()).toBe('/panel/subscription');
    expect(routes.subscriptionPay()).toBe('/panel/subscription/pay');
  });

  it('builds the bridges', () => {
    expect(routes.specialtiesBridge()).toBe('/panel/specialties');
    expect(routes.profileBridge()).toBe('/panel/profile');
    expect(routes.homeBridge()).toBe('/home');
    expect(routes.homeBridge(['home', 'my subscription'])).toBe(
      '/home/home/my%20subscription',
    );
  });

  it('carries the return path when signing in and signing up', () => {
    expect(routes.signIn()).toBe('/sign-in');
    expect(routes.signIn('/a/abc?origin=email-12')).toBe(
      '/sign-in?redirect=%2Fa%2Fabc%3Forigin%3Demail-12',
    );
    expect(routes.signUp()).toBe('/sign-up');
    expect(routes.signUp('/i/tok')).toBe('/sign-up?redirect=%2Fi%2Ftok');
  });

  it('keeps the payment page out of the app paths, and the rest of the panel in', () => {
    expect(isAppOwnedPath(routes.subscriptionPay())).toBe(false);
    expect(isAppOwnedPath(routes.subscription())).toBe(true);
    expect(isAppOwnedPath(routes.agenda('2026-10-01'))).toBe(true);
    expect(isAppOwnedPath(routes.specialistAppointments())).toBe(true);
    expect(isAppOwnedPath(routes.reports())).toBe(true);
    expect(isAppOwnedPath(routes.specialistHome())).toBe(false);
  });

  it('encodes the opt-out token', () => {
    expect(routes.dailySummaryOptOut('a+b/c')).toBe(
      '/daily-summary/unsubscribe?token=a%2Bb%2Fc',
    );
  });
});

describe('isSafeRedirect', () => {
  it('accepts same-origin paths', () => {
    expect(isSafeRedirect('/appointments')).toBe(true);
    expect(isSafeRedirect('/a/abc?origin=email-12')).toBe(true);
  });

  it('rejects other origins and odd shapes', () => {
    expect(isSafeRedirect('https://evil.example')).toBe(false);
    expect(isSafeRedirect('//evil.example')).toBe(false);
    expect(isSafeRedirect('/\\evil.example')).toBe(false);
    expect(isSafeRedirect('appointments')).toBe(false);
    expect(isSafeRedirect('')).toBe(false);
    expect(isSafeRedirect(null)).toBe(false);
  });
});

describe('isSafeRedirect, after the browser resolves the path', () => {
  it('refuses a path that resolves to another host', () => {
    expect(isSafeRedirect('/..//evil.com')).toBe(false);
    expect(isSafeRedirect('/./\\evil.com')).toBe(false);
    expect(isSafeRedirect('/a/../i/tok')).toBe(true);
  });
});
