'use client';

import { useId, type ComponentProps } from 'react';

import KeyboardArrowDown from '@material-symbols/svg-400/rounded/keyboard_arrow_down.svg?svgr';

import { cn } from '@/app/lib/utils';

import { Icon } from './icons';

export type SelectOption = { value: string; label: string };

type SelectFieldProps = Omit<ComponentProps<'select'>, 'children'> & {
  label: string;
  options: readonly SelectOption[];
  className?: string;
};

/*
 * A choice among a few, with the TextField's look: the label above, the
 * white 40 px box with the `md` radius and the `sm` shadow, a chevron at
 * the end. The browser's own select underneath: its list, its keyboard and
 * its screen-reader behaviour on every phone. 16 px text, so iOS does not
 * zoom in on focus.
 */
export function SelectField({
  label,
  options,
  className,
  id,
  ...props
}: SelectFieldProps) {
  const generatedId = useId();
  const selectId = id ?? generatedId;

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <label
        htmlFor={selectId}
        className="text-body-xxs font-medium text-text-primary"
      >
        {label}
      </label>
      <div className="relative flex h-control items-center rounded-md border border-transparent bg-pure-white shadow-sm transition-[border-color,box-shadow] duration-fast ease-house focus-within:border-primary focus-within:ring-3 focus-within:ring-ring/30">
        <select
          id={selectId}
          className="h-full w-full min-w-0 cursor-pointer appearance-none bg-transparent pr-10 pl-3 text-body-xs text-text-primary outline-none"
          {...props}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <Icon
          icon={KeyboardArrowDown}
          size={20}
          className="pointer-events-none absolute right-3 text-text-secondary"
        />
      </div>
    </div>
  );
}
