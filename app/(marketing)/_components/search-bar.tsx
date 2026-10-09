import LocationOn from '@material-symbols/svg-400/rounded/location_on.svg?svgr';
import Search from '@material-symbols/svg-400/rounded/search.svg?svgr';
import Stethoscope from '@material-symbols/svg-400/rounded/stethoscope.svg?svgr';
import { useTranslations } from 'next-intl';

import { cn } from '@/app/lib/utils';

import { Icon, type IconComponent } from '@/app/ui/icons';

/*
 * The search bar (Figma): in the hero, a white pill, 56 px tall, with the
 * specialty and the city side by side, one short line between them and
 * the search icon alone at the end — 20 px in from the edges, 24 px
 * between the pieces; stacked on phones, with lines between the rows and
 * the search as a labelled row. In the docked navigation bar, the same
 * pieces in a 44 px pill on a light surface, the city only from tablets up.
 * TODO(search): the submit wires to the search when it opens (AGENTS.md §1).
 */
const variants = {
  hero: {
    form: 'mx-auto max-w-3xl flex-col rounded-2xl bg-pure-white shadow-md sm:min-h-14 sm:flex-row sm:items-center sm:gap-6 sm:rounded-full sm:px-5',
    field: 'px-5 py-4 text-subtitle-s sm:px-0',
    city: '',
    divider: 'mx-5 h-px sm:mx-0 sm:h-6.5 sm:w-px',
    secondDivider: 'sm:hidden',
    // On a phone a row of its own; from tablets up, the bare icon with a
    // full tap target, pulled in so the glyph sits 20 px from the edge.
    button:
      'min-h-touch gap-2 rounded-b-2xl px-5 hover:bg-blue-50 focus-visible:bg-blue-50 sm:-mr-2.5 sm:size-11 sm:shrink-0 sm:rounded-full sm:px-0 sm:hover:scale-110 sm:hover:bg-transparent sm:focus-visible:bg-transparent sm:focus-visible:ring-3 sm:focus-visible:ring-ring/50',
    label: 'sm:sr-only',
  },
  bar: {
    form: 'h-11 flex-row items-center gap-3 rounded-full bg-white-200 px-4',
    field: 'py-0 text-body-xs',
    city: 'hidden md:flex',
    divider: 'hidden h-5 w-px md:block',
    secondDivider: 'hidden',
    button:
      '-mr-1.5 size-9 shrink-0 rounded-full hover:scale-110 focus-visible:ring-3 focus-visible:ring-ring/50',
    label: 'sr-only',
  },
};

type SearchBarProps = {
  variant?: keyof typeof variants;
  /** The landmark's name; two searches on one page need two names. */
  label?: string;
  className?: string;
};

export function SearchBar({
  variant = 'hero',
  label,
  className,
}: SearchBarProps) {
  const t = useTranslations('landing.hero.search');
  const style = variants[variant];

  return (
    <form
      role="search"
      aria-label={label ?? t('label')}
      className={cn(
        'flex w-full transition-shadow duration-fast ease-house focus-within:ring-3 focus-within:ring-ring/50',
        style.form,
        className,
      )}
    >
      <SearchField
        name="q"
        icon={Stethoscope}
        label={t('specialty')}
        className={style.field}
      />
      <Divider className={style.divider} />
      <SearchField
        name="city"
        icon={LocationOn}
        label={t('city')}
        className={cn(style.field, style.city)}
      />
      <Divider className={cn(style.divider, style.secondDivider)} />
      <button
        type="submit"
        className={cn(
          'flex items-center justify-center text-label-lg text-primary transition-[background-color,scale] duration-fast ease-house outline-none',
          style.button,
        )}
      >
        <Icon icon={Search} size={24} />
        <span className={style.label}>{t('submit')}</span>
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
      className={cn('shrink-0 bg-grey-300', className)}
    />
  );
}

function SearchField({
  name,
  icon,
  label,
  className,
}: {
  name: string;
  icon: IconComponent;
  label: string;
  className?: string;
}) {
  return (
    <label
      className={cn(
        'flex min-w-0 flex-1 items-center gap-2.5 text-grey-700',
        className,
      )}
    >
      <Icon icon={icon} size={24} className="shrink-0" />
      <span className="sr-only">{label}</span>
      <input
        type="text"
        name={name}
        placeholder={label}
        autoComplete="off"
        className="min-w-0 flex-1 bg-transparent text-pure-black outline-none placeholder:text-grey-700"
      />
    </label>
  );
}
