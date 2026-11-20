'use client';

import type { ReactNode } from 'react';

import { useTranslations } from 'next-intl';

import {
  formatAppointmentDay,
  formatAppointmentTime,
} from '@/app/lib/format/appointment-time';
import { formatBirthDate } from '@/app/lib/format/date-of-birth';
import { formatIdentityDocument } from '@/app/lib/format/identity-document';
import { formatPrice } from '@/app/lib/format/money';
import type { BookingAttendee, BookingReason } from '@/app/lib/schemas/booking';

import { usePriceWords } from '@/app/hooks/use-price-words';

import type { BookingSpecialist, BookingStep } from './booking-types';

type SummaryStepProps = {
  office: BookingSpecialist['offices'][number];
  /** The office can be changed: the specialist has more than one. */
  canChangeOffice: boolean;
  day: string;
  time: string;
  reason: BookingReason | null;
  attendee: BookingAttendee;
  /** The account the appointment will be saved under (AGENTS.md §1). */
  savedUnder: string | null;
  onEdit: (step: BookingStep) => void;
};

/*
 * The app's «Resumen de tu cita»: the office, the day and hour, the person
 * in one's care when it is for one, the reason and its price, each with
 * «Editar» back to its step, and the app's notice that the consultation is
 * paid to the specialist. It says which account keeps the appointment, as
 * the invitation does.
 */
export function SummaryStep({
  office,
  canChangeOffice,
  day,
  time,
  reason,
  attendee,
  savedUnder,
  onEdit,
}: SummaryStepProps) {
  const t = useTranslations();
  const words = usePriceWords();
  const price = reason ? formatPrice(reason.price, words, 'detailed') : null;
  const person =
    attendee.kind === 'tercero'
      ? attendee.tercero
      : attendee.kind === 'new'
        ? attendee.person
        : null;

  return (
    <div className="flex flex-col gap-4">
      <dl className="flex flex-col divide-y divide-divider rounded-2xl bg-pure-white px-5 shadow-md">
        <SummaryRow
          term={t('office')}
          onEdit={
            canChangeOffice
              ? () => {
                  onEdit('office');
                }
              : undefined
          }
        >
          <p className="font-medium text-text-primary">{office.name}</p>
          <p>{office.address}</p>
          {office.description ? <p>{office.description}</p> : null}
        </SummaryRow>
        <SummaryRow
          term={t('dateAndTime')}
          onEdit={() => {
            onEdit('slot');
          }}
        >
          <p className="font-medium text-text-primary first-letter:uppercase">
            {formatAppointmentDay(day)}
          </p>
          <p>{formatAppointmentTime(time)}</p>
        </SummaryRow>
        {person ? (
          <SummaryRow
            term={t('patient')}
            onEdit={() => {
              onEdit('patient');
            }}
          >
            <p className="font-medium text-text-primary">
              {person.firstName} {person.lastName}
            </p>
            <p>{formatBirthDate(person.dateOfBirth)}</p>
            {person.document ? (
              <p>
                {formatIdentityDocument(
                  person.document.type,
                  person.document.number,
                )}
              </p>
            ) : null}
            {person.sex ? (
              <p>{t(person.sex === 'MALE' ? 'male' : 'female')}</p>
            ) : null}
          </SummaryRow>
        ) : null}
        {reason ? (
          <SummaryRow
            term={t('search.consultationReason')}
            onEdit={() => {
              onEdit('patient');
            }}
          >
            <p className="font-medium text-text-primary">{reason.name}</p>
          </SummaryRow>
        ) : null}
        <SummaryRow term={t('price')}>
          <p className="font-medium text-text-primary">
            {price ?? t('search.priceOnRequest')}
          </p>
        </SummaryRow>
      </dl>
      <p className="text-body-sm text-text-secondary">
        {t('search.confirm.priceDisclaimer')}
      </p>
      {savedUnder ? (
        <p className="text-body-md wrap-break-word text-text-secondary">
          {t.rich('appointments.invitation.savedUnder', {
            email: savedUnder,
            strong: (chunks) => (
              <strong className="font-semibold text-text-primary">
                {chunks}
              </strong>
            ),
          })}
        </p>
      ) : null}
    </div>
  );
}

function SummaryRow({
  term,
  onEdit,
  children,
}: {
  term: string;
  onEdit?: (() => void) | undefined;
  children: ReactNode;
}) {
  const t = useTranslations();
  return (
    <div className="flex items-start justify-between gap-3 py-4">
      <div className="flex min-w-0 flex-col gap-0.5">
        <dt className="text-label-md text-text-secondary">{term}</dt>
        <dd className="flex flex-col gap-0.5 text-body-md wrap-break-word text-text-secondary">
          {children}
        </dd>
      </div>
      {onEdit ? (
        <button
          type="button"
          onClick={onEdit}
          className="-my-2.5 inline-flex min-h-touch shrink-0 items-center rounded-sm text-label-lg text-primary outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          {t('edit')}
          <span className="sr-only"> {term.toLocaleLowerCase('es')}</span>
        </button>
      ) : null}
    </div>
  );
}
