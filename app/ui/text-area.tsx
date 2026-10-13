'use client';

import { useId, useState, type ComponentProps } from 'react';

import { cn } from '@/app/lib/utils';

import { FieldError } from './field-error';

type TextAreaProps = ComponentProps<'textarea'> & {
  label: string;
  /** The error under the field (AGENTS.md §8.2: animated, kept while it leaves). */
  error?: string | undefined;
  /** Shows how much of `maxLength` is used («120/1000»); nothing without a limit. */
  showCount?: boolean;
  className?: string;
};

/*
 * The app's multiline field (a review's comment): TextField's look — the
 * label above, a white box with the `md` radius and the `sm` shadow, the
 * error line under it — grown to several lines, with the count of
 * characters when there is a limit. The text is 16 px so iOS does not zoom
 * in on focus. Works with react-hook-form's `register`.
 */
export function TextArea({
  label,
  error,
  showCount = false,
  maxLength,
  rows = 4,
  className,
  id,
  value,
  defaultValue,
  onChange,
  ...props
}: TextAreaProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const errorId = `${inputId}-error`;
  const countId = `${inputId}-count`;
  const invalid = error !== undefined;
  const counting = showCount && maxLength !== undefined;
  const [typed, setTyped] = useState(
    () => String(value ?? defaultValue ?? '').length,
  );
  const length = value === undefined ? typed : String(value).length;
  const describedBy =
    [invalid ? errorId : null, counting ? countId : null]
      .filter((part) => part !== null)
      .join(' ') || undefined;

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <label
        htmlFor={inputId}
        className="text-body-xxs font-medium text-text-primary"
      >
        {label}
      </label>
      <div
        data-invalid={invalid || undefined}
        className="flex overflow-hidden rounded-md border border-transparent bg-pure-white shadow-sm transition-[border-color,box-shadow] duration-fast ease-house focus-within:border-primary focus-within:ring-3 focus-within:ring-ring/30 data-invalid:border-error"
      >
        <textarea
          id={inputId}
          rows={rows}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          className="min-w-0 flex-1 resize-y bg-transparent px-3 py-2 text-body-xs text-text-primary outline-none placeholder:text-grey-400"
          {...(maxLength === undefined ? {} : { maxLength })}
          {...(value === undefined ? {} : { value })}
          {...(defaultValue === undefined ? {} : { defaultValue })}
          onChange={(event) => {
            setTyped(event.target.value.length);
            onChange?.(event);
          }}
          {...props}
        />
      </div>
      <div className="flex items-start justify-between gap-3">
        <FieldError id={errorId} message={error} className="flex-1" />
        {counting ? (
          <p
            id={countId}
            className="text-body-sm text-text-secondary tabular-nums"
          >
            {length}/{maxLength}
          </p>
        ) : null}
      </div>
    </div>
  );
}
