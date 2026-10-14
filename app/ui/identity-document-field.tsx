'use client';

import type { ComponentProps } from 'react';

import { useTranslations } from 'next-intl';

import { documentTypes } from '@/app/lib/format/identity-document';

import { TextField } from './text-field';

type IdentityDocumentFieldProps = Omit<
  ComponentProps<typeof TextField>,
  'label' | 'leading'
> & {
  /** The type's select (V, E, P, J, G), like react-hook-form's `register('documentType')`. */
  typeProps: ComponentProps<'select'>;
};

/*
 * «Cédula de identidad» as the app's input: the type before the digits, in
 * one box. The patient's sign-up (M3) and the person a booking adds (M15)
 * ask it the same way; the digits' rules live in app/lib/format.
 */
export function IdentityDocumentField({
  typeProps,
  ...numberProps
}: IdentityDocumentFieldProps) {
  const t = useTranslations();

  return (
    <TextField
      label={t('identityDocument')}
      inputMode="numeric"
      autoComplete="off"
      placeholder={t('signUp.documentPlaceholder')}
      leading={
        <select
          aria-label={t('signUp.documentType')}
          className="h-full cursor-pointer border-r border-divider bg-transparent pr-1 pl-3 text-body-xs text-text-primary outline-none"
          {...typeProps}
        >
          {documentTypes.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      }
      {...numberProps}
    />
  );
}
