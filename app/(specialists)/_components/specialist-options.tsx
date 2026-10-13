import Link from 'next/link';

import CalendarMonth from '@material-symbols/svg-400/rounded/calendar_month.svg?svgr';
import ChevronRight from '@material-symbols/svg-400/rounded/chevron_right.svg?svgr';
import IdCard from '@material-symbols/svg-400/rounded/id_card.svg?svgr';
import Stethoscope from '@material-symbols/svg-400/rounded/stethoscope.svg?svgr';
import WorkspacePremium from '@material-symbols/svg-400/rounded/workspace_premium.svg?svgr';
import { getTranslations } from 'next-intl/server';

import { routes } from '@/app/lib/routes';
import { cn } from '@/app/lib/utils';

import { Icon, type IconComponent } from '@/app/ui/icons';

/*
 * The app's options, one card each. A card leads to the option's bridge
 * (M11), which opens the same path in the app on a phone and says where it
 * opens on a computer: one place knows how to open the app. The
 * subscription is the exception: it is paid on the web (M13), so its card
 * leads to `/pay`; the bridge `/panel/subscription` stays for the app and
 * the emails.
 */
const options = [
  { key: 'agenda', icon: CalendarMonth, href: routes.agendaBridge() },
  { key: 'specialties', icon: Stethoscope, href: routes.specialtiesBridge() },
  { key: 'profile', icon: IdCard, href: routes.profileBridge() },
  { key: 'subscription', icon: WorkspacePremium, href: routes.payment() },
] as const satisfies readonly {
  key: string;
  icon: IconComponent;
  href: string;
}[];

export async function SpecialistOptions({ className }: { className?: string }) {
  const t = await getTranslations('specialistHome.options');

  return (
    <ul className={cn('grid gap-3 sm:grid-cols-2', className)}>
      {options.map((option) => (
        <li key={option.key}>
          {/* As a UrlObject: typed routes cannot name `/panel/agenda` (an
              optional catch-all) in a union; the paths still come from
              routes.ts. */}
          <Link
            href={{ pathname: option.href }}
            className="group flex min-h-20 items-center gap-4 rounded-2xl bg-pure-white p-4 shadow-md transition-[translate,box-shadow] duration-base ease-house outline-none hover:-translate-y-0.5 hover:shadow-lg focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-info-light text-primary transition-[scale] duration-base ease-house group-hover:scale-110">
              <Icon icon={option.icon} size={24} />
            </span>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="text-title-md text-text-primary">
                {t(`${option.key}.title`)}
              </span>
              <span className="text-body-sm text-text-secondary">
                {t(`${option.key}.description`)}
              </span>
            </span>
            <Icon
              icon={ChevronRight}
              size={24}
              className="shrink-0 text-grey-400 transition-[translate] duration-base ease-house group-hover:translate-x-0.5"
            />
          </Link>
        </li>
      ))}
    </ul>
  );
}
