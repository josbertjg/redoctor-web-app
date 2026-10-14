'use client';

import { useId, useRef, useState } from 'react';

import Close from '@material-symbols/svg-400/rounded/close.svg?svgr';
import History from '@material-symbols/svg-400/rounded/history.svg?svgr';
import Search from '@material-symbols/svg-400/rounded/search.svg?svgr';
import Stethoscope from '@material-symbols/svg-400/rounded/stethoscope.svg?svgr';
import VerifiedFill from '@material-symbols/svg-400/rounded/verified-fill.svg?svgr';
import { useQuery } from '@tanstack/react-query';

import { specialistSuggestionsQueryOptions } from '@/app/lib/queries/search';
import type { SearchLocation } from '@/app/lib/search/location';
import type { RecentSearch } from '@/app/lib/search/recent';
import {
  canSuggest,
  matchSpecialties,
  type SearchSuggestion,
} from '@/app/lib/search/suggestions';
import { cn } from '@/app/lib/utils';

import { Avatar } from '@/app/ui/avatar';
import { Icon } from '@/app/ui/icons';

import { useDebouncedValue } from '@/app/hooks/use-debounced-value';

import { Highlight } from './highlight';
import {
  SuggestionGroup,
  SuggestionNote,
  SuggestionOption,
  SuggestionPopup,
  SuggestionSkeletonRows,
} from './suggestion-popup';
import { useCombobox } from './use-combobox';

import type {
  SearchBarWords,
  SearchCatalog,
  SpecialtyRef,
} from './search-bar-types';

/** The app's pause before asking the API for names. */
const suggestionsDebounceMs = 400;

/** How many of the catalog an empty box offers. */
const featuredLimit = 8;

/** What the box can take in hand. */
export type WhatPick =
  | { kind: 'text'; text: string }
  | { kind: 'specialty'; specialty: SpecialtyRef }
  | { kind: 'specialist'; id: string; name: string };

type WhatFieldProps = {
  text: string;
  specialty: SpecialtyRef | null;
  onTextChange: (text: string) => void;
  onPick: (pick: WhatPick) => void;
  catalog: SearchCatalog;
  /** Where the specialists suggested are looked for first. */
  location: SearchLocation;
  recent: readonly RecentSearch[];
  onForgetRecent: (entry: RecentSearch) => void;
  words: SearchBarWords;
  hint: string;
  /** The id of the line that says what is wrong, when something is. */
  describedBy?: string | undefined;
  invalid?: boolean;
  className?: string;
  inputClassName?: string;
};

/*
 * «¿Qué buscas?»: a specialty of the catalog or a specialist's name. Empty,
 * it offers what was looked for before and the catalog's first
 * specialties; from two letters, the specialties that match (found here,
 * at once) and the specialists whose name does (asked of the API after a
 * pause), with the letters that matched in bold, and the text itself as
 * the first option, so Enter and a tap do the same.
 */
export function WhatField({
  text,
  specialty,
  onTextChange,
  onPick,
  catalog,
  location,
  recent,
  onForgetRecent,
  words,
  hint,
  describedBy,
  invalid = false,
  className,
  inputClassName,
}: WhatFieldProps) {
  const root = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const labelId = useId();
  const [touched, setTouched] = useState(false);

  const typed = text.trim();
  const suggesting = canSuggest(typed) && specialty === null;
  const settled = useDebouncedValue(
    suggesting ? typed : '',
    suggestionsDebounceMs,
  );
  const specialists = useQuery(
    specialistSuggestionsQueryOptions(settled, location),
  );
  const specialties = suggesting ? matchSpecialties(catalog, typed) : [];
  const specialistRows =
    suggesting && settled === typed ? (specialists.data ?? []) : [];
  const waitingForNames =
    suggesting &&
    (settled !== typed || (specialists.isPending && !specialists.isError));

  type Option =
    | { kind: 'text' }
    | { kind: 'recent'; entry: RecentSearch }
    | { kind: 'suggestion'; suggestion: SearchSuggestion }
    | { kind: 'featured'; specialty: SpecialtyRef };
  const options: Option[] = suggesting
    ? [
        { kind: 'text' },
        ...specialties.map((suggestion) => ({
          kind: 'suggestion' as const,
          suggestion,
        })),
        ...specialistRows.map((suggestion) => ({
          kind: 'suggestion' as const,
          suggestion,
        })),
      ]
    : [
        ...recent.map((entry) => ({ kind: 'recent' as const, entry })),
        ...catalog
          .slice(0, featuredLimit)
          .map((item) => ({ kind: 'featured' as const, specialty: item })),
      ];

  const combobox = useCombobox({
    count: options.length,
    root,
    onPick: (index) => {
      const option = options[index];
      if (!option) return;
      switch (option.kind) {
        case 'text':
          onPick({ kind: 'text', text: typed });
          break;
        case 'featured':
          onPick({ kind: 'specialty', specialty: option.specialty });
          break;
        case 'suggestion':
          onPick(
            option.suggestion.kind === 'specialty'
              ? {
                  kind: 'specialty',
                  specialty: {
                    id: option.suggestion.id,
                    name: option.suggestion.name,
                  },
                }
              : {
                  kind: 'specialist',
                  id: option.suggestion.id,
                  name: option.suggestion.name,
                },
          );
          break;
        case 'recent':
          onPick(
            option.entry.kind === 'text'
              ? { kind: 'text', text: option.entry.label }
              : option.entry.kind === 'specialty'
                ? {
                    kind: 'specialty',
                    specialty: {
                      id: option.entry.id,
                      name: option.entry.label,
                    },
                  }
                : {
                    kind: 'specialist',
                    id: option.entry.id,
                    name: option.entry.label,
                  },
          );
          break;
      }
    },
  });

  const optionAt = (index: number) => ({
    id: combobox.optionId(index),
    active: combobox.activeIndex === index,
    onActivate: () => {
      combobox.setActive(index);
    },
    onPick: () => {
      combobox.pick(index);
    },
  });
  const recentCount = suggesting ? 0 : recent.length;
  const specialtiesStart = 1;
  const specialistsStart = specialtiesStart + specialties.length;
  const hasEmptyOffer = recentCount > 0 || catalog.length > 0;

  return (
    <div ref={root} className={cn('relative flex min-w-0 flex-1', className)}>
      <div className="flex min-w-0 flex-1 items-center gap-2.5 text-grey-700">
        <Icon
          icon={Stethoscope}
          size={24}
          className={cn(
            'shrink-0 transition-colors duration-fast ease-house',
            specialty !== null && 'text-primary',
          )}
        />
        <span id={labelId} className="sr-only">
          {words.whatLabel}
        </span>
        <input
          ref={input}
          type="text"
          name="q"
          value={text}
          placeholder={hint}
          aria-labelledby={labelId}
          aria-describedby={describedBy}
          aria-invalid={invalid || undefined}
          enterKeyHint="search"
          maxLength={100}
          {...combobox.inputProps}
          onChange={(event) => {
            onTextChange(event.target.value);
            combobox.show();
          }}
          onFocus={() => {
            setTouched(true);
            if (suggesting || hasEmptyOffer) combobox.show();
          }}
          className={cn(
            'min-w-0 flex-1 bg-transparent text-pure-black outline-none placeholder:text-grey-700',
            inputClassName,
          )}
        />
        {text !== '' ? (
          <button
            type="button"
            aria-label={words.clear}
            onMouseDown={(event) => {
              event.preventDefault();
            }}
            onClick={() => {
              onTextChange('');
              input.current?.focus();
            }}
            className="flex size-8 shrink-0 items-center justify-center rounded-full text-text-secondary transition-colors duration-fast ease-house outline-none hover:bg-surface-variant focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <Icon icon={Close} size={18} />
          </button>
        ) : null}
      </div>
      <SuggestionPopup
        open={combobox.open && touched && (suggesting || hasEmptyOffer)}
        id={combobox.listboxId}
        label={words.suggestions}
      >
        {suggesting ? (
          <>
            <div className="py-1">
              <SuggestionOption
                {...optionAt(0)}
                icon={Search}
                className="font-medium text-primary"
              >
                {words.searchFor} «{typed}»
              </SuggestionOption>
            </div>
            {specialties.length > 0 ? (
              <SuggestionGroup title={words.specialtiesGroup}>
                {specialties.map((suggestion, index) => (
                  <SuggestionOption
                    key={suggestion.id}
                    {...optionAt(specialtiesStart + index)}
                    icon={Stethoscope}
                  >
                    <Highlight
                      text={suggestion.name}
                      match={suggestion.match}
                    />
                  </SuggestionOption>
                ))}
              </SuggestionGroup>
            ) : null}
            {specialistRows.length > 0 ? (
              <SuggestionGroup title={words.specialistsGroup}>
                {specialistRows.map((suggestion, index) => (
                  <SuggestionOption
                    key={suggestion.id}
                    {...optionAt(specialistsStart + index)}
                    leading={
                      <Avatar
                        name={suggestion.name}
                        src={suggestion.photoUrl}
                        size="sm"
                        decorative
                      />
                    }
                    trailing={
                      suggestion.specialty ? (
                        <span className="max-w-[40%] shrink-0 truncate text-body-sm text-text-secondary">
                          {suggestion.specialty}
                        </span>
                      ) : undefined
                    }
                  >
                    <span className="inline-flex max-w-full items-center gap-1">
                      <span className="truncate">
                        <Highlight
                          text={suggestion.name}
                          match={suggestion.match}
                        />
                      </span>
                      {suggestion.verified ? (
                        <Icon
                          icon={VerifiedFill}
                          size={16}
                          label={words.verifiedSpecialist}
                          className="shrink-0 text-verified"
                        />
                      ) : null}
                    </span>
                  </SuggestionOption>
                ))}
              </SuggestionGroup>
            ) : waitingForNames ? (
              <SuggestionSkeletonRows rows={2} />
            ) : specialties.length === 0 ? (
              <SuggestionNote>{words.noSuggestions}</SuggestionNote>
            ) : null}
          </>
        ) : (
          <>
            {recent.length > 0 ? (
              <SuggestionGroup title={words.recentSearches}>
                {recent.map((entry, index) => (
                  <SuggestionOption
                    key={`${entry.kind}:${entry.kind === 'text' ? entry.label : entry.id}`}
                    {...optionAt(index)}
                    icon={entry.kind === 'specialty' ? Stethoscope : History}
                    trailing={
                      <button
                        type="button"
                        aria-label={`${words.removeRecent}: ${entry.label}`}
                        onClick={(event) => {
                          event.stopPropagation();
                          onForgetRecent(entry);
                        }}
                        className="-mr-1 flex size-8 shrink-0 items-center justify-center rounded-full text-text-secondary transition-colors duration-fast ease-house outline-none hover:bg-white-300 focus-visible:ring-3 focus-visible:ring-ring/50"
                      >
                        <Icon icon={Close} size={16} />
                      </button>
                    }
                  >
                    {entry.label}
                  </SuggestionOption>
                ))}
              </SuggestionGroup>
            ) : null}
            {catalog.length > 0 ? (
              <SuggestionGroup title={words.topSpecialties}>
                {catalog.slice(0, featuredLimit).map((item, index) => (
                  <SuggestionOption
                    key={item.id}
                    {...optionAt(recentCount + index)}
                    icon={Stethoscope}
                  >
                    {item.name}
                  </SuggestionOption>
                ))}
              </SuggestionGroup>
            ) : null}
          </>
        )}
      </SuggestionPopup>
    </div>
  );
}
