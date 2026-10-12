import type { ReactNode } from 'react';

import Directions from '@material-symbols/svg-400/rounded/directions.svg?svgr';
import LocationOn from '@material-symbols/svg-400/rounded/location_on.svg?svgr';
import Payments from '@material-symbols/svg-400/rounded/payments.svg?svgr';
import Person from '@material-symbols/svg-400/rounded/person.svg?svgr';
import { useTranslations } from 'next-intl';

import { formatPrice } from '@/app/lib/format/money';
import { directionsUrl } from '@/app/lib/maps';
import type { AppointmentSummary } from '@/app/lib/schemas/appointments';

import { Icon, type IconComponent } from '@/app/ui/icons';

/** One labelled fact of the patient's section (document, reason, notes…). */
export type PatientFact = { term: string; value: string };

type AppointmentDetailsProps = {
  appointment: AppointmentSummary;
  /**
   * Who attends: the page decides what of them its viewer may see — an
   * invitation shows a stranger only the name (REDOC-315), the patient's
   * own appointment shows the reason and the notes.
   */
  patient: {
    heading: string;
    name: string | null;
    facts: readonly PatientFact[];
    /** A line under the facts (the appointment is someone in one's care). */
    note?: string | undefined;
  } | null;
};

/*
 * An appointment's details, as the app's summary lists them: the office,
 * with «Cómo llegar» to its exact place, the price and who attends. The
 * invitation (M4) and the appointment page (M5) share it.
 */
export function AppointmentDetails({
  appointment,
  patient,
}: AppointmentDetailsProps) {
  const t = useTranslations();
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
      {patient ? (
        <Detail icon={Person} term={patient.heading}>
          {patient.name ? (
            <p className="font-medium text-text-primary">{patient.name}</p>
          ) : null}
          {patient.facts.length > 0 ? (
            <dl className="mt-1 grid gap-1">
              {patient.facts.map((fact) => (
                // Term and value flow as one sentence: a long note wraps
                // under its label instead of dropping below it.
                <div key={fact.term}>
                  <dt className="inline">{fact.term}: </dt>
                  <dd className="inline text-text-primary">{fact.value}</dd>
                </div>
              ))}
            </dl>
          ) : null}
          {patient.note ? (
            <p className="mt-1 text-body-sm">{patient.note}</p>
          ) : null}
        </Detail>
      ) : null}
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
