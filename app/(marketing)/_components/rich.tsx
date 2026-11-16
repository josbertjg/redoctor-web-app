import type { ReactNode } from 'react';

/*
 * The words a title paints green: `<accent>…</accent>` in es.json, through
 * next-intl's rich text, always the app's green-500 (the owner's rule,
 * 2026-11-16): on the blue background it reads as a large title (3.7:1);
 * on white it measures 2.8:1, under AA, which he accepts for the brand.
 */

export const accentOnBlue = {
  accent: (chunks: ReactNode) => (
    <span className="text-secondary">{chunks}</span>
  ),
};

export const accentOnWhite = {
  accent: (chunks: ReactNode) => (
    <span className="text-secondary">{chunks}</span>
  ),
};
