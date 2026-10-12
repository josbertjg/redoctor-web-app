import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';

import { invitationTokens } from '@/tests/factories/invitations';

import {
  claimInvitation,
  invitationQueryOptions,
  selfClaimRefusalOf,
} from './invitations';
import { knownUserId } from '../../../tests/factories/identity';
import { validToken } from '../../../tests/msw/handlers/identity';

const claimer = {
  accountId: knownUserId,
  getToken: () => Promise.resolve(validToken),
};

const read = (token: string) =>
  new QueryClient().query(invitationQueryOptions(token));

describe('invitationQueryOptions', () => {
  it('reads an invitation by its token, without a session', async () => {
    const response = await read(invitationTokens.pending);
    expect(response?.invitation.status).toBe('PENDING');
  });

  it('answers null for a token no invitation has', async () => {
    await expect(read(invitationTokens.missing)).resolves.toBeNull();
  });
});

describe('claimInvitation', () => {
  it('links the appointment to the account', async () => {
    const response = await claimInvitation(claimer, invitationTokens.pending, {
      relationship: 'SELF',
    });

    expect(response.invitation.status).toBe('ACCEPTED');
    expect(response.invitation.acceptedByUserId).toBe(knownUserId);
  });

  it('confirms in the same step when the window is open', async () => {
    const response = await claimInvitation(
      claimer,
      invitationTokens.confirmable,
      { relationship: 'SELF', confirm: true },
    );
    expect(response.appointment.status).toBe('CONFIRMED');
  });

  it('counts a claim this account already holds as done', async () => {
    const response = await claimInvitation(
      claimer,
      invitationTokens.claimedByMe,
      { relationship: 'SELF' },
    );
    expect(response.invitation.acceptedByUserId).toBe(knownUserId);
  });

  it('says why the API refused a SELF claim', async () => {
    const error: unknown = await claimInvitation(
      claimer,
      invitationTokens.mismatch,
      { relationship: 'SELF' },
    ).catch((caught: unknown) => caught);

    expect(selfClaimRefusalOf(error)).toBe('DOCUMENT_MISMATCH');
  });

  it('refuses someone else’s claimed invitation', async () => {
    const error: unknown = await claimInvitation(
      claimer,
      invitationTokens.claimedByOther,
      { relationship: 'SELF' },
    ).catch((caught: unknown) => caught);

    expect(error).toMatchObject({ status: 409 });
    expect(selfClaimRefusalOf(error)).toBeNull();
  });
});
