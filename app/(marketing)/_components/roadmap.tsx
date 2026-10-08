import { useTranslations } from 'next-intl';

import { cn } from '@/app/lib/utils';

import { Swirl } from './decor';
import { IconBadge, toneFills } from './icon-badge';
import { accentOnBlue, accentOnWhite } from './rich';
import { RoadmapBelt } from './roadmap-belt';
import { RoadmapMotion } from './roadmap-motion';
import { landingSections, roadmapItems } from '../_data/landing-content';

/*
 * «Prepárate para lo que viene» (Figma): a ribbon of cards that moves by
 * itself, pauses under the pointer and can be dragged (roadmap-belt.tsx).
 * The list is in the track four times so the loop never shows a seam and
 * a drag either way finds cards; the copy is read once. With reduced motion
 * and on touch screens the ribbon stands still and scrolls by hand. The
 * pieces carry `data-piece` for their entrance (roadmap-motion.tsx). Over
 * a card it lifts, its badge grows and the badge's tint grows out of the
 * badge until it fills the card: a `::before` under the content, clipped
 * to a circle centred on the badge (its padding plus half its size down).
 */
const fill =
  'before:absolute before:inset-0 before:-z-10 before:transition-[clip-path] before:duration-slow before:ease-house before:[clip-path:circle(0%_at_50%_calc(--spacing(9)_+_--spacing(8)))] hover:before:[clip-path:circle(100%_at_50%_calc(--spacing(9)_+_--spacing(8)))]';

export function Roadmap() {
  const t = useTranslations('landing.roadmap');

  const cards = roadmapItems.map((item) => (
    <li
      key={item.key}
      data-piece="card"
      className={cn(
        'group relative isolate w-72 shrink-0 snap-start overflow-hidden rounded-2xl bg-pure-white px-6 py-9 shadow-md transition-[translate,box-shadow] duration-base ease-house hover:-translate-y-1 hover:shadow-lg',
        fill,
        toneFills[item.tone],
      )}
    >
      <Swirl
        variant={item.swirl}
        className="top-[-30%] left-[-10%] w-[175%] opacity-70"
      />
      <div className="relative flex flex-col items-center gap-4 text-center">
        <IconBadge
          data-piece="badge"
          icon={item.icon}
          tone={item.tone}
          size="lg"
          className="shadow-md transition-[scale] duration-base ease-house group-hover:scale-110"
        />
        {/* On the tint the green words step one shade darker to keep AA. */}
        <p className="text-subtitle-s font-semibold text-pure-black [&_span]:transition-colors [&_span]:duration-slow [&_span]:ease-house group-hover:[&_span]:text-green-800">
          {t.rich(`items.${item.key}`, accentOnWhite)}
        </p>
        <span
          className={cn(
            'rounded-lg px-3 py-1.5 text-label-lg shadow-sm',
            item.audience === 'patient'
              ? 'bg-green-50 text-green-700'
              : 'bg-blue-50 text-primary',
          )}
        >
          {t(`audience.${item.audience}`)}
        </span>
      </div>
    </li>
  ));

  return (
    <section
      id={landingSections.roadmap}
      aria-labelledby="roadmap-title"
      className="scroll-mt-28 overflow-hidden py-16 lg:py-24"
    >
      <RoadmapMotion>
        <div className="px-gutter text-center text-pure-white">
          {/* The emojis and the words are blocks of their own, so each can
              make its entrance: a transform does nothing to inline text. */}
          <p className="text-subtitle-s font-medium sm:text-subtitle-m lg:text-title-xl">
            <span
              data-piece="rocket"
              aria-hidden="true"
              className="inline-block"
            >
              🚀
            </span>{' '}
            <span data-piece="lead" className="inline-block">
              {t('lead')}
            </span>{' '}
            <span data-piece="pin" aria-hidden="true" className="inline-block">
              📌
            </span>
          </p>
          <h2
            id="roadmap-title"
            data-piece="title"
            className="mt-2 text-headline-md font-bold sm:text-display-sm lg:text-title-xxxl"
          >
            {t.rich('title', accentOnBlue)}
          </h2>
        </div>
        {/* On touch screens and with reduced motion the ribbon stands still
            and scrolls by hand, with the copy once. */}
        <RoadmapBelt label={t('listLabel')}>
          <ul className="flex gap-7">{cards}</ul>
          {[2, 3, 4].map((copy) => (
            <ul
              key={copy}
              className="flex gap-7 motion-reduce:hidden touch:hidden"
              aria-hidden="true"
            >
              {cards}
            </ul>
          ))}
        </RoadmapBelt>
      </RoadmapMotion>
    </section>
  );
}
