'use client';

import { useId, type ComponentProps, type ReactNode } from 'react';

import { cn } from '@/app/lib/utils';

import { FieldError } from './field-error';

type TextFieldProps = Omit<ComponentProps<'input'>, 'prefix'> & {
  label: string;
  /** The error under the field (AGENTS.md §8.2: animated, kept while it leaves). */
  error?: string | undefined;
  /**
   * Inside the box, before the text: a fixed prefix (`+58`) or a control of
   * its own (the document type), which brings its own accessible name.
   */
  leading?: ReactNode;
  className?: string;
};

/*
 * The app's TextField: the label above, a white box 40 px tall with the
 * `md` radius and the `sm` shadow, the error line under it. The text is
 * 16 px so iOS does not zoom in on focus. Works with react-hook-form's
 * `register` (the ref reaches the input).
 */
export function TextField({
  label,
  error,
  leading,
  className,
  id,
  ...props
}: TextFieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const errorId = `${inputId}-error`;
  const invalid = error !== undefined;

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
        className="flex h-control items-center overflow-hidden rounded-md border border-transparent bg-pure-white shadow-sm transition-[border-color,box-shadow] duration-fast ease-house focus-within:border-primary focus-within:ring-3 focus-within:ring-ring/30 data-invalid:border-error"
      >
        {leading}
        <input
          id={inputId}
          aria-invalid={invalid || undefined}
          aria-describedby={invalid ? errorId : undefined}
          className="h-full min-w-0 flex-1 bg-transparent px-3 text-body-xs text-text-primary outline-none placeholder:text-grey-400"
          {...props}
        />
      </div>
      <FieldError id={errorId} message={error} />
    </div>
  );
}
