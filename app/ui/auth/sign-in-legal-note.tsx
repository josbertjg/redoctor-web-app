'use client';

import { useTranslations } from 'next-intl';

import { cn } from '@/app/lib/utils';

/** The legal line under the sign-in buttons, as the app's login says it. */
export function SignInLegalNote({ className }: { className?: string }) {
  const t = useTranslations('auth');
  // TODO(M10): link the legal pages once they exist.
  return (
    <p
      className={cn('text-center text-body-sm text-text-secondary', className)}
    >
      {t('byLoggingInAcceptsOur')}
      <span className="font-semibold">{t('termsOfUseAndPrivacy')}</span>
    </p>
  );
}
