import Image from 'next/image';

import { useTranslations } from 'next-intl';

import type { TextSegment } from '@/app/ui/motion';

import { Swirl } from './decor';
import { HeroTitle } from './hero-title';
import { SearchBar } from './search-bar';
import { SpecialtyChips } from './specialty-chips';

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
 * from behind the search bar, and the specialties. The picture, the search
 * and the chips paint at once; only the words and the cursor make their
 * entrance (hero-title.tsx), after the splash when there is one.
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
              the bar's top edge, so nothing of him shows under it. */}
          <div className="mx-auto h-30 overflow-hidden sm:h-36 lg:h-44">
            <Image
              src="/illustrations/landing/hero-doctor.svg"
              alt=""
              aria-hidden="true"
              width={217}
              height={242}
              preload
              className="mx-auto h-44 w-auto sm:h-52 lg:h-60"
            />
          </div>
          <SearchBar className="relative z-10" />
        </div>
        <SpecialtyChips className="mt-4 w-full lg:mt-5" />
      </div>
    </section>
  );
}
