import { z } from 'zod';

import {
  appointmentSchema,
  toAppointmentSummary,
  type AppointmentSummary,
} from './appointments';
import {
  canUseSpecialistArea,
  mustFinishPatientSignup,
  needsSignUp,
  type Account,
} from '../auth/account';
import { isDocumentType, type DocumentType } from '../format/identity-document';
import { nationalDigits, phoneProblem } from '../format/phone';

/*
 * The invitation behind `/i/{token}` (M4): `GET /scheduling/invitations/{token}`
 * is public, the token being the credential, and answers the invited
 * person's data with the appointment. `POST …/claim` links the appointment
 * to the signed-in account: SELF when the invited person claims it (the
 * API checks the account's document against the invitation's), DEPENDENT
 * when a representative claims it for someone in their care, who becomes
 * their «tercero». With `confirm: true` the claim also confirms it when the
 * confirmation window is open. Mirrors the app's AppointmentInvitation.
 *
 * The token never leaves this flow: not in logs, analytics or reports
 * (AGENTS.md §6, §11).
 */

export const claimRelationships = ['SELF', 'DEPENDENT'] as const;
export type ClaimRelationship = (typeof claimRelationships)[number];

export const invitationSexes = ['MALE', 'FEMALE'] as const;
export type InvitedSex = (typeof invitationSexes)[number];

// Lenient where the API may grow: an unknown status reads as pending, as
// in the app, and an unknown sex or document type as missing.
const invitedSchema = z.object({
  status: z.string(),
  invitedFirstName: z.string(),
  invitedLastName: z.string(),
  invitedDateOfBirth: z.string().nullish(),
  invitedSex: z.string().nullish(),
  invitedDocumentType: z.string().nullish(),
  invitedDocumentNumber: z.string().nullish(),
  minorWithoutDocument: z.boolean().nullish(),
  invitedPhone: z.string().nullish(),
  acceptedByUserId: z.string().nullish(),
});

export const invitationResponseSchema = z.object({
  invitation: invitedSchema,
  appointment: appointmentSchema,
});

export type InvitationResponse = z.infer<typeof invitationResponseSchema>;

export const claimBodySchema = z.strictObject({
  relationship: z.enum(claimRelationships),
  dateOfBirth: z.iso.date().optional(),
  sex: z.enum(invitationSexes).optional(),
  confirm: z.boolean().optional(),
});

export type ClaimBody = z.infer<typeof claimBodySchema>;

/** Why the API refuses a SELF claim (409 ERR_4014, `details.reason`). */
export const selfClaimRefusals = [
  'INVITATION_WITHOUT_DOCUMENT',
  'ACCOUNT_WITHOUT_DOCUMENT',
  'DOCUMENT_MISMATCH',
] as const;

export type SelfClaimRefusal = (typeof selfClaimRefusals)[number];

export type InvitationStatus = 'pending' | 'accepted' | 'expired' | 'cancelled';

export type Invitation = {
  status: InvitationStatus;
  /** The account (the API's id) that claimed it. */
  acceptedBy: string | null;
  invited: {
    firstName: string;
    lastName: string;
    /** YYYY-MM-DD. */
    dateOfBirth: string | null;
    sex: InvitedSex | null;
    document: { type: DocumentType; number: string } | null;
    phone: string | null;
  };
  /**
   * Whether the invited person can claim it as themselves: only with a
   * document the API can check the account against (the app's
   * `canBeClaimedAsSelf`). Without one, only a representative claims it.
   */
  canBeClaimedAsSelf: boolean;
  appointment: AppointmentSummary;
};

const statuses: Readonly<Record<string, InvitationStatus>> = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  EXPIRED: 'expired',
  CANCELLED: 'cancelled',
};

const calendarDay = /^\d{4}-\d{2}-\d{2}/;

/** Trimmed text, or null when there is none. */
const filled = (value: string | null | undefined): string | null => {
  const text = value?.trim() ?? '';
  return text === '' ? null : text;
};

export function toInvitation(response: InvitationResponse): Invitation {
  const invited = response.invitation;
  const documentNumber = filled(invited.invitedDocumentNumber);
  const documentType = invited.invitedDocumentType ?? '';
  const sex = invited.invitedSex;

  return {
    status: statuses[invited.status] ?? 'pending',
    acceptedBy: invited.acceptedByUserId ?? null,
    invited: {
      firstName: invited.invitedFirstName,
      lastName: invited.invitedLastName,
      dateOfBirth:
        calendarDay.exec(invited.invitedDateOfBirth ?? '')?.[0] ?? null,
      sex: sex === 'MALE' || sex === 'FEMALE' ? sex : null,
      document:
        documentNumber && isDocumentType(documentType)
          ? { type: documentType, number: documentNumber }
          : null,
      phone: filled(invited.invitedPhone),
    },
    canBeClaimedAsSelf:
      !(invited.minorWithoutDocument ?? false) && documentNumber !== null,
    appointment: toAppointmentSummary(response.appointment),
  };
}

/** What `/i/{token}` shows, from the invitation and the session. */
export type InvitationView =
  | { kind: 'expired' }
  | { kind: 'cancelled' }
  /** Session or account still on their way. */
  | { kind: 'waiting' }
  | { kind: 'account-error' }
  | { kind: 'claimed-by-me' }
  | { kind: 'claimed-by-other' }
  /** Claimed, and nobody signed in to say whether it was them. */
  | { kind: 'claimed-signed-out' }
  | { kind: 'sign-in' }
  /** A specialist's or an admin's account: invitations are the patient's to claim. */
  | { kind: 'for-patients' }
  /** The claim; first the sign-up when the account has not finished it. */
  | { kind: 'claim'; mustSignUp: boolean };

export type SessionForInvitation = {
  status: 'resolving' | 'signed-out' | 'signed-in';
  account: Account | null;
  accountStatus: 'idle' | 'loading' | 'ready' | 'error';
};

export function planInvitationView(
  invitation: Invitation,
  session: SessionForInvitation,
): InvitationView {
  if (invitation.status === 'expired') return { kind: 'expired' };
  if (invitation.status === 'cancelled') return { kind: 'cancelled' };
  if (session.status === 'resolving') return { kind: 'waiting' };

  const accepted = invitation.status === 'accepted';
  if (session.status === 'signed-out') {
    return { kind: accepted ? 'claimed-signed-out' : 'sign-in' };
  }
  if (session.accountStatus === 'error') return { kind: 'account-error' };
  const { account } = session;
  if (account === null) return { kind: 'waiting' };

  if (accepted) {
    return {
      kind:
        invitation.acceptedBy === account.id
          ? 'claimed-by-me'
          : 'claimed-by-other',
    };
  }
  if (canUseSpecialistArea(account)) return { kind: 'for-patients' };
  return {
    kind: 'claim',
    mustSignUp: needsSignUp(account) || mustFinishPatientSignup(account),
  };
}

/** The personal data a patient's sign-up starts from when the invitation is theirs. */
export type PersonalDataDefaults = {
  dateOfBirth?: string;
  phone?: string;
  documentType?: DocumentType;
  documentNumber?: string;
  sex?: InvitedSex;
};

/**
 * The invited person's data, for the sign-up of whoever says the
 * appointment is for them (the app's prefill of «Finalizar registro»). Never
 * for a representative: it is someone else's data. A phone the web cannot
 * take (not a Venezuelan mobile) is left for the person to write.
 */
export function personalDataFrom(invitation: Invitation): PersonalDataDefaults {
  const { invited } = invitation;
  const defaults: PersonalDataDefaults = {};
  if (invited.dateOfBirth) defaults.dateOfBirth = invited.dateOfBirth;
  if (invited.phone && phoneProblem(invited.phone) === null) {
    const digits = nationalDigits(invited.phone);
    defaults.phone = `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
  }
  if (invited.document) {
    defaults.documentType = invited.document.type;
    defaults.documentNumber = invited.document.number;
  }
  if (invited.sex) defaults.sex = invited.sex;
  return defaults;
}
