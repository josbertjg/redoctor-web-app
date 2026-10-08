'use client';

import { useMemo } from 'react';
import type { ReactNode } from 'react';

import { m } from 'framer-motion';

import { useReducedMotion } from './reduced-motion';
import { houseTransition } from './tokens';

/** Where the piece comes from; `top` is its own height and a bit more. */
const offsets = {
  top: { y: '-120%' },
  bottom: { y: 40 },
  left: { x: -40 },
  right: { x: 40 },
} as const;

type EntranceProps = {
  from?: keyof typeof offsets;
  /** Starts the entrance; until then the piece stays out of sight. */
  play?: boolean;
  /** Seconds to wait once it may start. */
  delay?: number;
  className?: string;
  onComplete?: (() => void) | undefined;
  children: ReactNode;
};

/**
 * A piece that slides and fades into place. Under reduced motion it is
 * simply there. The wrapper is a plain block: give it the layout classes
 * the piece needs.
 */
export function Entrance({
  from = 'bottom',
  play = true,
  delay = 0,
  className,
  onComplete,
  children,
}: EntranceProps) {
  const reduced = useReducedMotion();
  const transition = useMemo(
    () => ({ ...houseTransition('entrance'), delay }),
    [delay],
  );

  if (reduced) return <div className={className}>{children}</div>;

  const hidden = { opacity: 0, x: 0, y: 0, ...offsets[from] };
  return (
    <m.div
      className={className}
      initial={hidden}
      animate={play ? { opacity: 1, x: 0, y: 0 } : hidden}
      transition={transition}
      onAnimationComplete={() => {
        if (play) onComplete?.();
      }}
    >
      {children}
    </m.div>
  );
}
