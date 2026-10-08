import LocationOn from '@material-symbols/svg-400/rounded/location_on.svg?svgr';
import Search from '@material-symbols/svg-400/rounded/search.svg?svgr';
import Stethoscope from '@material-symbols/svg-400/rounded/stethoscope.svg?svgr';
import { useTranslations } from 'next-intl';

import { cn } from '@/app/lib/utils';

import { Icon, type IconComponent } from '@/app/ui/icons';

/*
 * The search bar of the hero (Figma): specialty and city in one white bar,
 * the search icon at its end. One row from tablets up; stacked on phones.
 * TODO(search): the submit wires to the search when it opens (AGENTS.md §1).
 */
export function SearchBar({ className }: { className?: string }) {
  const t = useTranslations('landing.hero.search');

  return (
    <form
      role="search"
      aria-label={t('label')}
      className={cn(
        'mx-auto w-full max-w-3xl rounded-lg bg-pure-white shadow-md transition-shadow duration-fast ease-house focus-within:ring-3 focus-within:ring-ring/50',
        className,
      )}
    >
      <div className="flex flex-col divide-y divide-grey-300 sm:flex-row sm:items-stretch sm:divide-x sm:divide-y-0">
        <SearchField name="q" icon={Stethoscope} label={t('specialty')} />
        <SearchField name="city" icon={LocationOn} label={t('city')} />
        <button
          type="submit"
          className="flex min-h-touch items-center justify-center gap-2 rounded-b-lg px-5 text-label-lg text-primary transition-colors duration-fast ease-house outline-none hover:bg-blue-50 focus-visible:bg-blue-50 sm:rounded-r-lg sm:rounded-bl-none"
        >
          <Icon icon={Search} size={24} />
          <span className="sm:sr-only">{t('submit')}</span>
        </button>
      </div>
    </form>
  );
}

function SearchField({
  name,
  icon,
  label,
}: {
  name: string;
  icon: IconComponent;
  label: string;
}) {
  return (
    <label className="flex flex-1 items-center gap-2.5 px-5 py-3.5 text-grey-700">
      <Icon icon={icon} size={24} />
      <span className="sr-only">{label}</span>
      <input
        type="text"
        name={name}
        placeholder={label}
        autoComplete="off"
        className="min-w-0 flex-1 bg-transparent text-subtitle-s text-pure-black outline-none placeholder:text-grey-700"
      />
    </label>
  );
}
