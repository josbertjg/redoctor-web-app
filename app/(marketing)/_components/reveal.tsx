'use client';

import { useEffect, useRef, type ReactNode } from 'react';

import { cn } from '@/app/lib/utils';

type RevealProps = {
  children: ReactNode;
  className?: string;
};

/*
 * Content below the fold slides up as it scrolls into view (AGENTS.md §8.2).
 * The HTML arrives visible: only after hydration, and only for what is still
 * out of view, does the element hide until it enters. What is already on
 * screen, reduced-motion users and environments without an observer never
 * see a hidden state, so nothing depends on JavaScript to be readable.
 */
export function Reveal({ children, className }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const reducesMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;
    const alreadyInView =
      element.getBoundingClientRect().top < window.innerHeight;
    if (
      reducesMotion ||
      alreadyInView ||
      typeof IntersectionObserver === 'undefined'
    ) {
      element.dataset.reveal = 'shown';
      return;
    }

    element.dataset.reveal = 'pending';
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        element.dataset.reveal = 'shown';
        observer.disconnect();
      },
      { rootMargin: '0px 0px -10% 0px' },
    );
    observer.observe(element);
    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <div
      ref={ref}
      data-reveal="idle"
      className={cn(
        // `translate`, not `transform`: Tailwind's translate-y sets that property.
        'transition-[opacity,translate] duration-entrance ease-entrance data-[reveal=pending]:translate-y-6 data-[reveal=pending]:opacity-0',
        className,
      )}
    >
      {children}
    </div>
  );
}
