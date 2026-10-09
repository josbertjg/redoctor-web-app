import Image from 'next/image';

import { useTranslations } from 'next-intl';

import type { TextSegment } from '@/app/ui/motion';

import { AfterSplash } from './after-splash';
import { beats } from './choreography';
import { Swirl } from './decor';
import { HeroTitle } from './hero-title';
import { SearchBar } from './search-bar';
import { SpecialtyChips } from './specialty-chips';
import { heroSearchId } from '../_data/landing-content';

/** The title's rich text as segments the letters can carry: the accent word in green. */
function accentSegments(markup: string): TextSegment[] {
  return markup
    .split(/(<accent>.*?<\/accent>)/)
    .filter((part) => part !== '')
    .map((part) => {
      const accent = /^<accent>(.*)<\/accent>$/.exec(part);
      return accent
        ? { text: accent[1] ?? '', className: 'text-secondary' }
        : { text: part };
    });
}

/*
 * The first screen (Figma): the promise in two lines, the specialist peeking
 * from behind the search bar, and the specialties. Everything makes its
 * entrance on the beats of choreography.ts, after the splash when there is
 * one: the words and the cursor (hero-title.tsx), the search bar, the
 * specialist rising out of it, and the chips from the middle outwards.
 */
export function Hero({ waitForSplash }: { waitForSplash: boolean }) {
  const t = useTranslations('landing.hero');
  const title = accentSegments(
    t.markup('title', { accent: (chunks) => `<accent>${chunks}</accent>` }),
  );

  return (
    <section
      aria-labelledby="hero-title"
      className="relative px-gutter pt-16 pb-10 sm:pt-20 lg:pt-28 lg:pb-14"
    >
      <Swirl
        variant="bg-4"
        className="top-[-130%] left-[-64%] hidden w-[126%] lg:block"
      />
      <Swirl
        variant="bg-3"
        className="top-[-12%] left-[59%] w-[90%] sm:w-[68%]"
      />
      <div className="relative mx-auto flex max-w-landing flex-col items-center text-center">
        <HeroTitle
          lead={t('titleLead')}
          title={title}
          waitForSplash={waitForSplash}
        />
        <div className="relative mt-6 w-full lg:mt-8">
          {/* The specialist stands behind the search bar: this box ends at
              the bar's top edge, so nothing of him shows under it — and his
              entrance rises out of it. */}
          <div className="mx-auto h-30 overflow-hidden sm:h-36 lg:h-44">
            <AfterSplash
              waitForSplash={waitForSplash}
              from="behind"
              delay={beats.doctor}
            >
              <Image
                src="/illustrations/landing/hero-doctor.svg"
                alt=""
                aria-hidden="true"
                width={217}
                height={242}
                preload
                className="mx-auto h-44 w-auto sm:h-52 lg:h-60"
              />
            </AfterSplash>
          </div>
          <div id={heroSearchId} className="relative z-10">
            <AfterSplash
              waitForSplash={waitForSplash}
              from="bottom"
              delay={beats.search}
            >
              <SearchBar />
            </AfterSplash>
          </div>
        </div>
        <SpecialtyChips
          waitForSplash={waitForSplash}
          className="mt-4 w-full lg:mt-5"
        />
      </div>
    </section>
  );
}
