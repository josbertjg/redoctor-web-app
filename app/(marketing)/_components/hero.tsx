import Image from 'next/image';

import { useTranslations } from 'next-intl';

import { Swirl } from './decor';
import { accentOnBlue } from './rich';
import { SearchBar } from './search-bar';
import { SpecialtyChips } from './specialty-chips';

/*
 * The first screen (Figma): the promise in two lines, the specialist peeking
 * from behind the search bar, and the specialties. It paints at once, with
 * no entrance, so the page is readable from its first frame.
 */
export function Hero() {
  const t = useTranslations('landing.hero');

  return (
    <section
      aria-labelledby="hero-title"
      className="relative overflow-hidden px-gutter pt-16 pb-10 sm:pt-20 lg:pt-28 lg:pb-14"
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
        <h1 id="hero-title" className="text-pure-white">
          <span className="block text-headline-sm font-bold sm:text-headline-lg lg:text-title-xxl">
            {t('titleLead')}
          </span>
          <span className="mt-1 inline-flex items-end gap-1 text-display-sm font-bold sm:gap-2 sm:text-display-lg lg:text-display-xl">
            <span>{t.rich('title', accentOnBlue)}</span>
            <Image
              src="/illustrations/landing/cursor.svg"
              alt=""
              aria-hidden="true"
              width={54}
              height={55}
              className="mb-1 size-6 sm:size-9 lg:mb-2 lg:size-13"
            />
          </span>
        </h1>
        <div className="relative mt-6 w-full lg:mt-8">
          <Image
            src="/illustrations/landing/hero-doctor.svg"
            alt=""
            aria-hidden="true"
            width={217}
            height={242}
            preload
            className="mx-auto h-44 w-auto sm:h-52 lg:h-60"
          />
          <SearchBar className="relative z-10 -mt-14 sm:-mt-16" />
        </div>
        <SpecialtyChips className="mt-4 w-full lg:mt-5" />
      </div>
    </section>
  );
}
