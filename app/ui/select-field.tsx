'use client';

import { useId, type ComponentProps } from 'react';

import KeyboardArrowDown from '@material-symbols/svg-400/rounded/keyboard_arrow_down.svg?svgr';

import { cn } from '@/app/lib/utils';

import { Icon, type IconComponent } from './icons';

export type SelectOption = { value: string; label: string };

type SelectFieldProps = Omit<ComponentProps<'select'>, 'children'> & {
  label: string;
  options: readonly SelectOption[];
  /**
   * `pill`: a toolbar's choice (the agenda's «Pendientes ▾»), its label
   * read by assistive technology only, a white pill a touch target tall.
   */
  variant?: 'field' | 'pill';
  /** An icon before the value, in the pill. */
  icon?: IconComponent;
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
  variant = 'field',
  icon,
  className,
  id,
  ...props
}: SelectFieldProps) {
  const generatedId = useId();
  const selectId = id ?? generatedId;

  if (variant === 'pill') {
    return (
      <div className={cn('flex', className)}>
        <label htmlFor={selectId} className="sr-only">
          {label}
        </label>
        <div className="relative flex h-touch min-w-0 flex-1 items-center rounded-full bg-pure-white shadow-sm transition-shadow duration-fast ease-house focus-within:ring-3 focus-within:ring-white-50/70 hover:shadow-md">
          {icon ? (
            <Icon
              icon={icon}
              size={18}
              className="pointer-events-none absolute left-4 text-primary"
            />
          ) : null}
          <select
            id={selectId}
            className={cn(
              'h-full w-full min-w-0 cursor-pointer appearance-none truncate rounded-full bg-transparent pr-10 text-body-xxs font-medium text-primary outline-none',
              icon ? 'pl-10' : 'pl-4',
            )}
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
            className="pointer-events-none absolute right-3 text-primary"
          />
        </div>
      </div>
    );
  }

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
