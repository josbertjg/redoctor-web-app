import { useId, type ReactNode } from 'react';

import { cn } from '@/app/lib/utils';

import { Icon, type IconComponent } from '@/app/ui/icons';

/*
 * A section of «Mi perfil», as the app's: its title, a line under it when
 * the section has one (how many offices the plan allows), and what it
 * holds.
 */
export function ProfileBlock({
  title,
  subtitle,
  children,
  className,
}: {
  title: string;
  subtitle?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const headingId = useId();

  return (
    <section
      aria-labelledby={headingId}
      className={cn(
        'flex animate-fade-up flex-col gap-4 rounded-2xl bg-pure-white p-5 shadow-md',
        className,
      )}
    >
      <div className="flex flex-col gap-0.5">
        <h2 id={headingId} className="text-title-md text-text-primary">
          {title}
        </h2>
        {subtitle ? (
          <p className="animate-fade-in text-body-sm text-text-secondary">
            {subtitle}
          </p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

/**
 * A section the specialist has not filled yet, in the app's words for it
 * («Añade un consultorio»): an empty slot, since adding happens in the app.
 */
export function ProfileBlockEmpty({
  icon,
  children,
}: {
  icon: IconComponent;
  children: ReactNode;
}) {
  return (
    <p className="flex animate-fade-in items-center gap-3 rounded-xl border border-dashed border-border px-4 py-3.5 text-body-md text-text-secondary">
      <Icon icon={icon} size={20} className="shrink-0 text-primary" />
      {children}
    </p>
  );
}
