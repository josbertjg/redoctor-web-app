'use client';

import { useEffect, useId, useRef, useState } from 'react';

import type { Route } from 'next';

import { useRouter } from 'next/navigation';

import Login from '@material-symbols/svg-400/rounded/login.svg?svgr';
import { useTranslations } from 'next-intl';

import { track } from '@/app/lib/analytics/track';
import { destinationAfterSignIn } from '@/app/lib/auth/destination';
import type { AuthProvider } from '@/app/lib/auth/last-provider';

import { AccountErrorState } from '@/app/ui/auth/account-error-state';
import { SignInButtons } from '@/app/ui/auth/sign-in-buttons';
import { SignInLegalNote } from '@/app/ui/auth/sign-in-legal-note';
import { Icon } from '@/app/ui/icons';
import { nextNavigation } from '@/app/ui/motion/navigation-events';
import { wipeScreen } from '@/app/ui/motion/screen-wipe';
import { Skeleton } from '@/app/ui/skeleton';

import { useSession } from '@/app/hooks/use-session';

/** However long the next page takes, the wipe opens after this. */
const LANDING_TIMEOUT_MS = 4000;

type SignInCardProps = {
  /** A same-origin path to return to, already checked by the page. */
  redirect: string | null;
};

/*
 * The sign-in card: the two provider buttons under a short promise, and the
 * legal line. Once Firebase has the person, the API says who they are
 * (`/me`, through the session) and they move on: an account with no
 * sign-up behind it to `/sign-up` (M3), keeping the way back; a patient
 * back where they came from or to the landing; a specialist to `/panel`.
 */
export function SignInCard({ redirect }: SignInCardProps) {
  const t = useTranslations('auth');
  const router = useRouter();
  const session = useSession();
  const headingId = useId();
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
        className="max-w-md"
      />
    );
  }

  // A session that was already there, or one just made: the API answers,
  // then the person moves on. The buttons' place keeps its height.
  const checking = status === 'signed-in' && chosen === null;

  return (
    <section
      aria-labelledby={headingId}
      className="w-full max-w-md animate-fade-up rounded-2xl bg-pure-white p-6 shadow-md sm:p-8"
    >
      <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-info-light text-primary">
        <Icon icon={Login} className="size-8" />
      </span>
      <h1
        id={headingId}
        className="mt-4 text-center text-headline-sm text-text-primary"
      >
        {t('title')}
      </h1>
      <p className="mt-2 text-center text-body-md text-text-secondary">
        {t('description')}
      </p>
      {checking ? (
        <div className="mt-6 flex flex-col gap-3" aria-busy="true">
          <Skeleton className="h-control-lg w-full" />
          <Skeleton className="h-control-lg w-full" />
        </div>
      ) : (
        <SignInButtons
          className="mt-6"
          onSignedIn={(_user, provider) => {
            setChosen(provider);
          }}
        />
      )}
      <SignInLegalNote className="mt-6" />
    </section>
  );
}
