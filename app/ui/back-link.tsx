import type { Route } from 'next';

import Link from 'next/link';

import ArrowBack from '@material-symbols/svg-400/rounded/arrow_back.svg?svgr';

import { Icon } from '@/app/ui/icons';

/** The way up to the page this one belongs to, named after it («Mi suscripción», «Recibos»). */
export function BackLink({ href, label }: { href: Route; label: string }) {
  return (
    <Link
      href={href}
      className="inline-flex min-h-touch w-fit items-center gap-1 rounded-lg pr-2 text-label-lg text-primary outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <Icon icon={ArrowBack} size={20} />
      {label}
    </Link>
  );
}
