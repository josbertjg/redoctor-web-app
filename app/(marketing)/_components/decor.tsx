import Image from 'next/image';

import { cn } from '@/app/lib/utils';

/*
 * The shapes that float behind the landing (Figma): white swirls at 10 % on
 * the blue page, blue ones at 10 % inside white cards, and white plus signs.
 * They are decoration: hidden from assistive technology, no pointer events,
 * positioned by whoever places them.
 */

const swirls = {
  'bg-1': { width: 1571, height: 1313 },
  'bg-2': { width: 2787, height: 2788 },
  'bg-3': { width: 975, height: 1092 },
  'bg-4': { width: 1818, height: 1856 },
  pricing: { width: 628, height: 687 },
  'card-1': { width: 508, height: 577 },
  'card-2': { width: 576, height: 506 },
  'card-3': { width: 532, height: 445 },
  'card-4': { width: 627, height: 602 },
} as const;

export type SwirlVariant = keyof typeof swirls;

export function Swirl({
  variant,
  className,
}: {
  variant: SwirlVariant;
  className: string;
}) {
  const { width, height } = swirls[variant];
  return (
    <Image
      src={`/illustrations/landing/swirl-${variant}.svg`}
      alt=""
      aria-hidden="true"
      width={width}
      height={height}
      className={cn(
        'pointer-events-none absolute h-auto max-w-none select-none',
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
      className={cn(
        'pointer-events-none absolute h-auto select-none',
        className,
      )}
    />
  );
}
