import LocationOn from '@material-symbols/svg-400/rounded/location_on.svg?svgr';
import Search from '@material-symbols/svg-400/rounded/search.svg?svgr';
import Stethoscope from '@material-symbols/svg-400/rounded/stethoscope.svg?svgr';
import { useTranslations } from 'next-intl';

import { cn } from '@/app/lib/utils';

import { Icon, type IconComponent } from '@/app/ui/icons';

/*
 * The search bar of the hero (Figma): a white pill, 56 px tall, with the
 * specialty and the city side by side, one short line between them and
 * the search icon alone at the end — 20 px in from the edges, 24 px
 * between the pieces. Stacked on phones, with lines between the rows and
 * the search as a labelled row.
 * TODO(search): the submit wires to the search when it opens (AGENTS.md §1).
 */
export function SearchBar({ className }: { className?: string }) {
  const t = useTranslations('landing.hero.search');

  return (
    <form
      role="search"
      aria-label={t('label')}
      className={cn(
        'mx-auto flex w-full max-w-3xl flex-col rounded-2xl bg-pure-white shadow-md transition-shadow duration-fast ease-house focus-within:ring-3 focus-within:ring-ring/50 sm:min-h-14 sm:flex-row sm:items-center sm:gap-6 sm:rounded-full sm:px-5',
        className,
      )}
    >
      <SearchField name="q" icon={Stethoscope} label={t('specialty')} />
      <Divider />
      <SearchField name="city" icon={LocationOn} label={t('city')} />
      <Divider className="sm:hidden" />
      {/* On a phone a row of its own; from tablets up, the bare icon with a
          full tap target, pulled in so the glyph sits 20 px from the edge. */}
      <button
        type="submit"
        className="flex min-h-touch items-center justify-center gap-2 rounded-b-2xl px-5 text-label-lg text-primary transition-[background-color,scale] duration-fast ease-house outline-none hover:bg-blue-50 focus-visible:bg-blue-50 sm:-mr-2.5 sm:size-11 sm:shrink-0 sm:rounded-full sm:px-0 sm:hover:scale-110 sm:hover:bg-transparent sm:focus-visible:bg-transparent sm:focus-visible:ring-3 sm:focus-visible:ring-ring/50"
      >
        <Icon icon={Search} size={24} />
        <span className="sm:sr-only">{t('submit')}</span>
      </button>
    </form>
  );
}

/* A hairline between two rows on a phone; a short upright line, centred,
   between the two fields from tablets up. */
function Divider({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'mx-5 h-px shrink-0 bg-grey-300 sm:mx-0 sm:h-6.5 sm:w-px',
        className,
      )}
    />
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
    <label className="flex flex-1 items-center gap-2.5 px-5 py-4 text-grey-700 sm:px-0">
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
