import { useId, type ReactNode } from 'react';

import { cn } from '@/app/lib/utils';

type ProfileSectionProps = {
  title: string;
  /** Anchor for in-page links (the header's offices line). */
  id?: string;
  children: ReactNode;
  className?: string;
};

/* A titled block of the profile, as the app's sections (subtitle-s, semibold). */
export function ProfileSection({
  title,
  id,
  children,
  className,
}: ProfileSectionProps) {
  const headingId = useId();

  return (
    <section
      id={id}
      aria-labelledby={headingId}
      className={cn('flex scroll-mt-4 flex-col gap-2', className)}
    >
      <h2
        id={headingId}
        className="text-subtitle-s font-semibold text-text-primary"
      >
        {title}
      </h2>
      {children}
    </section>
  );
}

/** What a section says when the specialist left it empty. */
export function ProfilePlaceholder({ children }: { children: ReactNode }) {
  return <p className="text-body-xxs text-text-secondary">{children}</p>;
}
