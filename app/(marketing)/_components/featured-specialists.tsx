import Link from 'next/link';

import Stars from '@material-symbols/svg-400/rounded/stars.svg?svgr';
import { useTranslations } from 'next-intl';

import { routes } from '@/app/lib/routes';
import type { SearchResult } from '@/app/lib/schemas/search';
import { cn } from '@/app/lib/utils';

import { Button } from '@/app/ui/button';
import { SpecialistCard } from '@/app/ui/specialists/specialist-card';

import { FeaturedMotion } from './featured-motion';
import { accentOnBlue } from './rich';
import { SectionHeading } from './section-heading';
import { landingSections } from '../_data/landing-content';

/** Three on a phone, four in two columns, all six from laptops up. */
const shownFrom = (index: number) =>
  cn(index >= 3 && 'max-sm:hidden', index >= 4 && 'sm:max-lg:hidden');

/**
 * One column on a phone, two on a tablet, three from laptops up, the gap
 * between them (gap-4) taken out; a row with fewer cards stays centred.
 * Never wider than its column: the row of days scrolls inside the card.
 */
const cardWidth =
  'w-full min-w-0 sm:w-[calc((100%-var(--spacing)*4)/2)] lg:w-[calc((100%-var(--spacing)*8)/3)]';

/*
 * «Especialistas destacados» (REDOC-177, the owner's ask of 2026-11-16; no
 * mockup yet, so the landing's own pieces): the API's best rated — the
 * national ranking, since the landing knows no point —, each one the
 * search's card, with its next days to book on. The cards render here, on
 * the server, so the landing sends no search copy to the browser. Right
 * under the search: whoever does not know whom to look for has a way in.
 * With no specialist to show, the section is not there.
 */
export function FeaturedSpecialists({
  specialists,
}: {
  specialists: readonly SearchResult[];
}) {
  const t = useTranslations('landing.featured');
  if (specialists.length === 0) return null;

  return (
    <section
      id={landingSections.featured}
      aria-labelledby="featured-title"
      className="relative scroll-mt-28 px-gutter py-16 lg:py-24"
    >
      <FeaturedMotion>
        <div className="relative mx-auto max-w-landing">
          <SectionHeading
            id="featured-title"
            chip={{ icon: Stars, label: t('chip') }}
            title={t.rich('title', accentOnBlue)}
            description={t('description')}
            tone="on-blue"
            pieces={{
              chip: 'chip',
              title: 'title',
              description: 'description',
            }}
          />
          <ul className="mt-10 flex flex-wrap justify-center gap-4">
            {specialists.map((specialist, index) => (
              <li
                key={specialist.id}
                data-piece="card"
                className={cn(cardWidth, shownFrom(index))}
              >
                <SpecialistCard
                  specialist={specialist}
                  headingLevel={3}
                  entrance={false}
                  className="h-full"
                />
              </li>
            ))}
          </ul>
          <div data-piece="more" className="mt-8 flex justify-center">
            <Button asChild variant="white" shape="soft">
              <Link href={routes.search()}>{t('seeMore')}</Link>
            </Button>
          </div>
        </div>
      </FeaturedMotion>
    </section>
  );
}
