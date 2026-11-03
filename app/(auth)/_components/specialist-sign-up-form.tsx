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
  documentTypes,
  type DocumentType,
} from '@/app/lib/format/identity-document';
import { cleanPersonName } from '@/app/lib/format/names';
import { toInternationalPhone, venezuelaCode } from '@/app/lib/format/phone';
import {
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

/** The sexes the app's form offers (the API also takes OTHER). */
const offeredSexes = ['MALE', 'FEMALE'] as const;

type SpecialistSignUpValues = {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  documentType: DocumentType;
  documentNumber: string;
  sex: '' | (typeof offeredSexes)[number];
  phone: string;
  acceptedTerms: boolean;
  acceptedSensitiveData: boolean;
  acceptedNewsletter: boolean;
};

const emptyValues: SpecialistSignUpValues = {
  firstName: '',
  lastName: '',
  dateOfBirth: '',
  documentType: 'V',
  documentNumber: '',
  sex: '',
  phone: '',
  acceptedTerms: false,
  acceptedSensitiveData: false,
  acceptedNewsletter: false,
};

/** The API's rules for a specialist, with the app's messages: an adult, all required but the newsletter. */
function useSpecialistResolver(): Resolver<SpecialistSignUpValues> {
  const person = usePersonChecks();

  return useMemo(
    () =>
      zodResolver(
        z.object({
          firstName: person.name,
          lastName: person.name,
          dateOfBirth: person.dateOfBirth(true),
          documentType: z.enum(documentTypes),
          documentNumber: person.documentNumber,
          sex: person.sex,
          phone: person.phone,
          acceptedTerms: person.consent,
          acceptedSensitiveData: person.consent,
          acceptedNewsletter: z.boolean(),
        }),
      ),
    [person],
  );
}

type SpecialistSignUpFormProps = {
  user: SessionUser;
  /**
   * Saved, and the token carries it. The page moves on under the colour and
   * reads the account there; the button stays busy until then.
   */
  onDone: () => void;
};

/*
 * A specialist's sign-up on the web (the owner's word, 2026-11-03), as the
 * app's form asks it while the API verifies no phone and runs no KYC:
 * names, date of birth (an adult), document, sex, phone and the consents,
 * in one `POST /identity/register`. The document is checked against other
 * accounts first, as the patient's; then a fresh token (its claims carry
 * the new status). The specialties and the licence are registered in the
 * app, where the page sends them next.
 */
export function SpecialistSignUpForm({
  user,
  onDone,
}: SpecialistSignUpFormProps) {
  const t = useTranslations();
  const formErrorId = useId();
  const resolver = useSpecialistResolver();
  const [limits] = useState(() => ({
    max: latestAdultBirthDate(),
    min: earliestBirthDate(),
  }));

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<SpecialistSignUpValues>({
    resolver,
    mode: 'onBlur',
    reValidateMode: 'onChange',
    defaultValues: emptyValues,
  });

  const save = useMutation({
    mutationFn: async (values: SpecialistSignUpValues) => {
      // Validated: the sex is chosen by now.
      if (values.sex === '') return;
      const documentNumber = cleanDocumentNumber(values.documentNumber);
      const available = await isDocumentAvailable({
        documentType: values.documentType,
        documentNumber,
      });
      if (!available) throw new DocumentTakenError();
      await registerAccount(user, {
        role: 'SPECIALIST',
        firstName: cleanPersonName(values.firstName),
        lastName: cleanPersonName(values.lastName),
        phone: toInternationalPhone(values.phone),
        dateOfBirth: values.dateOfBirth,
        sex: values.sex,
        documentType: values.documentType,
        documentNumber,
        acceptedTerms: true,
        acceptedSensitiveData: true,
        acceptedNewsletter: values.acceptedNewsletter,
      });
      track('web_signup_completed', { step: 'register', role: 'specialist' });
      await refreshIdToken(user);
    },
    onSuccess: onDone,
    onError: (error) => {
      const taken = takenIdentityField(error);
      if (taken === 'document') {
        setError(
          'documentNumber',
          { type: 'taken', message: t('auth.identityDocumentTaken') },
          { shouldFocus: true },
        );
      } else if (taken === 'phone') {
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
      className="flex flex-col gap-4 text-left"
    >
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
      <TextField
        label={t('dateOfBirth')}
        type="date"
        autoComplete="bday"
        min={limits.min}
        max={limits.max}
        error={errors.dateOfBirth?.message}
        {...register('dateOfBirth')}
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
      <SignUpConsents
        terms={register('acceptedTerms')}
        sensitiveData={register('acceptedSensitiveData')}
        newsletter={register('acceptedNewsletter')}
        errors={{
          terms: errors.acceptedTerms?.message,
          sensitiveData: errors.acceptedSensitiveData?.message,
        }}
      />
      <FieldError id={formErrorId} message={failure} className="text-center" />
      <Button
        type="submit"
        block
        shape="soft"
        loading={save.isPending || save.isSuccess}
      >
        {t('continue')}
      </Button>
    </form>
  );
}
