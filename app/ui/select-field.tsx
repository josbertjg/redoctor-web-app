'use client';

import { useId, useState, type ComponentProps } from 'react';

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
 * the end. The browser's own select sits invisibly across the whole box:
 * its native picker, keyboard and screen-reader behaviour on every phone
 * with 16 px text so iOS never zooms on focus, while the flex-centered
 * label and chevron below never show a second native browser arrow.
 */
export function SelectField({
  label,
  options,
  variant = 'field',
  icon,
  className,
  id,
  value,
  defaultValue,
  onChange,
  disabled,
  ...props
}: SelectFieldProps) {
  const generatedId = useId();
  const selectId = id ?? generatedId;
  const [uncontrolledValue, setUncontrolledValue] = useState(() =>
    defaultValue !== undefined
      ? String(defaultValue)
      : (options[0]?.value ?? ''),
  );
  const currentValue = value !== undefined ? String(value) : uncontrolledValue;
  const selectedLabel =
    options.find((option) => option.value === currentValue)?.label ??
    options[0]?.label ??
    '';

  const nativeSelect = (
    <select
      id={selectId}
      value={value}
      defaultValue={defaultValue}
      disabled={disabled}
      onChange={(event) => {
        if (value === undefined) setUncontrolledValue(event.target.value);
        onChange?.(event);
      }}
      className={cn(
        'absolute inset-0 size-full appearance-none bg-transparent text-body-xs opacity-0 outline-none',
        disabled ? 'cursor-not-allowed' : 'cursor-pointer',
      )}
      {...props}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );

  if (variant === 'pill') {
    return (
      <div className={cn('flex', className)}>
        <label htmlFor={selectId} className="sr-only">
          {label}
        </label>
        <div className="relative flex h-touch min-w-0 flex-1 items-center gap-2 rounded-full bg-pure-white pr-3 pl-4 shadow-sm transition-shadow duration-fast ease-house focus-within:ring-3 focus-within:ring-white-50/70 hover:shadow-md">
          {icon ? (
            <Icon
              icon={icon}
              size={18}
              className="pointer-events-none shrink-0 text-primary"
            />
          ) : null}
          <span
            data-slot="select-value"
            aria-hidden="true"
            className="pointer-events-none min-w-0 flex-1 truncate text-body-xxs font-medium text-primary"
          >
            {selectedLabel}
          </span>
          <Icon
            icon={KeyboardArrowDown}
            size={20}
            className="pointer-events-none shrink-0 text-primary"
          />
          {nativeSelect}
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
      <div className="relative flex h-control items-center gap-2 rounded-md border border-transparent bg-pure-white px-3 shadow-sm transition-[border-color,box-shadow] duration-fast ease-house focus-within:border-primary focus-within:ring-3 focus-within:ring-ring/30">
        <span
          data-slot="select-value"
          aria-hidden="true"
          className="pointer-events-none min-w-0 flex-1 truncate text-body-xs text-text-primary"
        >
          {selectedLabel}
        </span>
        <Icon
          icon={KeyboardArrowDown}
          size={20}
          className="pointer-events-none shrink-0 text-text-secondary"
        />
        {nativeSelect}
      </div>
    </div>
  );
}
