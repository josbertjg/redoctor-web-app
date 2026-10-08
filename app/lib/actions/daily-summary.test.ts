// @vitest-environment node
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';

import { apiUrl, errorEnvelope } from '@/tests/msw/api-url';
import { validOptOutToken } from '@/tests/msw/handlers/notifications';
import { server } from '@/tests/msw/server';

import { changeDailySummary, type DailySummaryState } from './daily-summary';

vi.mock(import('../api/retry'), async (importOriginal) => ({
  ...(await importOriginal()),
  backoffDelay: () => 0,
}));

const ask: DailySummaryState = { view: 'ask', failed: false };

function form(fields: Record<string, string>) {
  const data = new FormData();
  for (const [name, value] of Object.entries(fields)) data.set(name, value);
  return data;
}

describe('changeDailySummary', () => {
  it('stops and resumes the daily summary with the token of the email', async () => {
    await expect(
      changeDailySummary(
        ask,
        form({ token: validOptOutToken, intent: 'unsubscribe' }),
      ),
    ).resolves.toEqual({ view: 'unsubscribed', failed: false });

    await expect(
      changeDailySummary(
        { view: 'unsubscribed', failed: false },
        form({ token: validOptOutToken, intent: 'subscribe' }),
      ),
    ).resolves.toEqual({ view: 'subscribed', failed: false });
  });

  it('says so when the link is not valid', async () => {
    await expect(
      changeDailySummary(ask, form({ token: 'forged', intent: 'unsubscribe' })),
    ).resolves.toEqual({ view: 'invalid-link', failed: false });
    await expect(
      changeDailySummary(ask, form({ intent: 'unsubscribe' })),
    ).resolves.toEqual({ view: 'invalid-link', failed: false });
  });

  it('keeps the view and flags the failure when the change is not saved', async () => {
    server.use(
      http.post(apiUrl('/notifications/daily-summary/subscribe'), () =>
        HttpResponse.json(errorEnvelope('ERR_9001', 'down'), { status: 503 }),
      ),
    );

    await expect(
      changeDailySummary(
        { view: 'unsubscribed', failed: false },
        form({ token: validOptOutToken, intent: 'subscribe' }),
      ),
    ).resolves.toEqual({ view: 'unsubscribed', failed: true });
  });

  it('never echoes a view it does not know', async () => {
    server.use(
      http.post(apiUrl('/notifications/daily-summary/unsubscribe'), () =>
        HttpResponse.json(errorEnvelope('ERR_9001', 'down'), { status: 503 }),
      ),
    );

    await expect(
      changeDailySummary(
        { view: '<script>' as never, failed: false },
        form({ token: validOptOutToken, intent: 'unsubscribe' }),
      ),
    ).resolves.toEqual({ view: 'ask', failed: true });
  });
});
