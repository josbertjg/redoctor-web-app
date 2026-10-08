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

  it('builds the bridges', () => {
    expect(routes.subscriptionBridge()).toBe('/suscripcion');
    expect(routes.agendaBridge()).toBe('/agenda');
    expect(routes.agendaBridge('2026-10-01')).toBe('/agenda/2026-10-01');
    expect(routes.specialtiesBridge()).toBe('/especialidades');
    expect(routes.profileBridge()).toBe('/perfil');
    expect(routes.homeBridge()).toBe('/home');
    expect(routes.homeBridge(['home', 'my subscription'])).toBe(
      '/home/home/my%20subscription',
    );
  });

  it('carries the return path when signing in', () => {
    expect(routes.signIn()).toBe('/entrar');
    expect(routes.signIn('/a/abc?origin=email-12')).toBe(
      '/entrar?redirect=%2Fa%2Fabc%3Forigin%3Demail-12',
    );
  });

  it('keeps the payment route out of the app paths', () => {
    expect(isAppOwnedPath(routes.payment())).toBe(false);
  });

  it('encodes the opt-out token', () => {
    expect(routes.dailySummaryOptOut('a+b/c')).toBe(
      '/resumen/baja?token=a%2Bb%2Fc',
    );
  });
});

describe('isSafeRedirect', () => {
  it('accepts same-origin paths', () => {
    expect(isSafeRedirect('/citas')).toBe(true);
    expect(isSafeRedirect('/a/abc?origin=email-12')).toBe(true);
  });

  it('rejects other origins and odd shapes', () => {
    expect(isSafeRedirect('https://evil.example')).toBe(false);
    expect(isSafeRedirect('//evil.example')).toBe(false);
    expect(isSafeRedirect('/\\evil.example')).toBe(false);
    expect(isSafeRedirect('citas')).toBe(false);
    expect(isSafeRedirect('')).toBe(false);
    expect(isSafeRedirect(null)).toBe(false);
  });
});
