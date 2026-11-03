'use client';

import { useEffect, useRef, useState } from 'react';

import type { Route } from 'next';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import Login from '@material-symbols/svg-400/rounded/login.svg?svgr';
import { useTranslations } from 'next-intl';

import { track } from '@/app/lib/analytics/track';
import { destinationAfterSignIn } from '@/app/lib/auth/destination';
import type { AuthProvider } from '@/app/lib/auth/last-provider';
import { routes } from '@/app/lib/routes';

import { AccountErrorState } from '@/app/ui/auth/account-error-state';
import { SignInButtons } from '@/app/ui/auth/sign-in-buttons';
import { SignInLegalNote } from '@/app/ui/auth/sign-in-legal-note';
import { nextNavigation } from '@/app/ui/motion/navigation-events';
import { wipeScreen } from '@/app/ui/motion/screen-wipe';
import { Skeleton } from '@/app/ui/skeleton';

import { useSession } from '@/app/hooks/use-session';

import { AuthCard, authLinkClass, authSurfaceClass } from './auth-card';

/** However long the next page takes, the wipe opens after this. */
const LANDING_TIMEOUT_MS = 4000;

type SignInCardProps = {
  /** A same-origin path to return to, already checked by the page. */
  redirect: string | null;
};

/*
 * The sign-in card: the two provider buttons under a short promise, the
 * legal line, and the way to sign up instead. Once Firebase has the person,
 * the API says who they are (`/me`, through the session) and they move on:
 * an account with no sign-up behind it to `/sign-up` (M3), keeping the way
 * back; a patient back where they came from or to the landing; a
 * specialist to `/panel`.
 */
export function SignInCard({ redirect }: SignInCardProps) {
  const t = useTranslations();
  const router = useRouter();
  const session = useSession();
  /** The provider the person just tapped; none for a session that was already there. */
  const [chosen, setChosen] = useState<AuthProvider | null>(null);

  /** The person moved on once: a fresher `/me` never moves them again. */
  const left = useRef(false);

  const { account, status, accountStatus } = session;

  useEffect(() => {
    if (account === null) {
      left.current = false;
      return;
    }
    if (left.current) return;
    left.current = true;
    const destination = destinationAfterSignIn(account, redirect) as Route;
    // A session that was already there just moves on.
    if (chosen === null) {
      router.replace(destination);
      return;
    }
    track('web_signin_completed', { provider: chosen, role: account.role });
    // Signing in is a big moment: the next page arrives under the blue wipe
    // (AGENTS.md §8, rule 13), which opens once it has landed.
    void wipeScreen({
      tone: 'primary',
      whileCovered: async () => {
        const landed = nextNavigation(LANDING_TIMEOUT_MS);
        router.replace(destination);
        await landed;
      },
    });
  }, [account, chosen, redirect, router]);

  if (status === 'signed-in' && accountStatus === 'error') {
    return (
      <AccountErrorState
        headingLevel={1}
        canSwitchAccount
        className={authSurfaceClass}
      />
    );
  }

  // A session that was already there, or one just made: the API answers,
  // then the person moves on. The buttons' place keeps its height.
  const checking = status === 'signed-in' && chosen === null;

  return (
    <AuthCard
      icon={Login}
      title={t('auth.title')}
      description={t('auth.description')}
      footer={
        <p>
          {t('auth.noAccountYet')}{' '}
          <Link
            href={routes.signUp(redirect ?? undefined)}
            className={authLinkClass}
          >
            {t('signup')}
          </Link>
        </p>
      }
    >
      {/* The buttons keep a line under them for a failure (no shift when
          one appears): the legal line follows it. */}
      <div className="flex flex-col">
        {checking ? (
          <div className="flex flex-col gap-3" aria-busy="true">
            <Skeleton className="h-control-lg w-full" />
            <Skeleton className="h-control-lg w-full" />
            <div className="min-h-5" />
          </div>
        ) : (
          <SignInButtons
            onSignedIn={(_user, provider) => {
              setChosen(provider);
            }}
          />
        )}
        <SignInLegalNote />
      </div>
    </AuthCard>
  );
}
