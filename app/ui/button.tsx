'use client';

import type { ComponentProps } from 'react';

import ProgressActivity from '@material-symbols/svg-400/rounded/progress_activity.svg?svgr';
import { cva, type VariantProps } from 'class-variance-authority';
import { Slot } from 'radix-ui';

import { cn } from '@/app/lib/utils';

import { Icon } from '@/app/ui/icons';

const buttonVariants = cva(
  [
    'relative inline-flex shrink-0 items-center justify-center gap-2 rounded-full border border-transparent',
    'text-label-lg whitespace-nowrap select-none',
    'transition-[background-color,border-color,color,box-shadow,transform] duration-fast ease-house',
    'outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
    'active:translate-y-px',
    '[&_svg]:pointer-events-none [&_svg]:shrink-0',
  ],
  {
    variants: {
      variant: {
        primary:
          'bg-primary text-on-primary shadow-xs hover:bg-blue-600 active:bg-blue-700',
        secondary:
          'bg-secondary text-on-secondary shadow-xs hover:bg-green-600 active:bg-green-700',
        white:
          'border-border bg-white-50 text-primary shadow-sm hover:bg-white-200 active:bg-white-300',
        error:
          'bg-error text-on-primary shadow-xs hover:bg-error-600 active:bg-error-700',
      },
      size: {
        small: 'h-control px-4',
        large: 'h-control-lg px-6',
      },
      block: {
        true: 'w-full',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'large',
      block: false,
    },
  },
);

type ButtonProps = ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    /** Renders the child element (a Link, an anchor) with the button's look. */
    asChild?: boolean;
    /**
     * Busy state (AGENTS.md §8.3): the button keeps its look and stays
     * focusable, shows a spinner inside and drops clicks until it ends.
     */
    loading?: boolean;
  };

export function Button({
  className,
  variant = 'primary',
  size = 'large',
  block = false,
  asChild = false,
  loading = false,
  type = 'button',
  onClick,
  children,
  ...props
}: ButtonProps) {
  const Component = asChild ? Slot.Root : 'button';

  const handleClick: NonNullable<ButtonProps['onClick']> = (event) => {
    if (loading) {
      event.preventDefault();
      return;
    }
    onClick?.(event);
  };

  return (
    <Component
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, block }), className)}
      onClick={handleClick}
      {...(asChild ? {} : { type })}
      {...(loading ? { 'aria-busy': true, 'data-loading': '' } : {})}
      {...props}
    >
      {asChild ? (
        children
      ) : (
        <>
          <span
            className={cn(
              'inline-flex items-center gap-2 transition-opacity duration-fast ease-house',
              loading && 'opacity-0',
            )}
          >
            {children}
          </span>
          <span
            aria-hidden="true"
            className={cn(
              'absolute inset-0 flex items-center justify-center transition-opacity duration-fast ease-house',
              loading ? 'opacity-100' : 'opacity-0',
            )}
          >
            <Icon
              icon={ProgressActivity}
              size={20}
              className="animate-spin motion-reduce:animate-none"
            />
          </span>
        </>
      )}
    </Component>
  );
}

export { buttonVariants };
