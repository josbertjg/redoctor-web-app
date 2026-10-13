'use client';

import { useId } from 'react';

import { cn } from '@/app/lib/utils';

export type FilterChipOption<T> = {
  key: string;
  value: T;
  label: string;
};

type FilterChipsProps<T> = {
  legend: string;
  /** The legend for screen readers alone, when the chips say it already. */
  hideLegend?: boolean;
  options: readonly FilterChipOption<T>[];
  value: T;
  onChange: (value: T) => void;
};

/*
 * One choice among a few, as the app's filter chips (its «Todas» first):
 * radios, so the keyboard moves among them and a screen reader hears the
 * group and its name. The appointments' history and the receipts filter
 * with them.
 */
export function FilterChips<T>({
  legend,
  hideLegend = false,
  options,
  value,
  onChange,
}: FilterChipsProps<T>) {
  const name = useId();

  return (
    <fieldset className="flex flex-col gap-2">
      <legend
        className={cn(
          'mb-2 text-body-xxs font-medium text-text-primary',
          hideLegend && 'sr-only',
        )}
      >
        {legend}
      </legend>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <label key={option.key} className="cursor-pointer">
            <input
              type="radio"
              name={name}
              checked={value === option.value}
              onChange={() => {
                onChange(option.value);
              }}
              className="peer sr-only"
            />
            <span className="inline-flex min-h-touch items-center rounded-full border border-divider bg-pure-white px-4 text-label-lg text-text-secondary transition-colors duration-fast ease-house peer-checked:border-primary peer-checked:bg-info-light peer-checked:text-primary peer-focus-visible:ring-3 peer-focus-visible:ring-ring/50 hover:bg-surface-variant">
              {option.label}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
