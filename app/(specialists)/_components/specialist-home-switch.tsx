'use client';

import type { ReactNode } from 'react';

import { specialistMustFinishInApp } from '@/app/lib/auth/account';

import { useSession } from '@/app/hooks/use-session';

type SpecialistHomeSwitchProps = {
  /** The app's options: a specialist whose sign-up is done. */
  ready: ReactNode;
  /** The way to the app: a specialist whose sign-up is still open (M3). */
  pending: ReactNode;
};

/*
 * `/panel` shows the app's options to a specialist who can use them, and to
 * one whose sign-up is still open the way to finish it in the app — support
 * while the app is in testing, the store once it is published. Both are
 * rendered on the server; the session (known only here) picks one.
 */
export function SpecialistHomeSwitch({
  ready,
  pending,
}: SpecialistHomeSwitchProps) {
  const { account } = useSession();
  return account !== null && specialistMustFinishInApp(account)
    ? pending
    : ready;
}
