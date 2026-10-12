'use client';

import { useId, useMemo, useState } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useForm, type Resolver } from 'react-hook-form';
import { z } from 'zod';

import { track } from '@/app/lib/analytics/track';
import { isApiError } from '@/app/lib/api/errors';
import type { SessionUser } from '@/app/lib/firebase/client';
import {
  birthDateProblem,
  earliestBirthDate,
  latestAdultBirthDate,
} from '@/app/lib/format/date-of-birth';
import {
  cleanDocumentNumber,
  documentNumberLength,
  documentNumberProblem,
  documentTypes,
  type DocumentType,
} from '@/app/lib/format/identity-document';
import {
  cleanPersonName,
  personNameMaxLength,
  personNameProblem,
} from '@/app/lib/format/names';
import {
  phoneProblem,
  toInternationalPhone,
  venezuelaCode,
} from '@/app/lib/format/phone';
import {
  completePatientRegistration,
  identityKeys,
  isDocumentAvailable,
  registerPatient,
} from '@/app/lib/queries/identity';

import { Button } from '@/app/ui/button';
import { Checkbox } from '@/app/ui/checkbox';
import { ChoiceCards } from '@/app/ui/choice-cards';
import { FieldError } from '@/app/ui/field-error';
import { TextField } from '@/app/ui/text-field';

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

/** Someone else's account already uses the document. */
class DocumentTaken extends Error {}

type PatientSignUpFormProps = {
  user: SessionUser;
  parts: SignUpParts;
  /** Values to start from, like the invitation's (M4). */
  defaults?: Partial<SignUpValues> | undefined;
  submitLabel: string;
  onDone: () => void;
};

/** The form's rules, with the app's messages: the same checks the API makes. */
function useSignUpResolver(parts: SignUpParts): Resolver<SignUpValues> {
  const t = useTranslations();

  return useMemo(() => {
    const check = (problemOf: (value: string) => string | undefined) =>
      z.string().superRefine((value, context) => {
        const message = problemOf(value);
        if (message !== undefined)
          context.addIssue({ code: 'custom', message });
      });

    const name = check((value) => {
      switch (personNameProblem(value)) {
        case 'empty':
          return t('input.empty');
        case 'invalidFormat':
          return t('input.name.invalidFormat');
        case 'maxLength':
          return t('input.maxLength', { maxLength: personNameMaxLength });
        default:
          return undefined;
      }
    });
    const consent = z.boolean().refine(Boolean, t('input.mustAccept'));
    const dateOfBirth = check((value) => {
      switch (birthDateProblem(value)) {
        case 'empty':
          return t('input.empty');
        case 'invalid':
          return t('input.dateOfBirth.invalid');
        case 'tooYoung':
          return t('input.dateOfBirth.tooYoung');
        default:
          return undefined;
      }
    });
    const phone = check((value) => {
      switch (phoneProblem(value)) {
        case 'empty':
          return t('input.empty');
        case 'invalidFormat':
          return t('input.phoneNumber.invalidFormat');
        default:
          return undefined;
      }
    });
    const documentNumber = check((value) => {
      switch (documentNumberProblem(value)) {
        case 'empty':
          return t('input.empty');
        case 'minLength':
          return t('input.identityDocument.minLength', {
            minLength: documentNumberLength.min,
          });
        case 'maxLength':
          return t('input.identityDocument.maxLength', {
            maxLength: documentNumberLength.max,
          });
        default:
          return undefined;
      }
    });
    const sex = z.string().refine((value) => value !== '', t('input.empty'));

    // A part the form does not ask is not checked.
    const skip = z.any();
    const schema = z.object({
      firstName: parts.register ? name : skip,
      lastName: parts.register ? name : skip,
      acceptedTerms: parts.register ? consent : skip,
      acceptedSensitiveData: parts.register ? consent : skip,
      acceptedNewsletter: skip,
      dateOfBirth: parts.personalData ? dateOfBirth : skip,
      phone: parts.personalData ? phone : skip,
      documentType: skip,
      documentNumber: parts.personalData ? documentNumber : skip,
      sex: parts.personalData ? sex : skip,
    });
    return zodResolver(schema);
  }, [parts.register, parts.personalData, t]);
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
  const queryClient = useQueryClient();
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
        if (!available) throw new DocumentTaken();
      }
      if (parts.register) {
        await registerPatient(user, {
          firstName: cleanPersonName(values.firstName),
          lastName: cleanPersonName(values.lastName),
          acceptedTerms: true,
          acceptedSensitiveData: true,
          acceptedNewsletter: values.acceptedNewsletter,
          role: 'PATIENT',
        });
        track('web_signup_completed', { step: 'register' });
      }
      if (parts.personalData && values.sex !== '') {
        await completePatientRegistration(user, {
          dateOfBirth: values.dateOfBirth,
          phone: toInternationalPhone(values.phone),
          documentType: values.documentType,
          documentNumber,
          sex: values.sex,
        });
        track('web_signup_completed', { step: 'personal_data' });
      }
      // The token's claims carry the registration status the API reads.
      await user.getToken(true);
      await queryClient.invalidateQueries({
        queryKey: identityKeys.me(user.id),
      });
    },
    onSuccess: onDone,
    onError: (error) => {
      if (error instanceof DocumentTaken) {
        setError(
          'documentNumber',
          { type: 'taken', message: t('auth.identityDocumentTaken') },
          { shouldFocus: true },
        );
      }
    },
  });

  const failure =
    save.error === null || save.error instanceof DocumentTaken
      ? undefined
      : isApiError(save.error) &&
          save.error.messageKey.startsWith('apiErrors.') &&
          save.error.messageKey !== 'apiErrors.unexpected'
        ? t(save.error.messageKey)
        : t('signUp.saveFailed');

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
          <TextField
            label={t('identityDocument')}
            inputMode="numeric"
            autoComplete="off"
            placeholder={t('signUp.documentPlaceholder')}
            error={errors.documentNumber?.message}
            leading={
              <select
                aria-label={t('signUp.documentType')}
                className="h-full cursor-pointer border-r border-divider bg-transparent pr-1 pl-3 text-body-xs text-text-primary outline-none"
                {...register('documentType')}
              >
                {documentTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            }
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
        <div className="flex flex-col">
          {/* TODO(M10): link the terms once the legal pages exist. */}
          <Checkbox
            label={
              <>
                {t('auth.iHaveRead')}{' '}
                <span className="font-semibold">
                  {t('auth.termsOfUseAndPrivacy')}
                </span>{' '}
                {t('ofRedoctor')}.
              </>
            }
            error={errors.acceptedTerms?.message}
            {...register('acceptedTerms')}
          />
          <Checkbox
            label={`${t('auth.iAgreeToRecopileData')}.`}
            error={errors.acceptedSensitiveData?.message}
            {...register('acceptedSensitiveData')}
          />
          <Checkbox
            label={`${t('auth.subscribeToOurNewsletter')}.`}
            {...register('acceptedNewsletter')}
          />
        </div>
      ) : null}

      <FieldError id={formErrorId} message={failure} className="text-center" />
      <Button type="submit" block shape="soft" loading={save.isPending}>
        {submitLabel}
      </Button>
    </form>
  );
}
