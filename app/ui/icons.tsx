import type { ComponentType, SVGProps } from 'react';

import { cn } from '@/app/lib/utils';

/*
 * One icon family: Material Symbols Rounded, one inline SVG per icon.
 * (This file is icons.tsx because icon.tsx is a Next.js metadata file name.)
 *   import Check from '@material-symbols/svg-400/rounded/check.svg?svgr';
 *   <Icon icon={Check} size={20} />
 * The `-fill` file of the same name is the filled (selected) state.
 */

export type IconComponent = ComponentType<SVGProps<SVGSVGElement>>;
export type IconSize = 16 | 18 | 20 | 24;

const sizeClass: Record<IconSize, string> = {
  16: 'size-4',
  18: 'size-4.5',
  20: 'size-5',
  24: 'size-6',
};

type IconProps = Omit<SVGProps<SVGSVGElement>, 'children'> & {
  icon: IconComponent;
  size?: IconSize;
  /** Accessible name when the icon stands alone. Decorative without it. */
  label?: string;
};

export function Icon({
  icon: Svg,
  size = 24,
  label,
  className,
  ...props
}: IconProps) {
  const accessibility =
    label === undefined
      ? { 'aria-hidden': true }
      : { role: 'img', 'aria-label': label };

  return (
    <Svg
      {...accessibility}
      className={cn(
        'inline-block shrink-0 fill-current',
        sizeClass[size],
        className,
      )}
      {...props}
    />
  );
}
