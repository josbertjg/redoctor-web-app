// @vitest-environment node
import { describe, expect, it } from 'vitest';

import { isAppOwnedPath } from './deep-links';
import { isSafeRedirect, returnPath, routes } from './routes';

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
    expect(routes.specialistProfile()).toBe('/panel/profile');
    expect(routes.specialties()).toBe('/panel/specialties');
    expect(routes.subscription()).toBe('/panel/subscription');
  });

  it('builds the booking, with the office the profile named', () => {
    expect(routes.book('a0af9566')).toBe('/book/a0af9566');
    expect(routes.book('a0af9566', 'of 1')).toBe(
      '/book/a0af9566?office=of%201',
    );
  });

  it('builds the payment, out of the panel’s paths', () => {
    expect(routes.subscriptionPay()).toBe('/pay');
    expect(routes.subscriptionPay('profesional')).toBe('/pay?plan=profesional');
    expect(routes.subscriptionPlans()).toBe('/pay?view=plans');
    expect(routes.subscriptionPayInvoice('in 1')).toBe('/pay?invoice=in%201');
  });

  it('builds the bridge to the app’s internal paths', () => {
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

  it('lets the app open the pages it shows, never the payment nor the web’s own', () => {
    expect(isAppOwnedPath(routes.subscription())).toBe(true);
    expect(isAppOwnedPath(routes.agenda())).toBe(true);
    expect(isAppOwnedPath(routes.agenda('2026-10-01'))).toBe(true);
    expect(isAppOwnedPath(routes.specialistAppointments())).toBe(true);
    expect(isAppOwnedPath(routes.reports())).toBe(true);
    expect(isAppOwnedPath(routes.specialties())).toBe(true);
    expect(isAppOwnedPath(routes.specialistProfile())).toBe(true);

    expect(isAppOwnedPath(routes.subscriptionPay())).toBe(false);
    expect(isAppOwnedPath(routes.subscriptionPay('profesional'))).toBe(false);
    expect(isAppOwnedPath(routes.subscriptionPlans())).toBe(false);
    expect(isAppOwnedPath(routes.subscriptionPayInvoice('in-1'))).toBe(false);

    // The web's own: the panel's home, and the receipts' pages until a
    // published build of the app shows them.
    expect(isAppOwnedPath(routes.specialistHome())).toBe(false);
    expect(isAppOwnedPath(routes.subscriptionInvoices())).toBe(false);
    expect(isAppOwnedPath(routes.subscriptionInvoice('in-1'))).toBe(false);
    expect(isAppOwnedPath(routes.subscriptionBalance())).toBe(false);
    expect(isAppOwnedPath(routes.subscriptionCoupons())).toBe(false);
    // The booking, out of `/s/*`: the app has no booking path to open.
    expect(isAppOwnedPath(routes.book('a0af9566'))).toBe(false);
    expect(isAppOwnedPath(routes.book('a0af9566', 'of-1'))).toBe(false);
  });

  it('encodes the opt-out token', () => {
    expect(routes.dailySummaryOptOut('a+b/c')).toBe(
      '/daily-summary/unsubscribe?token=a%2Bb%2Fc',
    );
  });
});

describe('returnPath', () => {
  it('keeps the query that brings the person back to the same view', () => {
    expect(returnPath('/pay', '?plan=profesional')).toBe(
      '/pay?plan=profesional',
    );
    expect(
      returnPath('/panel/appointments', '?status=CONFIRMED&from=2026-10-01'),
    ).toBe('/panel/appointments?status=CONFIRMED&from=2026-10-01');
    expect(returnPath('/panel', '')).toBe('/panel');
  });

  it('never carries what was typed in a search box, nor the channel tag', () => {
    expect(
      returnPath('/panel/appointments', '?q=Ana+P%C3%A9rez&status=CONFIRMED'),
    ).toBe('/panel/appointments?status=CONFIRMED');
    expect(returnPath('/panel/appointments', '?q=12345678')).toBe(
      '/panel/appointments',
    );
    expect(returnPath('/panel/subscription', '?origin=email-4')).toBe(
      '/panel/subscription',
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
