'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';

import type { Route } from 'next';

import { useRouter, useSearchParams } from 'next/navigation';

import Close from '@material-symbols/svg-400/rounded/close.svg?svgr';
import History from '@material-symbols/svg-400/rounded/history.svg?svgr';
import Search from '@material-symbols/svg-400/rounded/search.svg?svgr';
import SearchOff from '@material-symbols/svg-400/rounded/search_off.svg?svgr';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';

import type { SessionUser } from '@/app/lib/firebase/client';
import { formatAppointmentDay } from '@/app/lib/format/appointment-time';
import { specialistAppointmentsQueryOptions } from '@/app/lib/queries/appointments';
import { myOfficesQueryOptions } from '@/app/lib/queries/offices';
import { isCalendarDay } from '@/app/lib/reports/period';
import { routes, searchParameter } from '@/app/lib/routes';
import {
  appointmentStatuses,
  statusChips,
  toAppointmentSummary,
  type AppointmentStatus,
  type AppointmentSummary,
} from '@/app/lib/schemas/appointments';
import { cn } from '@/app/lib/utils';

import { AppointmentCard } from '@/app/ui/appointments/appointment-card';
import { Button } from '@/app/ui/button';
import { EmptyState } from '@/app/ui/empty-state';
import { FieldError } from '@/app/ui/field-error';
import { FilterChips } from '@/app/ui/filter-chips';
import { Icon } from '@/app/ui/icons';
import { SelectField } from '@/app/ui/select-field';
import { Skeleton } from '@/app/ui/skeleton';
import { TextField } from '@/app/ui/text-field';

import { useInfiniteScroll } from '@/app/hooks/use-infinite-scroll';
import { useSession } from '@/app/hooks/use-session';

import { AgendaHeader } from './agenda-header';
import { byStartDescending } from './agenda-order';
import { AppointmentListSkeleton } from './agenda-skeleton';
import { PanelLoadError } from './panel-load-error';

type Filters = {
  q: string;
  status: AppointmentStatus | null;
  from: string;
  to: string;
  office: string;
};

/** The filters as the address keeps them: back, forward and a reload keep them too. */
function readFilters(params: URLSearchParams): Filters {
  const status = params.get('status') ?? '';
  const from = params.get('from') ?? '';
  const to = params.get('to') ?? '';
  return {
    q: params.get(searchParameter)?.trim() ?? '',
    status: (appointmentStatuses as readonly string[]).includes(status)
      ? (status as AppointmentStatus)
      : null,
    from: isCalendarDay(from) ? from : '',
    to: isCalendarDay(to) ? to : '',
    office: params.get('office') ?? '',
  };
}

function toQuery(filters: Filters): string {
  const params = new URLSearchParams();
  if (filters.q) params.set(searchParameter, filters.q);
  if (filters.status) params.set('status', filters.status);
  if (filters.from) params.set('from', filters.from);
  if (filters.to) params.set('to', filters.to);
  if (filters.office) params.set('office', filters.office);
  return params.toString();
}

const noFilters: Filters = {
  q: '',
  status: null,
  from: '',
  to: '',
  office: '',
};

/**
 * How many cards show at first, and how many more come each time the end
 * of the list comes into view (infinite scroll, 10 at a time: the owner's
 * call, 2026-10-13).
 */
const pageSize = 10;

/*
 * `/panel/appointments` (M14): the specialist's history, the app's «Más
 * recientes» — the latest first, grouped by day, filtered by a search
 * (name, document, phone or email, as the app's box), a state, two dates and
 * the office when there is more than one. Read only: each appointment opens
 * its own page.
 */
export function AppointmentsHistory() {
  const { user } = useSession();
  if (user === null) return <HistorySkeleton />;
  return <HistoryList user={user} />;
}

/** The history before the person is known: title, tabs, filters, list. No words, so it fits any scope. */
export function HistorySkeleton() {
  return (
    <div aria-busy="true" className="flex flex-col gap-4">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-touch w-full" />
      <Skeleton className="h-72 rounded-2xl" />
      <AppointmentListSkeleton />
    </div>
  );
}

function HistoryList({ user }: { user: SessionUser }) {
  const t = useTranslations();
  const router = useRouter();
  const searchParams = useSearchParams();
  const filters = readFilters(searchParams);
  const [search, setSearch] = useState(filters.q);
  /** The search this page last put in the address. */
  const [askedQuery, setAskedQuery] = useState(filters.q);
  const [shown, setShown] = useState(pageSize);
  const offices = useQuery(myOfficesQueryOptions(user));
  const countId = useId();
  const rangeErrorId = useId();
  const typing = useRef<number | undefined>(undefined);

  // The address changed by itself (back, forward): the box follows it.
  if (filters.q !== askedQuery) {
    setAskedQuery(filters.q);
    setSearch(filters.q);
  }

  const replaceFilters = useCallback(
    (patch: Partial<Filters>) => {
      const current = readFilters(new URLSearchParams(window.location.search));
      const query = toQuery({ ...current, ...patch });
      router.replace(
        `${routes.specialistAppointments()}${query ? `?${query}` : ''}` as Route,
        { scroll: false },
      );
      setShown(pageSize);
    },
    [router, setShown],
  );

  useEffect(
    () => () => {
      window.clearTimeout(typing.current);
    },
    [],
  );

  // The search goes to the address once the typing pauses (400 ms, as the app).
  const typeSearch = (value: string) => {
    setSearch(value);
    window.clearTimeout(typing.current);
    typing.current = window.setTimeout(() => {
      const asked = value.trim();
      setAskedQuery(asked);
      replaceFilters({ q: asked });
    }, 400);
  };

  const rangeInvalid =
    filters.from !== '' && filters.to !== '' && filters.from > filters.to;
  const query = useQuery({
    ...specialistAppointmentsQueryOptions(user, {
      search: filters.q || undefined,
      status: filters.status ?? undefined,
      from: filters.from || undefined,
      to: filters.to || undefined,
      officeId: filters.office || undefined,
    }),
    enabled: !rangeInvalid,
    // A new filter keeps the list on screen until the answer replaces it.
    placeholderData: keepPreviousData,
  });

  // The latest first, as the app's «Más recientes».
  const appointments = (query.data ?? [])
    .map(toAppointmentSummary)
    .sort(byStartDescending);
  const foot = useInfiniteScroll({
    enabled: appointments.length > shown,
    onLoadMore: () => {
      setShown((count) => count + pageSize);
    },
    loaded: shown,
  });

  const filtering =
    filters.q !== '' ||
    filters.status !== null ||
    filters.from !== '' ||
    filters.to !== '' ||
    filters.office !== '';
  const officeList = offices.data ?? [];

  const clearAll = () => {
    window.clearTimeout(typing.current);
    setSearch('');
    setAskedQuery('');
    replaceFilters(noFilters);
  };

  return (
    <div className="flex flex-col gap-4">
      <AgendaHeader active="history" />

      <section
        aria-label={t('panel.history.filtersLabel')}
        className="flex flex-col gap-4 rounded-2xl bg-pure-white p-4 shadow-md"
      >
        <TextField
          type="search"
          label={t('panel.history.searchLabel')}
          placeholder={t('appointments.search.hint')}
          value={search}
          onChange={(event) => {
            typeSearch(event.target.value);
          }}
          enterKeyHint="search"
          leading={
            <Icon
              icon={Search}
              size={20}
              className="ml-3 shrink-0 text-text-secondary"
            />
          }
        />
        <StatusFilter
          value={filters.status}
          onChange={(status) => {
            replaceFilters({ status });
          }}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            type="date"
            label={t('panel.history.from')}
            value={filters.from}
            max={filters.to || undefined}
            onChange={(event) => {
              replaceFilters({ from: event.target.value });
            }}
          />
          <TextField
            type="date"
            label={t('panel.history.to')}
            value={filters.to}
            min={filters.from || undefined}
            aria-describedby={rangeInvalid ? rangeErrorId : undefined}
            onChange={(event) => {
              replaceFilters({ to: event.target.value });
            }}
          />
        </div>
        <FieldError
          id={rangeErrorId}
          message={rangeInvalid ? t('panel.history.rangeOrder') : undefined}
        />
        {officeList.length > 1 ? (
          <SelectField
            label={t('panel.history.office')}
            value={filters.office}
            onChange={(event) => {
              replaceFilters({ office: event.target.value });
            }}
            options={[
              { value: '', label: t('appointments.filters.allOffices') },
              ...officeList.map((office) => ({
                value: office.id,
                label: office.name,
              })),
            ]}
          />
        ) : null}
        {filtering ? (
          <Button
            variant="white"
            size="small"
            shape="soft"
            className="animate-fade-in self-start"
            onClick={clearAll}
          >
            <Icon icon={Close} size={18} />
            {t('appointments.filters.clearAll')}
          </Button>
        ) : null}
      </section>

      {content()}
    </div>
  );

  function content() {
    if (query.isPending) return <AppointmentListSkeleton />;

    if (query.isLoadingError) {
      return (
        <PanelLoadError
          error={query.error}
          title={t('appointments.hub.loadError')}
          description={t('panel.agenda.loadErrorDescription')}
          retrying={query.isFetching}
          onRetry={() => {
            void query.refetch();
          }}
        />
      );
    }

    if (appointments.length === 0) {
      return filtering ? (
        <EmptyState
          icon={SearchOff}
          title={t('appointments.noAppointmentsFound')}
          description={t('panel.history.noResultsDescription')}
          action={
            <Button variant="white" shape="soft" onClick={clearAll}>
              {t('appointments.filters.clearAll')}
            </Button>
          }
        />
      ) : (
        <EmptyState
          icon={History}
          title={t('panel.history.empty')}
          description={t('panel.history.emptyDescription')}
        />
      );
    }

    const visible = appointments.slice(0, shown);
    return (
      <section
        aria-labelledby={countId}
        aria-busy={query.isFetching}
        className={cn(
          'flex flex-col gap-4 transition-opacity duration-base ease-house',
          query.isPlaceholderData && 'opacity-60',
        )}
      >
        <p
          id={countId}
          role="status"
          className="text-label-lg text-text-secondary"
        >
          {t('panel.history.count', { count: appointments.length })}
        </p>
        {groupByDay(visible).map(({ date, items }) => (
          <section key={date} className="flex flex-col gap-3">
            <h2 className="text-title-md text-text-primary first-letter:uppercase">
              {formatAppointmentDay(date)}
            </h2>
            <ul className="flex flex-col gap-3">
              {items.map((appointment) => (
                <AppointmentCard
                  key={appointment.id}
                  appointment={appointment}
                  viewer="specialist"
                  showDay={false}
                />
              ))}
            </ul>
          </section>
        ))}
        {appointments.length > shown ? (
          // Where the list ends: coming into view, the next ten follow.
          <div ref={foot} aria-hidden="true" className="h-px" />
        ) : null}
      </section>
    );
  }
}

/** The appointments of each day together, in the order they come. */
function groupByDay(appointments: readonly AppointmentSummary[]) {
  const days: { date: string; items: AppointmentSummary[] }[] = [];
  for (const appointment of appointments) {
    const last = days.at(-1);
    if (last?.date === appointment.date) last.items.push(appointment);
    else days.push({ date: appointment.date, items: [appointment] });
  }
  return days;
}

/** The app's status chips, one at a time, «Todas» first. */
function StatusFilter({
  value,
  onChange,
}: {
  value: AppointmentStatus | null;
  onChange: (status: AppointmentStatus | null) => void;
}) {
  const t = useTranslations();
  return (
    <FilterChips
      legend={t('panel.history.statusLabel')}
      options={[
        { key: 'all', value: null, label: t('appointments.filters.all') },
        ...appointmentStatuses.map((status) => ({
          key: status,
          value: status,
          label: t(`appointments.status.${statusChips[status].label}`),
        })),
      ]}
      value={value}
      onChange={onChange}
    />
  );
}
