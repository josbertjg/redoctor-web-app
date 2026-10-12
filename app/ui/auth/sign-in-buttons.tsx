'use client';

import { useState, useSyncExternalStore } from 'react';

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

import { useDevice } from '@/app/hooks/use-device';
import { useInAppBrowser } from '@/app/hooks/use-in-app-browser';

import { InAppBrowserHelp } from './in-app-browser-help';
import { AppleLogo, GoogleLogo } from './provider-logos';

type SignInButtonsProps = {
  /** Called once Firebase has the person; the page decides where they go. */
  onSignedIn: (user: SessionUser, provider: AuthProvider) => void;
  className?: string;
};

// The memory does not change while the page is open: nothing to listen to.
const subscribe = () => () => undefined;
const onServer = () => null;

/*
 * «Continuar con Google» and «Continuar con Apple», as the app draws them:
 * each in its brand's colours, the last-used provider first with the
 * «Última vez» chip (the memory lives in this browser), Apple first on
 * Apple devices otherwise. A press shows its own loading state and never
 * disables anything (AGENTS.md §8.3); a closed window is not an error, a
 * failure says what happened under the buttons. Inside Instagram's or
 * Facebook's browser the buttons give way to the way out.
 */
export function SignInButtons({ onSignedIn, className }: SignInButtonsProps) {
  const t = useTranslations('auth');
  const errors = useTranslations('apiErrors.firebaseAuthErrors');
  const device = useDevice();
  const inApp = useInAppBrowser();
  const last = useSyncExternalStore(subscribe, readLastProvider, onServer);
  const [busy, setBusy] = useState<AuthProvider | null>(null);
  const [failure, setFailure] = useState<AuthErrorKey | null>(null);

  if (inApp !== null) {
    return <InAppBrowserHelp app={inApp} className={className} />;
  }

  const providers = orderProviders(last, device?.isIOS ?? false);

  const signIn = async (provider: AuthProvider) => {
    if (busy !== null) return;
    setBusy(provider);
    setFailure(null);
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
