import { useTranslations } from 'next-intl';

import { cn } from '@/app/lib/utils';

import { Icon } from '@/app/ui/icons';

import { specialtyChips } from '../_data/landing-content';

/*
 * The row of specialties under the search bar (Figma): white chips that
 * scroll sideways and fade at both ends. Sample names for now; the logic
 * step lists the API's catalog and each chip searches its specialty.
 */
export function SpecialtyChips({ className }: { className?: string }) {
  const t = useTranslations('landing.hero');

  return (
    <nav
      aria-label={t('specialtiesLabel')}
      className={cn('flex justify-center', className)}
    >
      <ul className="flex max-w-full snap-x scrollbar-none gap-4 overflow-x-auto mask-x-from-85% mask-x-to-100% px-gutter py-3">
        {specialtyChips.map((chip) => (
          <li key={chip.name} className="shrink-0 snap-start">
            {/* TODO(search): opens the search for this specialty. */}
            <button
              type="button"
              className="inline-flex min-h-touch items-center gap-1.5 rounded-lg bg-pure-white px-5 text-label-lg text-primary shadow-md transition-[transform,box-shadow] duration-fast ease-house outline-none hover:-translate-y-0.5 hover:shadow-lg focus-visible:ring-3 focus-visible:ring-white-50/70"
            >
              <Icon icon={chip.icon} size={16} />
              {chip.name}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
