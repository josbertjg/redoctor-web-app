'use client';

import { useId, useRef, useState, useTransition } from 'react';

import { useRouter } from 'next/navigation';

import ProgressActivity from '@material-symbols/svg-400/rounded/progress_activity.svg?svgr';
import Search from '@material-symbols/svg-400/rounded/search.svg?svgr';

import { track } from '@/app/lib/analytics/track';
import { findPlace } from '@/app/lib/queries/places';
import { routes } from '@/app/lib/routes';
import { wholeCountry, type SearchLocation } from '@/app/lib/search/location';
import {
  emptySearchQuery,
  toSearchParams,
  type SearchQuery,
} from '@/app/lib/search/query';
import type { RecentSearch } from '@/app/lib/search/recent';
import { cn } from '@/app/lib/utils';

import { FieldError } from '@/app/ui/field-error';
import { Icon } from '@/app/ui/icons';

import { useDeviceLocation } from '@/app/hooks/use-device-location';

import { useLastLocation, useRecentSearches } from './use-remembered';
import { WhatField, type WhatPick } from './what-field';
import { WhereField } from './where-field';

import type {
  SearchBarVariant,
  SearchBarWords,
  SearchCatalog,
  SpecialtyRef,
} from './search-bar-types';
import type { LocationSuggestion } from './use-location-suggestions';

/*
 * The search box (M16), the same on the landing — in the hero and in the
 * docked bar — and on the search page: what is looked for, where, and
 * «Buscar». A text or a specialty goes to `/search`; a specialist straight
 * to their profile. Where the search looks is the place in hand — the
 * device's position, or a place of Google's — or the whole country; what
 * the browser remembers (the last place, the last searches) comes back on
 * the next visit. Its words come translated from the server
 * (`useSearchBarWords`).
 *
 * In the hero (Figma): a white pill, 56 px tall, the two fields side by
 * side with a short line between them and the search icon alone at the
 * end; stacked on phones, the search as a labelled row. In the docked bar:
 * the same pieces in a 44 px pill on a light surface, the place only from
 * tablets up. On the search page: the pill on the page's surface, the
 * fields side by side from tablets up and stacked on phones.
 */
const variants: Record<
  SearchBarVariant,
  {
    form: string;
    field: string;
    input: string;
    where: string;
    divider: string;
    secondDivider: string;
    button: string;
    label: string;
  }
> = {
  hero: {
    form: 'mx-auto max-w-3xl flex-col rounded-2xl bg-pure-white shadow-md sm:min-h-14 sm:flex-row sm:items-center sm:gap-6 sm:rounded-full sm:px-5',
    field: 'px-5 py-3 sm:px-0 sm:py-0',
    input: 'text-subtitle-s',
    where: '',
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
    field: 'py-0',
    input: 'text-body-xs',
    where: 'hidden md:flex',
    divider: 'hidden h-5 w-px md:block',
    secondDivider: 'hidden',
    // A 36 px circle in the 44 px pill; an invisible ring around it makes
    // the tap target the pill's full height (§8.5) without moving a thing.
    button:
      'relative -mr-1.5 size-9 shrink-0 rounded-full after:absolute after:-inset-1 after:rounded-full hover:scale-110 focus-visible:ring-3 focus-visible:ring-ring/50',
    label: 'sr-only',
  },
  page: {
    form: 'flex-col rounded-2xl bg-pure-white shadow-sm ring-1 ring-divider sm:h-12 sm:flex-row sm:items-center sm:gap-4 sm:rounded-full sm:px-4',
    field: 'px-4 py-2.5 sm:px-0 sm:py-0',
    input: 'text-body-xs',
    where: '',
    divider: 'mx-4 h-px sm:mx-0 sm:h-5 sm:w-px',
    secondDivider: 'sm:hidden',
    button:
      'min-h-touch gap-2 rounded-b-2xl px-4 hover:bg-blue-50 focus-visible:bg-blue-50 sm:-mr-1.5 sm:size-9 sm:shrink-0 sm:rounded-full sm:px-0 sm:hover:scale-110 sm:hover:bg-transparent sm:focus-visible:bg-transparent sm:focus-visible:ring-3 sm:focus-visible:ring-ring/50',
    label: 'sm:sr-only',
  },
};

type SearchBarProps = {
  variant?: SearchBarVariant;
  /** The landmark's name; two searches on one page need two names. */
  label: string;
  words: SearchBarWords;
  /** The catalog, flat: what the box matches and offers. */
  catalog: SearchCatalog;
  /** The search in the address, on the search page: the box starts from it. */
  initialQuery?: SearchQuery | undefined;
  /** The name of the specialty the address names, when the catalog has it. */
  initialSpecialtyName?: string | null | undefined;
  /** The search page itself takes the search over; elsewhere the box goes to it. */
  onSearch?: ((query: SearchQuery) => void) | undefined;
  className?: string;
};

export function SearchBar({
  variant = 'hero',
  label,
  words,
  catalog,
  initialQuery,
  initialSpecialtyName,
  onSearch,
  className,
}: SearchBarProps) {
  const router = useRouter();
  const style = variants[variant];
  const problemId = useId();
  const form = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();
  const { recent, remember, forget } = useRecentSearches();
  const { last, keep } = useLastLocation();
  const device = useDeviceLocation();

  const [text, setText] = useState(
    () => initialQuery?.text ?? initialSpecialtyName ?? '',
  );
  const [specialty, setSpecialty] = useState<SpecialtyRef | null>(() =>
    initialQuery?.specialtyId && initialSpecialtyName
      ? { id: initialQuery.specialtyId, name: initialSpecialtyName }
      : null,
  );
  // The place in hand: chosen here, named by the address, or the last one
  // this browser searched from.
  const [chosen, setChosen] = useState<SearchLocation | null>(() =>
    initialQuery && initialQuery.location.kind !== 'country'
      ? initialQuery.location
      : null,
  );
  const location = chosen ?? last ?? wholeCountry;
  const [typedPlace, setTypedPlace] = useState('');
  const [problem, setProblem] = useState<string | null>(null);
  // A place just taken in hand, while Google places it: a search that
  // comes before the answer waits for it (an Enter right after the pick).
  const pendingPlace = useRef<Promise<SearchLocation | null> | null>(null);

  const locate = () => {
    pendingPlace.current = null;
    void device.locate().then((coordinates) => {
      if (coordinates) {
        setChosen({ kind: 'device', coordinates });
        setTypedPlace('');
      }
    });
  };

  const pickPlace = (place: LocationSuggestion) => {
    const settled = place.resolve().then(
      (resolved): SearchLocation | null => {
        if (!resolved) return null;
        const picked: SearchLocation = {
          kind: 'place',
          coordinates: resolved.coordinates,
          label: resolved.label,
        };
        setChosen(picked);
        device.reset();
        return picked;
      },
      () => null,
    );
    pendingPlace.current = settled;
  };

  const go = (query: SearchQuery) => {
    keep(query.location);
    if (onSearch) {
      onSearch(query);
      return;
    }
    startTransition(() => {
      router.push(routes.search(toSearchParams(query)));
    });
  };

  /**
   * Where the search looks: the place just picked once Google places it;
   * else a place typed and not picked becomes the first place Google names
   * for it; else the place in hand.
   */
  const resolveTyped = async (): Promise<SearchLocation> => {
    if (pendingPlace.current) {
      const picked = await pendingPlace.current;
      if (picked) return picked;
    }
    const typed = typedPlace.trim();
    if (typed === '') return location;
    try {
      const found = await findPlace(typed);
      return found
        ? { kind: 'place', coordinates: found.coordinates, label: found.label }
        : location;
    } catch {
      return location;
    }
  };

  const search = async (
    criteria: { text: string } | { specialty: SpecialtyRef },
  ) => {
    const where = await resolveTyped();
    const radius = initialQuery?.radius ?? emptySearchQuery.radius;
    const query: SearchQuery = {
      text: 'text' in criteria ? criteria.text : null,
      specialtyId: 'specialty' in criteria ? criteria.specialty.id : null,
      location: where,
      radius: where.kind === 'country' ? 'all' : radius,
      from: initialQuery?.from ?? null,
    };
    const entry: RecentSearch =
      'text' in criteria
        ? { kind: 'text', label: criteria.text }
        : {
            kind: 'specialty',
            id: criteria.specialty.id,
            label: criteria.specialty.name,
          };
    remember(entry);
    go(query);
  };

  const onPick = (pick: WhatPick) => {
    setProblem(null);
    switch (pick.kind) {
      case 'text':
        setText(pick.text);
        setSpecialty(null);
        void search({ text: pick.text });
        break;
      case 'specialty':
        setText(pick.specialty.name);
        setSpecialty(pick.specialty);
        track('web_search_suggestion_taken', { kind: 'specialty' });
        void search({ specialty: pick.specialty });
        break;
      case 'specialist':
        setText(pick.name);
        remember({ kind: 'specialist', id: pick.id, label: pick.name });
        track('web_search_suggestion_taken', { kind: 'specialist' });
        startTransition(() => {
          router.push(routes.specialist(pick.id));
        });
        break;
    }
  };

  const deviceIssue =
    device.status === 'denied'
      ? words.locationDenied
      : device.status === 'unavailable' || device.status === 'unsupported'
        ? words.locationUnavailable
        : null;
  const notice = problem ?? deviceIssue;

  return (
    <div className={cn('relative w-full', className)}>
      <form
        ref={form}
        role="search"
        aria-label={label}
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          const typed = text.trim();
          if (specialty !== null && typed === specialty.name) {
            void search({ specialty });
            return;
          }
          if (typed === '') {
            setProblem(words.needCriteria);
            form.current
              ?.querySelector<HTMLInputElement>('input[name="q"]')
              ?.focus();
            return;
          }
          setProblem(null);
          setSpecialty(null);
          void search({ text: typed });
        }}
        className={cn(
          'flex w-full transition-shadow duration-fast ease-house focus-within:ring-3 focus-within:ring-ring/50',
          style.form,
        )}
      >
        <WhatField
          text={text}
          specialty={specialty}
          onTextChange={(next) => {
            setText(next);
            setProblem(null);
            if (specialty !== null && next !== specialty.name) {
              setSpecialty(null);
            }
          }}
          onPick={onPick}
          catalog={catalog}
          location={location}
          recent={recent}
          onForgetRecent={forget}
          words={words}
          hint={variant === 'bar' ? words.whatShortHint : words.whatHint}
          describedBy={problem ? problemId : undefined}
          invalid={problem !== null}
          className={style.field}
          inputClassName={style.input}
        />
        <Divider className={style.divider} />
        <WhereField
          location={location}
          onLocationChange={(next) => {
            pendingPlace.current = null;
            setChosen(next);
            if (next.kind !== 'device') device.reset();
          }}
          device={{ status: device.status, locate }}
          onTypedChange={setTypedPlace}
          onPlacePick={pickPlace}
          words={words}
          className={cn(style.field, style.where)}
          inputClassName={style.input}
        />
        <Divider className={cn(style.divider, style.secondDivider)} />
        <button
          type="submit"
          aria-busy={pending || undefined}
          className={cn(
            'flex items-center justify-center text-label-lg text-primary transition-[background-color,scale] duration-fast ease-house outline-none',
            style.button,
          )}
        >
          <Icon
            icon={pending ? ProgressActivity : Search}
            size={24}
            className={cn(pending && 'animate-spin motion-reduce:animate-none')}
          />
          <span className={style.label}>{words.submit}</span>
        </button>
      </form>
      {variant === 'bar' ? null : (
        <FieldError
          id={problemId}
          message={notice ?? undefined}
          className={cn(
            'mt-2 px-5',
            variant === 'hero' && 'text-center [&_p]:text-white-50',
          )}
        />
      )}
    </div>
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
