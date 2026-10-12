import { useTranslations } from 'next-intl';

import { formatBirthDate } from '@/app/lib/format/date-of-birth';
import { formatIdentityDocument } from '@/app/lib/format/identity-document';
import type { Invitation } from '@/app/lib/schemas/invitations';

import {
  AppointmentDetails,
  type PatientFact,
} from '@/app/ui/appointments/appointment-details';

type InvitationDetailsProps = {
  invitation: Invitation;
  /**
   * The invited person's document, birth date, sex and the reason: only for
   * someone signed in. A link travels by WhatsApp and gets forwarded, and
   * the API still answers it all to anyone who has it (REDOC-315).
   */
  showPrivate: boolean;
};

/** The invitation's details: the app's summary, with the invited patient. */
export function InvitationDetails({
  invitation,
  showPrivate,
}: InvitationDetailsProps) {
  const t = useTranslations();
  const { invited, appointment } = invitation;

  const facts: PatientFact[] = [];
  if (showPrivate) {
    if (invited.document) {
      facts.push({
        term: t('identityDocument'),
        value: formatIdentityDocument(
          invited.document.type,
          invited.document.number,
        ),
      });
    }
    if (invited.dateOfBirth) {
      facts.push({
        term: t('dateOfBirth'),
        value: formatBirthDate(invited.dateOfBirth),
      });
    }
    if (invited.sex) {
      facts.push({
        term: t('sex'),
        value: t(invited.sex === 'MALE' ? 'male' : 'female'),
      });
    }
    if (appointment.reason) {
      facts.push({
        term: t('appointments.detail.reason'),
        value: appointment.reason,
      });
    }
  }

  return (
    <AppointmentDetails
      appointment={appointment}
      patient={{
        heading: t('appointments.invitation.invitedPatient'),
        name: `${invited.firstName} ${invited.lastName}`,
        facts,
      }}
    />
  );
}
