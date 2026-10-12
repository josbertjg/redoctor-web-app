import type { ReactNode } from 'react';

import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';

import {
  pickClientMessages,
  pickMessages,
  type Namespace,
} from '@/app/lib/i18n/client-messages';

type MessagesScopeProps = {
  /** The namespaces this subtree's client components read beyond the shared ones. */
  namespaces: readonly Namespace[];
  children: ReactNode;
};

/*
 * Sends a page's own messages to its client components, and only to that
 * page: the root layout ships the namespaces every page needs
 * (`clientNamespaces`); a page whose client components read more wraps them
 * in this scope, so the landing never carries the sign-up's copy. A nested
 * provider takes the place of the root one for its subtree, so it carries
 * the shared namespaces too.
 */
export async function MessagesScope({
  namespaces,
  children,
}: MessagesScopeProps) {
  const messages = await getMessages();
  return (
    <NextIntlClientProvider
      messages={{
        ...pickClientMessages(messages),
        ...pickMessages(messages, namespaces),
      }}
    >
      {children}
    </NextIntlClientProvider>
  );
}
