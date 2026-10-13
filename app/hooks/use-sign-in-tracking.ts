import { useEffect, useRef, useState } from 'react';

import { track } from '@/app/lib/analytics/track';
import type { AuthProvider } from '@/app/lib/auth/last-provider';

import { useSession } from './use-session';

/**
 * Counts a sign-in made on this page (`web_signin_completed`) once the API
 * has said who the person is, so the event carries their role. Returns the
 * handler for the sign-in buttons.
 */
export function useSignInTracking() {
  const { account } = useSession();
  const [provider, setProvider] = useState<AuthProvider | null>(null);
  const tracked = useRef(false);

  useEffect(() => {
    if (account === null || provider === null || tracked.current) return;
    tracked.current = true;
    track('web_signin_completed', { provider, role: account.role });
  }, [account, provider]);

  return (_user: unknown, chosen: AuthProvider) => {
    setProvider(chosen);
  };
}
