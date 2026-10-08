import type { ReactNode } from 'react';

/*
 * The words a title paints green: `<accent>…</accent>` in es.json, through
 * next-intl's rich text. On the blue background the brand green reads as a
 * large title (3.7:1); on white it would not (2.8:1), so there the darker
 * green of the scale keeps WCAG AA.
 */

export const accentOnBlue = {
  accent: (chunks: ReactNode) => (
    <span className="text-secondary">{chunks}</span>
  ),
};

export const accentOnWhite = {
  accent: (chunks: ReactNode) => (
    <span className="text-green-700">{chunks}</span>
  ),
};
