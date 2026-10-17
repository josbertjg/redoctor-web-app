import { useLayoutEffect, useRef } from 'react';

/**
 * Moves the focus to the heading of the view inside the returned container
 * when `view` changes — a flow's next step, the next consultation to rate,
 * the outcome of a form — so the keyboard and screen readers follow it: the
 * control that was pressed is gone, and the focus must not fall back to the
 * start of the page. Never on the first render: arriving on a page keeps the
 * browser's own focus. Before the view paints (a layout effect): the scroll
 * the focus may bring happens before a page transition captures the view,
 * never in the middle of its animation (AGENTS.md §8, rule 13).
 */
export function useFocusHeading<T extends HTMLElement = HTMLDivElement>(
  view: unknown,
) {
  const container = useRef<T>(null);
  const shown = useRef(view);

  useLayoutEffect(() => {
    if (Object.is(shown.current, view)) return;
    shown.current = view;
    // The view's news when it marks one (a StatusCard's title), else its heading.
    const heading =
      container.current?.querySelector<HTMLElement>('[data-view-heading]') ??
      container.current?.querySelector<HTMLElement>('h1, h2');
    if (!heading) return;
    // Focusable by script only; globals.css keeps a heading without a ring.
    if (!heading.hasAttribute('tabindex')) heading.tabIndex = -1;
    heading.focus();
  }, [view]);

  return container;
}
