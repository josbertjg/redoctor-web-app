import { getRequestConfig } from 'next-intl/server';

import { defaultLocale, timeZone } from './config';
import messages from './messages/es.json';

/* next-intl's request configuration (registered in next.config.ts). */
export default getRequestConfig(() => ({
  locale: defaultLocale,
  timeZone,
  messages,
}));
