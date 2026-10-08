import type { ReactNode } from 'react';

import { cn } from '@/app/lib/utils';

import type { IconComponent } from '@/app/ui/icons';

import { LabelChip } from './label-chip';

type SectionHeadingProps = {
  /** The id the section's `aria-labelledby` points at. */
  id: string;
  chip?: { icon: IconComponent; label: string };
  title: ReactNode;
  description?: string;
  /** On the blue page the text is white; inside a white container, blue. */
  tone: 'on-blue' | 'on-white';
  align?: 'center' | 'start';
  className?: string;
};

/* A section's opening: an optional chip, the title and a line of support. */
export function SectionHeading({
  id,
  chip,
  title,
  description,
  tone,
  align = 'center',
  className,
}: SectionHeadingProps) {
  const onBlue = tone === 'on-blue';

  return (
    <div
      className={cn(
        'flex flex-col gap-4',
        align === 'center' ? 'items-center text-center' : 'items-start',
        className,
      )}
    >
      {chip ? <LabelChip icon={chip.icon}>{chip.label}</LabelChip> : null}
      <h2
        id={id}
        className={cn(
          'text-headline-md font-bold sm:text-display-sm lg:text-title-xxxl',
          onBlue ? 'text-pure-white' : 'text-primary',
        )}
      >
        {title}
      </h2>
      {description ? (
        <p
          className={cn(
            'text-body-lg font-medium sm:text-subtitle-m',
            onBlue ? 'text-pure-white' : 'text-pure-black',
          )}
        >
          {description}
        </p>
      ) : null}
    </div>
  );
}
