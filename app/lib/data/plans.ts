import 'server-only';

import { apiFetch } from '../api/client';
import { isApiError, type ApiError } from '../api/errors';
import {
  offeredPlans,
  plansResponseSchema,
  type OfferedPlan,
} from '../schemas/billing';

/*
 * The plans the landing offers (M9, wired 2026-10-14): `GET /billing/plans`
 * read on the server, with no session, for every visitor. Today the API
 * answers it to signed-in specialists only (a 401), so the landing keeps
 * the mockup's plans until Heyscar opens it (AGENTS.md §13); the day it
 * answers, the real plans take their place with no change here.
 *
 * The Data Cache keeps only a 200 (Next's patched fetch), so a refusal
 * would cost the API one call per visit: an instance remembers it for a
 * while instead. One short try, no retries: the landing never waits long
 * for a section it can stand without.
 */

export const plansTag = 'plans';

/** The plans change when the admin edits one: five minutes. */
const PLANS_REVALIDATE_SECONDS = 300;

/** The landing's wait for the plans: short, once. */
const PLANS_TIMEOUT_MS = 4000;

/** How long an instance remembers that the API refused, before asking again. */
const REFUSAL_MEMORY_MS = 10 * 60_000;

export type LandingPlans =
  /** The plans on offer, the cheapest first. */
  | { status: 'offered'; plans: OfferedPlan[] }
  /** The API keeps them for signed-in specialists: the landing shows its own. */
  | { status: 'private' }
  /** The API could not answer: the landing says so. */
  | { status: 'unavailable' };

let refusedUntil = 0;

const isRefusal = (error: ApiError) =>
  error.status === 401 || error.status === 403;

/** Forgets a refusal, so the next read asks the API again (tests). */
export function forgetPlansRefusal(): void {
  refusedUntil = 0;
}

export async function getLandingPlans(now = Date.now()): Promise<LandingPlans> {
  if (now < refusedUntil) return { status: 'private' };
  try {
    const { plans } = await apiFetch({
      path: '/billing/plans',
      schema: plansResponseSchema,
      next: { revalidate: PLANS_REVALIDATE_SECONDS, tags: [plansTag] },
      timeoutMs: PLANS_TIMEOUT_MS,
      maxRetries: 0,
      // Until the API opens the plans, the refusal is its answer, not a fault.
      expected: isRefusal,
    });
    refusedUntil = 0;
    return { status: 'offered', plans: offeredPlans(plans) };
  } catch (error) {
    if (isApiError(error) && isRefusal(error)) {
      refusedUntil = now + REFUSAL_MEMORY_MS;
      return { status: 'private' };
    }
    return { status: 'unavailable' };
  }
}
