import { queryOptions } from '@tanstack/react-query';

import { apiFetch } from '../api/client';
import { isApiError } from '../api/errors';
import { createWriteOnceGuard } from '../api/write-once';
import {
  invitationResponseSchema,
  selfClaimRefusals,
  type ClaimBody,
  type InvitationResponse,
  type SelfClaimRefusal,
} from '../schemas/invitations';

/*
 * The invitation behind `/i/{token}` (M4), read in the browser: it is a
 * patient's data, so it comes from their own device (AGENTS.md §5). The
 * token travels only inside the path the client fills; errors and reports
 * carry the route template, never the token.
 */

export const invitationKeys = {
  detail: (token: string) => ['invitation', token] as const,
};

/** The invitation, or null when no invitation has that token (a wrong link is no error to report). */
async function readInvitation(
  token: string,
  signal?: AbortSignal,
): Promise<InvitationResponse | null> {
  try {
    return await apiFetch({
      path: '/scheduling/invitations/:token',
      params: { token },
      schema: invitationResponseSchema,
      ...(signal ? { signal } : {}),
    });
  } catch (error) {
    if (isApiError(error) && error.status === 404) return null;
    throw error;
  }
}

export function invitationQueryOptions(token: string) {
  return queryOptions({
    queryKey: invitationKeys.detail(token),
    queryFn: ({ signal }) => readInvitation(token, signal),
    // Someone may claim it from another device: short, but no polling.
    staleTime: 30_000,
  });
}

type Claimer = {
  /** The API's id for the account (`/identity/me`), as `acceptedByUserId` names it. */
  accountId: string;
  getToken: () => Promise<string>;
};

/** The claim left the invitation in this account. */
const claimedBy = (response: InvitationResponse | null, accountId: string) =>
  response?.invitation.status === 'ACCEPTED' &&
  response.invitation.acceptedByUserId === accountId;

/*
 * A claim must not land twice (AGENTS.md §5): when its answer is lost, the
 * write-once guard reads the invitation before sending again. A refusal
 * because it is no longer pending is not an error when this same account
 * holds it (a second tab, a lost answer).
 */
const claims = createWriteOnceGuard<InvitationResponse>();

export function claimInvitation(
  claimer: Claimer,
  token: string,
  body: ClaimBody,
): Promise<InvitationResponse> {
  return claims({
    intent: `claim:${token}`,
    send: async () => {
      try {
        return await apiFetch({
          method: 'POST',
          path: '/scheduling/invitations/:token/claim',
          params: { token },
          token: await claimer.getToken(),
          body,
          schema: invitationResponseSchema,
        });
      } catch (error) {
        if (isApiError(error) && error.status === 409) {
          const current = await readInvitation(token);
          if (current !== null && claimedBy(current, claimer.accountId)) {
            return current;
          }
        }
        throw error;
      }
    },
    findLanded: async () => {
      const current = await readInvitation(token);
      return current !== null && claimedBy(current, claimer.accountId)
        ? current
        : null;
    },
  });
}

/** Why the API refused a SELF claim (409 ERR_4014), or null for any other failure. */
export function selfClaimRefusalOf(error: unknown): SelfClaimRefusal | null {
  if (!isApiError(error) || error.status !== 409 || error.code !== 'ERR_4014')
    return null;
  const reason = error.details?.reason;
  return (selfClaimRefusals as readonly unknown[]).includes(reason)
    ? (reason as SelfClaimRefusal)
    : null;
}
