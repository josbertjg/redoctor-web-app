/*
 * One locale for the pilot, no URL prefix (AGENTS.md §2, §9). Messages use
 * the `es` locale; dates and numbers are formatted for Venezuela.
 */
export const defaultLocale = 'es';

/** Locale for Intl date, time and number formatting (app/lib/format). */
export const formatLocale = 'es-VE';

/** Every instant from the API (UTC) is shown in this time zone. */
export const timeZone = 'America/Caracas';
