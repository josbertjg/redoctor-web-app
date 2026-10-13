'use client';

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';

import dynamic from 'next/dynamic';

import { cn } from '@/app/lib/utils';

import { readDuration, useReducedMotion } from '@/app/ui/motion';

import { useSlowConnection } from './connection';
import { splashCookie } from './splash-cookie';
import { markSplashDone } from './splash-state';

// The Rive runtime comes in its own chunk, only where the veil is.
const RiveLogo = dynamic(() => import('./rive-logo'), { ssr: false });

type Phase = 'playing' | 'leaving' | 'gone';

/*
 * The veil over the landing on the first visit of a session (AGENTS.md §13):
 * the page's blue, the logo's entrance from the app's own Rive file, and the
 * app's 250 ms fade when the entrance ends — or at its cap, on a tap, on
 * Escape, or when the runtime fails or takes too long to start. Rendered on
 * the server, so it is there from the first frame; without JavaScript the
 * CSS fades it out by itself. Under reduced motion, or on a slow or
 * data-saving connection, it is over at once. It is decoration: hidden from
 * assistive technology and never in the way of the keyboard.
 */
export function SplashVeil() {
  const reduced = useReducedMotion();
  const slow = useSlowConnection();
  const [phase, setPhase] = useState<Phase>('playing');
  /** JavaScript leads the veil: the CSS fallback fade is off. */
  const [driven, setDriven] = useState(false);
  const veil = useRef<HTMLDivElement>(null);
  // Skipping needs no phase of its own: the veil is simply over.
  const over = phase !== 'playing' || reduced || slow;

  // Once the page runs, the CSS fade (the fallback without JavaScript) must
  // not cut the logo mid-entrance on a slow start: the timers here take over.
  // A page that hydrated after that fade had already played out is over.
  useLayoutEffect(() => {
    const element = veil.current;
    if (!element) return;
    if (getComputedStyle(element).visibility === 'hidden') {
      setPhase('gone');
      return;
    }
    setDriven(true);
  }, []);

  const finish = useCallback(() => {
    setPhase((current) => (current === 'playing' ? 'leaving' : current));
  }, []);

  // What leaving means for the rest of the page happens as it starts.
  useEffect(() => {
    if (!over) return;
    rememberSplash();
    markSplashDone();
  }, [over]);

  // The runtime may never answer (offline, blocked, slow): the veil waits
  // for it until the fallback, and no longer once the entrance is playing.
  const fallback = useRef<number | undefined>(undefined);
  useEffect(() => {
    fallback.current = window.setTimeout(
      finish,
      readDuration('splash-fallback') * 1000,
    );
    return () => {
      window.clearTimeout(fallback.current);
    };
  }, [finish]);
  const started = useCallback(() => {
    window.clearTimeout(fallback.current);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') finish();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [finish]);

  if (phase === 'gone' || reduced || slow) return null;

  return (
    <div
      ref={veil}
      data-splash={phase}
      aria-hidden="true"
      onClick={finish}
      onAnimationEnd={() => {
        setPhase('gone');
      }}
      className={cn(
        'fixed inset-0 z-50 flex items-center justify-center bg-primary motion-reduce:hidden',
        // Playing without JavaScript: the fallback, a fade after its delay.
        // Leaving: the fade now, under another name — the browser would
        // carry on the first animation, already past its end, instead of
        // restarting it.
        phase === 'leaving'
          ? 'animate-fade-out'
          : driven
            ? null
            : 'animate-splash-out',
      )}
    >
      <RiveLogo
        onStart={started}
        onDone={finish}
        onError={finish}
        className="h-full w-full max-w-md"
      />
    </div>
  );
}

function rememberSplash(): void {
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${splashCookie}=1; Path=/; SameSite=Lax${secure}`;
}
