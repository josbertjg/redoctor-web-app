import { useId, type ReactNode } from 'react';

import { cn } from '@/app/lib/utils';

import { Icon, type IconComponent } from '@/app/ui/icons';

type EmptyStateProps = {
  title: string;
  description?: string;
  /** A Material icon shown in a tinted circle, unless an illustration is given. */
  icon?: IconComponent;
  illustration?: ReactNode;
  /** One or two buttons; the primary one first. */
  action?: ReactNode;
  tone?: 'neutral' | 'error';
  /**
   * 1 when the state is the whole page (404, page error): its title is the
   * page heading. 3 inside a section that already has its h2.
   */
  headingLevel?: 1 | 2 | 3;
  className?: string;
};

/*
 * The empty, "not found" and error states of a page or a section: an
 * illustration or icon, a title, a line of help and the way out. It enters
 * with a fade so it never pops in (AGENTS.md §8.2, §8.9).
 */
export function EmptyState({
  title,
  description,
  icon,
  illustration,
  action,
  tone = 'neutral',
  headingLevel = 2,
  className,
}: EmptyStateProps) {
  const headingId = useId();
  const Heading = headingLevel === 1 ? 'h1' : headingLevel === 2 ? 'h2' : 'h3';

  return (
    <section
      aria-labelledby={headingId}
      data-tone={tone}
      className={cn(
        'mx-auto flex w-full max-w-content animate-fade-up flex-col items-center gap-4 px-gutter py-10 text-center',
        className,
      )}
    >
      {illustration ??
        (icon ? (
          <span
            className={cn(
              'flex size-16 items-center justify-center rounded-full',
              tone === 'error'
                ? 'bg-error-light text-error-700'
                : 'bg-info-light text-primary',
            )}
          >
            <Icon icon={icon} className="size-8" />
          </span>
        ) : null)}
      <div className="flex flex-col gap-2">
        <Heading
          id={headingId}
          className={cn(
            'text-text-primary',
            headingLevel === 1
              ? 'text-headline-md'
              : headingLevel === 2
                ? 'text-title-lg'
                : 'text-title-md',
          )}
        >
          {title}
        </Heading>
        {description ? (
          <p className="text-body-md text-text-secondary">{description}</p>
        ) : null}
      </div>
      {action ? (
        <div className="mt-2 flex w-full flex-col items-stretch gap-2 sm:w-auto sm:flex-row sm:justify-center">
          {action}
        </div>
      ) : null}
    </section>
  );
}
