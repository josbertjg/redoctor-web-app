// @vitest-environment node
import { describe, expect, it } from 'vitest';

import {
  scrubAnalyticsEvent,
  scrubBreadcrumb,
  scrubEvent,
  scrubText,
  scrubUrl,
} from './scrub';

describe('scrubUrl', () => {
  it('masks the invitation token of the web and of the API', () => {
    expect(scrubUrl('https://redoctorapp.com/i/abc123?origin=email-12')).toBe(
      'https://redoctorapp.com/i/[token]',
    );
    expect(
      scrubUrl(
        'https://api-dev.redoctorapp.com/api/v1/scheduling/invitations/abc123/claim',
      ),
    ).toBe(
      'https://api-dev.redoctorapp.com/api/v1/scheduling/invitations/[token]/claim',
    );
    expect(scrubUrl('/i/abc123')).toBe('/i/[token]');
  });

  it('cuts every query string and fragment', () => {
    expect(
      scrubUrl(
        'https://redoctorapp.com/daily-summary/unsubscribe?token=signed#top',
      ),
    ).toBe('https://redoctorapp.com/daily-summary/unsubscribe');
    expect(scrubUrl('/sign-in?redirect=%2Fa%2F1')).toBe('/sign-in');
  });

  it('leaves the rest of the path alone', () => {
    expect(scrubUrl('https://redoctorapp.com/s/a0af9566')).toBe(
      'https://redoctorapp.com/s/a0af9566',
    );
    expect(scrubUrl('https://redoctorapp.com/info/terms')).toBe(
      'https://redoctorapp.com/info/terms',
    );
  });
});

describe('scrubText', () => {
  it('cleans URLs inside free text and keeps route templates', () => {
    expect(scrubText('GET /i/abc123')).toBe('GET /i/[token]');
    expect(scrubText('/i/[token]')).toBe('/i/[token]');
    expect(
      scrubText('Failed to load https://redoctorapp.com/i/abc?origin=x now'),
    ).toBe('Failed to load https://redoctorapp.com/i/[token] now');
  });
});

describe('scrubBreadcrumb', () => {
  it('drops console breadcrumbs', () => {
    expect(scrubBreadcrumb({ category: 'console', message: 'hi' })).toBe(null);
  });

  it('cleans navigation and fetch URLs', () => {
    expect(
      scrubBreadcrumb({
        category: 'navigation',
        data: { from: '/i/abc?origin=x', to: '/sign-in?redirect=%2Fi%2Fabc' },
      }),
    ).toEqual({
      category: 'navigation',
      data: { from: '/i/[token]', to: '/sign-in' },
    });
    expect(
      scrubBreadcrumb({
        category: 'fetch',
        data: {
          url: 'https://api-dev.redoctorapp.com/api/v1/scheduling/invitations/abc',
          status_code: 404,
        },
      }),
    ).toEqual({
      category: 'fetch',
      data: {
        url: 'https://api-dev.redoctorapp.com/api/v1/scheduling/invitations/[token]',
        status_code: 404,
      },
    });
  });
});

describe('scrubEvent', () => {
  it('keeps only what identifies the failure, never the person', () => {
    const event = scrubEvent({
      transaction: 'GET /i/abc123',
      message: 'Lost /i/abc123?origin=email-12',
      request: {
        url: 'https://redoctorapp.com/i/abc123?origin=email-12',
        query_string: 'origin=email-12',
        cookies: { session: 'x' },
        data: { reason: 'dolor' },
        headers: {
          'user-agent': 'Safari',
          referer: 'https://redoctorapp.com/i/abc123',
          cookie: 'session=x',
        },
      },
      exception: {
        values: [{ value: 'Failed /daily-summary/unsubscribe?token=secret' }],
      },
      breadcrumbs: [
        { category: 'console', message: 'debug' },
        { category: 'navigation', data: { to: '/i/abc123' } },
      ],
    });

    expect(event).toEqual({
      transaction: 'GET /i/[token]',
      message: 'Lost /i/[token]',
      request: {
        url: 'https://redoctorapp.com/i/[token]',
        headers: { 'user-agent': 'Safari' },
      },
      exception: { values: [{ value: 'Failed /daily-summary/unsubscribe' }] },
      breadcrumbs: [{ category: 'navigation', data: { to: '/i/[token]' } }],
    });
  });
});

describe('scrubAnalyticsEvent', () => {
  it('cleans the URLs PostHog attaches', () => {
    expect(
      scrubAnalyticsEvent({
        properties: {
          $current_url:
            'https://redoctorapp.com/i/abc?origin=whatsapp-invitation',
          $pathname: '/i/abc',
          origin: 'whatsapp-invitation',
        },
        $set_once: { $initial_current_url: 'https://redoctorapp.com/a/1?x=1' },
      }),
    ).toEqual({
      properties: {
        $current_url: 'https://redoctorapp.com/i/[token]',
        $pathname: '/i/[token]',
        origin: 'whatsapp-invitation',
      },
      $set_once: { $initial_current_url: 'https://redoctorapp.com/a/1' },
    });
    expect(scrubAnalyticsEvent(null)).toBe(null);
  });
});
