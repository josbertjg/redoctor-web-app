/* eslint-disable @typescript-eslint/consistent-type-definitions -- next-intl is configured through interface merging */
import type { defaultLocale } from '@/app/lib/i18n/config';
import type messages from '@/app/lib/i18n/messages/es.json';

/* Typed message keys and locale for useTranslations / getTranslations. */
declare module 'next-intl' {
  interface AppConfig {
    Locale: typeof defaultLocale;
    Messages: typeof messages;
  }
}
