import type { invitationResponseSchema } from '@/app/lib/schemas/invitations';

import { knownUserId } from './identity';

import type { z } from 'zod';

type InvitationInput = z.input<typeof invitationResponseSchema>;
/** As the API sends them: the contract's fields, plus the ones the web drops. */
type InvitedInput = InvitationInput['invitation'] & Record<string, unknown>;
type AppointmentInput = InvitationInput['appointment'] &
  Record<string, unknown>;
type InvitationPayload = {
  invitation: InvitedInput;
  appointment: AppointmentInput;
};

/** The tokens the handlers know: each one a case of `/i/{token}`. */
export const invitationTokens = {
  pending: 'tok-pending-000000000001',
  /** Within its confirmation window: the claim may confirm it too. */
  confirmable: 'tok-confirmable-0000001',
  /** A child with no document: only a representative claims it, and the API lacks the birth date and sex. */
  withoutDocument: 'tok-no-document-000001',
  /** A SELF claim the API refuses: the account's document is another. */
  mismatch: 'tok-mismatch-00000000001',
  claimedByMe: 'tok-claimed-me-00000001',
  claimedByOther: 'tok-claimed-other-0001',
  expired: 'tok-expired-000000000001',
  cancelled: 'tok-cancelled-0000000001',
  /** No invitation has it: 404. */
  missing: 'tok-missing-000000000001',
} as const;

/** What `GET /scheduling/invitations/{token}` answers for a pending invitation. */
export function buildInvitationResponse(
  overrides: {
    invitation?: Partial<InvitedInput>;
    appointment?: Partial<AppointmentInput>;
  } = {},
): InvitationPayload {
  return {
    invitation: {
      id: '0f9d7c1e-2b3a-4c5d-8e6f-7a8b9c0d1e2f',
      appointmentId: '8f2c1a3e-6b7d-4c2e-9a1f-3d4e5f6a7b8c',
      relationship: 'SELF',
      status: 'PENDING',
      invitedFirstName: 'Ana',
      invitedLastName: 'Pérez',
      invitedDateOfBirth: '1990-05-14',
      invitedSex: 'FEMALE',
      invitedDocumentType: 'V',
      invitedDocumentNumber: '12345678',
      minorWithoutDocument: false,
      invitedPhone: '+584141234567',
      acceptedByUserId: null,
      acceptedAt: null,
      expiresAt: '2026-10-21T19:00:00.000Z',
      ...overrides.invitation,
    },
    appointment: {
      id: '8f2c1a3e-6b7d-4c2e-9a1f-3d4e5f6a7b8c',
      patientUserId: null,
      specialistId: '5b8e2c14-3f1a-4d7e-9c2b-7a1e0f6d4b92',
      forSelf: true,
      slot: {
        date: '2026-10-22',
        startTime: '15:00',
        endTime: '15:30',
        timezone: 'America/Caracas',
        startsAtUtc: '2026-10-22T19:00:00.000Z',
      },
      price: {
        type: 'FIXED',
        currency: 'USD',
        amount: 40,
        minAmount: null,
        maxAmount: null,
      },
      attendee: { firstName: 'Ana', lastName: 'Pérez' },
      specialistName: 'Dra. María González',
      specialistPhotoUrl: null,
      specialistSpecialties: [
        { id: 'a0000000-0000-4000-8000-000000000014', name: 'Pediatría' },
      ],
      officeName: 'Clínica Canaima',
      officeAddress:
        'Av. Francisco de Miranda, Torre Canaima, piso 3, Los Palos Grandes, Caracas',
      officeDescription: 'Consultorio 3-B, a la derecha al salir del ascensor',
      officeLatitude: 10.4961,
      officeLongitude: -66.8467,
      reasonName: 'Control pediátrico',
      status: 'PENDING_CONFIRMATION',
      canConfirmNow: false,
      confirmationWindowOpensAt: '2026-10-21T19:00:00.000Z',
      ...overrides.appointment,
    },
  };
}

/** The same invitation, claimed by an account. */
export function buildClaimedInvitationResponse(
  acceptedBy = knownUserId,
  overrides: {
    invitation?: Partial<InvitedInput>;
    appointment?: Partial<AppointmentInput>;
  } = {},
): InvitationPayload {
  return buildInvitationResponse({
    invitation: {
      status: 'ACCEPTED',
      acceptedByUserId: acceptedBy,
      ...overrides.invitation,
    },
    appointment: { patientUserId: acceptedBy, ...overrides.appointment },
  });
}

/** The invitation each known token answers, or undefined for an unknown one. */
export function invitationFor(token: string): InvitationPayload | undefined {
  switch (token) {
    case invitationTokens.pending:
      return buildInvitationResponse();
    case invitationTokens.confirmable:
      return buildInvitationResponse({ appointment: { canConfirmNow: true } });
    case invitationTokens.withoutDocument:
      return buildInvitationResponse({
        invitation: {
          invitedFirstName: 'Sofía',
          invitedDocumentType: null,
          invitedDocumentNumber: null,
          minorWithoutDocument: true,
          invitedDateOfBirth: null,
          invitedSex: null,
        },
        appointment: { attendee: { firstName: 'Sofía', lastName: 'Pérez' } },
      });
    case invitationTokens.mismatch:
      return buildInvitationResponse({
        invitation: { invitedDocumentNumber: '87654321' },
      });
    case invitationTokens.claimedByMe:
      return buildClaimedInvitationResponse();
    case invitationTokens.claimedByOther:
      return buildClaimedInvitationResponse(
        '9e8d7c6b-5a49-4382-a716-152433445566',
      );
    case invitationTokens.expired:
      return buildInvitationResponse({ invitation: { status: 'EXPIRED' } });
    case invitationTokens.cancelled:
      return buildInvitationResponse({ invitation: { status: 'CANCELLED' } });
    default:
      return undefined;
  }
}
