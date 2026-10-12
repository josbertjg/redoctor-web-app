'use client';

import { useEffect, useId, useState } from 'react';

import type { Route } from 'next';

import { useRouter } from 'next/navigation';

import Login from '@material-symbols/svg-400/rounded/login.svg?svgr';
import { useTranslations } from 'next-intl';

import { track } from '@/app/lib/analytics/track';
import { destinationAfterSignIn } from '@/app/lib/auth/destination';
import type { AuthProvider } from '@/app/lib/auth/last-provider';

import { SignInButtons } from '@/app/ui/auth/sign-in-buttons';
import { Button } from '@/app/ui/button';
import { EmptyState } from '@/app/ui/empty-state';
import { Icon } from '@/app/ui/icons';
import { Skeleton } from '@/app/ui/skeleton';

import { useSession } from '@/app/hooks/use-session';

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
  const common = useTranslations();
  const router = useRouter();
  const session = useSession();
  const headingId = useId();
  /** The provider the person just tapped; none for a session that was already there. */
  const [chosen, setChosen] = useState<AuthProvider | null>(null);

  const { account, status, accountStatus } = session;

  useEffect(() => {
    if (account === null) return;
    if (chosen !== null) {
      track('web_signin_completed', { provider: chosen, role: account.role });
    }
    router.replace(destinationAfterSignIn(account, redirect) as Route);
  }, [account, chosen, redirect, router]);

  if (status === 'signed-in' && accountStatus === 'error') {
    return (
      <EmptyState
        headingLevel={1}
        tone="error"
        title={t('accountError.title')}
        description={t('accountError.description')}
        action={
          <>
            <Button shape="soft" onClick={session.retryAccount}>
              {common('retry')}
            </Button>
            <Button
              shape="soft"
              variant="white"
              onClick={() => {
                void session.signOut();
              }}
            >
              {t('switchAccount')}
            </Button>
          </>
        }
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
      {/* TODO(M10): link the legal pages once they exist. */}
      <p className="mt-6 text-center text-body-sm text-text-secondary">
        {t('byLoggingInAcceptsOur')}
        <span className="font-semibold">{t('termsOfUseAndPrivacy')}</span>
      </p>
    </section>
  );
}
