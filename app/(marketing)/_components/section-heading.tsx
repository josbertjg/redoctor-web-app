import type { ReactNode } from 'react';

import { cn } from '@/app/lib/utils';

import { Icon, type IconComponent } from '@/app/ui/icons';

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
      {chip ? (
        <span className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-3 py-1.5 text-label-lg text-primary shadow-sm">
          <Icon icon={chip.icon} size={16} />
          {chip.label}
        </span>
      ) : null}
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
