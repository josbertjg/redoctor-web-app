import Image from 'next/image';

import { cn } from '@/app/lib/utils';

/*
 * The shapes that float behind the landing (Figma): white swirls at 10 % on
 * the blue page, blue ones at 10 % inside white cards, and white plus signs.
 * They are decoration: hidden from assistive technology, no pointer events,
 * positioned by whoever places them.
 *
 * Page shapes (`bg-*` swirls, the plus signs) paint behind every section's
 * content: a negative z-index inside the page's own stacking context (the
 * `isolate` wrapper of the page), above its blue background. So a shape may
 * start in one section and run on into the next without being cut, as long
 * as the section that places it is `relative` and does not clip; the page
 * wrapper clips at its own edges. Card shapes (`pricing`, `card-*`) belong to
 * a white card and are cut by its corners.
 */

const swirls = {
  'bg-1': { width: 1571, height: 1313, layer: 'page' },
  'bg-2': { width: 2787, height: 2788, layer: 'page' },
  'bg-3': { width: 975, height: 1092, layer: 'page' },
  'bg-4': { width: 1818, height: 1856, layer: 'page' },
  pricing: { width: 628, height: 687, layer: 'card' },
  'card-1': { width: 508, height: 577, layer: 'card' },
  'card-2': { width: 576, height: 506, layer: 'card' },
  'card-3': { width: 532, height: 445, layer: 'card' },
  'card-4': { width: 627, height: 602, layer: 'card' },
} as const;

export type SwirlVariant = keyof typeof swirls;

const base = 'pointer-events-none absolute h-auto select-none';
const pageLayer = '-z-10';

export function Swirl({
  variant,
  className,
}: {
  variant: SwirlVariant;
  className: string;
}) {
  const { width, height, layer } = swirls[variant];
  return (
    <Image
      src={`/illustrations/landing/swirl-${variant}.svg`}
      alt=""
      aria-hidden="true"
      width={width}
      height={height}
      className={cn(
        base,
        'max-w-none',
        layer === 'page' && pageLayer,
        className,
      )}
    />
  );
}

export function Plus({ className }: { className: string }) {
  return (
    <Image
      src="/illustrations/landing/plus.svg"
      alt=""
      aria-hidden="true"
      width={105}
      height={105}
      className={cn(base, pageLayer, className)}
    />
  );
}
