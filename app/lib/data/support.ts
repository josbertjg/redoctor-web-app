import 'server-only';

import { apiFetch } from '../api/client';
import {
  supportContactResponseSchema,
  toSupportContact,
} from '../schemas/support';
import { noSupport, type SupportContact } from '../support';

/*
 * The support lines for what the server renders (the legal pages, the
 * specialist's way into the app). Public, and the API takes 30 requests a
 * minute from one address — from the web's server every visitor is one —,
 * so the answer is shared from the Data Cache for five minutes. Support is
 * never what a page waits on: an API that does not answer in a moment, or
 * answers anything else, leaves the page without support lines, which is
 * a state the page already handles.
 */

export const supportTag = 'support';

const SUPPORT_REVALIDATE_SECONDS = 300;

const SUPPORT_TIMEOUT_MS = 3000;

/** Several reads in one render are one request: Next.js memoizes the fetch. */
export async function getSupportContact(): Promise<SupportContact> {
  try {
    const response = await apiFetch({
      path: '/config/support',
      schema: supportContactResponseSchema,
      next: { revalidate: SUPPORT_REVALIDATE_SECONDS, tags: [supportTag] },
      timeoutMs: SUPPORT_TIMEOUT_MS,
      maxRetries: 0,
      // A refusal or a timeout costs the page nothing: no report.
      expected: () => true,
    });
    return toSupportContact(response);
  } catch {
    return noSupport;
  }
}
