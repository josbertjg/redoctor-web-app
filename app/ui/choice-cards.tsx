'use client';

import { useId, type ComponentProps, type ReactNode } from 'react';

import { cn } from '@/app/lib/utils';

import { FieldError } from './field-error';

export type ChoiceOption<Value extends string> = {
  value: Value;
  label: ReactNode;
  description?: ReactNode;
};

type ChoiceCardsProps<Value extends string> = {
  legend: ReactNode;
  options: readonly ChoiceOption<Value>[];
  /** What every radio of the group takes, like react-hook-form's `register(name)`. */
  inputProps: Omit<ComponentProps<'input'>, 'type' | 'value'>;
  error?: string | undefined;
  /** Two short options side by side (Hombre, Mujer); one per row when they explain themselves. */
  columns?: 1 | 2;
  className?: string;
};

/*
 * One choice among a few, drawn as cards that fill with the brand blue: a
 * native radio group, so forms and assistive technology get it for free.
 * Nothing is chosen until the person chooses (the sign-up's sex, the
 * invitation's «¿Para quién es esta cita?»). The group carries the error
 * (`aria-describedby`): a radio cannot be marked invalid on its own.
 */
export function ChoiceCards<Value extends string>({
  legend,
  options,
  inputProps,
  error,
  columns = 2,
  className,
}: ChoiceCardsProps<Value>) {
  const errorId = useId();

  return (
    <fieldset
      aria-describedby={error ? errorId : undefined}
      className={cn('flex flex-col gap-2', className)}
    >
      <legend className="mb-2 text-body-xxs font-medium text-text-primary">
        {legend}
      </legend>
      <div className={cn('grid gap-3', columns === 2 && 'grid-cols-2')}>
        {options.map((option) => (
          <label
            key={option.value}
            className={cn(
              'flex min-h-touch cursor-pointer flex-col justify-center gap-0.5 rounded-md border-2 border-transparent bg-pure-white px-3 py-2 text-body-xs text-text-primary shadow-sm transition-colors duration-fast ease-house',
              'has-checked:border-primary has-checked:bg-blue-50 has-checked:text-primary has-focus-visible:ring-3 has-focus-visible:ring-ring/50',
              columns === 2 ? 'items-center text-center' : 'items-start',
              error && 'border-error',
            )}
          >
            <input
              type="radio"
              value={option.value}
              className="sr-only"
              {...inputProps}
            />
            <span className={cn(option.description && 'font-semibold')}>
              {option.label}
            </span>
            {option.description ? (
              <span className="text-body-xxs text-text-secondary">
                {option.description}
              </span>
            ) : null}
          </label>
        ))}
      </div>
      <FieldError id={errorId} message={error} />
    </fieldset>
  );
}
