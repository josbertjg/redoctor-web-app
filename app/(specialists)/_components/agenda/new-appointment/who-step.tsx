'use client';

import { useId, useMemo, useState } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import PersonHeart from '@material-symbols/svg-400/rounded/person_heart.svg?svgr';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';

import type { SessionUser } from '@/app/lib/firebase/client';
import { ageOn, earliestBirthDate } from '@/app/lib/format/date-of-birth';
import {
  documentTypes,
  formatIdentityDocument,
  type DocumentType,
} from '@/app/lib/format/identity-document';
import { formatPrice } from '@/app/lib/format/money';
import { toInternationalPhone, venezuelaCode } from '@/app/lib/format/phone';
import { officeServicesQueryOptions } from '@/app/lib/queries/booking';
import type {
  SpecialistBookingRequest,
  SpecialistPatient,
} from '@/app/lib/schemas/appointments';
import { terceroNeedsDocument } from '@/app/lib/schemas/booking';
import { cn } from '@/app/lib/utils';

import { Button } from '@/app/ui/button';
import { ChoiceCards } from '@/app/ui/choice-cards';
import { FieldError } from '@/app/ui/field-error';
import { Icon } from '@/app/ui/icons';
import { IdentityDocumentField } from '@/app/ui/identity-document-field';
import { SelectField } from '@/app/ui/select-field';
import type { SheetStep } from '@/app/ui/sheet';
import { StateChip } from '@/app/ui/state-chip';
import { TextField } from '@/app/ui/text-field';

import { usePersonChecks } from '@/app/hooks/use-person-checks';
import { usePriceWords } from '@/app/hooks/use-price-words';

import {
  usePatientSearch,
  type PatientSearchOrigin,
} from './use-patient-search';

type WhoValues = {
  documentType: DocumentType;
  documentNumber: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  sex: '' | 'MALE' | 'FEMALE';
  phone: string;
  reasonId: string;
};

const emptyValues: WhoValues = {
  documentType: 'V',
  documentNumber: '',
  firstName: '',
  lastName: '',
  dateOfBirth: '',
  sex: '',
  phone: '',
  reasonId: '',
};

/** The form's id: «Agendar cita», in the sheet's footer, submits it. */
const whoFormId = 'new-appointment-patient';

const calendarDate = /^\d{4}-\d{2}-\d{2}$/;

type WhoStepOptions = {
  user: SessionUser;
  officeId: string;
  today: string;
  /** Whether the step is on screen: only then are its reasons read. */
  enabled: boolean;
  /** The booking is on its way: the button says so, nothing is sent twice. */
  booking: boolean;
  /** Why the API refused it, in words; null when it did not. */
  problem: string | null;
  onBack: () => void;
  onBook: (
    patient: SpecialistBookingRequest['patient'],
    reasonId: string | null,
  ) => void;
};

/*
 * «Nueva cita»'s second step (`4663:3952`), as the app's patient step: the
 * document or the names look for a registered patient as they are typed
 * (`usePatientSearch`); one chosen becomes its card — what its account
 * lacks said, never in the way — and «Cambiar por otro paciente» undoes
 * it; otherwise the same fields register someone new: names, birth date,
 * the document from 9 years and a month, sex and the phone the invitation
 * goes to. The reason with its price, when the office has any. Validated
 * on blur and on «Agendar cita» (AGENTS.md §9).
 */
export function useWhoStep({
  user,
  officeId,
  today,
  enabled,
  booking,
  problem,
  onBack,
  onBook,
}: WhoStepOptions): SheetStep {
  const t = useTranslations();
  const words = usePriceWords();
  const problemId = useId();
  const [chosen, setChosen] = useState<SpecialistPatient | null>(null);
  const [origin, setOrigin] = useState<PatientSearchOrigin>('document');
  const resolver = useWhoResolver(chosen !== null, today);
  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors },
  } = useForm<WhoValues>({
    defaultValues: emptyValues,
    mode: 'onBlur',
    resolver,
  });
  const [documentNumber, firstName, lastName, dateOfBirth] = useWatch({
    control,
    name: ['documentNumber', 'firstName', 'lastName', 'dateOfBirth'],
  });
  const term =
    origin === 'document' ? documentNumber : `${firstName} ${lastName}`;
  const search = usePatientSearch(user, chosen ? '' : term, origin);
  const services = useQuery({
    ...officeServicesQueryOptions(user, officeId),
    enabled: enabled && officeId !== '',
  });
  const reasons = services.data ?? [];

  const submit = handleSubmit((values) => {
    if (booking) return;
    const reasonId = values.reasonId === '' ? null : values.reasonId;
    if (chosen) {
      onBook({ kind: 'registered', userId: chosen.userId }, reasonId);
      return;
    }
    const digits = values.documentNumber.replace(/\D/g, '');
    onBook(
      {
        kind: 'new',
        firstName: values.firstName.trim(),
        lastName: values.lastName.trim(),
        dateOfBirth: values.dateOfBirth,
        document:
          digits === '' ? null : { type: values.documentType, number: digits },
        sex: values.sex === '' ? null : values.sex,
        phone: toInternationalPhone(values.phone),
      },
      reasonId,
    );
  });

  const results = (field: PatientSearchOrigin) =>
    origin === field && !chosen ? (
      <PatientResults
        search={search}
        origin={field}
        onChoose={(patient) => {
          setChosen(patient);
        }}
      />
    ) : null;
  const documentExempt =
    calendarDate.test(dateOfBirth) && !terceroNeedsDocument(dateOfBirth, today);

  // The reason with its price, when the office has any: beside the sex
  // in the new patient's fields, under a registered one's card.
  const reasonField =
    reasons.length > 0 ? (
      <SelectField
        label={t('appointments.booking.reason')}
        options={[
          { value: '', label: t('appointments.booking.reasonPlaceholder') },
          ...reasons.map((reason) => {
            const price = formatPrice(reason.price, words);
            return {
              value: reason.id,
              label: price ? `${reason.name} · ${price}` : reason.name,
            };
          }),
        ]}
        {...register('reasonId')}
      />
    ) : null;

  return {
    title: t('appointments.booking.title'),
    body: (
      <form
        id={whoFormId}
        noValidate
        onSubmit={(event) => {
          void submit(event);
        }}
        className="flex flex-col gap-5 rounded-2xl bg-pure-white p-4 shadow-md sm:p-6"
      >
        <p className="flex items-center gap-2 text-body-xs font-semibold text-text-primary">
          <Icon icon={PersonHeart} size={20} className="text-primary" />
          {t('appointments.booking.patient')}
        </p>
        {chosen ? (
          <ChosenPatient
            patient={chosen}
            today={today}
            onChange={() => {
              setChosen(null);
              setValue('documentNumber', '');
              setOrigin('document');
            }}
          />
        ) : (
          <div className="grid animate-fade-in gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <IdentityDocumentField
                typeProps={register('documentType')}
                error={
                  documentExempt ? undefined : errors.documentNumber?.message
                }
                {...register('documentNumber', {
                  onChange: () => {
                    setOrigin('document');
                  },
                })}
              />
              {documentExempt ? (
                <p className="animate-fade-in text-body-sm text-text-secondary">
                  {t('appointments.book.noDocumentNeeded')}
                </p>
              ) : null}
              {results('document')}
            </div>
            <TextField
              label={t('phoneNumber')}
              type="tel"
              inputMode="tel"
              autoComplete="off"
              hint={t('appointments.booking.phoneHint')}
              error={errors.phone?.message}
              leading={
                <span className="pl-3 text-body-xs text-text-secondary">
                  {venezuelaCode}
                </span>
              }
              {...register('phone')}
            />
            <div className="flex flex-col gap-2">
              <div className="grid grid-cols-2 gap-3">
                <TextField
                  label={t('name')}
                  autoComplete="off"
                  error={errors.firstName?.message}
                  {...register('firstName', {
                    onChange: () => {
                      setOrigin('name');
                    },
                  })}
                />
                <TextField
                  label={t('lastName')}
                  autoComplete="off"
                  error={errors.lastName?.message}
                  {...register('lastName', {
                    onChange: () => {
                      setOrigin('name');
                    },
                  })}
                />
              </div>
              {results('name')}
            </div>
            <TextField
              label={t('dateOfBirth')}
              type="date"
              min={earliestBirthDate(today)}
              max={today}
              error={errors.dateOfBirth?.message}
              {...register('dateOfBirth')}
            />
            <ChoiceCards
              legend={t('sex')}
              options={(['MALE', 'FEMALE'] as const).map((sex) => ({
                value: sex,
                label: t(sex === 'MALE' ? 'male' : 'female'),
              }))}
              inputProps={register('sex')}
              error={errors.sex?.message}
            />
            {reasonField}
          </div>
        )}
        {chosen ? reasonField : null}
      </form>
    ),
    footer: (
      <div className="flex flex-col gap-2">
        <FieldError
          id={problemId}
          message={problem ?? undefined}
          className="text-center"
        />
        <div className="flex items-center justify-between gap-3">
          <Button variant="white" shape="soft" onClick={onBack}>
            {t('back')}
          </Button>
          <Button type="submit" form={whoFormId} shape="soft" loading={booking}>
            {t('appointments.booking.bookAppointment')}
          </Button>
        </div>
      </div>
    ),
  };
}

/** The checks of a new patient's fields; a registered one brings their account's. */
function useWhoResolver(registered: boolean, today: string) {
  const t = useTranslations();
  const person = usePersonChecks();
  return useMemo(() => {
    const schema = z
      .object({
        documentType: z.enum(documentTypes),
        documentNumber: z.string(),
        firstName: z.string(),
        lastName: z.string(),
        dateOfBirth: z.string(),
        sex: z.enum(['', 'MALE', 'FEMALE']),
        phone: z.string(),
        reasonId: z.string(),
      })
      .superRefine((values, context) => {
        if (registered) return;
        const check = (
          path: keyof WhoValues,
          rule: z.ZodType,
          value: string,
        ) => {
          const result = rule.safeParse(value);
          if (!result.success) {
            context.addIssue({
              code: 'custom',
              path: [path],
              message: result.error.issues[0]?.message ?? t('input.empty'),
            });
          }
        };
        check('firstName', person.name, values.firstName);
        check('lastName', person.name, values.lastName);
        check('dateOfBirth', person.dateOfBirth(false), values.dateOfBirth);
        check('sex', person.sex, values.sex);
        check('phone', person.phone, values.phone);
        // The document waits for a date that says whether it is needed.
        if (
          calendarDate.test(values.dateOfBirth) &&
          terceroNeedsDocument(values.dateOfBirth, today)
        ) {
          check('documentNumber', person.documentNumber, values.documentNumber);
        }
      });
    return zodResolver(schema);
  }, [registered, person, t, today]);
}

/** What the search found under the field that searched, each one a choice. */
function PatientResults({
  search,
  origin,
  onChoose,
}: {
  search: ReturnType<typeof usePatientSearch>;
  origin: PatientSearchOrigin;
  onChoose: (patient: SpecialistPatient) => void;
}) {
  const t = useTranslations('appointments.booking');
  if (search.searching) {
    return (
      <p role="status" className="text-body-sm text-text-secondary">
        {t('searchingPatients')}
      </p>
    );
  }
  if (search.failed) {
    return (
      <p role="status" className="text-body-sm text-error-700">
        {t('patientSearchFailed')}
      </p>
    );
  }
  if (!search.answered) return null;
  if (search.results.length === 0) {
    return (
      <div role="status" className="flex animate-fade-in flex-col gap-0.5">
        <p className="text-body-sm font-medium text-text-primary">
          {t('patientNotFound')}
        </p>
        <p className="text-body-sm text-text-secondary">
          {origin === 'document'
            ? t('patientNotFoundByDocument')
            : t('patientNotFoundByName')}
        </p>
      </div>
    );
  }
  return (
    <ul
      aria-label={t('patientResults')}
      className="flex animate-fade-in flex-col overflow-hidden rounded-md border border-divider bg-pure-white shadow-sm"
    >
      {search.results.map((patient) => {
        const name = `${patient.firstName} ${patient.lastName}`.trim();
        return (
          <li
            key={patient.userId}
            className="border-b border-divider last:border-b-0"
          >
            <button
              type="button"
              onClick={() => {
                onChoose(patient);
              }}
              className="flex min-h-touch w-full flex-col items-start px-3 py-2 text-left transition-colors duration-fast ease-house outline-none hover:bg-blue-50 focus-visible:bg-blue-50"
            >
              <span className="text-body-md font-medium text-text-primary">
                {name === '' ? t('unnamedPatient') : name}
              </span>
              {patient.document ? (
                <span className="text-body-sm text-text-secondary">
                  {formatIdentityDocument(
                    patient.document.type,
                    patient.document.number,
                  )}
                </span>
              ) : null}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

/** The registered patient chosen, as the app's card: who, what the account lacks, and the way to another. */
function ChosenPatient({
  patient,
  today,
  onChange,
}: {
  patient: SpecialistPatient;
  today: string;
  onChange: () => void;
}) {
  const t = useTranslations();
  const name = `${patient.firstName} ${patient.lastName}`.trim();
  const age = patient.dateOfBirth ? ageOn(patient.dateOfBirth, today) : null;
  const facts = [
    ...(age === null ? [] : [t('panel.agenda.age', { count: age })]),
    ...(patient.sex ? [t(patient.sex === 'MALE' ? 'male' : 'female')] : []),
    ...(patient.document
      ? [formatIdentityDocument(patient.document.type, patient.document.number)]
      : []),
  ];
  const missing = new Intl.ListFormat('es', {
    style: 'long',
    type: 'conjunction',
  }).format(
    patient.missing.map((field) => t(`appointments.booking.missing.${field}`)),
  );

  return (
    <div className="flex animate-fade-in flex-col items-start gap-2 rounded-xl border border-blue-100 bg-blue-50/60 p-4">
      <StateChip tone="info">
        {t('appointments.booking.registeredPatient')}
      </StateChip>
      <p className="text-title-md break-words text-text-primary">
        {name === '' ? t('appointments.booking.unnamedPatient') : name}
      </p>
      {facts.length > 0 ? (
        <p className="text-body-md text-text-secondary">{facts.join(' · ')}</p>
      ) : null}
      {patient.missing.length > 0 ? (
        <p className={cn('text-body-sm text-warning-800')}>
          {t('appointments.booking.missingData', { fields: missing })}
        </p>
      ) : null}
      <p className="text-body-sm text-text-secondary">
        {t('appointments.booking.registeredPatientHint')}
      </p>
      <Button size="small" variant="white" shape="soft" onClick={onChange}>
        {t('appointments.booking.changePatient')}
      </Button>
    </div>
  );
}
