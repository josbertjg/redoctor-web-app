'use client';

import type { ComponentProps } from 'react';

import { cn } from '@/app/lib/utils';

import { useFadingEdges } from '@/app/hooks/use-fading-edges';

import { fadingEdgesClass } from './fading-edges';

/**
 * A row that scrolls sideways with the sides that have more beyond them
 * faded (`useFadingEdges`, the app's ScrollFadingEdges). It is the one part
 * of a strip that needs the browser, so what goes inside renders wherever
 * its parent does — on the server too (the landing's specialists).
 */
export function FadingRow({
  className,
  ...props
}: Omit<ComponentProps<'div'>, 'ref'>) {
  const { ref, fade } = useFadingEdges<HTMLDivElement>();
  return (
    <div
      {...props}
      ref={ref}
      data-fade={fade}
      className={cn(fadingEdgesClass, className)}
    />
  );
}
