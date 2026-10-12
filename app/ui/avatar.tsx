'use client';

import { useState } from 'react';

import Image from 'next/image';

import { cva, type VariantProps } from 'class-variance-authority';

import { initialsOf } from '@/app/lib/format/names';
import { cn } from '@/app/lib/utils';

// The initials in grey-700: 6:1 on the surface (grey-600 measured 4.1:1,
// under AA, the day a specialist without a photo appeared, 2026-10-12).
const avatarVariants = cva(
  'relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface-variant font-semibold text-grey-700 select-none',
  {
    variants: {
      size: {
        sm: 'size-8 text-label-sm',
        md: 'size-10 text-label-md',
        lg: 'size-16 text-title-md',
        xl: 'size-24 text-headline-sm',
        // The specialist profile's header (the app's 110 px avatar).
        '2xl': 'size-27.5 text-headline-md',
      },
    },
    defaultVariants: { size: 'md' },
  },
);

const pixels = { sm: 32, md: 40, lg: 64, xl: 96, '2xl': 110 } as const;

type AvatarProps = VariantProps<typeof avatarVariants> & {
  /** The person's name: initials fallback and accessible name. */
  name: string;
  src?: string | null;
  preload?: boolean;
  className?: string;
};

/*
 * A photo that fades in over the initials; the initials stay when there is
 * no photo or it fails to load (CustomNetworkImage / Avatar in the app).
 */
export function Avatar({
  name,
  src,
  size,
  preload = false,
  className,
}: AvatarProps) {
  const [status, setStatus] = useState<'loading' | 'loaded' | 'failed'>(
    'loading',
  );
  const sizeKey = size ?? 'md';
  const side = pixels[sizeKey];
  const showImage =
    typeof src === 'string' && src !== '' && status !== 'failed';

  return (
    <span
      role="img"
      aria-label={name}
      data-slot="avatar"
      data-size={sizeKey}
      className={cn(avatarVariants({ size }), className)}
    >
      <span aria-hidden="true">{initialsOf(name)}</span>
      {showImage ? (
        <Image
          src={src}
          alt=""
          width={side}
          height={side}
          sizes={`${side}px`}
          preload={preload}
          onLoad={() => {
            setStatus('loaded');
          }}
          onError={() => {
            setStatus('failed');
          }}
          className={cn(
            'absolute inset-0 size-full object-cover transition-opacity duration-base ease-house',
            status === 'loaded' ? 'opacity-100' : 'opacity-0',
          )}
        />
      ) : null}
    </span>
  );
}
