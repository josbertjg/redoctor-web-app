import type { ReactNode } from 'react';

import Directions from '@material-symbols/svg-400/rounded/directions.svg?svgr';
import LocationOn from '@material-symbols/svg-400/rounded/location_on.svg?svgr';
import Payments from '@material-symbols/svg-400/rounded/payments.svg?svgr';
import Person from '@material-symbols/svg-400/rounded/person.svg?svgr';
import { useTranslations } from 'next-intl';

import { formatBirthDate } from '@/app/lib/format/date-of-birth';
import { formatIdentityDocument } from '@/app/lib/format/identity-document';
import { formatPrice } from '@/app/lib/format/money';
import { directionsUrl } from '@/app/lib/maps';
import type { Invitation } from '@/app/lib/schemas/invitations';

import { Icon, type IconComponent } from '@/app/ui/icons';

type AppointmentDetailsProps = {
  invitation: Invitation;
  /**
   * The invited person's document, birth date, sex and the reason: only for
   * someone signed in. A link travels by WhatsApp and gets forwarded, and
   * the API still answers it all to anyone who has it (REDOC-315).
   */
  showPrivate: boolean;
};

/*
 * The rest of the app's invitation summary: the office (with «Cómo llegar»
 * to its exact place), the price and the invited patient.
 */
export function AppointmentDetails({
  invitation,
  showPrivate,
}: AppointmentDetailsProps) {
  const t = useTranslations();
  const { appointment, invited } = invitation;
  const { office } = appointment;
  const price = formatPrice(
    appointment.price,
    {
      from: (amount) => t('priceFormat.from', { amount }),
      rangeShort: (min, max) => t('priceFormat.rangeShort', { min, max }),
      range: (min, max) => t('priceFormat.range', { min, max }),
    },
    'detailed',
  );
  const sex =
    invited.sex === 'MALE'
      ? t('male')
      : invited.sex === 'FEMALE'
        ? t('female')
        : null;

  return (
    <dl className="flex animate-fade-up flex-col divide-y divide-divider rounded-2xl bg-pure-white px-5 shadow-md">
      {office.name ? (
        <Detail icon={LocationOn} term={t('appointments.detail.office')}>
          <p className="font-medium text-text-primary">{office.name}</p>
          {office.address ? <p>{office.address}</p> : null}
          {office.description ? <p>{office.description}</p> : null}
          {office.coordinates ? (
            <a
              href={directionsUrl(office.coordinates)}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={t('specialists.directionsTo', {
                office: office.name,
              })}
              className="inline-flex min-h-touch items-center gap-1.5 self-start rounded-sm text-label-lg text-primary outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <Icon icon={Directions} size={18} />
              {t('specialists.directions')}
            </a>
          ) : null}
        </Detail>
      ) : null}
      {price ? (
        <Detail icon={Payments} term={t('price')}>
          <p className="text-text-primary">{price}</p>
        </Detail>
      ) : null}
      <Detail icon={Person} term={t('appointments.invitation.invitedPatient')}>
        <p className="font-medium text-text-primary">
          {invited.firstName} {invited.lastName}
        </p>
        {showPrivate ? (
          <dl className="mt-1 grid gap-1">
            {invited.document ? (
              <Fact term={t('identityDocument')}>
                {formatIdentityDocument(
                  invited.document.type,
                  invited.document.number,
                )}
              </Fact>
            ) : null}
            {invited.dateOfBirth ? (
              <Fact term={t('dateOfBirth')}>
                {formatBirthDate(invited.dateOfBirth)}
              </Fact>
            ) : null}
            {sex ? <Fact term={t('sex')}>{sex}</Fact> : null}
            {appointment.reason ? (
              <Fact term={t('appointments.detail.reason')}>
                {appointment.reason}
              </Fact>
            ) : null}
          </dl>
        ) : null}
      </Detail>
    </dl>
  );
}

function Detail({
  icon,
  term,
  children,
}: {
  icon: IconComponent;
  term: string;
  children: ReactNode;
}) {
  // A definition list holds its terms and descriptions directly: the icon
  // goes with the term, and the description lines up under its words.
  return (
    <div className="flex flex-col gap-1 py-4">
      <dt className="flex items-center gap-2 text-label-md text-text-secondary">
        <Icon icon={icon} size={20} className="shrink-0 text-primary" />
        {term}
      </dt>
      <dd className="flex min-w-0 flex-col gap-0.5 pl-7 text-body-md text-text-secondary">
        {children}
      </dd>
    </div>
  );
}

function Fact({ term, children }: { term: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap gap-x-1">
      <dt>{term}:</dt>
      <dd className="text-text-primary">{children}</dd>
    </div>
  );
}
