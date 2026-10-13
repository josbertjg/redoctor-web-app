'use client';

import { useCallback, useEffect, useState } from 'react';

import type { Route } from 'next';

import { useRouter, useSearchParams } from 'next/navigation';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';

import type { SessionUser } from '@/app/lib/firebase/client';
import { todayInCaracas } from '@/app/lib/format/date-of-birth';
import { formatDayRange } from '@/app/lib/format/figures';
import { myOfficesQueryOptions } from '@/app/lib/queries/offices';
import { specialistReportQueryOptions } from '@/app/lib/queries/reports';
import {
  customRangeProblem,
  defaultReportPeriod,
  granularityFor,
  presetRange,
  rangeDays,
  reportPeriods,
  type ReportPeriod,
} from '@/app/lib/reports/period';
import { routes } from '@/app/lib/routes';
import type { SpecialistReport } from '@/app/lib/schemas/reports';
import { cn } from '@/app/lib/utils';

import { Skeleton } from '@/app/ui/skeleton';
import { Tabs } from '@/app/ui/tabs';

import { useSession } from '@/app/hooks/use-session';

import { ReportExport } from './report-export';
import { ReportFilters, type ReportSelection } from './report-filters';
import {
  AppointmentsReport,
  IncomeReport,
  ReasonsReport,
  ReviewsReport,
  SummaryReport,
} from './report-sections';
import { PanelLoadError } from '../panel-load-error';

type ReportTab = 'summary' | 'appointments' | 'income' | 'reviews' | 'reasons';

const tabs: readonly ReportTab[] = [
  'summary',
  'appointments',
  'income',
  'reviews',
  'reasons',
];

/** What the address says the statistics look at; a period it cannot read is the default. */
function readSelection(
  params: URLSearchParams,
  today: string,
): ReportSelection {
  const asked = params.get('period') ?? '';
  const office = params.get('office') ?? '';
  if (asked === 'custom') {
    const range = {
      from: params.get('from') ?? '',
      to: params.get('to') ?? '',
    };
    if (customRangeProblem(range, today) === null) {
      return { period: 'custom', range, office };
    }
  }
  const period = (reportPeriods as readonly string[]).includes(asked)
    ? (asked as Exclude<ReportPeriod, 'custom'>)
    : defaultReportPeriod;
  const preset = period === 'custom' ? defaultReportPeriod : period;
  return {
    period: preset,
    range: presetRange(preset as Exclude<ReportPeriod, 'custom'>, today),
    office,
  };
}

function toQuery(selection: ReportSelection): string {
  const params = new URLSearchParams();
  if (selection.period !== defaultReportPeriod) {
    params.set('period', selection.period);
  }
  if (selection.period === 'custom') {
    params.set('from', selection.range.from);
    params.set('to', selection.range.to);
  }
  if (selection.office) params.set('office', selection.office);
  return params.toString();
}

/*
 * `/panel/reports` (M14): the specialist's statistics, the app's
 * «Estadísticas» tab and its four reports in one page — the summary first,
 * then the appointments, the estimated income, the reviews and the reasons,
 * each a tab. The period and the office live in the address. «Descargar»
 * gives a PDF or a spreadsheet when the plan allows it.
 */
export function ReportsView() {
  const { user } = useSession();
  if (user === null) return <ReportsSkeleton />;
  return <Reports user={user} />;
}

export function ReportsSkeleton() {
  return (
    <div aria-busy="true" className="flex flex-col gap-4">
      <Skeleton className="h-8 w-44" />
      <Skeleton className="h-5 w-56" />
      <Skeleton className="h-control w-full" />
      <Skeleton className="h-touch w-full" />
      <div className="grid gap-3 sm:grid-cols-2">
        {[0, 1, 2, 3].map((item) => (
          <Skeleton key={item} className="h-36 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}

function Reports({ user }: { user: SessionUser }) {
  const t = useTranslations('reports');
  const router = useRouter();
  const params = useSearchParams();
  // Today is fixed once per visit: «este mes» stays this month while the page is open.
  const [today] = useState(() => todayInCaracas());
  const selection = readSelection(params, today);
  const offices = useQuery(myOfficesQueryOptions(user));
  const officeList = offices.data ?? [];
  const query = useQuery({
    ...specialistReportQueryOptions(user, {
      ...selection.range,
      officeId: selection.office || undefined,
    }),
    // A new period keeps the figures on screen until the answer replaces them.
    placeholderData: keepPreviousData,
  });
  const [tab, setTab] = useState<ReportTab>('summary');
  const [printing, setPrinting] = useState(false);

  const select = useCallback(
    (next: ReportSelection) => {
      const queryString = toQuery(next);
      router.replace(
        `${routes.reports()}${queryString ? `?${queryString}` : ''}` as Route,
        { scroll: false },
      );
    },
    [router],
  );

  // The PDF: every section laid out for paper, then the browser's print dialog.
  useEffect(() => {
    if (!printing) return;
    const finish = () => {
      setPrinting(false);
    };
    window.addEventListener('afterprint', finish);
    const frame = window.requestAnimationFrame(() => {
      window.print();
    });
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('afterprint', finish);
    };
  }, [printing]);

  const officeName =
    officeList.find((office) => office.id === selection.office)?.name ?? null;
  const caption = `${formatDayRange(selection.range.from, selection.range.to)} · ${t(
    `period.by.${granularityFor(selection.range)}`,
  )}`;
  const days = rangeDays(selection.range);
  const report = query.data;

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="text-headline-sm text-text-primary">
            {t('statistics.title')}
          </h1>
          <p className="text-body-md text-text-secondary">
            {t('statistics.subtitle')}
          </p>
        </div>
        {report ? (
          <ReportExport
            user={user}
            report={report}
            officeName={officeName}
            onPrint={() => {
              setPrinting(true);
            }}
          />
        ) : null}
      </header>

      <section
        aria-label={t('statistics.filtersLabel')}
        className="flex flex-col gap-3 print:hidden"
      >
        <ReportFilters
          // A new address (back, forward) starts the filters over from it.
          key={`${selection.period}:${selection.range.from}:${selection.range.to}`}
          selection={selection}
          today={today}
          offices={officeList}
          onChange={select}
          rangeOf={(period) => presetRange(period, today)}
        />
        <p className="text-body-sm text-text-secondary" aria-live="polite">
          {officeName ? `${caption} · ${officeName}` : caption}
        </p>
      </section>

      {content()}
    </div>
  );

  function content() {
    if (query.isPending) return <ReportsSkeleton />;

    if (query.isLoadingError) {
      return (
        <PanelLoadError
          error={query.error}
          title={t('screen.loadError')}
          description={t('screen.loadErrorDescription')}
          retrying={query.isFetching}
          onRetry={() => {
            void query.refetch();
          }}
        />
      );
    }

    const data: SpecialistReport = query.data;
    const views: Record<ReportTab, React.ReactNode> = {
      summary: <SummaryReport report={data} days={days} />,
      appointments: <AppointmentsReport report={data} days={days} />,
      income: <IncomeReport report={data} days={days} />,
      reviews: <ReviewsReport report={data} days={days} />,
      reasons: <ReasonsReport report={data} />,
    };

    return (
      <div
        aria-busy={query.isFetching}
        className={cn(
          'transition-opacity duration-base ease-house',
          query.isPlaceholderData && 'opacity-60',
        )}
      >
        <div className="print:hidden">
          <Tabs
            label={t('statistics.reportsLabel')}
            scrollable
            value={tab}
            onValueChange={setTab}
            items={tabs.map((key) => ({
              value: key,
              label: t(`statistics.sections.${key}`),
              content: views[key],
            }))}
          />
        </div>
        {printing ? (
          // For paper only: every section, one after the other.
          <div className="hidden flex-col gap-8 print:flex">
            <p className="text-title-md text-text-primary">
              {t('export.documentTitle')} · {caption}
              {officeName ? ` · ${officeName}` : ''}
            </p>
            {tabs.map((key) => (
              <section key={key} className="flex flex-col gap-4">
                <h2 className="text-headline-sm text-text-primary">
                  {t(`statistics.sections.${key}`)}
                </h2>
                {views[key]}
              </section>
            ))}
          </div>
        ) : null}
      </div>
    );
  }
}
