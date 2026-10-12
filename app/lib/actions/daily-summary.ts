'use server';

import { z } from 'zod';

import { apiFetch } from '../api/client';
import { isApiError } from '../api/errors';

/*
 * Daily-summary opt-out (M11). The specialist's email links to
 * `/daily-summary/unsubscribe?token=…` and the signed token is the only
 * credential: no session, so this write may run on the server as a Server
 * Action (AGENTS.md §4). The token is never logged: it travels in the API's query,
 * and reports carry the route template only.
 */

export type DailySummaryView =
  'ask' | 'unsubscribed' | 'subscribed' | 'invalid-link';

export type DailySummaryState = {
  view: DailySummaryView;
  /** The last change could not be saved: the view stays, with a notice. */
  failed: boolean;
};

const inputSchema = z.object({
  token: z.string().min(1).max(4096),
  intent: z.enum(['unsubscribe', 'subscribe']),
});

const responseSchema = z.object({ dailySummaryEmail: z.boolean() });

// The previous state comes back from the browser: keep only a known view.
const previousViewSchema = z
  .object({ view: z.enum(['ask', 'unsubscribed', 'subscribed']) })
  .transform((state) => state.view)
  .catch('ask' as const);

export async function changeDailySummary(
  previous: DailySummaryState,
  formData: FormData,
): Promise<DailySummaryState> {
  const input = inputSchema.safeParse({
    token: formData.get('token'),
    intent: formData.get('intent'),
  });
  if (!input.success) return { view: 'invalid-link', failed: false };

  try {
    const { dailySummaryEmail } = await apiFetch({
      method: 'POST',
      path: '/notifications/daily-summary/:intent',
      params: { intent: input.data.intent },
      query: { token: input.data.token },
      schema: responseSchema,
      // Both calls set a value: one sent twice changes nothing (API contract).
      idempotent: true,
    });
    return {
      view: dailySummaryEmail ? 'subscribed' : 'unsubscribed',
      failed: false,
    };
  } catch (error) {
    if (isApiError(error) && error.code === 'ERR_8004') {
      return { view: 'invalid-link', failed: false };
    }
    return { view: previousViewSchema.parse(previous), failed: true };
  }
}
