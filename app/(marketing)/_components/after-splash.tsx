'use client';

import type { ComponentProps } from 'react';

import { Entrance } from '@/app/ui/motion';

import { useSplashDone } from './splash/splash-state';

type AfterSplashProps = Omit<ComponentProps<typeof Entrance>, 'play'> & {
  /** The splash is on: the piece waits for it to leave. */
  waitForSplash: boolean;
};

/** An entrance that starts when the splash leaves — or at once, without one. */
export function AfterSplash({ waitForSplash, ...props }: AfterSplashProps) {
  const splashDone = useSplashDone();
  return <Entrance play={!waitForSplash || splashDone} {...props} />;
}
