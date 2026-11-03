'use client';

import { useMemo, useRef, useState } from 'react';

import type { Route } from 'next';

import { useRouter, useSearchParams } from 'next/navigation';

import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';

import type { SessionUser } from '@/app/lib/firebase/client';
import { todayInCaracas } from '@/app/lib/format/date-of-birth';
import { specialistAppointmentsQueryOptions } from '@/app/lib/queries/appointments';
import { myOfficesQueryOptions } from '@/app/lib/queries/offices';
import { weekOf } from '@/app/lib/reports/period';
import { toAppointmentSummary } from '@/app/lib/schemas/appointments';

import { useSkeletonHold } from '@/app/ui/motion/skeleton-hold';

import { useFocusHeading } from '@/app/hooks/use-focus-heading';
import { useSession } from '@/app/hooks/use-session';
import { useWideScreen } from '@/app/hooks/use-wide-screen';

import { byStart } from '../agenda-order';
import { AgendaBodySkeleton, AgendaSkeleton } from '../agenda-skeleton';
import { PanelLoadError } from '../panel-load-error';
import {
  agendaAddress,
  agendaHref,
  agendaInPlaceHref,
  type AgendaAddress,
} from './agenda-address';
import { AgendaDayList } from './agenda-day-list';
import { AgendaMonth, AgendaNext } from './agenda-side';
import { AgendaToolbar } from './agenda-toolbar';
import { AgendaWeek } from './agenda-week';
import { AppointmentDialog } from './appointment-dialog';
import { NewAppointmentDialog } from './new-appointment/new-appointment-dialog';

/*
 * «Citas» (`/panel/agenda[/{YYYY-MM-DD}]`), as the designer drew it: the
 * week (`4647:2160`) or the day (`4669:2956`), the bar over them, and «Ver
 * cita» over the agenda (`4669:2206`) with what the app lets a specialist
 * do. The address is the one state: the day, the view, the filters and the
 * open appointment. One read of the week serves the week, the day's list
 * and the strip of days; the month and the next appointment read their own
 * beside the day, from laptops up.
 */
export function AgendaView({ pathDate }: { pathDate: string | null }) {
  const { user } = useSession();
  if (user === null) return <AgendaSkeleton />;
  return <Agenda user={user} pathDate={pathDate} />;
}

function Agenda({
  user,
  pathDate,
}: {
  user: SessionUser;
  pathDate: string | null;
}) {
  const t = useTranslations();
  const router = useRouter();
  const searchParams = useSearchParams();
  // Today and now are fixed once per visit, as the appointment page fixes them.
  const [today] = useState(() => todayInCaracas());
  const [now] = useState(() => new Date());
  const wide = useWideScreen();
  const address = agendaAddress(pathDate, searchParams, wide, today);
  const days = weekOf(address.date);
  const monday = days[0] ?? address.date;
  const sunday = days[6] ?? address.date;
  const week = useQuery(
    specialistAppointmentsQueryOptions(user, {
      from: monday,
      to: sunday,
      status: address.status ?? undefined,
      officeId: address.officeId ?? undefined,
    }),
  );
  const offices = useQuery(myOfficesQueryOptions(user));
  // The skeleton crossfades into what arrives (AGENTS.md §8, rule 13).
  const holding = useSkeletonHold(week.isPending);
  const appointments = useMemo(
    () => (week.data ?? []).map(toAppointmentSummary).sort(byStart),
    [week.data],
  );
  // The title of what is on screen takes the focus when it changes.
  const frame = useFocusHeading(
    address.view === 'week' ? `week:${monday}` : `day:${address.date}`,
  );
  /** «Ver cita» was opened from this page: going back closes it. */
  const openedHere = useRef(false);

  /** A change in place (a filter, «Ver cita»): the path kept, no trip to the server. */
  const write = (change: Partial<AgendaAddress>, how: 'push' | 'replace') => {
    const href = agendaInPlaceHref({ ...address, ...change }, pathDate);
    if (how === 'push') window.history.pushState(null, '', href);
    else window.history.replaceState(null, '', href);
  };
  const openAppointment = (appointmentId: string) => {
    openedHere.current = true;
    write({ appointmentId, newAppointment: false }, 'push');
  };
  const openNew = () => {
    openedHere.current = true;
    write({ newAppointment: true, appointmentId: null }, 'push');
  };
  /** A dialog closes: back when it was opened here, else it leaves the address. */
  const closeDialog = () => {
    if (openedHere.current) {
      openedHere.current = false;
      window.history.back();
    } else {
      write({ appointmentId: null, newAppointment: false }, 'replace');
    }
  };

  return (
    <div ref={frame} className="flex flex-col gap-5 lg:gap-6">
      <h1 className="text-title-xl font-semibold text-pure-white lg:pr-72 lg:text-title-xxxl">
        {t('panel.agenda.title')}
      </h1>
      <AgendaToolbar
        address={address}
        today={today}
        wide={wide}
        offices={offices.data ?? []}
        onFilter={(change) => {
          write({ ...change, appointmentId: null }, 'replace');
        }}
        onNew={openNew}
      />
      {content()}
      <AppointmentDialog
        appointmentId={address.appointmentId}
        user={user}
        today={today}
        now={now}
        listed={week.data ?? []}
        listedAt={week.dataUpdatedAt}
        listReady={!week.isPending}
        onClose={closeDialog}
      />
      <NewAppointmentDialog
        open={address.newAppointment}
        user={user}
        today={today}
        onClose={closeDialog}
        onSeeDay={(date) => {
          openedHere.current = false;
          // In place of the entry that opened it: back does not reopen it.
          router.replace(
            agendaHref(
              {
                ...address,
                date,
                view: 'day',
                appointmentId: null,
                newAppointment: false,
              },
              today,
            ) as Route,
            { scroll: false },
          );
        }}
      />
    </div>
  );

  function content() {
    if (week.isPending || holding) return <AgendaBodySkeleton />;

    if (week.isLoadingError) {
      return (
        <div className="rounded-2xl bg-pure-white p-4 shadow-md sm:p-6">
          <PanelLoadError
            error={week.error}
            title={t('appointments.hub.loadError')}
            description={t('panel.agenda.loadErrorDescription')}
            retrying={week.isFetching}
            onRetry={() => {
              void week.refetch();
            }}
          />
        </div>
      );
    }

    if (address.view === 'week') {
      return (
        <AgendaWeek
          address={address}
          today={today}
          days={days}
          appointments={appointments}
          openAppointment={openAppointment}
        />
      );
    }

    return (
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)] lg:gap-6">
        <AgendaDayList
          address={address}
          today={today}
          days={days}
          appointments={appointments}
          showStrip={!wide}
          openAppointment={openAppointment}
        />
        {wide ? (
          <div className="flex flex-col gap-5 lg:gap-6">
            <AgendaMonth
              user={user}
              date={address.date}
              today={today}
              filters={{ status: address.status, officeId: address.officeId }}
              onSelect={(date) => {
                router.push(
                  agendaHref(
                    { ...address, date, appointmentId: null },
                    today,
                  ) as Route,
                  { scroll: false },
                );
              }}
            />
            <AgendaNext
              user={user}
              today={today}
              now={now}
              officeId={address.officeId}
              openAppointment={openAppointment}
            />
          </div>
        ) : null}
      </div>
    );
  }
}
