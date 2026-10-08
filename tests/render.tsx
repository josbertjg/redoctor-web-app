import type { ReactElement } from 'react';

import { render, type RenderOptions } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';

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
