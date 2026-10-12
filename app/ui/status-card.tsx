import { useId, type ReactNode } from 'react';

import { cn } from '@/app/lib/utils';

import { Icon, type IconComponent } from './icons';

type StatusCardProps = {
  icon: IconComponent;
  title: string;
  description?: ReactNode;
  /** Actions or a form under the words (sign-in buttons, «Ver mi cita»…). */
  children?: ReactNode;
  className?: string;
};

/*
 * Where a flow stands, in a card: an icon in a tinted circle, a title and a
 * line of help, with room for what can be done next. The invitation (M4)
 * and the appointment (M5) speak through it; a whole-page state (404,
 * error) is an EmptyState instead.
 */
export function StatusCard({
  icon,
  title,
  description,
  children,
  className,
}: StatusCardProps) {
  const headingId = useId();
  return (
    <section
      aria-labelledby={headingId}
      className={cn(
        'flex animate-fade-up flex-col gap-5 rounded-2xl bg-pure-white p-5 shadow-md',
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-info-light text-primary">
          <Icon icon={icon} size={24} />
        </span>
        <div className="flex flex-col gap-1">
          <h2 id={headingId} className="text-title-md text-text-primary">
            {title}
          </h2>
          {description ? (
            <p className="text-body-md text-text-secondary">{description}</p>
          ) : null}
        </div>
      </div>
      {children}
    </section>
  );
}
