import Image from 'next/image';

import { cn } from '@/app/lib/utils';

/*
 * Intrinsic sizes of the brand files (Figma «REDOCTOR APP»): the wordmark
 * of the landing header, and the short mark — its «Re» alone, the app's
 * `logo-short` with the letters in brand blue and green.
 */
const sources = {
  brand: { src: '/brand/logo.svg', width: 212, height: 38 },
  // The same wordmark with its blue turned white, for blue backgrounds.
  inverse: { src: '/brand/logo-white.svg', width: 212, height: 38 },
  mark: { src: '/brand/logo-mark.svg', width: 43, height: 28 },
};

type LogoProps = {
  /**
   * Accessible name. Leave it out when the logo sits inside a link or a
   * heading that already names it.
   */
  label?: string;
  preload?: boolean;
  /** `inverse` on a blue background; `mark` for the short «Re». */
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
  const source = sources[tone];
  return (
    <Image
      src={source.src}
      alt={label ?? ''}
      width={source.width}
      height={source.height}
      preload={preload}
      className={cn('h-7 w-auto', className)}
    />
  );
}
