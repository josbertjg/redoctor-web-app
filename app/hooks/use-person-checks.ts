import { useMemo } from 'react';

import { useTranslations } from 'next-intl';
import { z } from 'zod';

import { birthDateProblem } from '@/app/lib/format/date-of-birth';
import {
  documentNumberLength,
  documentNumberProblem,
} from '@/app/lib/format/identity-document';
import { personNameMaxLength, personNameProblem } from '@/app/lib/format/names';

/**
 * A person's data checked as the API checks it, as zod rules carrying the
 * app's messages: the patient's sign-up (M3) and the person in one's care
 * a booking adds (M15) ask the same things the same way.
 */
export function usePersonChecks() {
  const t = useTranslations();

  return useMemo(() => {
    const check = (problemOf: (value: string) => string | undefined) =>
      z.string().superRefine((value, context) => {
        const message = problemOf(value);
        if (message !== undefined)
          context.addIssue({ code: 'custom', message });
      });

    return {
      name: check((value) => {
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
      }),
      /** An adult's (the account holder's), or anyone's already born (`adult: false`). */
      dateOfBirth: (adult: boolean) =>
        check((value) => {
          switch (birthDateProblem(value, undefined, { adult })) {
            case 'empty':
              return t('input.empty');
            case 'invalid':
              return t('input.dateOfBirth.invalid');
            case 'tooYoung':
              return t('input.dateOfBirth.tooYoung');
            default:
              return undefined;
          }
        }),
      documentNumber: check((value) => {
        switch (documentNumberProblem(value)) {
          case 'empty':
            return t('input.empty');
          case 'onlyDigits':
            return t('input.identityDocument.onlyDigits');
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
      }),
      sex: z.string().refine((value) => value !== '', t('input.empty')),
    };
  }, [t]);
}
