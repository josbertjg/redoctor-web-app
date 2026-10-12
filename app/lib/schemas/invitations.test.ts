import { describe, expect, it } from 'vitest';

import {
  buildClaimedInvitationResponse,
  buildInvitationResponse,
} from '@/tests/factories/invitations';

import { meResponseSchema, toAccount } from './identity';
import {
  invitationResponseSchema,
  personalDataFrom,
  planInvitationView,
  toInvitation,
  type SessionForInvitation,
} from './invitations';
import {
  buildMeResponse,
  buildNewAccountMeResponse,
  buildSpecialistMeResponse,
  knownUserId,
  patientFacet,
} from '../../../tests/factories/identity';

const invitation = (
  input: Parameters<typeof invitationResponseSchema.parse>[0],
) => toInvitation(invitationResponseSchema.parse(input));

const signedIn = (
  me: Parameters<typeof meResponseSchema.parse>[0],
): SessionForInvitation => ({
  status: 'signed-in',
  account: toAccount(meResponseSchema.parse(me)),
  accountStatus: 'ready',
});

const signedOut: SessionForInvitation = {
  status: 'signed-out',
  account: null,
  accountStatus: 'idle',
};

describe('toInvitation', () => {
  it('keeps what the page shows and decides with', () => {
    const pending = invitation(buildInvitationResponse());

    expect(pending.status).toBe('pending');
    expect(pending.invited).toEqual({
      firstName: 'Ana',
      lastName: 'Pérez',
      dateOfBirth: '1990-05-14',
      sex: 'FEMALE',
      document: { type: 'V', number: '12345678' },
      phone: '+584141234567',
    });
    expect(pending.canBeClaimedAsSelf).toBe(true);
    expect(pending.appointment.specialist.name).toBe('Dra. María González');
    expect(pending.appointment.office.coordinates).toEqual({
      latitude: 10.4961,
      longitude: -66.8467,
    });
  });

  it('only lets a representative claim one without a document', () => {
    const child = invitation(
      buildInvitationResponse({
        invitation: {
          invitedDocumentType: null,
          invitedDocumentNumber: null,
          minorWithoutDocument: true,
        },
      }),
    );

    expect(child.invited.document).toBeNull();
    expect(child.canBeClaimedAsSelf).toBe(false);
  });

  it('reads an unknown status as pending, as the app does', () => {
    expect(
      invitation(buildInvitationResponse({ invitation: { status: 'NEW' } }))
        .status,
    ).toBe('pending');
  });

  it('takes the calendar day of a birth date and drops blank values', () => {
    const odd = invitation(
      buildInvitationResponse({
        invitation: {
          invitedDateOfBirth: '1990-05-14T00:00:00.000Z',
          invitedPhone: '  ',
          invitedSex: 'OTHER',
        },
      }),
    );

    expect(odd.invited.dateOfBirth).toBe('1990-05-14');
    expect(odd.invited.phone).toBeNull();
    expect(odd.invited.sex).toBeNull();
  });
});

describe('planInvitationView', () => {
  const pending = invitation(buildInvitationResponse());

  it('says an invitation that is over is over, whoever looks', () => {
    for (const status of ['EXPIRED', 'CANCELLED'] as const) {
      const over = invitation(
        buildInvitationResponse({ invitation: { status } }),
      );
      expect(planInvitationView(over, signedOut).kind).toBe(
        status === 'EXPIRED' ? 'expired' : 'cancelled',
      );
    }
  });

  it('waits for the session, then asks a stranger to sign in', () => {
    expect(
      planInvitationView(pending, { ...signedOut, status: 'resolving' }).kind,
    ).toBe('waiting');
    expect(planInvitationView(pending, signedOut).kind).toBe('sign-in');
  });

  it('lets a patient claim it, after the sign-up when it is open', () => {
    expect(planInvitationView(pending, signedIn(buildMeResponse()))).toEqual({
      kind: 'claim',
      mustSignUp: false,
    });
    expect(
      planInvitationView(pending, signedIn(buildNewAccountMeResponse())),
    ).toEqual({ kind: 'claim', mustSignUp: true });
    expect(
      planInvitationView(
        pending,
        signedIn(
          buildMeResponse({
            registrationStatus: 'PENDING_COMPLETE_PATIENT',
            profiles: {
              patient: patientFacet({ status: 'PENDING_PERSONAL_DATA' }),
              specialist: { exists: false },
            },
          }),
        ),
      ),
    ).toEqual({ kind: 'claim', mustSignUp: true });
  });

  it('keeps specialists out: invitations are the patient’s', () => {
    expect(
      planInvitationView(pending, signedIn(buildSpecialistMeResponse())).kind,
    ).toBe('for-patients');
  });

  it('tells whose it is once claimed', () => {
    const mine = invitation(buildClaimedInvitationResponse(knownUserId));
    const theirs = invitation(buildClaimedInvitationResponse('someone-else'));

    expect(planInvitationView(mine, signedIn(buildMeResponse())).kind).toBe(
      'claimed-by-me',
    );
    expect(planInvitationView(theirs, signedIn(buildMeResponse())).kind).toBe(
      'claimed-by-other',
    );
    expect(planInvitationView(mine, signedOut).kind).toBe('claimed-signed-out');
  });

  it('offers a retry when the account cannot be read', () => {
    expect(
      planInvitationView(pending, {
        status: 'signed-in',
        account: null,
        accountStatus: 'error',
      }).kind,
    ).toBe('account-error');
  });
});

describe('personalDataFrom', () => {
  it('fills the sign-up with the invited person’s data', () => {
    expect(personalDataFrom(invitation(buildInvitationResponse()))).toEqual({
      dateOfBirth: '1990-05-14',
      phone: '414 123 4567',
      documentType: 'V',
      documentNumber: '12345678',
      sex: 'FEMALE',
    });
  });

  it('leaves out what the web cannot take', () => {
    expect(
      personalDataFrom(
        invitation(
          buildInvitationResponse({
            invitation: {
              invitedPhone: '+15555550100',
              invitedDateOfBirth: null,
              invitedSex: null,
              invitedDocumentNumber: null,
            },
          }),
        ),
      ),
    ).toEqual({});
  });
});
