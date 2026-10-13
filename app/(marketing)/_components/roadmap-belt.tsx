'use client';

import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';

import { cn } from '@/app/lib/utils';

import {
  m,
  readDuration,
  useCoarsePointer,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from '@/app/ui/motion';

/** Keeps `value` inside [min, max): a belt of copies loops without a seam. */
function wrap(min: number, max: number, value: number): number {
  const range = max - min;
  return ((((value - min) % range) + range) % range) + min;
}

/** The screens where the ribbon stands still: the `touch:` variant's and reduced motion's. */
const standsStill = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
  window.matchMedia('(hover: none) and (pointer: coarse)').matches;

/** The horizontal shift of a computed `transform` (a 2D matrix), in px. */
function shiftOf(transform: string): number {
  const parts = /^matrix\(([^)]+)\)$/.exec(transform)?.[1]?.split(',');
  return Number(parts?.[4] ?? 0) || 0;
}

type RoadmapBeltProps = {
  label: string;
  children: ReactNode;
};

/*
 * The ribbon of «Prepárate para lo que viene»: four copies of the cards in
 * a track that rolls left by itself, pauses under the pointer or the
 * keyboard's focus, and can be dragged. The HTML arrives rolling by CSS
 * (`animate-marquee`); once mounted, JavaScript reads where CSS has rolled
 * the track to and takes over from there, so a hand can drag it and it
 * rolls on from wherever it is let go, at the same pace (one copy per
 * `--duration-marquee`). The track rests one copy in (and settles back
 * there, one copy at a time, which the eye cannot tell), so a drag of a
 * screen's width either way still finds cards. On touch screens and with
 * reduced motion the ribbon stands still and scrolls by hand (CSS, one
 * copy), and nothing here runs.
 */
export function RoadmapBelt({ label, children }: RoadmapBeltProps) {
  const reduced = useReducedMotion();
  const coarse = useCoarsePointer();
  const still = reduced || coarse;
  const region = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  /** One copy's width with the gap after it, in px; 0 until measured. */
  const [copy, setCopy] = useState(0);
  const [driven, setDriven] = useState(false);
  const dragging = useRef(false);
  const pace = useRef(0);
  /** The copy's width for the frame loop, which must not restart when it changes. */
  const copyWidth = useRef(0);
  const base = useMotionValue(0);
  const x = useTransform(base, (value) =>
    copy > 0 ? wrap(-2 * copy, -copy, value) : value,
  );

  useEffect(() => {
    const element = track.current;
    const first = element?.firstElementChild;
    // Read again here: during hydration `still` is the server's guess (false).
    if (!element || !(first instanceof HTMLElement) || still || standsStill())
      return;
    const measure = () =>
      first.getBoundingClientRect().width +
      (parseFloat(getComputedStyle(element).columnGap) || 0);
    const width = measure();
    // Where CSS has rolled the track to; the same spot one copy in, and the
    // CSS animation off in the same breath, so nothing jumps.
    const rolled = shiftOf(getComputedStyle(element).transform);
    base.set(-width + rolled);
    element.style.animation = 'none';
    element.style.transform = `translateX(${String(-width + rolled)}px)`;
    pace.current = width / readDuration('marquee');
    copyWidth.current = width;
    setCopy(width);
    setDriven(true);
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => {
      const next = measure();
      pace.current = next / readDuration('marquee');
      copyWidth.current = next;
      setCopy(next);
    });
    observer.observe(first);
    return () => {
      observer.disconnect();
    };
  }, [base, still]);

  // Rolls unless a pointer rests on the ribbon or the keyboard focuses it
  // (the same pause the CSS phase has; a drag's click focuses it too, so
  // only a visible focus counts), or a hand holds it. The frame loop runs
  // only while JavaScript drives the ribbon and it is on screen: off screen,
  // nothing wakes the page every frame.
  useEffect(() => {
    const element = region.current;
    if (!driven || still || !element) return;
    let frame = 0;
    let last: number | null = null;
    const tick = (time: number) => {
      const delta = last === null ? 0 : time - last;
      last = time;
      frame = requestAnimationFrame(tick);
      if (dragging.current || copyWidth.current === 0) return;
      if (element.matches(':hover, :focus-visible')) return;
      base.set(base.get() - pace.current * (delta / 1000));
    };
    const start = () => {
      if (frame !== 0) return;
      last = null;
      frame = requestAnimationFrame(tick);
    };
    const stop = () => {
      cancelAnimationFrame(frame);
      frame = 0;
    };
    if (typeof IntersectionObserver === 'undefined') {
      start();
      return stop;
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) start();
      else stop();
    });
    observer.observe(element);
    return () => {
      observer.disconnect();
      stop();
    };
  }, [base, driven, still]);

  return (
    <div
      ref={region}
      role="region"
      aria-label={label}
      // A region that scrolls by hand must be reachable with the keyboard
      // (axe: scrollable-region-focusable).
      // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
      tabIndex={0}
      className="group/belt mt-10 flex scrollbar-none overflow-hidden py-3 outline-none focus-visible:ring-3 focus-visible:ring-white-50/70 motion-reduce:snap-x motion-reduce:overflow-x-auto motion-reduce:px-gutter lg:mt-12 touch:snap-x touch:overflow-x-auto touch:px-gutter"
    >
      <m.div
        ref={track}
        style={{ x }}
        drag={driven && !still ? 'x' : false}
        dragMomentum={false}
        onDragStart={() => {
          dragging.current = true;
        }}
        onDragEnd={() => {
          base.set(wrap(-2 * copy, -copy, x.get()));
          dragging.current = false;
        }}
        className={cn(
          'flex w-max gap-7 pr-7 motion-reduce:pr-0 touch:pr-0',
          driven
            ? 'cursor-grab active:cursor-grabbing'
            : 'animate-marquee group-hover/belt:[animation-play-state:paused] group-focus-visible/belt:[animation-play-state:paused] motion-reduce:animate-none touch:animate-none',
        )}
      >
        {children}
      </m.div>
    </div>
  );
}
