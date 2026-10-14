'use client';

import { useId, useRef, useState } from 'react';

import Close from '@material-symbols/svg-400/rounded/close.svg?svgr';
import LocationOn from '@material-symbols/svg-400/rounded/location_on.svg?svgr';
import MyLocation from '@material-symbols/svg-400/rounded/my_location.svg?svgr';
import PinDrop from '@material-symbols/svg-400/rounded/pin_drop.svg?svgr';
import ProgressActivity from '@material-symbols/svg-400/rounded/progress_activity.svg?svgr';
import Public from '@material-symbols/svg-400/rounded/public.svg?svgr';

import { wholeCountry, type SearchLocation } from '@/app/lib/search/location';
import { suggestionsMinLength } from '@/app/lib/search/suggestions';
import { cn } from '@/app/lib/utils';

import { Icon } from '@/app/ui/icons';

import type { DeviceLocationStatus } from '@/app/hooks/use-device-location';

import { Highlight } from './highlight';
import {
  SuggestionGroup,
  SuggestionNote,
  SuggestionOption,
  SuggestionPopup,
  SuggestionSkeletonRows,
} from './suggestion-popup';
import { useCombobox } from './use-combobox';
import {
  useLocationSuggestions,
  type LocationSuggestion,
} from './use-location-suggestions';

import type { SearchBarWords } from './search-bar-types';

type WhereFieldProps = {
  location: SearchLocation;
  onLocationChange: (location: SearchLocation) => void;
  /** The device's position: its state, and the way to ask for it. */
  device: { status: DeviceLocationStatus; locate: () => void };
  /** The text typed and not yet picked, for the search to resolve. */
  onTypedChange: (typed: string) => void;
  /** A place taken in hand: the box resolves its point (and waits for it). */
  onPlacePick: (place: LocationSuggestion) => void;
  words: SearchBarWords;
  className?: string;
  inputClassName?: string;
};

/*
 * «¿Dónde?»: the device's own position (the browser asks for it on the
 * tap), the whole country, or a place typed — Google's places, through
 * the web's server. The field shows the place in hand («Caracas»,
 * «Ubicación actual»); typing over it looks for another. The crosshair at
 * its end asks the device straight away, from the first paint.
 */
export function WhereField({
  location,
  onLocationChange,
  device,
  onTypedChange,
  onPlacePick,
  words,
  className,
  inputClassName,
}: WhereFieldProps) {
  const root = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const labelId = useId();
  const locationLabel = labelOf(location, words);
  const [typed, setTyped] = useState(locationLabel);
  const [editing, setEditing] = useState(false);
  // A place chosen elsewhere (the device answered, a search page loaded
  // with one) shows its name unless the person is typing another.
  const [shownFor, setShownFor] = useState(locationLabel);
  if (!editing && shownFor !== locationLabel) {
    setShownFor(locationLabel);
    setTyped(locationLabel);
  }

  const suggestions = useLocationSuggestions(editing ? typed : '');

  type Option =
    { kind: 'device' } | { kind: 'country' } | { kind: 'place'; index: number };
  const fixed: Option[] =
    typed.trim() === '' ? [{ kind: 'device' }, { kind: 'country' }] : [];
  const options: Option[] = [
    ...fixed,
    ...suggestions.items.map((_, index) => ({
      kind: 'place' as const,
      index,
    })),
  ];

  const stopEditing = () => {
    setEditing(false);
    onTypedChange('');
  };

  const combobox = useCombobox({
    count: options.length,
    root,
    onPick: (index) => {
      const option = options[index];
      if (!option) return;
      if (option.kind === 'device') {
        stopEditing();
        device.locate();
      } else if (option.kind === 'country') {
        stopEditing();
        onLocationChange(wholeCountry);
      } else {
        const item = suggestions.items[option.index];
        if (!item) return;
        setTyped(item.mainText);
        stopEditing();
        onPlacePick(item);
      }
    },
  });

  const locating = device.status === 'locating';
  const located = location.kind === 'device';
  const typing = editing && typed.trim().length >= suggestionsMinLength;

  return (
    <div ref={root} className={cn('relative flex min-w-0 flex-1', className)}>
      <div className="flex min-w-0 flex-1 items-center gap-2.5 text-grey-700">
        <Icon icon={LocationOn} size={24} className="shrink-0" />
        <span id={labelId} className="sr-only">
          {words.whereLabel}
        </span>
        <input
          ref={input}
          type="text"
          name="near"
          value={typed}
          placeholder={words.whereHint}
          aria-labelledby={labelId}
          enterKeyHint="search"
          {...combobox.inputProps}
          onChange={(event) => {
            setEditing(true);
            setTyped(event.target.value);
            onTypedChange(event.target.value);
            combobox.show();
          }}
          onFocus={() => {
            combobox.show();
          }}
          onBlur={() => {
            // Emptied and left: the place in hand is gone. Typed and left:
            // the search resolves the text, or keeps the place in hand.
            if (editing && typed.trim() === '') {
              stopEditing();
              onLocationChange(wholeCountry);
            }
          }}
          className={cn(
            'min-w-0 flex-1 bg-transparent text-pure-black outline-none placeholder:text-grey-700',
            inputClassName,
          )}
        />
        {typed !== '' ? (
          <button
            type="button"
            aria-label={words.clear}
            onMouseDown={(event) => {
              event.preventDefault();
            }}
            onClick={() => {
              setTyped('');
              setEditing(true);
              onTypedChange('');
              onLocationChange(wholeCountry);
              input.current?.focus();
            }}
            className="flex size-8 shrink-0 items-center justify-center rounded-full text-text-secondary transition-colors duration-fast ease-house outline-none hover:bg-surface-variant focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <Icon icon={Close} size={18} />
          </button>
        ) : (
          <button
            type="button"
            aria-label={words.useMyLocation}
            aria-pressed={located}
            onMouseDown={(event) => {
              event.preventDefault();
            }}
            onClick={() => {
              if (locating) return;
              combobox.close();
              device.locate();
            }}
            className={cn(
              'flex size-8 shrink-0 items-center justify-center rounded-full transition-[background-color,color,scale] duration-fast ease-house outline-none hover:scale-110 focus-visible:ring-3 focus-visible:ring-ring/50',
              located
                ? 'bg-info-light text-primary'
                : 'text-text-secondary hover:bg-surface-variant',
            )}
          >
            <Icon
              icon={locating ? ProgressActivity : MyLocation}
              size={18}
              className={cn(
                locating && 'animate-spin motion-reduce:animate-none',
              )}
            />
          </button>
        )}
      </div>
      <SuggestionPopup
        open={combobox.open && (fixed.length > 0 || typing)}
        id={combobox.listboxId}
        label={words.whereLabel}
      >
        {fixed.length > 0 ? (
          <div className="py-1">
            <SuggestionOption
              id={combobox.optionId(0)}
              active={combobox.activeIndex === 0}
              onActivate={() => {
                combobox.setActive(0);
              }}
              onPick={() => {
                combobox.pick(0);
              }}
              icon={locating ? ProgressActivity : MyLocation}
              className="font-medium text-primary"
            >
              {locating ? words.locating : words.useMyLocation}
            </SuggestionOption>
            <SuggestionOption
              id={combobox.optionId(1)}
              active={combobox.activeIndex === 1}
              onActivate={() => {
                combobox.setActive(1);
              }}
              onPick={() => {
                combobox.pick(1);
              }}
              icon={Public}
            >
              {words.wholeCountry}
            </SuggestionOption>
          </div>
        ) : null}
        {!typing ? null : suggestions.loading ? (
          <SuggestionSkeletonRows />
        ) : suggestions.items.length > 0 ? (
          <SuggestionGroup title={words.placesGroup}>
            {suggestions.items.map((item, index) => {
              const position = fixed.length + index;
              return (
                <SuggestionOption
                  key={item.id}
                  id={combobox.optionId(position)}
                  active={combobox.activeIndex === position}
                  onActivate={() => {
                    combobox.setActive(position);
                  }}
                  onPick={() => {
                    combobox.pick(position);
                  }}
                  icon={PinDrop}
                  trailing={
                    item.secondaryText ? (
                      <span className="max-w-[45%] shrink-0 truncate text-body-sm text-text-secondary">
                        {item.secondaryText}
                      </span>
                    ) : undefined
                  }
                >
                  <Highlight text={item.mainText} match={item.match} />
                </SuggestionOption>
              );
            })}
          </SuggestionGroup>
        ) : (
          <SuggestionNote>
            {suggestions.failed ? words.placesFailed : words.noSuggestions}
          </SuggestionNote>
        )}
      </SuggestionPopup>
    </div>
  );
}

/** What the field shows for the place in hand. */
function labelOf(location: SearchLocation, words: SearchBarWords): string {
  switch (location.kind) {
    case 'device':
      return words.currentLocation;
    case 'place':
      return location.label;
    case 'area':
      return words.mapArea;
    case 'country':
      return '';
  }
}
