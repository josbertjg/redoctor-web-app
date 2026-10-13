'use client';

import { useEffect, type ReactNode } from 'react';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

import { useTranslations } from 'next-intl';

import { returnPath, routes } from '@/app/lib/routes';
import {
  canUseSpecialistArea,
  needsSignUp,
  type Account,
} from '@/app/lib/schemas/identity';

import { Button } from '@/app/ui/button';
import { EmptyState } from '@/app/ui/empty-state';

import { useSession } from '@/app/hooks/use-session';

import { AccountErrorState } from './account-error-state';

export type SessionFacet = 'patient' | 'specialist';

type RequireSessionProps = {
  /** The facet the segment is for; without one, any signed-in person. */
  facet?: SessionFacet;
  /** The segment's skeleton, shown until the person is known (never a flash of the wrong UI). */
  fallback: ReactNode;
  /** Where to come back after signing in; by default the page's address, its query too, but for what must not travel (`returnPath`). */
  returnTo?: string | undefined;
  /** The sign-up page itself: an account with no sign-up behind it is who it is for, so it gets in instead of being sent there. */
  allowUnregistered?: boolean;
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
 * the person goes to sign in and comes back here afterwards; an account with
 * no sign-up behind it goes to sign up first (M3), the same way back; a
 * specialist on a patient's page goes back to their panel; any other wrong
 * facet gets a way out instead of a page that is not theirs.
 */
export function RequireSession({
  facet,
  fallback,
  returnTo,
  allowUnregistered = false,
  children,
}: RequireSessionProps) {
  const t = useTranslations();
  const session = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const signedOut = session.status === 'signed-out';
  const mustSignUp =
    !allowUnregistered &&
    session.status === 'signed-in' &&
    session.account !== null &&
    needsSignUp(session.account);
  // A patient's page is no place for a specialist: they stay in their panel
  // (owner, 2026-10-13). One who is also a patient keeps their own.
  const toPanel =
    facet === 'patient' &&
    session.account !== null &&
    !session.account.patient.exists &&
    canUseSpecialistArea(session.account);

  useEffect(() => {
    // The address is read as the page leaves: the plan a link asks for, a
    // list's filters, come back too.
    const back = returnTo ?? returnPath(pathname, window.location.search);
    if (signedOut) router.replace(routes.signIn(back));
    else if (mustSignUp) router.replace(routes.signUp(back));
    else if (toPanel) router.replace(routes.specialistHome());
  }, [signedOut, mustSignUp, toPanel, returnTo, pathname, router]);

  if (session.status !== 'signed-in') return fallback;

  if (session.accountStatus === 'error') {
    return <AccountErrorState headingLevel={1} />;
  }

  const { account } = session;
  if (account === null || mustSignUp || toPanel) return fallback;

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
