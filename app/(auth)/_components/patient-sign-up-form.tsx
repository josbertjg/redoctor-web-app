'use client';

import { useId, useMemo, useState } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useForm, type Resolver } from 'react-hook-form';
import { z } from 'zod';

import { track } from '@/app/lib/analytics/track';
import { failureMessageKey } from '@/app/lib/api/errors';
import type { SessionUser } from '@/app/lib/firebase/client';
import {
  earliestBirthDate,
  latestAdultBirthDate,
} from '@/app/lib/format/date-of-birth';
import {
  cleanDocumentNumber,
  type DocumentType,
} from '@/app/lib/format/identity-document';
import { cleanPersonName } from '@/app/lib/format/names';
import { toInternationalPhone, venezuelaCode } from '@/app/lib/format/phone';
import {
  completePatientRegistration,
  DocumentTakenError,
  isDocumentAvailable,
  refreshIdToken,
  registerAccount,
  takenIdentityField,
} from '@/app/lib/queries/identity';

import { Button } from '@/app/ui/button';
import { ChoiceCards } from '@/app/ui/choice-cards';
import { FieldError } from '@/app/ui/field-error';
import { IdentityDocumentField } from '@/app/ui/identity-document-field';
import { TextField } from '@/app/ui/text-field';

import { usePersonChecks } from '@/app/hooks/use-person-checks';

import { SignUpConsents } from './sign-up-consents';

/** What the form asks: the names and consents, the personal data, or both. */
export type SignUpParts = { register: boolean; personalData: boolean };

/** The sexes the app's form offers (the API also takes OTHER). */
const offeredSexes = ['MALE', 'FEMALE'] as const;

export type SignUpValues = {
  firstName: string;
  lastName: string;
  acceptedTerms: boolean;
  acceptedSensitiveData: boolean;
  acceptedNewsletter: boolean;
  dateOfBirth: string;
  phone: string;
  documentType: DocumentType;
  documentNumber: string;
  sex: '' | (typeof offeredSexes)[number];
};

const emptyValues: SignUpValues = {
  firstName: '',
  lastName: '',
  acceptedTerms: false,
  acceptedSensitiveData: false,
  acceptedNewsletter: false,
  dateOfBirth: '',
  phone: '',
  documentType: 'V',
  documentNumber: '',
  sex: '',
};

type PatientSignUpFormProps = {
  user: SessionUser;
  parts: SignUpParts;
  /** Values to start from, like the invitation's (M4). */
  defaults?: Partial<SignUpValues> | undefined;
  submitLabel: string;
  /**
   * Saved, and the token carries it. Reading the account again is what
   * moves the page on, so the page does it when it moves on — under the
   * colour, when the end is a big moment. The button stays busy until then.
   */
  onDone: () => void;
};

/** The form's rules, with the app's messages: the same checks the API makes. */
function useSignUpResolver(parts: SignUpParts): Resolver<SignUpValues> {
  const person = usePersonChecks();

  return useMemo(() => {
    // A part the form does not ask is not checked.
    const skip = z.any();
    const schema = z.object({
      firstName: parts.register ? person.name : skip,
      lastName: parts.register ? person.name : skip,
      acceptedTerms: parts.register ? person.consent : skip,
      acceptedSensitiveData: parts.register ? person.consent : skip,
      acceptedNewsletter: skip,
      dateOfBirth: parts.personalData ? person.dateOfBirth(true) : skip,
      phone: parts.personalData ? person.phone : skip,
      documentType: skip,
      documentNumber: parts.personalData ? person.documentNumber : skip,
      sex: parts.personalData ? person.sex : skip,
    });
    return zodResolver(schema);
  }, [parts.register, parts.personalData, person]);
}

/*
 * The patient's sign-up (M3), the app's two forms in one screen when a flow
 * needs both: the names and the three consents of the app's patient form
 * (`POST /identity/register`), and the personal data of its «Finalizar
 * registro» (`POST /identity/complete-registration`). Validated on blur
 * with the API's rules; the document is checked against other accounts
 * before anything is sent, as the app does. Then a fresh token (its claims
 * carry the registration status) and a fresh `/me`. The button shows the
 * wait inside it and is never disabled (AGENTS.md §8.3).
 */
export function PatientSignUpForm({
  user,
  parts,
  defaults,
  submitLabel,
  onDone,
}: PatientSignUpFormProps) {
  const t = useTranslations();
  const formErrorId = useId();
  const resolver = useSignUpResolver(parts);
  const [today] = useState(() => ({
    max: latestAdultBirthDate(),
    min: earliestBirthDate(),
  }));

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<SignUpValues>({
    resolver,
    mode: 'onBlur',
    reValidateMode: 'onChange',
    defaultValues: { ...emptyValues, ...defaults },
  });

  const save = useMutation({
    mutationFn: async (values: SignUpValues) => {
      const documentNumber = cleanDocumentNumber(values.documentNumber);
      if (parts.personalData) {
        const available = await isDocumentAvailable({
          documentType: values.documentType,
          documentNumber,
        });
        if (!available) throw new DocumentTakenError();
      }
      if (parts.register) {
        await registerAccount(user, {
          firstName: cleanPersonName(values.firstName),
          lastName: cleanPersonName(values.lastName),
          acceptedTerms: true,
          acceptedSensitiveData: true,
          acceptedNewsletter: values.acceptedNewsletter,
          role: 'PATIENT',
        });
        track('web_signup_completed', { step: 'register', role: 'patient' });
        // The completion reads the registration from the token's claims, as
        // the app refreshes it between the two steps.
        await refreshIdToken(user);
      }
      if (parts.personalData && values.sex !== '') {
        await completePatientRegistration(user, {
          dateOfBirth: values.dateOfBirth,
          phone: toInternationalPhone(values.phone),
          documentType: values.documentType,
          documentNumber,
          sex: values.sex,
        });
        track('web_signup_completed', {
          step: 'personal_data',
          role: 'patient',
        });
      }
      // The token's claims carry the registration status the API reads.
      await refreshIdToken(user);
    },
    onSuccess: onDone,
    onError: (error) => {
      // A document another account confirmed (ERR_2011, REDOC-365), or a
      // phone another account has (ERR_1005 with `details.phone`): said
      // under the field to change.
      if (takenIdentityField(error) === 'document') {
        setError(
          'documentNumber',
          { type: 'taken', message: t('auth.identityDocumentTaken') },
          { shouldFocus: true },
        );
      } else if (takenIdentityField(error) === 'phone') {
        setError(
          'phone',
          {
            type: 'taken',
            message: t('apiErrors.genericCustomErrors.phoneTaken'),
          },
          { shouldFocus: true },
        );
      }
    },
  });

  const failureKey =
    save.error === null || takenIdentityField(save.error) !== null
      ? null
      : failureMessageKey(save.error, 'signUp.saveFailed');
  const failure = failureKey === null ? undefined : t(failureKey);

  return (
    <form
      noValidate
      aria-describedby={failure === undefined ? undefined : formErrorId}
      onSubmit={(event) => {
        void handleSubmit((values) => {
          if (save.isPending) return;
          save.mutate(values);
        })(event);
      }}
      className="flex flex-col gap-4"
    >
      {parts.register ? (
        <>
          <div className="grid grid-cols-2 gap-3">
            <TextField
              label={t('name')}
              autoComplete="given-name"
              error={errors.firstName?.message}
              {...register('firstName')}
            />
            <TextField
              label={t('lastName')}
              autoComplete="family-name"
              error={errors.lastName?.message}
              {...register('lastName')}
            />
          </div>
        </>
      ) : null}

      {parts.personalData ? (
        <>
          <TextField
            label={t('dateOfBirth')}
            type="date"
            autoComplete="bday"
            min={today.min}
            max={today.max}
            error={errors.dateOfBirth?.message}
            {...register('dateOfBirth')}
          />
          <TextField
            label={t('phoneNumber')}
            type="tel"
            inputMode="tel"
            autoComplete="tel-national"
            placeholder={t('signUp.phonePlaceholder')}
            error={errors.phone?.message}
            leading={
              <span className="pl-3 text-body-xs text-text-secondary">
                {venezuelaCode}
              </span>
            }
            {...register('phone')}
          />
          <IdentityDocumentField
            typeProps={register('documentType')}
            error={errors.documentNumber?.message}
            {...register('documentNumber')}
          />
          <ChoiceCards
            legend={t('sex')}
            options={offeredSexes.map((sex) => ({
              value: sex,
              label: t(sex === 'MALE' ? 'male' : 'female'),
            }))}
            inputProps={register('sex')}
            error={errors.sex?.message}
          />
        </>
      ) : null}

      {parts.register ? (
        <SignUpConsents
          terms={register('acceptedTerms')}
          sensitiveData={register('acceptedSensitiveData')}
          newsletter={register('acceptedNewsletter')}
          errors={{
            terms: errors.acceptedTerms?.message,
            sensitiveData: errors.acceptedSensitiveData?.message,
          }}
        />
      ) : null}

      <FieldError id={formErrorId} message={failure} className="text-center" />
      <Button
        type="submit"
        block
        shape="soft"
        loading={save.isPending || save.isSuccess}
      >
        {submitLabel}
      </Button>
    </form>
  );
}
