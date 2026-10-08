import Help from '@material-symbols/svg-400/rounded/help.svg?svgr';
import { useTranslations } from 'next-intl';

import { Swirl } from './decor';
import { FaqAccordion } from './faq-accordion';
import { Reveal } from './reveal';
import { accentOnBlue } from './rich';
import { SectionHeading } from './section-heading';
import { faqItems, landingSections } from '../_data/landing-content';

/*
 * «Preguntas frecuentes» (Figma): the mockup's questions; the answers the
 * mockup leaves out come from the landing doc. The copy is translated here
 * and handed to the client accordion.
 */
export function Faq() {
  const t = useTranslations('landing.faq');
  const items = faqItems.map((key) => ({
    key,
    question: t(`items.${key}.question`),
    answer: t(`items.${key}.answer`),
  }));

  return (
    <section
      id={landingSections.faq}
      aria-labelledby="faq-title"
      className="relative scroll-mt-28 px-gutter py-16 lg:py-24"
    >
      <Swirl variant="bg-2" className="bottom-[-90%] left-[-85%] w-[190%]" />
      <div className="relative mx-auto max-w-3xl">
        <Reveal>
          <SectionHeading
            id="faq-title"
            chip={{ icon: Help, label: t('chip') }}
            title={t.rich('title', accentOnBlue)}
            description={t('description')}
            tone="on-blue"
          />
        </Reveal>
        <Reveal delay="short" className="mt-10">
          <FaqAccordion items={items} />
        </Reveal>
      </div>
    </section>
  );
}
