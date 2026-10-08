'use client';

import { useEffect, useMemo, useRef } from 'react';

import {
  Fit,
  Layout,
  Rive,
  RuntimeLoader,
  useRive,
} from '@rive-app/react-canvas-lite';

import { readDuration } from '@/app/ui/motion';

// The runtime fetches its WebAssembly from a CDN by default; ours serves it
// (public/animations, a copy the test keeps in step with the package), so no
// third party sees a visit and the CSP stays closed.
RuntimeLoader.setWasmUrl('/animations/rive.wasm');
// Playing a named timeline is what tells us when the entrance ends; a state
// machine would not. The parameter is deprecated for a later major, and the
// package is pinned to this one.
Rive.suppressDeprecationWarnings = [
  'animations-param',
  'animation-names',
  'names-array',
];

type RiveLogoProps = {
  /** The entrance started: from here it has its own, shorter, time. */
  onStart: () => void;
  /** The entrance ended, or ran out of its time. */
  onDone: () => void;
  /** The file or the runtime failed: the veil should not wait. */
  onError: () => void;
  className?: string;
};

/*
 * The logo's entrance from the app's own file (`Timeline 1` of
 * splash_logo.riv; `Timeline 2`, the waiting bob, is the app's: here there
 * is nothing to wait for). Loaded only on the client, by the veil.
 */
export default function RiveLogo({
  onStart,
  onDone,
  onError,
  className,
}: RiveLogoProps) {
  // The callbacks live in a ref: the runtime keeps the first ones it gets.
  const callbacks = useRef({ onStart, onDone, onError });
  useEffect(() => {
    callbacks.current = { onStart, onDone, onError };
  }, [onStart, onDone, onError]);
  const cap = useRef<number | undefined>(undefined);

  const params = useMemo(
    () => ({
      src: '/animations/splash-logo.riv',
      animations: 'Timeline 1',
      autoplay: true,
      // The artboard is a phone screen (393×852) painting its own blue, with
      // the logo in the middle: contained in a tall box, it reads as the app
      // shows it, and the logo takes the same share of a phone's width.
      layout: new Layout({ fit: Fit.Contain }),
      onPlay: () => {
        callbacks.current.onStart();
        // Once it plays, the entrance gets its token of time: the length of
        // `Timeline 1`, measured, since the runtime does not say when it ends.
        window.clearTimeout(cap.current);
        cap.current = window.setTimeout(
          () => {
            callbacks.current.onDone();
          },
          readDuration('splash') * 1000,
        );
      },
      // No `onStop`: the runtime never reports the end of a one-shot timeline,
      // and the React hook stops and restarts it right after mounting.
      onLoadError: () => {
        callbacks.current.onError();
      },
    }),
    [],
  );

  const { RiveComponent } = useRive(params);

  useEffect(
    () => () => {
      window.clearTimeout(cap.current);
    },
    [],
  );

  return <RiveComponent className={className} />;
}
