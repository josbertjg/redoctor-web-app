import Image from 'next/image';

import CheckCircle from '@material-symbols/svg-400/rounded/check_circle.svg?svgr';
import { useTranslations } from 'next-intl';

import { cn } from '@/app/lib/utils';

import { accentOnBlue } from './rich';
import { SectionHeading } from './section-heading';
import { TrustMotion } from './trust-motion';
import {
  landingSections,
  trustSteps,
  type TrustStepKey,
  type TrustTone,
} from '../_data/landing-content';

/*
 * «Sí, puedes confiar» (Figma): the verification in four numbered cards,
 * each with its illustration peeking from the bottom edge. The words and
 * the picture have separate areas, one under the other, so a longer line
 * makes the card taller instead of running under the picture. Since the
 * mockup's update of 2026-10-08 the second card is brand green and the
 * third brand blue, with white words — the owner's call for the green:
 * white on green-500 measures 2.8:1, under AA, and the e2e audit lists
 * that card as its one accepted exception (AGENTS.md §13). The pieces
 * carry `data-piece` for their entrance (trust-motion.tsx). Over a card it
 * lifts, its picture peeks up a little more and a wave of the opposite
 * surface washes over it, each from its own corner.
 */
const surfaces: Record<TrustTone, string> = {
  white: 'bg-pure-white text-primary',
  green: 'bg-secondary text-pure-white',
  blue: 'bg-primary text-pure-white',
};
/* The wave: a `::before` under the words, clipped to a circle or ellipse
   that grows from the wave's origin until it covers the card (142 % of a
   clip-path's reference radius reaches the far corner), while the words
   take the colour that reads on the new surface. */
const wave =
  'before:absolute before:inset-0 before:-z-10 before:transition-[clip-path] before:duration-slow before:ease-house';
const waves: Record<TrustStepKey, string> = {
  // Green rising from the bottom edge, its crest in the middle.
  identity:
    'before:bg-secondary before:[clip-path:ellipse(100%_0%_at_50%_100%)] hover:text-pure-white hover:before:[clip-path:ellipse(100%_125%_at_50%_100%)]',
  // White from the top right corner down to the bottom left.
  specialty:
    'before:bg-pure-white before:[clip-path:circle(0%_at_100%_0%)] hover:text-primary hover:before:[clip-path:circle(142%_at_100%_0%)]',
  // White from the bottom left corner up to the top right.
  approved:
    'before:bg-pure-white before:[clip-path:circle(0%_at_0%_100%)] hover:text-primary hover:before:[clip-path:circle(142%_at_0%_100%)]',
  // Green out of the circle behind the specialist, at the bottom centre.
  published:
    'before:bg-secondary before:[clip-path:circle(0%_at_50%_100%)] hover:text-pure-white hover:before:[clip-path:circle(142%_at_50%_100%)]',
};
/* Each card above the ones after it: a card entering from where an earlier
   one sits comes out from under it. */
const cardDepth = ['z-4', 'z-3', 'z-2', 'z-1'];
export function Trust() {
  const t = useTranslations('landing.trust');

  return (
    <section
      id={landingSections.trust}
      aria-labelledby="trust-title"
      className="scroll-mt-28 px-gutter py-16 lg:py-24"
    >
      <TrustMotion>
        <div className="mx-auto grid max-w-landing items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:gap-16">
          <SectionHeading
            id="trust-title"
            chip={{ icon: CheckCircle, label: t('chip') }}
            title={t.rich('title', accentOnBlue)}
            description={t('description')}
            tone="on-blue"
            align="start"
            pieces={{
              chip: 'chip',
              title: 'title',
              description: 'description',
            }}
          />
          <ol
            aria-label={t('stepsLabel')}
            className="isolate grid gap-5 sm:grid-cols-2"
          >
            {trustSteps.map((step, index) => (
              <li
                key={step.key}
                data-piece={`card-${String(index + 1)}`}
                className={cn(
                  'group relative isolate flex cursor-pointer flex-col overflow-hidden rounded-2xl shadow-md transition-[translate,box-shadow] duration-base ease-house hover:-translate-y-1 hover:shadow-lg',
                  surfaces[step.tone],
                  cardDepth[index],
                  wave,
                  waves[step.key],
                )}
              >
                <div className="flex items-start gap-3 p-5 pb-3">
                  <span
                    data-piece="number"
                    aria-hidden="true"
                    className="flex size-7 shrink-0 items-center justify-center rounded-full bg-blue-50 text-label-lg text-primary shadow-sm"
                  >
                    {index + 1}
                  </span>
                  {/* The words turn in a fast beat, a third of the wave in,
                      so they flip as its front reaches them rather than
                      fading out on the old surface; on the way back they
                      turn at once, since the front leaves them first. */}
                  <p className="text-body-xs font-semibold text-pretty transition-colors duration-fast ease-house group-hover:delay-[calc(var(--duration-slow)/3)]">
                    {t(`steps.${step.key}`)}
                  </p>
                </div>
                {/* The picture area: as tall as the mockup leaves under two
                    lines, and the card's edge cuts what sticks out. */}
                <div className="relative mt-auto aspect-291/112">
                  <Image
                    data-piece="picture"
                    src={`/illustrations/landing/${step.illustration}.svg`}
                    alt=""
                    aria-hidden="true"
                    width={step.width}
                    height={step.height}
                    className={cn(
                      'absolute left-1/2 h-auto -translate-x-1/2 transition-[translate] duration-base ease-house group-hover:-translate-y-2',
                      step.placement,
                    )}
                  />
                </div>
              </li>
            ))}
          </ol>
        </div>
      </TrustMotion>
    </section>
  );
}
