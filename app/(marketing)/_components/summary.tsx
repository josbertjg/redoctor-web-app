import Image from 'next/image';

import { useTranslations } from 'next-intl';

import { accentOnWhite } from './rich';
import { SummaryMotion } from './summary-motion';
import emojiAlarm from '../_assets/emoji-alarm.png';
import emojiEyes from '../_assets/emoji-eyes.png';
import summaryDoctor from '../_assets/summary-doctor.webp';
import summaryEyes from '../_assets/summary-eyes.webp';
import summaryHand from '../_assets/summary-hand.webp';

/*
 * «Del mensaje a la consulta» (Figma): a white container with the promise
 * and three photo cards. The photos are cut-outs placed as in the mockup,
 * in percentages of the card so every width keeps the composition, and the
 * words take their size from the card itself (container queries), so they
 * fit whatever width the grid gives it. The pieces carry `data-piece` for
 * their entrance (summary-motion.tsx).
 */

/* Type steps by the card's width: 30/18 px, then 36/22 from 288 px, then
   42/30 from 448 px (the two-column stretch of tablets). */
const cardTitle =
  'block text-subtitle-l leading-none font-bold @2xs:text-title-xl @md:text-title-xxl';
const cardSubtitle =
  'block text-subtitle-s font-medium @2xs:text-subtitle-m @md:text-subtitle-l';
/* On the green card the lead stays "large text" (≥ 24 px): white on
   green-600 is 3.3:1, enough for large text only (WCAG AA). */
const greenLead =
  'block text-headline-sm leading-tight font-medium @md:text-subtitle-l';

export function Summary() {
  const t = useTranslations('landing.summary');

  return (
    <section
      aria-labelledby="summary-title"
      className="px-gutter py-6 lg:py-10"
    >
      <SummaryMotion>
        <div
          data-piece="box"
          className="mx-auto max-w-5xl rounded-2xl bg-pure-white px-5 py-8 shadow-md sm:px-8 lg:px-12 lg:py-12"
        >
          <div className="text-center">
            {/* Inline, so the emojis sit beside the title's own width. */}
            <div className="relative inline-block max-w-2xl">
              <Image
                data-piece="emoji-alarm"
                src={emojiAlarm}
                alt=""
                aria-hidden="true"
                className="absolute top-0 -left-12 hidden w-9 rotate-[-24deg] sm:block lg:-left-16 lg:w-11"
              />
              <h2
                data-piece="title"
                id="summary-title"
                className="text-headline-sm font-bold text-primary sm:text-headline-lg lg:text-title-xxl"
              >
                {t.rich('title', accentOnWhite)}
              </h2>
              <Image
                data-piece="emoji-eyes"
                src={emojiEyes}
                alt=""
                aria-hidden="true"
                className="absolute -right-10 bottom-1 hidden w-7 sm:block lg:-right-12 lg:w-9"
              />
            </div>
          </div>
          <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:mt-10 lg:grid-cols-3 lg:gap-6">
            <li
              data-piece="card-left"
              className="@container relative aspect-344/307 overflow-hidden rounded-xl bg-primary shadow-md"
            >
              <Image
                data-piece="photo-left"
                src={summaryDoctor}
                alt={t('verified.photoAlt')}
                sizes="(min-width: 1024px) 380px, (min-width: 640px) 60vw, 125vw"
                className="absolute top-[-42%] left-[32%] w-[128%] max-w-none"
              />
              <p className="absolute top-[10%] left-[9%] text-left text-pure-white">
                <span className={cardTitle}>{t('verified.title')}</span>
                <span className={cardSubtitle}>{t('verified.subtitle')}</span>
              </p>
            </li>
            {/* Above its neighbours: the side cards slide out from behind it. */}
            <li
              data-piece="card-center"
              className="@container relative z-10 aspect-344/307 overflow-hidden rounded-xl bg-pure-white shadow-md"
            >
              <p className="absolute inset-x-0 top-[12%] text-center text-primary">
                <span className={cardTitle}>{t('free.title')}</span>
                <span className={cardSubtitle}>{t('free.subtitle')}</span>
              </p>
              <Image
                data-piece="photo-center"
                src={summaryEyes}
                alt={t('free.photoAlt')}
                sizes="(min-width: 1024px) 210px, (min-width: 640px) 35vw, 70vw"
                className="absolute bottom-0 left-1/2 w-[70%] -translate-x-1/2"
              />
            </li>
            {/* green-600, not the mockup's 500: white on the brand green is
                2.8:1, under the 3:1 that large text needs (AGENTS.md §13). */}
            <li
              data-piece="card-right"
              className="@container relative aspect-344/307 overflow-hidden rounded-xl bg-green-600 shadow-md sm:col-span-2 sm:mx-auto sm:w-1/2 lg:col-span-1 lg:w-auto"
            >
              <Image
                data-piece="photo-right"
                src={summaryHand}
                alt={t('fast.photoAlt')}
                sizes="(min-width: 1024px) 210px, (min-width: 640px) 35vw, 70vw"
                // Mirrored, as the mockup places it: the thumb on the right.
                // Anchored to the bottom edge, so the wrist always runs off
                // it and what exceeds the card is cut at the top.
                className="absolute bottom-0 left-[-19%] w-[74%] -scale-x-100"
              />
              {/* Below the phone, so the words only share the bottom with
                  the wrist on the left. */}
              <p className="absolute inset-x-[7%] bottom-[8%] text-right text-pure-white">
                <span className={greenLead}>{t('fast.lead')}</span>
                <span className={cardTitle}>{t('fast.title')}</span>
              </p>
            </li>
          </ul>
        </div>
      </SummaryMotion>
    </section>
  );
}
