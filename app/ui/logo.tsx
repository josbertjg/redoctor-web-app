import Image from 'next/image';

import { cn } from '@/app/lib/utils';

/* Intrinsic size of public/brand/logo.svg (Figma «REDOCTOR APP», landing header). */
const LOGO_WIDTH = 212;
const LOGO_HEIGHT = 38;

const sources = {
  brand: '/brand/logo.svg',
  // The same wordmark with its blue turned white, for blue backgrounds.
  inverse: '/brand/logo-white.svg',
};

type LogoProps = {
  /**
   * Accessible name. Leave it out when the logo sits inside a link or a
   * heading that already names it.
   */
  label?: string;
  preload?: boolean;
  /** `inverse` on a blue background. */
  tone?: keyof typeof sources;
  className?: string;
};

/** The Redoctor wordmark. Size it with a height class; the width follows. */
export function Logo({
  label,
  preload = false,
  tone = 'brand',
  className,
}: LogoProps) {
  return (
    <Image
      src={sources[tone]}
      alt={label ?? ''}
      width={LOGO_WIDTH}
      height={LOGO_HEIGHT}
      preload={preload}
      className={cn('h-7 w-auto', className)}
    />
  );
}
