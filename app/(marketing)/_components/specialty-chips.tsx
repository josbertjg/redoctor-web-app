import Link from 'next/link';

import { useTranslations } from 'next-intl';

import { routes } from '@/app/lib/routes';
import { searchParamNames } from '@/app/lib/search/query';
import { cn } from '@/app/lib/utils';

import { Icon } from '@/app/ui/icons';
import type { SearchCatalog } from '@/app/ui/search/search-bar-types';

import { AfterSplash } from './after-splash';
import { beats } from './choreography';
import { specialtyIcon } from '../_data/landing-content';

/** With fewer specialties in the catalog, the row shows nothing (the owner's rule). */
const chipsFrom = 4;

const chipsLimit = 10;

/** The row's own vertical padding; a chip is a touch target tall. */
const rowPadding = 'py-3';

/*
 * The row of specialties under the search bar (Figma): white chips that
 * scroll sideways and fade at both ends, each one a search for its
 * specialty (M16). They enter from the middle of the row outwards: the two
 * central chips first (the central one, when they are odd), then each
 * pair further out, a beat apart. The names are the catalog's own — never
 * sample ones — and the row appears only with four specialties or more;
 * with fewer, its space stays, so the hero keeps its shape (the owner's
 * rule, 2026-10-14).
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

  if (catalog.length < chipsFrom) return <ChipsSpace className={className} />;

  const chips = catalog.slice(0, chipsLimit).map((specialty) => ({
    id: specialty.id,
    name: specialty.name,
    icon: specialtyIcon(specialty.name),
    params: new URLSearchParams({
      [searchParamNames.specialty]: specialty.id,
    }),
  }));
  const middle = (chips.length - 1) / 2;

  return (
    <nav
      aria-label={t('specialtiesLabel')}
      className={cn('flex justify-center', className)}
    >
      <ul
        className={cn(
          'flex max-w-full snap-x scrollbar-none gap-4 overflow-x-auto mask-x-from-85% mask-x-to-100% px-gutter',
          rowPadding,
        )}
      >
        {chips.map((chip, index) => (
          <li key={chip.id} className="shrink-0 snap-start">
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

/**
 * The room one row of chips takes — its padding and a chip's touch height —
 * when there are none to show: the search's section is not cut short.
 */
function ChipsSpace({ className }: { className?: string | undefined }) {
  return (
    <div aria-hidden="true" className={cn(rowPadding, className)}>
      <div className="min-h-touch" />
    </div>
  );
}
