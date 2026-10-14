'use client';

import { useState } from 'react';

import KeyboardArrowDown from '@material-symbols/svg-400/rounded/keyboard_arrow_down.svg?svgr';
import { useTranslations } from 'next-intl';

import { formatAppointmentDayShort } from '@/app/lib/format/appointment-time';
import { isCalendarDay } from '@/app/lib/reports/period';
import {
  isSearchRadius,
  searchRadiiKm,
  type SearchRadius,
} from '@/app/lib/search/location';
import type { SearchQuery } from '@/app/lib/search/query';
import { cn } from '@/app/lib/utils';

import { Button } from '@/app/ui/button';
import { ChoiceCards } from '@/app/ui/choice-cards';
import { Icon } from '@/app/ui/icons';
import { Sheet } from '@/app/ui/sheet';
import { TextField } from '@/app/ui/text-field';

type SearchFiltersProps = {
  query: SearchQuery;
  today: string;
  onChange: (next: SearchQuery) => void;
};

/*
 * The app's «Filtros» as chips over the results: «Disponibilidad» («Lo
 * antes posible», or from a day) and «Distancia» (the app's stops and
 * «Todo el país»), each opening a sheet whose «Aplicar» changes the search.
 * The distance needs a point: searching the whole country, the chip is not
 * there. «Restablecer» puts both back.
 */
export function SearchFilters({ query, today, onChange }: SearchFiltersProps) {
  const t = useTranslations();
  const [open, setOpen] = useState<'availability' | 'distance' | null>(null);
  const hasPoint = query.location.kind !== 'country';
  const changed = query.from !== null || (hasPoint && query.radius !== 'all');

  return (
    <div className="flex flex-wrap items-center gap-2">
      <FilterChip
        label={t('availability')}
        value={
          query.from === null
            ? t('asSoonAsPossible')
            : t('search.web.fromDay', {
                date: formatAppointmentDayShort(query.from),
              })
        }
        changed={query.from !== null}
        onClick={() => {
          setOpen('availability');
        }}
      />
      {hasPoint ? (
        <FilterChip
          label={t('distance')}
          value={
            query.radius === 'all'
              ? t('allTheCountry')
              : t('search.web.radiusKm', { km: query.radius })
          }
          changed={query.radius !== 'all'}
          onClick={() => {
            setOpen('distance');
          }}
        />
      ) : null}
      {changed ? (
        <button
          type="button"
          onClick={() => {
            onChange({ ...query, from: null, radius: 'all' });
          }}
          className="inline-flex min-h-touch items-center rounded-sm px-2 text-label-lg text-primary outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          {t('reset')}
        </button>
      ) : null}
      <AvailabilitySheet
        open={open === 'availability'}
        onOpenChange={(next) => {
          setOpen(next ? 'availability' : null);
        }}
        from={query.from}
        today={today}
        onApply={(from) => {
          setOpen(null);
          if (from !== query.from) onChange({ ...query, from });
        }}
      />
      <DistanceSheet
        open={open === 'distance'}
        onOpenChange={(next) => {
          setOpen(next ? 'distance' : null);
        }}
        radius={query.radius}
        onApply={(radius) => {
          setOpen(null);
          if (radius !== query.radius) onChange({ ...query, radius });
        }}
      />
    </div>
  );
}

function FilterChip({
  label,
  value,
  changed,
  onClick,
}: {
  label: string;
  value: string;
  changed: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-haspopup="dialog"
      aria-label={`${label}: ${value}`}
      onClick={onClick}
      className={cn(
        'inline-flex min-h-touch items-center gap-1 rounded-full border px-4 text-label-lg transition-colors duration-fast ease-house outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
        changed
          ? 'border-primary bg-info-light text-primary'
          : 'border-divider bg-pure-white text-text-primary hover:bg-surface-variant',
      )}
    >
      <span className="text-text-secondary">{label}:</span>
      <span>{value}</span>
      <Icon icon={KeyboardArrowDown} size={18} className="-mr-1" />
    </button>
  );
}

type AvailabilityChoice = 'asap' | 'custom';

function AvailabilitySheet({
  open,
  onOpenChange,
  from,
  today,
  onApply,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  from: string | null;
  today: string;
  onApply: (from: string | null) => void;
}) {
  const t = useTranslations();
  const [choice, setChoice] = useState<AvailabilityChoice>(
    from === null ? 'asap' : 'custom',
  );
  const [day, setDay] = useState(from ?? today);
  // The sheet starts from the search each time it opens.
  const [openedWith, setOpenedWith] = useState(open);
  if (open !== openedWith) {
    setOpenedWith(open);
    if (open) {
      setChoice(from === null ? 'asap' : 'custom');
      setDay(from ?? today);
    }
  }
  const dayProblem =
    choice === 'custom' && (!isCalendarDay(day) || day < today)
      ? t('geoLocation.validation.missing')
      : undefined;

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={t('availability')}
      footer={
        <Button
          block
          onClick={() => {
            if (choice === 'asap') onApply(null);
            else if (dayProblem === undefined)
              onApply(day === today ? null : day);
          }}
        >
          {t('search.web.applyFilters')}
        </Button>
      }
    >
      <div className="flex flex-col gap-4">
        <ChoiceCards<AvailabilityChoice>
          legend={t('availability')}
          columns={1}
          value={choice}
          options={[
            { value: 'asap', label: t('asSoonAsPossible') },
            { value: 'custom', label: t('custom') },
          ]}
          inputProps={{
            name: 'availability',
            onChange: (event) => {
              setChoice(event.target.value as AvailabilityChoice);
            },
          }}
        />
        {choice === 'custom' ? (
          <TextField
            type="date"
            label={t('from')}
            min={today}
            value={day}
            onChange={(event) => {
              setDay(event.target.value);
            }}
            error={dayProblem}
            className="animate-fade-up"
          />
        ) : null}
      </div>
    </Sheet>
  );
}

function DistanceSheet({
  open,
  onOpenChange,
  radius,
  onApply,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  radius: SearchRadius;
  onApply: (radius: SearchRadius) => void;
}) {
  const t = useTranslations();
  const [choice, setChoice] = useState<SearchRadius>(radius);
  const [openedWith, setOpenedWith] = useState(open);
  if (open !== openedWith) {
    setOpenedWith(open);
    if (open) setChoice(radius);
  }

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={t('distance')}
      footer={
        <Button
          block
          onClick={() => {
            onApply(choice);
          }}
        >
          {t('search.web.applyFilters')}
        </Button>
      }
    >
      <ChoiceCards<string>
        legend={t('distance')}
        columns={1}
        value={String(choice)}
        options={[
          ...searchRadiiKm.map((km) => ({
            value: String(km),
            label: t('search.web.radiusKm', { km }),
          })),
          { value: 'all', label: t('allTheCountry') },
        ]}
        inputProps={{
          name: 'distance',
          onChange: (event) => {
            const value = event.target.value;
            const next = value === 'all' ? 'all' : Number(value);
            if (isSearchRadius(next)) setChoice(next);
          },
        }}
      />
    </Sheet>
  );
}
