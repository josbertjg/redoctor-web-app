'use client';

import { useEffect, useMemo, useRef } from 'react';
import type { ReactNode } from 'react';

import { useFormatter } from 'next-intl';

import {
  Choreographed,
  motionValue,
  readDuration,
  readEase,
} from '@/app/ui/motion';
import type {
  AnimationSequence,
  DOMKeyframesDefinition,
} from '@/app/ui/motion';

/** The section's pieces, as pricing.tsx marks them. */
const piece = (name: string) => `[data-piece="${name}"]`;

/** Seconds between two benefits that enter one after the other. */
const featureBeat = 0.07;
/** How a price is written: as the server writes it. */
const cents = { minimumFractionDigits: 2, maximumFractionDigits: 2 };

type Plan = { key: string; price: number; featured: boolean };

type PricingMotionProps = {
  plans: Plan[];
  children: ReactNode;
};

/*
 * «Elige el plan ideal» enters as it scrolls into view: the white box
 * fades in, the chip pops, the title and its line rise; the recommended
 * plan grows into place and the other two slide out from behind it
 * (measured from the layout, so in a column they come from above and
 * below it); each price counts up from zero as its card lands, written
 * the way the server writes it; the «Recomendado» tag pops, the benefits
 * step in one after another and the buttons rise last. Seconds count from
 * the moment the box comes into view.
 */
export function PricingMotion({ plans, children }: PricingMotionProps) {
  const format = useFormatter();
  const root = useRef<HTMLDivElement>(null);
  const amounts = useMemo(
    () => plans.map((plan) => motionValue(plan.price)),
    [plans],
  );

  // Each amount writes itself into its number as it counts.
  useEffect(() => {
    const box = root.current;
    if (!box) return;
    const stops = plans.map((plan, index) => {
      const target = box.querySelector(piece(`amount-${plan.key}`));
      const value = amounts[index];
      if (!target || !value) return () => undefined;
      return value.on('change', (latest) => {
        target.textContent = format.number(latest, cents);
      });
    });
    return () => {
      for (const stop of stops) stop();
    };
  }, [plans, amounts, format]);

  const { hidden, sequence } = useMemo(() => {
    const step = {
      duration: readDuration('entrance'),
      ease: readEase('entrance'),
    };
    const featured = plans.find((plan) => plan.featured) ?? plans[0];
    const hidden = (box: HTMLElement) => {
      const states: Record<string, DOMKeyframesDefinition> = {
        [piece('box')]: { opacity: 0 },
        [piece('chip')]: { opacity: 0, scale: 0.6 },
        [piece('title')]: { opacity: 0, y: 24 },
        [piece('description')]: { opacity: 0, y: 16 },
        [piece('tag')]: { opacity: 0, scale: 0.6 },
        [piece('feature-1')]: { opacity: 0, x: -12 },
        [piece('feature-2')]: { opacity: 0, x: -12 },
        [piece('feature-3')]: { opacity: 0, x: -12 },
        [piece('cta')]: { opacity: 0, y: 12 },
      };
      const anchor = featured
        ? box
            .querySelector(piece(`card-${featured.key}`))
            ?.getBoundingClientRect()
        : undefined;
      plans.forEach((plan, index) => {
        const card = box.querySelector(piece(`card-${plan.key}`));
        if (!card) return;
        if (plan.featured || !anchor) {
          states[piece(`card-${plan.key}`)] = { opacity: 0, scale: 0.95 };
        } else {
          const own = card.getBoundingClientRect();
          states[piece(`card-${plan.key}`)] = {
            opacity: 0,
            x: anchor.left - own.left,
            y: anchor.top - own.top,
          };
        }
        // The price waits at zero until its card lands.
        amounts[index]?.set(0);
        const amount = box.querySelector(piece(`amount-${plan.key}`));
        if (amount) amount.textContent = format.number(0, cents);
      });
      return states;
    };
    const sequence: AnimationSequence = [
      [piece('box'), { opacity: 1 }, { ...step, at: 0 }],
      [piece('chip'), { opacity: 1, scale: 1 }, { ...step, at: 0.1 }],
      [piece('title'), { opacity: 1, y: 0 }, { ...step, at: 0.2 }],
      [piece('description'), { opacity: 1, y: 0 }, { ...step, at: 0.3 }],
    ];
    plans.forEach((plan, index) => {
      const at = plan.featured ? 0.4 : 0.5;
      sequence.push([
        piece(`card-${plan.key}`),
        plan.featured ? { opacity: 1, scale: 1 } : { opacity: 1, x: 0, y: 0 },
        { ...step, at },
      ]);
      const value = amounts[index];
      if (value) sequence.push([value, plan.price, { ...step, at: at + 0.1 }]);
    });
    sequence.push([
      piece('tag'),
      { opacity: 1, scale: 1 },
      { ...step, at: 0.55 },
    ]);
    [1, 2, 3].forEach((n, index) => {
      sequence.push([
        piece(`feature-${String(n)}`),
        { opacity: 1, x: 0 },
        { ...step, at: 0.7 + index * featureBeat },
      ]);
    });
    sequence.push([piece('cta'), { opacity: 1, y: 0 }, { ...step, at: 0.9 }]);
    return { hidden, sequence };
  }, [plans, amounts, format]);

  return (
    <div ref={root}>
      <Choreographed hidden={hidden} sequence={sequence}>
        {children}
      </Choreographed>
    </div>
  );
}
