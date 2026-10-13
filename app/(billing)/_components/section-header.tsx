import type { Route } from 'next';

import Link from 'next/link';

import { cn } from '@/app/lib/utils';

import { Icon, type IconComponent } from '@/app/ui/icons';

type SectionHeaderProps = {
  id: string;
  icon: IconComponent;
  title: string;
  /** The whole list, when there is more than the section shows: it fades in instead of jumping in. */
  more?: { href: Route; label: string; shown: boolean };
};

/*
 * The head of a section of «Mi suscripción» (the app's SectionLinkHeader):
 * its icon, its title and, when there is more to see, the way to the whole
 * list. The link is always there and the fade decides whether it shows,
 * so the head measures the same with it and without it.
 */
export function SectionHeader({ id, icon, title, more }: SectionHeaderProps) {
  return (
    <div className="flex min-h-touch items-center gap-2.5">
      <Icon icon={icon} size={24} className="shrink-0 text-primary" />
      <h2 id={id} className="flex-1 text-title-md text-text-primary">
        {title}
      </h2>
      {more ? (
        <Link
          href={more.href}
          aria-hidden={more.shown ? undefined : true}
          tabIndex={more.shown ? undefined : -1}
          inert={!more.shown}
          className={cn(
            'inline-flex min-h-touch items-center rounded-lg px-1.5 text-label-lg text-primary transition-opacity duration-base ease-house outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50',
            more.shown ? 'opacity-100' : 'pointer-events-none opacity-0',
          )}
        >
          {more.label}
        </Link>
      ) : null}
    </div>
  );
}
