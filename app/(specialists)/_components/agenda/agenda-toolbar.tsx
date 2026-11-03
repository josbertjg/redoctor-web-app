'use client';

import type { Route } from 'next';

import Link from 'next/link';

import Add from '@material-symbols/svg-400/rounded/add.svg?svgr';
import FilterAlt from '@material-symbols/svg-400/rounded/filter_alt.svg?svgr';
import History from '@material-symbols/svg-400/rounded/history.svg?svgr';
import { useTranslations } from 'next-intl';

import { addDays } from '@/app/lib/reports/period';
import { routes } from '@/app/lib/routes';
import {
  appointmentStatuses,
  type AppointmentStatus,
} from '@/app/lib/schemas/appointments';
import { cn } from '@/app/lib/utils';

import { Icon } from '@/app/ui/icons';
import { navBack, navForward } from '@/app/ui/motion/view-transitions';
import { SelectField } from '@/app/ui/select-field';

import {
  agendaHref,
  type AgendaAddress,
  type AgendaView,
} from './agenda-address';

/** A toolbar pill: the frame's 14 px words, a touch target tall. */
export const agendaPillClass =
  'inline-flex min-h-touch items-center gap-2 rounded-lg px-4 text-body-xxs font-medium shadow-md outline-none transition-[background-color,color,translate] duration-fast ease-house focus-visible:ring-3 focus-visible:ring-white-50/70';

type AgendaToolbarProps = {
  address: AgendaAddress;
  today: string;
  /** From laptops up: the day and the week to choose from. */
  wide: boolean;
  offices: readonly { id: string; name: string }[];
  /** A filter changed: the address takes it, in place. */
  onFilter: (change: {
    status?: AppointmentStatus | null;
    officeId?: string | null;
  }) => void;
  /** «+»: «Nueva cita» over the agenda. */
  onNew: () => void;
};

/*
 * The bar over «Citas», as the designer drew it (`4647:2160`): «Hoy» and
 * «Mañana», the status, the office (with two or more) and, from laptops
 * up, the day or the week; then the history. Every choice is in the
 * address, so back, forward and a reload keep it; the days are links, the
 * filters replace the address in place.
 */
export function AgendaToolbar({
  address,
  today,
  wide,
  offices,
  onFilter,
  onNew,
}: AgendaToolbarProps) {
  const t = useTranslations('panel.agenda');
  const tomorrow = addDays(today, 1);

  const dayLink = (date: string, label: string) => {
    const current = address.date === date;
    return (
      <Link
        href={
          agendaHref({ ...address, date, appointmentId: null }, today) as Route
        }
        aria-current={current ? 'date' : undefined}
        // The days go sideways, like turning a calendar's page (§8.13).
        transitionTypes={[date < address.date ? navBack : navForward]}
        scroll={false}
        // Dates are many here: each day is read when chosen, never ahead.
        prefetch={false}
        className={cn(
          agendaPillClass,
          current
            ? 'bg-primary text-on-primary'
            : 'bg-pure-white text-text-primary hover:-translate-y-0.5',
        )}
      >
        {label}
      </Link>
    );
  };

  return (
    <nav
      aria-label={t('toolbarLabel')}
      className="flex flex-wrap items-center gap-2.5"
    >
      {dayLink(today, t('today'))}
      {dayLink(tomorrow, t('tomorrow'))}
      <SelectField
        variant="pill"
        label={t('statusLabel')}
        value={address.status ?? ''}
        onChange={(event) => {
          const { value } = event.target;
          onFilter({
            status: (appointmentStatuses as readonly string[]).includes(value)
              ? (value as AppointmentStatus)
              : null,
          });
        }}
        options={[
          { value: '', label: t('statusFilter.all') },
          ...appointmentStatuses.map((status) => ({
            value: status,
            label: t(`statusFilter.${status}`),
          })),
        ]}
        className="w-44"
      />
      {offices.length >= 2 ? (
        <SelectField
          variant="pill"
          icon={FilterAlt}
          label={t('officeLabel')}
          value={address.officeId ?? ''}
          onChange={(event) => {
            onFilter({ officeId: event.target.value || null });
          }}
          options={[
            { value: '', label: t('allOffices') },
            ...offices.map((office) => ({
              value: office.id,
              label: office.name,
            })),
          ]}
          className="w-60 max-w-full"
        />
      ) : null}
      <div className="flex items-center gap-2.5 sm:ml-auto">
        {wide ? <ViewSwitch address={address} today={today} /> : null}
        <Link
          href={routes.specialistAppointments()}
          className={cn(
            agendaPillClass,
            'bg-pure-white text-primary hover:-translate-y-0.5',
          )}
        >
          <Icon icon={History} size={18} />
          {t('history')}
        </Link>
        <button
          type="button"
          aria-label={t('newAppointment')}
          onClick={onNew}
          className="flex size-touch shrink-0 items-center justify-center rounded-full bg-pure-white text-primary shadow-md transition-[translate] duration-fast ease-house outline-none hover:-translate-y-0.5 focus-visible:ring-3 focus-visible:ring-white-50/70"
        >
          <Icon icon={Add} size={24} />
        </button>
      </div>
    </nav>
  );
}

/** The day or the week, the one on screen marked for every reader. */
function ViewSwitch({
  address,
  today,
}: {
  address: AgendaAddress;
  today: string;
}) {
  const t = useTranslations('panel.agenda');
  const option = (view: AgendaView, label: string) => {
    const current = address.view === view;
    return (
      <Link
        href={
          agendaHref({ ...address, view, appointmentId: null }, today) as Route
        }
        aria-current={current ? 'true' : undefined}
        scroll={false}
        prefetch={false}
        className={cn(
          'flex min-h-touch items-center px-4 text-body-xxs transition-colors duration-fast ease-house outline-none focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset',
          current
            ? 'bg-blue-50 font-semibold text-primary'
            : 'font-medium text-text-primary hover:text-primary',
        )}
      >
        {label}
      </Link>
    );
  };
  return (
    <div
      role="group"
      aria-label={t('viewLabel')}
      className="flex overflow-hidden rounded-lg bg-pure-white shadow-md"
    >
      {option('day', t('dayView'))}
      {option('week', t('weekView'))}
    </div>
  );
}
