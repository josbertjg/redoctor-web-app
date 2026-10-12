'use client';

import { useId, type ComponentProps, type ReactNode } from 'react';

import Check from '@material-symbols/svg-400/rounded/check.svg?svgr';

import { cn } from '@/app/lib/utils';

import { FieldError } from './field-error';
import { Icon } from './icons';

type CheckboxProps = Omit<ComponentProps<'input'>, 'type'> & {
  label: ReactNode;
  error?: string | undefined;
  className?: string;
};

/*
 * A native checkbox drawn to the tokens: a 20 px box that fills with the
 * brand blue, its label beside it, the whole row a 44 px target. Native, so
 * forms and assistive technology get it for free; works with
 * react-hook-form's `register`.
 */
export function Checkbox({
  label,
  error,
  className,
  id,
  ...props
}: CheckboxProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const errorId = `${inputId}-error`;
  const invalid = error !== undefined;

  return (
    <div className={cn('flex flex-col', className)}>
      <label
        htmlFor={inputId}
        className="flex min-h-touch cursor-pointer items-start gap-3 py-2.5"
      >
        <span className="relative mt-px flex size-5 shrink-0">
          <input
            id={inputId}
            type="checkbox"
            aria-invalid={invalid || undefined}
            aria-describedby={invalid ? errorId : undefined}
            className="peer size-5 cursor-pointer appearance-none rounded-xs border-2 border-grey-500 bg-pure-white transition-colors duration-fast ease-house outline-none checked:border-primary checked:bg-primary focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-error"
            {...props}
          />
          <Icon
            icon={Check}
            size={16}
            className="pointer-events-none absolute inset-0.5 text-pure-white opacity-0 transition-opacity duration-fast ease-house peer-checked:opacity-100"
          />
        </span>
        <span className="text-body-sm text-text-primary">{label}</span>
      </label>
      <FieldError id={errorId} message={error} className="pl-8" />
    </div>
  );
}
