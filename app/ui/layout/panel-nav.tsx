'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import CalendarMonth from '@material-symbols/svg-400/rounded/calendar_month.svg?svgr';
import Home from '@material-symbols/svg-400/rounded/home.svg?svgr';
import Monitoring from '@material-symbols/svg-400/rounded/monitoring.svg?svgr';
import WorkspacePremium from '@material-symbols/svg-400/rounded/workspace_premium.svg?svgr';
import { useTranslations } from 'next-intl';

import { routes } from '@/app/lib/routes';
import { cn } from '@/app/lib/utils';

import { Icon, type IconComponent } from '@/app/ui/icons';

import { useSession } from '@/app/hooks/use-session';

type Section = {
  key: 'home' | 'appointments' | 'reports' | 'subscription';
  href: string;
  icon: IconComponent;
  /** Whether the page on screen belongs to the section. */
  isCurrent: (pathname: string) => boolean;
};

const sections: readonly Section[] = [
  {
    key: 'home',
    href: routes.specialistHome(),
    icon: Home,
    isCurrent: (pathname) => pathname === routes.specialistHome(),
  },
  {
    key: 'appointments',
    href: routes.agenda(),
    icon: CalendarMonth,
    isCurrent: (pathname) =>
      pathname.startsWith(routes.agenda()) ||
      pathname.startsWith(routes.specialistAppointments()),
  },
  {
    key: 'reports',
    href: routes.reports(),
    icon: Monitoring,
    isCurrent: (pathname) => pathname.startsWith(routes.reports()),
  },
  {
    key: 'subscription',
    href: routes.subscription(),
    icon: WorkspacePremium,
    // The payment belongs to it, though its path is out of `/panel/`.
    isCurrent: (pathname) =>
      pathname.startsWith(routes.subscription()) ||
      pathname === routes.subscriptionPay(),
  },
];

/*
 * The panel's sections, as the app's tabs for a specialist (Inicio, Citas,
 * Estadísticas; the subscription where the app has the profile, which is
 * still edited there). The section on screen is marked for every reader
 * (`aria-current`). An admin's account without the specialist facet has no
 * agenda, statistics or plan of its own: its panel is the one page.
 */
export function PanelNav({ className }: { className?: string }) {
  const t = useTranslations('panel.nav');
  const pathname = usePathname();
  const { account } = useSession();
  if (account !== null && !account.specialist.exists) return null;

  return (
    <nav
      aria-label={t('label')}
      className={cn(
        'mx-auto w-full max-w-content px-gutter print:hidden',
        className,
      )}
    >
      {/* Three layers for the page transitions (AGENTS.md §8, rule 13): the
          white surface, the mark of the section on screen — it slides to
          the next section, even into another layout's copy of this nav —,
          and the sections above it, so the mark never covers a name. */}
      <div className="rounded-2xl bg-pure-white p-1 shadow-xs vt-panel-nav-surface">
        <ul className="grid grid-cols-4 gap-1 vt-panel-nav">
          {sections.map((section) => {
            const current = section.isCurrent(pathname);
            return (
              <li key={section.key} className="relative">
                {current ? (
                  <span
                    aria-hidden="true"
                    className="absolute inset-0 rounded-xl bg-info-light vt-panel-nav-pill"
                  />
                ) : null}
                {/* As a UrlObject: the sections' paths are strings from routes.ts. */}
                <Link
                  href={{ pathname: section.href }}
                  aria-current={current ? 'page' : undefined}
                  className={cn(
                    'relative flex min-h-touch flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1.5 text-label-sm transition-colors duration-fast ease-house outline-none focus-visible:ring-3 focus-visible:ring-ring/50 sm:flex-row sm:gap-2 sm:text-label-lg',
                    current
                      ? 'text-primary'
                      : 'text-text-secondary hover:bg-surface-variant hover:text-text-primary',
                  )}
                >
                  <Icon icon={section.icon} size={20} className="shrink-0" />
                  <span className="truncate">{t(section.key)}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
