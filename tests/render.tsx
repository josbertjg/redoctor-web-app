import type { ReactElement } from 'react';

import { render, type RenderOptions } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';

import {
  clientNamespaces,
  pickMessages,
  type Namespace,
} from '@/app/lib/i18n/client-messages';
import { defaultLocale, timeZone } from '@/app/lib/i18n/config';
import messages from '@/app/lib/i18n/messages/es.json';

/** Renders with the real Spanish catalog, as the app does. */
export function renderWithIntl(ui: ReactElement, options?: RenderOptions) {
  return render(
    <NextIntlClientProvider
      locale={defaultLocale}
      timeZone={timeZone}
      messages={messages}
    >
      {ui}
    </NextIntlClientProvider>,
    options,
  );
}

/**
 * Renders with only what a page sends to the browser: every page's
 * namespaces plus its own (AGENTS.md §9). A key the page does not send
 * fails the test, where production would show the raw key.
 */
export function renderWithPageMessages(
  ui: ReactElement,
  namespaces: readonly Namespace[],
  options?: RenderOptions,
) {
  return render(
    <NextIntlClientProvider
      locale={defaultLocale}
      timeZone={timeZone}
      messages={pickMessages(messages, [...clientNamespaces, ...namespaces])}
      onError={(error) => {
        throw error;
      }}
    >
      {ui}
    </NextIntlClientProvider>,
    options,
  );
}
