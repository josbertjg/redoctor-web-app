'use client';

import type { ReactNode } from 'react';

import { LazyMotion } from 'framer-motion';

/*
 * Mounts Motion for a subtree with its features loaded after the first
 * render: the `m` components render their initial state on the server and
 * animate once the chunk arrives. `strict` throws on a stray `motion.*`
 * import, which would ship the whole library at once.
 */
const loadFeatures = () =>
  import('./features').then((module) => module.default);

export function MotionProvider({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={loadFeatures} strict>
      {children}
    </LazyMotion>
  );
}
