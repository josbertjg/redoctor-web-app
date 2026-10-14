import Link from 'next/link';

import { useTranslations } from 'next-intl';

import { routes } from '@/app/lib/routes';
import { searchParamNames } from '@/app/lib/search/query';
import { cn } from '@/app/lib/utils';

import { Icon } from '@/app/ui/icons';
import type { SearchCatalog } from '@/app/ui/search/search-bar-types';

import { AfterSplash } from './after-splash';
import { beats } from './choreography';
import { specialtyChips, specialtyIcon } from '../_data/landing-content';

/** With this many in the catalog, the chips are the catalog's own. */
const catalogChipsFrom = 6;

const chipsLimit = 10;

/*
 * The row of specialties under the search bar (Figma): white chips that
 * scroll sideways and fade at both ends, each one a search for its
 * specialty (M16). They enter from the middle of the row outwards: the two
 * central chips first (the central one, when they are odd), then each
 * pair further out, a beat apart. The names come from the catalog once it
 * has enough of them; until then the mockup's sample names, each a search
 * by its name.
 */
export function SpecialtyChips({
  waitForSplash,
  catalog,
  className,
}: {
  waitForSplash: boolean;
  catalog: SearchCatalog;
  className?: string;
}) {
  const t = useTranslations('landing.hero');
  const chips =
    catalog.length >= catalogChipsFrom
      ? catalog.slice(0, chipsLimit).map((specialty) => ({
          key: specialty.id,
          name: specialty.name,
          icon: specialtyIcon(specialty.name),
          params: new URLSearchParams({
            [searchParamNames.specialty]: specialty.id,
          }),
        }))
      : specialtyChips.map((chip) => ({
          key: chip.name,
          name: chip.name,
          icon: chip.icon,
          params: new URLSearchParams({ [searchParamNames.text]: chip.name }),
        }));
  const middle = (chips.length - 1) / 2;

  return (
    <nav
      aria-label={t('specialtiesLabel')}
      className={cn('flex justify-center', className)}
    >
      <ul className="flex max-w-full snap-x scrollbar-none gap-4 overflow-x-auto mask-x-from-85% mask-x-to-100% px-gutter py-3">
        {chips.map((chip, index) => (
          <li key={chip.key} className="shrink-0 snap-start">
            <AfterSplash
              waitForSplash={waitForSplash}
              from="nudge"
              delay={
                beats.chips +
                Math.floor(Math.abs(index - middle)) * beats.chipStep
              }
            >
              <Link
                href={routes.search(chip.params)}
                className="inline-flex min-h-touch items-center gap-1.5 rounded-lg bg-pure-white px-5 text-label-lg text-primary shadow-md transition-[translate,box-shadow] duration-fast ease-house outline-none hover:-translate-y-0.5 hover:shadow-lg focus-visible:ring-3 focus-visible:ring-white-50/70"
              >
                <Icon icon={chip.icon} size={16} />
                {chip.name}
              </Link>
            </AfterSplash>
          </li>
        ))}
      </ul>
    </nav>
  );
}
