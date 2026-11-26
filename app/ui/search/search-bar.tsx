'use client';

import { useEffect, useId, useRef, useState, useTransition } from 'react';

import { useRouter } from 'next/navigation';

import ProgressActivity from '@material-symbols/svg-400/rounded/progress_activity.svg?svgr';
import Search from '@material-symbols/svg-400/rounded/search.svg?svgr';

import { track } from '@/app/lib/analytics/track';
import { findPlace } from '@/app/lib/queries/places';
import { routes } from '@/app/lib/routes';
import type { ActiveSearch } from '@/app/lib/search/active-search';
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

import { SearchShade, searchShadeHost } from './search-shade';
import {
  useActiveSearch,
  useLastLocation,
  useRecentSearches,
} from './use-remembered';
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
 * tablets up, working as the hero's; a list hangs under its field from
 * 1280 px, as in the hero, and where the fields are narrow, under the
 * whole pill (tablets, small laptops) or the whole bar (phones), and what
 * is missing floats under the pill. On the search page: the pill on the
 * page's surface, the fields side by side from tablets up and stacked on
 * phones.
 */
const variants: Record<
  SearchBarVariant,
  {
    /** The box around the pill: what its lists and notice hang from. */
    wrapper: string;
    form: string;
    field: string;
    input: string;
    where: string;
    divider: string;
    secondDivider: string;
    button: string;
    label: string;
    /** The line that says what is missing (`FieldError`). */
    notice: string;
    /** The shade's layer: over the page's bar (the hero), or under it. */
    shade: string;
    /**
     * Where each list hangs (Figma): under the pill, from its left edge to
     * the divider («¿Qué?») or from the divider to its right edge
     * («¿Dónde?»), 16 px down — the fields span the pill's height, and the
     * offsets are the pill's padding and gaps.
     */
    whatPopup: string;
    wherePopup: string;
  }
> = {
  hero: {
    wrapper: '',
    form: 'mx-auto max-w-4xl flex-col rounded-2xl bg-pure-white shadow-md sm:min-h-14 sm:flex-row sm:items-center sm:gap-6 sm:rounded-full sm:px-5',
    field: 'px-5 py-3 sm:self-stretch sm:px-0 sm:py-0',
    input: 'text-subtitle-s',
    where: '',
    divider: 'mx-5 h-px sm:mx-0 sm:h-6.5 sm:w-px',
    secondDivider: 'sm:hidden',
    // On a phone a row of its own; from tablets up, the bare icon with a
    // full tap target, pulled in so the glyph sits 20 px from the edge.
    button:
      'min-h-touch gap-2 rounded-b-2xl px-5 hover:bg-blue-50 focus-visible:bg-blue-50 sm:-mr-2.5 sm:size-11 sm:shrink-0 sm:rounded-full sm:px-0 sm:hover:scale-110 sm:hover:bg-transparent sm:focus-visible:bg-transparent sm:focus-visible:ring-3 sm:focus-visible:ring-ring/50',
    label: 'sm:sr-only',
    notice: 'mt-2 px-5 text-center [&_p]:text-white-50',
    // Over the landing's bar (z-20): the hero's block rises over it.
    shade: 'z-30',
    whatPopup: 'sm:-right-6 sm:-left-5 sm:mt-4',
    // The button (44 px, 10 px into the padding) and the gap: 78 px.
    wherePopup: 'sm:-right-19.5 sm:-left-6 sm:mt-4',
  },
  bar: {
    // A field 138 px wide (1024) or a phone's 163 px is no width for a
    // list: the positioned box a list hangs from is the field from 1280 px
    // (xl), the pill from tablets up, and the bar itself on phones.
    wrapper: 'max-md:static',
    form: 'h-11 flex-row items-center gap-1.5 rounded-full bg-white-200 px-2.5 sm:gap-3 sm:px-4',
    field: 'py-0 max-xl:static xl:self-stretch',
    input: 'text-body-xs',
    where: 'hidden md:flex',
    divider: 'hidden h-5 w-px md:block',
    secondDivider: 'hidden',
    // A 36 px circle in the 44 px pill; an invisible ring around it makes
    // the tap target the pill's full height (§8.5) without moving a thing.
    button:
      'relative -mr-1.5 size-9 shrink-0 rounded-full after:absolute after:-inset-1 after:rounded-full hover:scale-110 focus-visible:ring-3 focus-visible:ring-ring/50',
    label: 'sr-only',
    // No room under the bar's pill: the line floats under it as a card,
    // over the page and never in the way of a tap.
    notice:
      'pointer-events-none absolute top-[calc(100%+0.5rem)] left-0 z-20 rounded-xl bg-pure-white px-4 py-2.5 shadow-lg ring-1 ring-divider max-md:right-0 md:w-max md:max-w-full',
    // Under the bar (z-20), which stays the search's surface.
    shade: 'z-15',
    whatPopup: 'md:mt-4 xl:-right-3 xl:-left-4',
    // The button (36 px, 6 px into the padding) and the gap: 58 px.
    wherePopup: 'md:mt-4 xl:-right-14.5 xl:-left-3',
  },
  page: {
    wrapper: '',
    form: 'flex-col rounded-2xl bg-pure-white shadow-sm ring-1 ring-divider sm:h-12 sm:flex-row sm:items-center sm:gap-4 sm:rounded-full sm:px-4',
    field: 'px-4 py-2.5 sm:self-stretch sm:px-0 sm:py-0',
    input: 'text-body-xs',
    where: '',
    divider: 'mx-4 h-px sm:mx-0 sm:h-5 sm:w-px',
    secondDivider: 'sm:hidden',
    button:
      'min-h-touch gap-2 rounded-b-2xl px-4 hover:bg-blue-50 focus-visible:bg-blue-50 sm:-mr-1.5 sm:size-9 sm:shrink-0 sm:rounded-full sm:px-0 sm:hover:scale-110 sm:hover:bg-transparent sm:focus-visible:bg-transparent sm:focus-visible:ring-3 sm:focus-visible:ring-ring/50',
    label: 'sm:sr-only',
    notice: 'mt-2 px-5',
    // Under the search page's bar (z-20).
    shade: 'z-15',
    whatPopup: 'sm:-right-4 sm:-left-4 sm:mt-4',
    // The button (36 px, 6 px into the padding) and the gap: 62 px.
    wherePopup: 'sm:-right-15.5 sm:-left-4 sm:mt-4',
  },
};

type SearchBarProps = {
  variant?: SearchBarVariant;
  /** The landmark's name; two searches on one page need two names. */
  label: string;
  words: SearchBarWords;
  /** The catalog, flat: what the box matches as one types. */
  catalog: SearchCatalog;
  /** What the empty box offers: the most booked specialties, or the catalog's first. */
  topSpecialties: SearchCatalog;
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
  topSpecialties,
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
  const { active, keepActive, clearActive } = useActiveSearch();
  const { last, keep } = useLastLocation();
  const device = useDeviceLocation();

  // What is looked for: on /search the address leads; elsewhere the active
  // search from this browser fills the bar until the person edits or clears it.
  const hasUrlQuery = initialQuery !== undefined;
  const urlSpecialtyId = initialQuery?.specialtyId ?? null;
  const urlText = initialQuery?.text ?? null;
  const baseWhat: ActiveSearch | null = hasUrlQuery
    ? urlSpecialtyId !== null && initialSpecialtyName
      ? {
          kind: 'specialty',
          id: urlSpecialtyId,
          name: initialSpecialtyName,
        }
      : urlText !== null && urlText !== ''
        ? { kind: 'text', text: urlText }
        : null
    : active;
  const baseKey = hasUrlQuery
    ? `url:${urlSpecialtyId ?? ''}:${urlText ?? ''}:${initialSpecialtyName ?? ''}`
    : active === null
      ? 'active:none'
      : active.kind === 'specialty'
        ? `active:specialty:${active.id}:${active.name}`
        : `active:text:${active.text}`;
  const [draft, setDraft] = useState<{
    forKey: string;
    text: string;
    specialty: SpecialtyRef | null;
  } | null>(null);
  const currentDraft = draft?.forKey === baseKey ? draft : null;
  const text =
    currentDraft !== null
      ? currentDraft.text
      : baseWhat === null
        ? ''
        : baseWhat.kind === 'specialty'
          ? baseWhat.name
          : baseWhat.text;
  const specialty: SpecialtyRef | null =
    currentDraft !== null
      ? currentDraft.specialty
      : baseWhat?.kind === 'specialty'
        ? { id: baseWhat.id, name: baseWhat.name }
        : null;
  // The place in hand: on /search the URL leads (including whole-country when
  // no lat/lng/near is in the URL); elsewhere the last remembered place does.
  const whereKey = hasUrlQuery
    ? `url:${JSON.stringify(initialQuery.location)}`
    : 'remembered';
  const [draftWhere, setDraftWhere] = useState<{
    forKey: string;
    location: SearchLocation;
  } | null>(null);
  const location =
    draftWhere?.forKey === whereKey
      ? draftWhere.location
      : hasUrlQuery
        ? initialQuery.location
        : (last ?? wholeCountry);
  const [typedPlace, setTypedPlace] = useState('');
  const [problem, setProblem] = useState<string | null>(null);
  // A place just taken in hand, while Google places it: a search that
  // comes before the answer waits for it (an Enter right after the pick).
  const pendingPlace = useRef<Promise<SearchLocation | null> | null>(null);
  // From the tap until the page moves: the place may be asked of Google
  // first. The button shows it, and a second tap or Enter waits (§8.3).
  const [locating, setLocating] = useState(false);
  const busy = pending || locating;
  // The bar's line floats over the page (the hero's sits in it and stays):
  // a tap elsewhere or Escape puts it away, until the next try.
  const wrapper = useRef<HTMLDivElement>(null);
  const [noticeAway, setNoticeAway] = useState(false);
  // A field in use dims the page (SearchShade), from the first use on, in
  // the page's own stacking context when it names one.
  const [engaged, setEngaged] = useState(false);
  const [shadeHost, setShadeHost] = useState<Element | null>(null);

  const locate = () => {
    pendingPlace.current = null;
    // The line answers the latest thing done: what the browser says of
    // the position, no longer what an empty search lacked.
    setProblem(null);
    setNoticeAway(false);
    void device.locate().then((coordinates) => {
      if (coordinates) {
        setDraftWhere({
          forKey: whereKey,
          location: { kind: 'device', coordinates },
        });
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
        setDraftWhere({ forKey: whereKey, location: picked });
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
    if (busy) return;
    setLocating(true);
    let where: SearchLocation;
    try {
      where = await resolveTyped();
    } finally {
      setLocating(false);
    }
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
    keepActive(
      'text' in criteria
        ? { kind: 'text', text: criteria.text }
        : {
            kind: 'specialty',
            id: criteria.specialty.id,
            name: criteria.specialty.name,
          },
    );
    go(query);
  };

  const onPick = (pick: WhatPick) => {
    setProblem(null);
    switch (pick.kind) {
      case 'text':
        setDraft({ forKey: baseKey, text: pick.text, specialty: null });
        void search({ text: pick.text });
        break;
      case 'specialty':
        setDraft({
          forKey: baseKey,
          text: pick.specialty.name,
          specialty: pick.specialty,
        });
        track('web_search_suggestion_taken', { kind: 'specialty' });
        void search({ specialty: pick.specialty });
        break;
      case 'specialist':
        setDraft({ forKey: baseKey, text: pick.name, specialty: null });
        keepActive({ kind: 'text', text: pick.name });
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
  const floats = variant === 'bar';
  const shownNotice = floats && noticeAway ? null : notice;

  // A search arrived at through its URL (a specialty chip, a shared search)
  // becomes the active search for subsequent pages too.
  useEffect(() => {
    if (!hasUrlQuery) return;
    if (urlSpecialtyId !== null && initialSpecialtyName) {
      keepActive({
        kind: 'specialty',
        id: urlSpecialtyId,
        name: initialSpecialtyName,
      });
    } else if (urlText !== null && urlText !== '') {
      keepActive({ kind: 'text', text: urlText });
    }
    if (initialQuery.location.kind !== 'country') {
      keep(initialQuery.location);
    }
  }, [
    hasUrlQuery,
    urlSpecialtyId,
    initialSpecialtyName,
    urlText,
    initialQuery?.location,
    keepActive,
    keep,
  ]);

  // In use while the focus is in the box; the shade's place is found on the
  // first use, from the box up.
  useEffect(() => {
    const box = wrapper.current;
    if (!box) return;
    const onFocusIn = () => {
      setEngaged(true);
      setShadeHost(
        (host) => host ?? box.closest(`[${searchShadeHost}]`) ?? document.body,
      );
    };
    const onFocusOut = (event: FocusEvent) => {
      const next = event.relatedTarget;
      if (next instanceof Node && box.contains(next)) return;
      setEngaged(false);
    };
    box.addEventListener('focusin', onFocusIn);
    box.addEventListener('focusout', onFocusOut);
    return () => {
      box.removeEventListener('focusin', onFocusIn);
      box.removeEventListener('focusout', onFocusOut);
    };
  }, []);

  useEffect(() => {
    if (!floats || shownNotice === null) return;
    const onPointerDown = (event: PointerEvent) => {
      const inside =
        event.target instanceof Node && wrapper.current?.contains(event.target);
      if (!inside) setNoticeAway(true);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setNoticeAway(true);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [floats, shownNotice]);

  return (
    <div
      ref={wrapper}
      // The page's layers read it: the hero's block rises over the shade.
      data-engaged={engaged || undefined}
      className={cn('relative w-full', style.wrapper, className)}
    >
      <form
        ref={form}
        role="search"
        aria-label={label}
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          setNoticeAway(false);
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
          setDraft({ forKey: baseKey, text, specialty: null });
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
            setProblem(null);
            setDraft({
              forKey: baseKey,
              text: next,
              specialty:
                specialty !== null && next === specialty.name
                  ? specialty
                  : null,
            });
          }}
          onClear={() => {
            setProblem(null);
            clearActive();
            setDraft(
              hasUrlQuery
                ? { forKey: baseKey, text: '', specialty: null }
                : null,
            );
          }}
          onPick={onPick}
          catalog={catalog}
          topSpecialties={topSpecialties}
          location={location}
          recent={recent}
          onForgetRecent={forget}
          words={words}
          hint={variant === 'bar' ? words.whatShortHint : words.whatHint}
          describedBy={problem ? problemId : undefined}
          invalid={problem !== null}
          hideLeadingIconOnMobile={variant === 'bar'}
          className={style.field}
          inputClassName={style.input}
          popupClassName={style.whatPopup}
        />
        <Divider className={style.divider} />
        <WhereField
          location={location}
          onLocationChange={(next) => {
            pendingPlace.current = null;
            setDraftWhere({ forKey: whereKey, location: next });
            if (next.kind !== 'device') device.reset();
          }}
          device={{ status: device.status, locate }}
          onTypedChange={setTypedPlace}
          onPlacePick={pickPlace}
          words={words}
          className={cn(style.field, style.where)}
          inputClassName={style.input}
          popupClassName={style.wherePopup}
        />
        <Divider className={cn(style.divider, style.secondDivider)} />
        <button
          type="submit"
          aria-busy={busy || undefined}
          className={cn(
            'flex items-center justify-center text-label-lg text-primary transition-[background-color,scale] duration-fast ease-house outline-none',
            style.button,
          )}
        >
          <Icon
            icon={busy ? ProgressActivity : Search}
            size={24}
            className={cn(busy && 'animate-spin motion-reduce:animate-none')}
          />
          <span className={style.label}>{words.submit}</span>
        </button>
      </form>
      <FieldError
        id={problemId}
        message={shownNotice ?? undefined}
        className={style.notice}
      />
      {shadeHost ? (
        <SearchShade host={shadeHost} open={engaged} className={style.shade} />
      ) : null}
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
