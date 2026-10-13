import type { Route } from 'next';

import Link from 'next/link';

import ChevronRight from '@material-symbols/svg-400/rounded/chevron_right.svg?svgr';

import { Icon, type IconComponent } from '@/app/ui/icons';

const cardClass =
  'group flex min-h-20 items-center gap-4 rounded-2xl bg-pure-white p-4 shadow-md transition-[translate,box-shadow] duration-base ease-house outline-none hover:-translate-y-0.5 hover:shadow-lg focus-visible:ring-3 focus-visible:ring-ring/50';

/*
 * A page one tap away, as a card: an icon in a tinted circle, what it is
 * and a line on what it holds, and the chevron that says it goes
 * somewhere (the app's option tiles). On the panel's home and on «Mi
 * suscripción».
 */
export function LinkCard({
  href,
  icon,
  title,
  description,
}: {
  href: Route;
  icon: IconComponent;
  title: string;
  description: string;
}) {
  return (
    <Link href={href} className={cardClass}>
      <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-info-light text-primary transition-[scale] duration-base ease-house group-hover:scale-110">
        <Icon icon={icon} size={24} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-title-md text-text-primary">{title}</span>
        <span className="text-body-sm text-text-secondary">{description}</span>
      </span>
      <Icon
        icon={ChevronRight}
        size={24}
        className="shrink-0 text-grey-400 transition-[translate] duration-base ease-house group-hover:translate-x-0.5"
      />
    </Link>
  );
}
