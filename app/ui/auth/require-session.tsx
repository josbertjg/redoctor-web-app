'use client';

import { useEffect, type ReactNode } from 'react';

import type { Route } from 'next';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

import { useTranslations } from 'next-intl';

import {
  canUseSpecialistArea,
  needsSignUp,
  type Account,
} from '@/app/lib/auth/account';
import { forgetPanelHint } from '@/app/lib/auth/session-hint';
import { returnPath, routes } from '@/app/lib/routes';

import { Button } from '@/app/ui/button';
import { EmptyState } from '@/app/ui/empty-state';
import { useSkeletonHold } from '@/app/ui/motion/skeleton-hold';

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
  /** Where the segment paints on a colour (the panel's blue): the surface its own states sit on. */
  stateClassName?: string;
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
  stateClassName,
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
  // Conversely, a patient-only account on the specialist's panel goes straight
  // back to `/` automatically (owner, 2026-11-25).
  const toHome =
    facet === 'specialist' &&
    session.account !== null &&
    !canUseSpecialistArea(session.account) &&
    session.account.patient.exists;

  useEffect(() => {
    // The address is read as the page leaves: the plan a link asks for, a
    // list's filters, come back too.
    const back = returnTo ?? returnPath(pathname, window.location.search);
    let target: Route | null = null;
    if (signedOut) target = routes.signIn(back);
    else if (mustSignUp) target = routes.signUp(back);
    else if (toPanel) target = routes.specialistHome();
    else if (toHome) {
      forgetPanelHint();
      target = routes.home();
    }
    if (target === null) return;
    router.replace(target);
    // Safety net: if an RSC fetch fails or is dropped on a degraded edge,
    // Next's router swallows the error and would leave the skeleton up forever.
    const destination = target;
    const fallbackTimer = setTimeout(() => {
      if (window.location.pathname === pathname) {
        window.location.replace(destination);
      }
    }, 4000);
    return () => {
      clearTimeout(fallbackTimer);
    };
  }, [signedOut, mustSignUp, toPanel, toHome, returnTo, pathname, router]);

  // The skeleton gives way to the page in a transition, so the page enters
  // as on any navigation (AGENTS.md §8, rule 13).
  const holding = useSkeletonHold(
    session.status !== 'signed-in' || session.account === null,
  );

  if (session.status !== 'signed-in') return fallback;

  const surface =
    stateClassName === undefined ? {} : { className: stateClassName };

  if (session.accountStatus === 'error') {
    return <AccountErrorState headingLevel={1} canSwitchAccount {...surface} />;
  }

  const { account } = session;
  if (account === null || mustSignUp || toPanel || toHome || holding) {
    return fallback;
  }

  if (!isAllowed(account, facet)) {
    const area = facet === 'specialist' ? 'specialist' : 'patient';
    return (
      <EmptyState
        headingLevel={1}
        {...surface}
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
