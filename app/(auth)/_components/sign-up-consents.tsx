'use client';

import Link from 'next/link';

import { useTranslations } from 'next-intl';

import { routes } from '@/app/lib/routes';

import { Checkbox } from '@/app/ui/checkbox';

import type { UseFormRegisterReturn } from 'react-hook-form';

const legalLinkClass =
  'rounded-sm font-semibold text-primary underline-offset-4 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50';

type SignUpConsentsProps = {
  terms: UseFormRegisterReturn;
  sensitiveData: UseFormRegisterReturn;
  newsletter: UseFormRegisterReturn;
  errors: { terms?: string | undefined; sensitiveData?: string | undefined };
};

/*
 * The app's three consents, the same for a patient and a specialist (the
 * API's `acceptedTerms`, `acceptedSensitiveData`, `acceptedNewsletter`):
 * the first two required, the newsletter not. The legal pages open apart,
 * so nothing typed in the form is lost.
 */
export function SignUpConsents({
  terms,
  sensitiveData,
  newsletter,
  errors,
}: SignUpConsentsProps) {
  const t = useTranslations();

  return (
    <div className="flex flex-col">
      <Checkbox
        label={
          <>
            {t('auth.iHaveRead')}{' '}
            {t.rich('auth.termsOfUseAndPrivacy', {
              terms: (chunks) => (
                <Link
                  href={routes.terms()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={legalLinkClass}
                >
                  {chunks}
                </Link>
              ),
              privacy: (chunks) => (
                <Link
                  href={routes.privacy()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={legalLinkClass}
                >
                  {chunks}
                </Link>
              ),
            })}{' '}
            {t('ofRedoctor')}.
          </>
        }
        error={errors.terms}
        {...terms}
      />
      <Checkbox
        label={`${t('auth.iAgreeToRecopileData')}.`}
        error={errors.sensitiveData}
        {...sensitiveData}
      />
      <Checkbox
        label={`${t('auth.subscribeToOurNewsletter')}.`}
        {...newsletter}
      />
    </div>
  );
}
