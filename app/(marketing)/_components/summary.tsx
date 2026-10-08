import Image from 'next/image';

import { useTranslations } from 'next-intl';

import { Reveal } from './reveal';
import { accentOnWhite } from './rich';
import emojiAlarm from '../_assets/emoji-alarm.png';
import emojiEyes from '../_assets/emoji-eyes.png';
import summaryDoctor from '../_assets/summary-doctor.webp';
import summaryEyes from '../_assets/summary-eyes.webp';
import summaryHand from '../_assets/summary-hand.webp';

/*
 * «Del mensaje a la consulta» (Figma): a white container with the promise
 * and three photo cards. The photos are cut-outs placed as in the mockup,
 * in percentages of the card so every width keeps the composition.
 */
export function Summary() {
  const t = useTranslations('landing.summary');

  return (
    <section
      aria-labelledby="summary-title"
      className="px-gutter py-6 lg:py-10"
    >
      <Reveal className="mx-auto max-w-landing rounded-2xl bg-pure-white px-5 py-10 shadow-md sm:px-10 lg:px-16 lg:py-16">
        <div className="text-center">
          {/* Inline, so the emojis sit beside the title's own width. */}
          <div className="relative inline-block max-w-3xl">
            <Image
              src={emojiAlarm}
              alt=""
              aria-hidden="true"
              className="absolute top-2 -left-16 hidden w-14 rotate-[-24deg] sm:block lg:-left-24 lg:w-20"
            />
            <h2
              id="summary-title"
              className="text-headline-md font-bold text-primary sm:text-display-sm lg:text-title-xxxl"
            >
              {t.rich('title', accentOnWhite)}
            </h2>
            <Image
              src={emojiEyes}
              alt=""
              aria-hidden="true"
              className="absolute -right-12 bottom-2 hidden w-9 sm:block lg:-right-16 lg:w-12"
            />
          </div>
        </div>
        <ul className="mx-auto mt-10 grid gap-6 sm:grid-cols-2 lg:mt-14 lg:grid-cols-3 lg:gap-11">
          <li className="relative aspect-344/307 overflow-hidden rounded-xl bg-primary shadow-md">
            <Image
              src={summaryDoctor}
              alt={t('verified.photoAlt')}
              sizes="(min-width: 1024px) 560px, (min-width: 640px) 70vw, 140vw"
              className="absolute top-[-48%] left-[27%] w-[140%] max-w-none"
            />
            <p className="absolute top-[10%] left-[10%] text-left text-pure-white">
              <span className="block text-title-xxl leading-none font-bold">
                {t('verified.title')}
              </span>
              <span className="block text-subtitle-l font-medium">
                {t('verified.subtitle')}
              </span>
            </p>
          </li>
          <li className="relative aspect-344/307 overflow-hidden rounded-xl bg-pure-white shadow-md">
            <p className="absolute inset-x-0 top-[12%] text-center text-primary">
              <span className="block text-title-xxl leading-none font-bold">
                {t('free.title')}
              </span>
              <span className="block text-subtitle-l font-medium">
                {t('free.subtitle')}
              </span>
            </p>
            <Image
              src={summaryEyes}
              alt={t('free.photoAlt')}
              sizes="(min-width: 1024px) 310px, (min-width: 640px) 40vw, 77vw"
              className="absolute bottom-0 left-1/2 w-[77%] -translate-x-1/2"
            />
          </li>
          {/* green-600, not the mockup's 500: white on the brand green is
              2.8:1, under the 3:1 that large text needs (AGENTS.md §13). */}
          <li className="relative aspect-344/307 overflow-hidden rounded-xl bg-green-600 shadow-md sm:col-span-2 sm:mx-auto sm:w-1/2 lg:col-span-1 lg:w-auto">
            <Image
              src={summaryHand}
              alt={t('fast.photoAlt')}
              sizes="(min-width: 1024px) 330px, (min-width: 640px) 40vw, 82vw"
              // Mirrored, as the mockup places it: the thumb on the right.
              className="absolute top-[-2%] left-[-20%] w-[82%] -scale-x-100"
            />
            <p className="absolute right-[7%] bottom-[11%] text-right text-pure-white">
              <span className="block text-subtitle-l font-medium">
                {t('fast.lead')}
              </span>
              <span className="block text-title-xxl leading-none font-bold">
                {t('fast.title')}
              </span>
            </p>
          </li>
        </ul>
      </Reveal>
    </section>
  );
}
