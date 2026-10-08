'use client';

import { useState, type ReactNode } from 'react';

import {
  MutationCache,
  QueryCache,
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query';

import { isApiError } from '@/app/lib/api/errors';
import { createNetworkNoticeThrottle } from '@/app/lib/api/network-notice';

import { toast, Toaster } from '@/app/ui/toast';

/*
 * Client-side plumbing shared by every page. next-intl's provider wraps this
 * in app/layout.tsx; PostHog and Sentry join here in M1 step 10, off while
 * their variables are empty.
 */

/** One toast id: a notice still on screen is replaced, never stacked. */
const NETWORK_NOTICE_ID = 'network-notice';

function createQueryClient(networkNotice: string) {
  const shouldShowNotice = createNetworkNoticeThrottle();

  // Connectivity problems are announced once for the whole page, throttled
  // (AGENTS.md §5); business errors are shown where they happen, by code.
  const onError = (error: unknown) => {
    if (!isApiError(error) || !error.isConnectivityProblem) return;
    if (shouldShowNotice()) toast(networkNotice, { id: NETWORK_NOTICE_ID });
  };

  return new QueryClient({
    queryCache: new QueryCache({ onError }),
    mutationCache: new MutationCache({ onError }),
    defaultOptions: {
      queries: {
        // The API client retries by itself (AGENTS.md §5); never twice.
        retry: false,
        // 100 requests/min per IP and "never poll": no refetch on focus.
        refetchOnWindowFocus: false,
        staleTime: 60_000,
      },
      mutations: { retry: false },
    },
  });
}

type ProvidersProps = {
  children: ReactNode;
  /** Already translated on the server (i18n: `notifications.title`, `close`). */
  toasterLabels: { region: string; close: string };
  /** The one neutral connectivity notice (i18n: `apiErrors.network`). */
  networkNotice: string;
};

export function Providers({
  children,
  toasterLabels,
  networkNotice,
}: ProvidersProps) {
  // The locale never changes in a session: the notice is read once.
  const [queryClient] = useState(() => createQueryClient(networkNotice));

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster
        regionLabel={toasterLabels.region}
        closeLabel={toasterLabels.close}
      />
    </QueryClientProvider>
  );
}
