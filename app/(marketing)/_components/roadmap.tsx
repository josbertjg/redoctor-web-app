import { useTranslations } from 'next-intl';

import { cn } from '@/app/lib/utils';

import { Swirl } from './decor';
import { IconBadge } from './icon-badge';
import { Reveal } from './reveal';
import { accentOnBlue, accentOnWhite } from './rich';
import { landingSections, roadmapItems } from '../_data/landing-content';

/*
 * «Prepárate para lo que viene» (Figma): a ribbon of cards that moves by
 * itself and pauses under the pointer. The list is in the track twice so the
 * loop never shows a seam; the copy is read once. With reduced motion the
 * ribbon stands still and scrolls by hand.
 */
export function Roadmap() {
  const t = useTranslations('landing.roadmap');

  const cards = roadmapItems.map((item) => (
    <li
      key={item.key}
      className="relative w-72 shrink-0 snap-start overflow-hidden rounded-2xl bg-pure-white px-6 py-9 shadow-md"
    >
      <Swirl
        variant={item.swirl}
        className="top-[-30%] left-[-10%] w-[175%] opacity-70"
      />
      <div className="relative flex flex-col items-center gap-4 text-center">
        <IconBadge
          icon={item.icon}
          tone={item.tone}
          size="lg"
          className="shadow-md"
        />
        <p className="text-subtitle-s font-semibold text-pure-black">
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
      <Reveal className="px-gutter text-center text-pure-white">
        <p className="text-subtitle-s font-medium sm:text-subtitle-m lg:text-title-xl">
          <span aria-hidden="true">🚀 </span>
          {t('lead')}
          <span aria-hidden="true"> 📌</span>
        </p>
        <h2
          id="roadmap-title"
          className="mt-2 text-headline-md font-bold sm:text-display-sm lg:text-title-xxxl"
        >
          {t.rich('title', accentOnBlue)}
        </h2>
      </Reveal>
      <Reveal delay="short" className="mt-10 lg:mt-12">
        {/* On touch screens and with reduced motion the ribbon stands still
            and scrolls by hand, with the copy once. */}
        <div
          role="region"
          aria-label={t('listLabel')}
          // A region that scrolls by hand must be reachable with the
          // keyboard (axe: scrollable-region-focusable).
          // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
          tabIndex={0}
          className="group flex scrollbar-none overflow-hidden py-3 outline-none focus-visible:ring-3 focus-visible:ring-white-50/70 motion-reduce:snap-x motion-reduce:overflow-x-auto motion-reduce:px-gutter touch:snap-x touch:overflow-x-auto touch:px-gutter"
        >
          <div className="flex w-max animate-marquee gap-7 pr-7 group-focus-within:[animation-play-state:paused] group-hover:[animation-play-state:paused] motion-reduce:animate-none motion-reduce:pr-0 touch:animate-none touch:pr-0">
            <ul className="flex gap-7">{cards}</ul>
            <ul
              className="flex gap-7 motion-reduce:hidden touch:hidden"
              aria-hidden="true"
            >
              {cards}
            </ul>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
