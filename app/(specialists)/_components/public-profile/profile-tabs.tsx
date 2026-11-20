'use client';

import { useEffect, useRef, useState } from 'react';

import { cn } from '@/app/lib/utils';

type ProfileTabsProps = {
  /** The landmark's name (`specialists.sectionsLabel`). */
  label: string;
  /** The page's sections, in order, by their ids and titles. */
  sections: readonly { id: string; title: string }[];
};

/** The tab's own corners: the card's outer ones are its frame's (overflow). */
const corners = ['rounded-tr-xl', 'rounded-t-xl', 'rounded-tl-xl'] as const;

/*
 * The profile's tabs (Figma, 2026-11-16): «Descripción», «Opiniones»,
 * «Sobre este especialista» take the page to their section, and the one
 * being read is marked — the blue tint, the primary words. They are the
 * header card's foot and stay at the top of the screen while the content
 * scrolls under them, a shadow beneath them once they do.
 */
export function ProfileTabs({ label, sections }: ProfileTabsProps) {
  const nav = useRef<HTMLElement>(null);
  const sentinel = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(sections[0]?.id ?? '');
  const [stuck, setStuck] = useState(false);

  // The section being read: the last whose top has passed under the tabs.
  useEffect(() => {
    const onScroll = () => {
      const line = (nav.current?.getBoundingClientRect().bottom ?? 0) + 8;
      let current = sections[0]?.id ?? '';
      for (const section of sections) {
        const top = document
          .getElementById(section.id)
          ?.getBoundingClientRect().top;
        if (top !== undefined && top <= line) current = section.id;
      }
      setActive(current);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
    };
  }, [sections]);

  // Stuck at the top once the line just above them has scrolled away.
  useEffect(() => {
    const line = sentinel.current;
    if (!line || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(([entry]) => {
      // Gone above the screen, not below it (a short screen at the top).
      setStuck(
        entry !== undefined &&
          !entry.isIntersecting &&
          entry.boundingClientRect.top < 0,
      );
    });
    observer.observe(line);
    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <>
      <div ref={sentinel} aria-hidden="true" className="-mb-px h-px" />
      <nav
        ref={nav}
        aria-label={label}
        data-stuck={stuck || undefined}
        className="sticky top-0 z-10 overflow-hidden rounded-b-xl bg-pure-white transition-shadow duration-base ease-house data-stuck:shadow-md"
      >
        <ul className="grid grid-cols-3">
          {sections.map((section, index) => (
            <li key={section.id} className="flex">
              <a
                href={`#${section.id}`}
                aria-current={active === section.id ? 'location' : undefined}
                onClick={() => {
                  setActive(section.id);
                }}
                className={cn(
                  'flex min-h-touch flex-1 items-center justify-center px-2 py-3 text-center text-body-xxs transition-colors duration-fast ease-house outline-none focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset sm:text-body-xs',
                  corners[index] ?? 'rounded-t-xl',
                  active === section.id
                    ? 'bg-blue-50 text-primary'
                    : 'text-text-secondary hover:text-primary',
                )}
              >
                {section.title}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}
