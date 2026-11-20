'use client';

import { createPortal } from 'react-dom';

import { cn } from '@/app/lib/utils';

type SearchShadeProps = {
  /**
   * Where it lives: the page's own stacking context (`data-search-shade-host`
   * on its wrapper; the landing's `isolate` one, which its background shapes
   * need), or the document's body — so its layer is weighed against the
   * page's bar and the box's block, not above the whole page.
   */
  host: Element;
  /** A field of the box is in use. */
  open: boolean;
  /** Its height among the page's layers: over the bar, or under it. */
  className?: string;
};

/** The attribute a page puts on the wrapper the shade belongs in. */
export const searchShadeHost = 'data-search-shade-host';

/*
 * The page dimmed while the search box is in use (Figma, 2026-11-16: black
 * at 52 % over the page, the box and its lists above it). A tap on it lands
 * nowhere but on it — the page under it never takes the tap — and leaves
 * the box: the field loses the focus, its list closes, and the shade fades.
 * The box renders it once first used (the portal needs the page), and keeps
 * it mounted so it can fade out. Fixed to the screen: an ancestor that clips
 * (the landing's `overflow-clip`) never cuts it.
 */
export function SearchShade({ host, open, className }: SearchShadeProps) {
  return createPortal(
    <div
      aria-hidden="true"
      data-search-shade=""
      data-open={open || undefined}
      className={cn(
        'pointer-events-none fixed inset-0 bg-black/52 opacity-0 transition-opacity duration-base ease-house data-open:pointer-events-auto data-open:opacity-100',
        className,
      )}
    />,
    host,
  );
}
