'use client';

import { useId, useState, type ComponentProps, type ReactNode } from 'react';

import StarFill from '@material-symbols/svg-400/rounded/star-fill.svg?svgr';
import Star from '@material-symbols/svg-400/rounded/star.svg?svgr';

import { cn } from '@/app/lib/utils';

import { FieldError } from './field-error';
import { Icon } from './icons';

const stars = [1, 2, 3, 4, 5] as const;

type StarsInputProps = {
  legend: ReactNode;
  /** What every radio of the group takes, like react-hook-form's `register(name)`. */
  inputProps: Omit<ComponentProps<'input'>, 'type' | 'value'>;
  /** The accessible name of each star: «3 estrellas». */
  starLabel: (stars: number) => string;
  error?: string | undefined;
  className?: string;
};

/*
 * One to five stars to rate a consultation (the app's StarsRatingInput): a
 * native radio group, so forms and assistive technology get it for free.
 * The stars up to the chosen one fill in the stars' colour, a pointer
 * previews its choice, and nothing is chosen until the person chooses.
 * The group carries the error (`aria-describedby`): a radio cannot be
 * marked invalid on its own. `StarsRating` is the read-only sibling.
 */
export function StarsInput({
  legend,
  inputProps,
  starLabel,
  error,
  className,
}: StarsInputProps) {
  const errorId = useId();
  const [chosen, setChosen] = useState(0);
  const [previewed, setPreviewed] = useState(0);
  const lit = previewed || chosen;

  return (
    <fieldset
      aria-describedby={error ? errorId : undefined}
      className={cn('flex flex-col gap-2', className)}
    >
      <legend className="mb-2 text-body-xxs font-medium text-text-primary">
        {legend}
      </legend>
      <div
        className="flex"
        onPointerLeave={() => {
          setPreviewed(0);
        }}
      >
        {stars.map((star) => (
          <label
            key={star}
            className="flex size-touch cursor-pointer items-center justify-center rounded-full has-focus-visible:ring-3 has-focus-visible:ring-ring/50"
            onPointerEnter={() => {
              setPreviewed(star);
            }}
          >
            <input
              type="radio"
              value={star}
              className="sr-only"
              {...inputProps}
              onChange={(event) => {
                setChosen(star);
                inputProps.onChange?.(event);
              }}
            />
            <span className="sr-only">{starLabel(star)}</span>
            <Icon
              icon={star <= lit ? StarFill : Star}
              className={cn(
                'size-8 transition-[color,transform] duration-fast ease-house',
                star <= lit ? 'text-warning-500' : 'text-grey-300',
                star <= previewed && 'scale-110',
              )}
            />
          </label>
        ))}
      </div>
      <FieldError id={errorId} message={error} />
    </fieldset>
  );
}
