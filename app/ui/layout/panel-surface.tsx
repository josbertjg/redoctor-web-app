import type { ReactNode } from 'react';

import { cn } from '@/app/lib/utils';

type PanelSurfaceProps = {
  /** `narrow` for a form or a reading column (the payment, a receipt). */
  width?: 'narrow' | 'content';
  className?: string;
  children: ReactNode;
};

/*
 * A panel page with no design of its own on the blue frame (statistics,
 * «Mi suscripción», a receipt…): its content as it was, on a white sheet,
 * clear of the controls at the frame's top right. The pages the designer
 * drew (the home, «Citas») paint on the blue instead.
 */
export function PanelSurface({
  width = 'content',
  className,
  children,
}: PanelSurfaceProps) {
  return (
    <div
      className={cn(
        'w-full rounded-xl bg-pure-white p-4 shadow-md sm:p-6 lg:mt-14',
        width === 'narrow' && 'max-w-2xl',
        className,
      )}
    >
      {children}
    </div>
  );
}
