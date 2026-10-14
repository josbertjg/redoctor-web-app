import { formatLocale } from '../i18n/config';

/*
 * How far an office is, as Venezuela writes it: «850 m», «3,2 km»,
 * «120 km». One decimal under a hundred kilometres, none above: past that,
 * the decimal says nothing.
 */

const metersFormat = new Intl.NumberFormat(formatLocale, {
  style: 'unit',
  unit: 'meter',
  unitDisplay: 'short',
  maximumFractionDigits: 0,
});

const kilometersFormat = new Intl.NumberFormat(formatLocale, {
  style: 'unit',
  unit: 'kilometer',
  unitDisplay: 'short',
  maximumFractionDigits: 1,
});

const farKilometersFormat = new Intl.NumberFormat(formatLocale, {
  style: 'unit',
  unit: 'kilometer',
  unitDisplay: 'short',
  maximumFractionDigits: 0,
});

/** The distance never breaks across lines: «3,2» here and «km» there. */
const unbreakable = (text: string) => text.replace(/\s/g, ' ');

export function formatDistance(meters: number): string {
  if (!Number.isFinite(meters) || meters < 0) return '';
  if (meters < 1000)
    return unbreakable(metersFormat.format(Math.round(meters)));
  const kilometers = meters / 1000;
  return unbreakable(
    kilometers < 100
      ? kilometersFormat.format(kilometers)
      : farKilometersFormat.format(kilometers),
  );
}
