'use client';

import Link from 'next/link';

import { useTranslations } from 'next-intl';

import { routes } from '@/app/lib/routes';
import { cn } from '@/app/lib/utils';

const linkClass =
  'rounded-sm font-semibold underline-offset-4 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50';

/** The legal line under the sign-in buttons, as the app's login says it, each page linked (M10). */
export function SignInLegalNote({ className }: { className?: string }) {
  const t = useTranslations('auth');
  return (
    <p
      className={cn('text-center text-body-sm text-text-secondary', className)}
    >
      {t('byLoggingInAcceptsOur')}
      {t.rich('termsOfUseAndPrivacy', {
        terms: (chunks) => (
          <Link href={routes.terms()} className={linkClass}>
            {chunks}
          </Link>
        ),
        privacy: (chunks) => (
          <Link href={routes.privacy()} className={linkClass}>
            {chunks}
          </Link>
        ),
      })}
    </p>
  );
}
