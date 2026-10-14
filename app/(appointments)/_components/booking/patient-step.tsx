'use client';

import { useEffect, useMemo } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useForm, useWatch, type Resolver } from 'react-hook-form';
import { z } from 'zod';

import type { TokenHolder } from '@/app/lib/api/types';
import {
  earliestBirthDate,
  formatBirthDate,
} from '@/app/lib/format/date-of-birth';
import {
  cleanDocumentNumber,
  documentTypes,
} from '@/app/lib/format/identity-document';
import { formatPrice } from '@/app/lib/format/money';
import { cleanPersonName } from '@/app/lib/format/names';
import {
  officeServicesQueryOptions,
  tercerosQueryOptions,
} from '@/app/lib/queries/booking';
import {
  terceroNeedsDocument,
  type BookingAttendee,
} from '@/app/lib/schemas/booking';

import { ChoiceCards } from '@/app/ui/choice-cards';
import { IdentityDocumentField } from '@/app/ui/identity-document-field';
import { Skeleton } from '@/app/ui/skeleton';
import { TextField } from '@/app/ui/text-field';

import { usePersonChecks } from '@/app/hooks/use-person-checks';
import { usePriceWords } from '@/app/hooks/use-price-words';

import { LoadFailure } from '../load-failure';

import type { PatientChoice, PatientValues } from './booking-types';

/** The form's id: «Siguiente», in the page's bottom bar, submits it. */
export const patientFormId = 'booking-patient';

const calendarDate = /^\d{4}-\d{2}-\d{2}$/;

/** A date of birth that proves the person too young to carry a document yet. */
function documentExempt(dateOfBirth: string, today: string): boolean {
  return (
    calendarDate.test(dateOfBirth) && !terceroNeedsDocument(dateOfBirth, today)
  );
}

type PatientStepProps = {
  user: TokenHolder;
  officeId: string;
  today: string;
  /** What was answered before: coming back to this step keeps it. */
  defaults: PatientValues;
  onDone: (choice: PatientChoice) => void;
};

/*
 * The app's third step, «Paciente»: the consultation reason with its price
 * — required, as in the app; the only one comes chosen —, and for whom:
 * oneself, someone already in one's care, or someone new: their names,
 * birth date, sex and, from 9 years and a month, their document (the API's
 * rule). Validated on blur and again on «Siguiente» (AGENTS.md §9).
 */
export function PatientStep({
  user,
  officeId,
  today,
  defaults,
  onDone,
}: PatientStepProps) {
  const t = useTranslations();
  const words = usePriceWords();
  const services = useQuery(officeServicesQueryOptions(user, officeId));
  const terceros = useQuery(tercerosQueryOptions(user));
  const reasons = services.data ?? [];
  const people = terceros.data ?? [];

  const resolver = usePatientResolver({
    needsReason: reasons.length > 0,
    choosesPerson: people.length > 0,
    today,
  });
  const {
    register,
    handleSubmit,
    control,
    getValues,
    setValue,
    formState: { errors },
  } = useForm<PatientValues>({
    resolver,
    mode: 'onBlur',
    reValidateMode: 'onChange',
    defaultValues: defaults,
  });
  // `useWatch`, not `watch`: the React Compiler memoizes this component.
  const who = useWatch({ control, name: 'who' });
  const terceroId = useWatch({ control, name: 'terceroId' });
  const dateOfBirth = useWatch({ control, name: 'dateOfBirth' });

  // An office with one reason has it chosen, as soon as it is known.
  const onlyReason = reasons.length === 1 ? reasons[0]?.id : undefined;
  useEffect(() => {
    if (onlyReason !== undefined && getValues('reasonId') === '') {
      setValue('reasonId', onlyReason);
    }
  }, [onlyReason, getValues, setValue]);

  const forSomeoneElse = who === 'TERCERO';
  const newPerson =
    forSomeoneElse &&
    !terceros.isPending &&
    (people.length === 0 || terceroId === 'new');

  return (
    <form
      id={patientFormId}
      noValidate
      onSubmit={(event) => {
        void handleSubmit((values) => {
          let attendee: BookingAttendee;
          if (values.who === 'SELF') {
            attendee = { kind: 'self' };
          } else {
            const known = people.find(
              (person) => person.id === values.terceroId,
            );
            if (known) {
              attendee = { kind: 'tercero', tercero: known };
            } else {
              if (values.sex === '') return;
              attendee = {
                kind: 'new',
                person: {
                  firstName: cleanPersonName(values.firstName),
                  lastName: cleanPersonName(values.lastName),
                  dateOfBirth: values.dateOfBirth,
                  sex: values.sex,
                  document: documentExempt(values.dateOfBirth, today)
                    ? null
                    : {
                        type: values.documentType,
                        number: cleanDocumentNumber(values.documentNumber),
                      },
                },
              };
            }
          }
          onDone({
            values,
            reasonId: values.reasonId === '' ? null : values.reasonId,
            attendee,
          });
        })(event);
      }}
      className="flex flex-col gap-6"
    >
      {services.isPending ? (
        <div aria-busy="true" className="flex flex-col gap-3">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-touch w-full rounded-md" />
          <Skeleton className="h-touch w-full rounded-md" />
        </div>
      ) : services.isError ? (
        <LoadFailure
          message={t('appointments.book.reasonsLoadError')}
          retrying={services.isFetching}
          onRetry={() => {
            void services.refetch();
          }}
        />
      ) : reasons.length === 0 ? (
        <div className="flex flex-col gap-2">
          <p className="text-body-xxs font-medium text-text-primary">
            {t('search.consultationReason')}
          </p>
          <p className="text-body-md text-text-secondary">
            {t('noOptionsAvailable')}
          </p>
        </div>
      ) : (
        <ChoiceCards
          legend={t('search.consultationReason')}
          columns={1}
          options={reasons.map((reason) => ({
            value: reason.id,
            label: reason.name,
            trailing: (
              <span className="text-label-lg">
                {formatPrice(reason.price, words) ??
                  t('search.priceOnRequestShort')}
              </span>
            ),
          }))}
          inputProps={register('reasonId')}
          error={errors.reasonId?.message}
        />
      )}

      <ChoiceCards
        legend={t('search.whoIsTheAppointmentFor')}
        options={[
          { value: 'SELF', label: t('search.forMe') },
          { value: 'TERCERO', label: t('search.forAThirdParty') },
        ]}
        inputProps={register('who')}
        error={errors.who?.message}
      />

      {forSomeoneElse ? (
        <section className="flex animate-fade-up flex-col gap-4">
          <h3 className="text-title-sm text-text-primary">
            {t('search.patientPersonalData')}
          </h3>
          {terceros.isPending ? (
            <div aria-busy="true" className="flex flex-col gap-3">
              <Skeleton className="h-touch w-full rounded-md" />
              <Skeleton className="h-touch w-full rounded-md" />
            </div>
          ) : (
            <>
              {terceros.isError ? (
                <LoadFailure
                  message={t('appointments.book.tercerosLoadError')}
                  retrying={terceros.isFetching}
                  onRetry={() => {
                    void terceros.refetch();
                  }}
                />
              ) : null}
              {people.length > 0 ? (
                <ChoiceCards
                  legend={t('appointments.book.yourPeople')}
                  columns={1}
                  options={[
                    ...people.map((person) => ({
                      value: person.id,
                      label: `${person.firstName} ${person.lastName}`,
                      description: formatBirthDate(person.dateOfBirth),
                    })),
                    { value: 'new', label: t('appointments.book.someoneElse') },
                  ]}
                  inputProps={register('terceroId')}
                  error={errors.terceroId?.message}
                />
              ) : null}
              {newPerson ? (
                <div className="flex animate-fade-up flex-col gap-4">
                  <div className="grid grid-cols-2 gap-3">
                    <TextField
                      label={t('name')}
                      autoComplete="off"
                      error={errors.firstName?.message}
                      {...register('firstName')}
                    />
                    <TextField
                      label={t('lastName')}
                      autoComplete="off"
                      error={errors.lastName?.message}
                      {...register('lastName')}
                    />
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
                  {documentExempt(dateOfBirth, today) ? (
                    <p className="animate-fade-in text-body-sm text-text-secondary">
                      {t('appointments.book.noDocumentNeeded')}
                    </p>
                  ) : (
                    <IdentityDocumentField
                      typeProps={register('documentType')}
                      error={errors.documentNumber?.message}
                      {...register('documentNumber')}
                    />
                  )}
                </div>
              ) : null}
            </>
          )}
        </section>
      ) : null}
    </form>
  );
}

type ResolverInput = {
  /** The office has reasons: one must be chosen, as in the app. */
  needsReason: boolean;
  /** The account has people in its care to choose from. */
  choosesPerson: boolean;
  today: string;
};

function usePatientResolver({
  needsReason,
  choosesPerson,
  today,
}: ResolverInput): Resolver<PatientValues> {
  const t = useTranslations();
  const person = usePersonChecks();

  return useMemo(() => {
    const schema = z
      .object({
        reasonId: z.string(),
        who: z.enum(['', 'SELF', 'TERCERO']),
        terceroId: z.string(),
        firstName: z.string(),
        lastName: z.string(),
        dateOfBirth: z.string(),
        sex: z.enum(['', 'MALE', 'FEMALE']),
        documentType: z.enum(documentTypes),
        documentNumber: z.string(),
      })
      .superRefine((values, context) => {
        const fail = (path: keyof PatientValues, message: string) => {
          context.addIssue({ code: 'custom', path: [path], message });
        };
        const check = (
          path: keyof PatientValues,
          rule: z.ZodType,
          value: string,
        ) => {
          const result = rule.safeParse(value);
          if (!result.success) {
            fail(path, result.error.issues[0]?.message ?? t('input.empty'));
          }
        };

        if (needsReason && values.reasonId === '') {
          fail('reasonId', t('search.selectAReason'));
        }
        if (values.who === '') {
          fail('who', t('appointments.invitation.chooseWho'));
          return;
        }
        if (values.who === 'SELF') return;
        if (choosesPerson && values.terceroId === '') {
          fail('terceroId', t('appointments.book.choosePerson'));
          return;
        }
        if (choosesPerson && values.terceroId !== 'new') return;

        check('firstName', person.name, values.firstName);
        check('lastName', person.name, values.lastName);
        check('dateOfBirth', person.dateOfBirth(false), values.dateOfBirth);
        check('sex', person.sex, values.sex);
        // The document waits for a date that says whether it is needed.
        if (
          calendarDate.test(values.dateOfBirth) &&
          !documentExempt(values.dateOfBirth, today)
        ) {
          check('documentNumber', person.documentNumber, values.documentNumber);
        }
      });
    return zodResolver(schema);
  }, [needsReason, choosesPerson, person, t, today]);
}
