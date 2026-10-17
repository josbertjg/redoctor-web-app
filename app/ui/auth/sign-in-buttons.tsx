'use client';

import { useEffect, useState } from 'react';

import { useTranslations } from 'next-intl';

import {
  orderProviders,
  readLastProvider,
  rememberLastProvider,
  type AuthProvider,
} from '@/app/lib/auth/last-provider';
import type { AuthErrorKey, SessionUser } from '@/app/lib/firebase/client';
import { cn } from '@/app/lib/utils';

import { Button } from '@/app/ui/button';
import { Skeleton } from '@/app/ui/skeleton';

import { useDevice } from '@/app/hooks/use-device';
import { useInAppBrowser } from '@/app/hooks/use-in-app-browser';
import { useSession } from '@/app/hooks/use-session';

import { InAppBrowserHelp } from './in-app-browser-help';
import { AppleLogo, GoogleLogo } from './provider-logos';

type SignInButtonsProps = {
  /** Called once Firebase has the person; the page decides where they go. */
  onSignedIn: (user: SessionUser, provider: AuthProvider) => void;
  className?: string;
};

/*
 * «Continuar con Google» and «Continuar con Apple», as the app draws them:
 * each in its brand's colours, the last-used provider first with the
 * «Última vez» chip (the memory lives in this browser), Apple first on
 * Apple devices otherwise. A press shows its own loading state and never
 * disables anything (AGENTS.md §8.3); a closed window is not an error, a
 * failure says what happened under the buttons. Inside Instagram's or
 * Facebook's browser the buttons give way to the way out.
 *
 * Until the browser and the session are known, a placeholder of the same
 * size holds their place: the order depends on the device (the buttons
 * would swap under the finger after hydrating), and a tap before Firebase
 * has loaded waits too long for Safari to allow the provider's window. The
 * buttons ask for Firebase as they appear: a page without them never
 * loads it for a visitor who has no session.
 */
export function SignInButtons({ onSignedIn, className }: SignInButtonsProps) {
  const t = useTranslations('auth');
  const errors = useTranslations('apiErrors.firebaseAuthErrors');
  const device = useDevice();
  const inApp = useInAppBrowser();
  // The memory as it was when the buttons appeared. Signing in writes it,
  // and read again the buttons would swap places and grow the chip under
  // the colour that grows from the one pressed. The server has none: the
  // placeholder stands until the device is known.
  const [last] = useState(readLastProvider);
  const { status, firebaseReady, prepareSignIn } = useSession();
  const [busy, setBusy] = useState<AuthProvider | null>(null);
  const [failure, setFailure] = useState<AuthErrorKey | null>(null);
  const [seenStatus, setSeenStatus] = useState(status);

  // A session these buttons opened was closed again (the API refused it):
  // they are ready for another try instead of staying busy.
  if (status !== seenStatus) {
    setSeenStatus(status);
    if (seenStatus === 'signed-in' && status === 'signed-out') setBusy(null);
  }

  useEffect(() => {
    prepareSignIn();
  }, [prepareSignIn]);

  if (inApp !== null) {
    return <InAppBrowserHelp app={inApp} className={className} />;
  }

  if (device === null || status === 'resolving' || !firebaseReady) {
    return (
      <div className={cn('flex flex-col gap-3', className)} aria-busy="true">
        <Skeleton className="h-control-lg w-full" />
        <Skeleton className="h-control-lg w-full" />
        <div className="min-h-5" />
      </div>
    );
  }

  const providers = orderProviders(last, device.isIOS);

  const signIn = async (provider: AuthProvider) => {
    if (busy !== null) return;
    setBusy(provider);
    setFailure(null);
    try {
      const { signInWith } = await import('@/app/lib/firebase/client');
      const outcome = await signInWith(provider);
      if (outcome.status === 'signed-in') {
        rememberLastProvider(provider);
        // Stays busy: the page is about to move on.
        onSignedIn(outcome.user, provider);
        return;
      }
      setBusy(null);
      if (outcome.status === 'failed') setFailure(outcome.reason);
    } catch {
      // Firebase itself could not load (the connection dropped, a blocked
      // script): the buttons are ready for another try.
      setBusy(null);
      setFailure('unknownAuth');
    }
  };

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {providers.map((provider) => (
        <div key={provider} className="relative">
          <Button
            block
            shape="soft"
            variant="white"
            loading={busy === provider}
            onClick={() => {
              void signIn(provider);
            }}
            className={cn(
              'text-body-xs font-semibold',
              provider === 'google'
                ? 'border-grey-200 bg-pure-white text-grey-800 shadow-md hover:bg-white-100 active:bg-white-300'
                : 'border-pure-black bg-pure-black text-pure-white shadow-none hover:bg-grey-900 active:bg-grey-800',
            )}
          >
            {provider === 'google' ? (
              <GoogleLogo className="size-5" />
            ) : (
              <AppleLogo className="size-5" />
            )}
            {t(
              provider === 'google'
                ? 'continueWithGoogle'
                : 'continueWithApple',
            )}
          </Button>
          {last === provider ? (
            <span className="pointer-events-none absolute -top-2.5 right-3.5 animate-scale-in rounded-full bg-secondary px-2 py-0.5 text-label-sm text-pure-white shadow-xs">
              {t('lastUsed')}
            </span>
          ) : null}
        </div>
      ))}
      <p
        role="alert"
        className={cn(
          'min-h-5 text-center text-body-sm text-error-700 transition-opacity duration-fast ease-house',
          failure === null ? 'opacity-0' : 'opacity-100',
        )}
      >
        {failure === null ? '' : errors(failure)}
      </p>
    </div>
  );
}
