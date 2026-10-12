'use client';

import { useEffect, type ReactNode } from 'react';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

import { useTranslations } from 'next-intl';

import { routes } from '@/app/lib/routes';
import { canUseSpecialistArea, type Account } from '@/app/lib/schemas/identity';

import { Button } from '@/app/ui/button';
import { EmptyState } from '@/app/ui/empty-state';

import { useSession } from '@/app/hooks/use-session';

export type SessionFacet = 'patient' | 'specialist';

type RequireSessionProps = {
  /** The facet the segment is for; without one, any signed-in person. */
  facet?: SessionFacet;
  /** The segment's skeleton, shown until the person is known (never a flash of the wrong UI). */
  fallback: ReactNode;
  children: ReactNode;
};

function isAllowed(account: Account, facet: SessionFacet | undefined) {
  if (facet === 'specialist') return canUseSpecialistArea(account);
  if (facet === 'patient') return account.patient.exists;
  return true;
}

/*
 * Wraps the layout of a segment that needs a session (AGENTS.md §3, §9):
 * `/me` resolves before anything of the segment paints; without a session
 * the person goes to sign in and comes back here afterwards; the wrong
 * facet gets a way out instead of a page that is not theirs.
 */
export function RequireSession({
  facet,
  fallback,
  children,
}: RequireSessionProps) {
  const t = useTranslations();
  const session = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const signedOut = session.status === 'signed-out';

  useEffect(() => {
    if (signedOut) router.replace(routes.signIn(pathname));
  }, [signedOut, pathname, router]);

  if (session.status !== 'signed-in') return fallback;

  if (session.accountStatus === 'error') {
    return (
      <EmptyState
        tone="error"
        headingLevel={1}
        title={t('auth.accountError.title')}
        description={t('auth.accountError.description')}
        action={
          <Button shape="soft" onClick={session.retryAccount}>
            {t('retry')}
          </Button>
        }
      />
    );
  }

  const { account } = session;
  if (account === null) return fallback;

  if (!isAllowed(account, facet)) {
    const area = facet === 'specialist' ? 'specialist' : 'patient';
    return (
      <EmptyState
        headingLevel={1}
        title={t(`auth.wrongArea.${area}.title`)}
        description={t(`auth.wrongArea.${area}.description`)}
        action={
          <Button asChild shape="soft">
            <Link
              href={
                area === 'specialist' ? routes.home() : routes.specialistHome()
              }
            >
              {t(`auth.wrongArea.${area}.action`)}
            </Link>
          </Button>
        }
      />
    );
  }

  return children;
}
