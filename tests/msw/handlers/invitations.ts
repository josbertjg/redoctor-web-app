import { http, HttpResponse } from 'msw';

import { claimBodySchema } from '@/app/lib/schemas/invitations';

import { knownUserId } from '../../factories/identity';
import {
  buildClaimedInvitationResponse,
  invitationFor,
  invitationTokens,
} from '../../factories/invitations';
import { apiUrl, errorEnvelope } from '../api-url';
import { badRequest, isStranger, unauthorized } from './identity';

const notFound = () =>
  HttpResponse.json(errorEnvelope('ERR_4001', 'Invitation not found'), {
    status: 404,
  });

const conflict = (code: string, details?: Record<string, unknown>) =>
  HttpResponse.json(
    { ...errorEnvelope(code, 'Conflict'), ...(details ? { details } : {}) },
    { status: 409 },
  );

/*
 * The invitation link (M4), built from the factories: the public read by
 * token, and the claim with the API's rules — a session, a strict body, a
 * document check for SELF, the missing data of someone in one's care for
 * DEPENDENT, and the confirmation only inside its window.
 */
export const invitationsHandlers = [
  http.get(apiUrl('/scheduling/invitations/:token'), ({ params }) => {
    const invitation = invitationFor(String(params.token));
    return invitation ? HttpResponse.json(invitation) : notFound();
  }),

  http.post(
    apiUrl('/scheduling/invitations/:token/claim'),
    async ({ request, params }) => {
      if (isStranger(request)) return unauthorized();
      const parsed = claimBodySchema.safeParse(await request.json());
      if (!parsed.success) return badRequest();
      const token = String(params.token);
      const current = invitationFor(token);
      if (!current) return notFound();
      if (current.invitation.status !== 'PENDING') return conflict('ERR_4010');

      const body = parsed.data;
      const { invitation, appointment } = current;
      if (body.relationship === 'SELF') {
        if (token === invitationTokens.withoutDocument) {
          return conflict('ERR_4014', {
            reason: 'INVITATION_WITHOUT_DOCUMENT',
          });
        }
        if (token === invitationTokens.mismatch) {
          return conflict('ERR_4014', { reason: 'DOCUMENT_MISMATCH' });
        }
      }
      if (
        body.relationship === 'DEPENDENT' &&
        ((!invitation.invitedDateOfBirth && !body.dateOfBirth) ||
          (!invitation.invitedSex && !body.sex))
      ) {
        return badRequest();
      }
      const confirmed = body.confirm === true && appointment.canConfirmNow;
      return HttpResponse.json(
        buildClaimedInvitationResponse(knownUserId, {
          invitation: {
            relationship: body.relationship,
            invitedFirstName: invitation.invitedFirstName,
          },
          appointment: {
            status: confirmed ? 'CONFIRMED' : 'PENDING_CONFIRMATION',
            canConfirmNow: false,
          },
        }),
      );
    },
  ),
];
