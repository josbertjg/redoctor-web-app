import EventAvailable from '@material-symbols/svg-400/rounded/event_available.svg?svgr';
import EventBusy from '@material-symbols/svg-400/rounded/event_busy.svg?svgr';
import Monitoring from '@material-symbols/svg-400/rounded/monitoring.svg?svgr';
import Payments from '@material-symbols/svg-400/rounded/payments.svg?svgr';
import PersonAdd from '@material-symbols/svg-400/rounded/person_add.svg?svgr';
import PersonOff from '@material-symbols/svg-400/rounded/person_off.svg?svgr';
import StarFill from '@material-symbols/svg-400/rounded/star-fill.svg?svgr';
import { useTranslations } from 'next-intl';

import {
  formatBucket,
  formatExactMoney,
  formatFigure,
  formatHeadlineFigure,
  formatHeadlineMoney,
  formatHour,
  formatPercent,
  formatRating,
  formatWeekday,
} from '@/app/lib/format/figures';
import {
  averageTrend,
  busiestSlots,
  completedTrend,
  mainCurrency,
  outcomeOf,
  reasonsByCompleted,
  reasonsByDemand,
  reasonsByIncome,
  shareOf,
  trendOf,
} from '@/app/lib/reports/figures';
import type {
  AppointmentsSection,
  IncomeCurrency,
  SpecialistReport,
} from '@/app/lib/schemas/reports';

import { EmptyState } from '@/app/ui/empty-state';

import { SeriesBars, WeekdayHourHeatmap } from './report-charts';
import {
  MetricCard,
  RankingList,
  ReportSection,
  SplitBar,
  type BarPart,
} from './report-parts';

/*
 * The statistics' five views (M14), as the app's dashboard and its four
 * reports: the summary, the appointments, the estimated income, the reviews
 * and the reasons for consulting. Every figure comes from one answer; each
 * view only reads it its way.
 */

type ReportViewProps = {
  report: SpecialistReport;
  /** The period's length, for «… en los 30 días anteriores». */
  days: number;
};

/** The app's tones for how an appointment ended. */
const outcomeShades = {
  completed: 'bg-green-500',
  cancelled: 'bg-error-400',
  noShow: 'bg-grey-400',
  open: 'bg-blue-200',
} as const;

const missing = '—';

function useBucketLabel(report: SpecialistReport) {
  const t = useTranslations('reports.series');
  return (bucket: string) =>
    report.range.granularity === 'week'
      ? t('weekOf', { date: formatBucket(bucket) })
      : formatBucket(bucket);
}

type Translate = ReturnType<typeof useTranslations<'reports'>>;

/** The parts of how the appointments ended, for the split bar. */
function outcomeParts(
  t: Translate,
  appointments: AppointmentsSection,
): BarPart[] {
  const outcome = outcomeOf(appointments);
  return [
    {
      key: 'completed',
      label: t('appointments.completed'),
      value: outcome.completed,
      className: outcomeShades.completed,
    },
    {
      key: 'cancelled',
      label: t('appointments.cancelled'),
      value: outcome.cancelled,
      className: outcomeShades.cancelled,
    },
    {
      key: 'noShow',
      label: t('appointments.noShow'),
      value: outcome.noShow,
      className: outcomeShades.noShow,
    },
    {
      key: 'open',
      label: t('appointments.open'),
      value: outcome.open,
      className: outcomeShades.open,
    },
  ];
}

/** «Resumen»: the four figures of the app's dashboard, how the appointments ended, the busiest hours, the top reasons. */
export function SummaryReport({ report, days }: ReportViewProps) {
  const t = useTranslations('reports');
  const { appointments, income, reviews, reasons } = report;

  if (appointments?.total === 0) {
    return (
      <EmptyState
        icon={Monitoring}
        title={t('statistics.emptyTitle')}
        description={t('statistics.emptyDescription')}
      />
    );
  }

  const previous = (value: string) => t('previousDays', { value, days });
  const main = income ? mainCurrency(income) : null;
  const slots = appointments ? busiestSlots(appointments).slice(0, 3) : [];
  const topReasons = reasons ? reasonsByDemand(reasons).slice(0, 3) : [];
  const allTimeAverage = reviews?.allTime.average ?? null;

  return (
    <div className="flex flex-col gap-6">
      <ReportSection title={t('blocks.summary')} plain titleHidden>
        <div className="grid gap-3 sm:grid-cols-2">
          <MetricCard
            icon={EventAvailable}
            title={t('statistics.attended')}
            value={
              appointments
                ? formatHeadlineFigure(appointments.byStatus.COMPLETED)
                : missing
            }
            unit={
              appointments && appointments.total > 0
                ? t('statistics.ofTotal', {
                    total: formatFigure(appointments.total),
                  })
                : null
            }
            caption={
              appointments
                ? previous(formatFigure(appointments.previous.completed))
                : null
            }
            trend={appointments ? completedTrend(appointments) : null}
          />
          {main ? (
            <MetricCard
              icon={Payments}
              iconClassName="bg-success-light text-green-700"
              title={t('income.title')}
              value={formatHeadlineMoney(main.total, main.currency)}
              unit={
                income && income.currencies.length > 1
                  ? t('statistics.moreCurrencies', {
                      count: income.currencies.length - 1,
                    })
                  : null
              }
              caption={previous(
                formatHeadlineMoney(main.previous.total, main.currency),
              )}
              trend={trendOf(main.total, main.previous.total)}
            />
          ) : (
            <MetricCard
              icon={Payments}
              iconClassName="bg-success-light text-green-700"
              title={t('income.title')}
              value={missing}
              caption={
                income && income.unpriced > 0
                  ? t('income.unpriced', { count: income.unpriced })
                  : t('statistics.incomeNone')
              }
            />
          )}
          {reviews && reviews.average !== null ? (
            <MetricCard
              icon={StarFill}
              iconClassName="bg-warning-light text-warning-500"
              title={t('statistics.rating')}
              value={formatRating(reviews.average)}
              unit={t('reviews.count', { count: reviews.count })}
              caption={
                reviews.previous.average === null
                  ? t('statistics.noPreviousReviews', { days })
                  : previous(formatRating(reviews.previous.average))
              }
              trend={averageTrend(reviews)}
            />
          ) : (
            // Without reviews in the period, the rating of always says more than a dash.
            <MetricCard
              icon={StarFill}
              iconClassName="bg-warning-light text-warning-500"
              title={t('statistics.rating')}
              value={
                allTimeAverage === null ? missing : formatRating(allTimeAverage)
              }
              unit={
                allTimeAverage === null || !reviews
                  ? null
                  : t('reviews.count', { count: reviews.allTime.count })
              }
              caption={
                allTimeAverage === null
                  ? t('statistics.noReviews')
                  : t('statistics.noNewReviews')
              }
            />
          )}
          <MetricCard
            icon={PersonAdd}
            title={t('patients.new')}
            value={
              appointments
                ? formatHeadlineFigure(appointments.newPatients)
                : missing
            }
            caption={
              appointments
                ? t('statistics.returning', {
                    count: appointments.returningPatients,
                  })
                : null
            }
          />
        </div>
      </ReportSection>

      {appointments ? (
        <>
          <ReportSection title={t('statistics.outcome')}>
            <SplitBar parts={outcomeParts(t, appointments)} />
          </ReportSection>
          <ReportSection title={t('statistics.busiestHours')}>
            <RankingList
              emptyText={t('heatmap.empty')}
              entries={slots.map((slot) => ({
                key: `${String(slot.weekday)}-${String(slot.hour)}`,
                label: t('heatmap.slot', {
                  day: formatWeekday(slot.weekday),
                  from: formatHour(slot.hour),
                  to: formatHour((slot.hour + 1) % 24),
                }),
                value: t('statistics.appointmentsCount', { count: slot.total }),
                share: shareOf(slot.total, slots[0]?.total ?? 0),
              }))}
            />
          </ReportSection>
        </>
      ) : null}

      {reasons ? (
        <ReportSection title={t('statistics.topReasons')}>
          <RankingList
            emptyText={t('reasons.empty')}
            entries={topReasons.map((reason) => ({
              key: reason.reasonId,
              label: reason.reasonName ?? t('reasons.unnamed'),
              value: t('statistics.appointmentsCount', { count: reason.total }),
              share: shareOf(reason.total, topReasons[0]?.total ?? 0),
            }))}
          />
        </ReportSection>
      ) : null}
    </div>
  );
}

/** «Citas»: the four counts against before, their evolution, who cancelled, the patients, the hours, the offices. */
export function AppointmentsReport({ report, days }: ReportViewProps) {
  const t = useTranslations('reports');
  const bucketLabel = useBucketLabel(report);
  const { appointments } = report;
  if (!appointments) return null;

  const previous = (value: number) =>
    t('previousDays', { value: formatFigure(value), days });
  const outcome = outcomeOf(appointments);
  const cancelledBy = [
    { key: 'patient', value: appointments.cancelledBy.PATIENT },
    { key: 'you', value: appointments.cancelledBy.SPECIALIST },
    { key: 'system', value: appointments.cancelledBy.SYSTEM },
  ] as const;
  const mostCancelled = Math.max(...cancelledBy.map((entry) => entry.value));
  const offices = [...appointments.byOffice].sort((a, b) => b.total - a.total);

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-3 sm:grid-cols-2">
        <MetricCard
          icon={Monitoring}
          title={t('appointments.total')}
          value={formatHeadlineFigure(appointments.total)}
          caption={previous(appointments.previous.total)}
          trend={trendOf(appointments.total, appointments.previous.total)}
        />
        <MetricCard
          icon={EventAvailable}
          iconClassName="bg-success-light text-green-700"
          title={t('appointments.completed')}
          value={formatHeadlineFigure(outcome.completed)}
          caption={previous(appointments.previous.completed)}
          trend={completedTrend(appointments)}
        />
        <MetricCard
          icon={EventBusy}
          iconClassName="bg-error-light text-error-700"
          title={t('appointments.cancelled')}
          value={formatHeadlineFigure(outcome.cancelled)}
          caption={previous(appointments.previous.cancelled)}
          trend={trendOf(outcome.cancelled, appointments.previous.cancelled)}
        />
        <MetricCard
          icon={PersonOff}
          iconClassName="bg-surface-variant text-grey-700"
          title={t('appointments.noShow')}
          value={formatHeadlineFigure(outcome.noShow)}
          caption={previous(appointments.previous.noShow)}
          trend={trendOf(outcome.noShow, appointments.previous.noShow)}
        />
      </div>

      <ReportSection title={t('blocks.appointmentsEvolution')}>
        <SeriesBars
          caption={t('blocks.appointmentsEvolution')}
          periodHeader={t('table.period')}
          emptyText={t('series.empty')}
          shades={outcomeShades}
          bars={appointments.series.map((bucket) => ({
            key: bucket.bucket,
            axisLabel: formatBucket(bucket.bucket),
            label: bucketLabel(bucket.bucket),
            parts: [
              {
                key: 'completed',
                label: t('appointments.completed'),
                value: bucket.completed,
              },
              {
                key: 'cancelled',
                label: t('appointments.cancelled'),
                value: bucket.cancelled,
              },
              {
                key: 'noShow',
                label: t('appointments.noShow'),
                value: bucket.noShow,
              },
              {
                key: 'open',
                label: t('appointments.open'),
                value: Math.max(
                  bucket.total -
                    bucket.completed -
                    bucket.cancelled -
                    bucket.noShow,
                  0,
                ),
              },
            ],
          }))}
        />
      </ReportSection>

      <ReportSection
        title={t('cancelledBy.title')}
        caption={t('cancelledBy.caption', { count: outcome.cancelled })}
      >
        <RankingList
          emptyText={t('series.empty')}
          entries={
            outcome.cancelled === 0
              ? []
              : cancelledBy.map((entry) => ({
                  key: entry.key,
                  label: t(`cancelledBy.${entry.key}`),
                  value: formatFigure(entry.value),
                  share: shareOf(entry.value, mostCancelled),
                }))
          }
        />
      </ReportSection>

      <ReportSection title={t('patients.title')}>
        <dl className="grid gap-4 sm:grid-cols-3">
          {(
            [
              ['new', appointments.newPatients, 'newCaptionOwn'],
              [
                'returning',
                appointments.returningPatients,
                'returningCaptionOwn',
              ],
              ['unclaimed', appointments.unclaimed, 'unclaimedCaption'],
            ] as const
          ).map(([key, value, caption]) => (
            <div key={key} className="flex flex-col gap-0.5">
              <dt className="text-label-lg text-text-secondary">
                {t(`patients.${key}`)}
              </dt>
              <dd className="text-headline-sm text-text-primary">
                {formatHeadlineFigure(value)}
              </dd>
              <dd className="text-body-sm text-text-secondary">
                {t(`patients.${caption}`)}
              </dd>
            </div>
          ))}
        </dl>
      </ReportSection>

      <ReportSection title={t('heatmap.title')}>
        <WeekdayHourHeatmap
          cells={appointments.byWeekdayHour}
          emptyText={t('heatmap.empty')}
        />
      </ReportSection>

      {offices.length > 1 ? (
        <ReportSection title={t('offices.title')}>
          <RankingList
            emptyText={t('series.empty')}
            entries={offices.map((office) => ({
              key: office.officeId,
              label: office.officeName ?? missing,
              value: t('statistics.appointmentsCount', { count: office.total }),
              share: shareOf(office.total, offices[0]?.total ?? 0),
            }))}
          />
        </ReportSection>
      ) : null}
    </div>
  );
}

/** «Ingresos estimados»: one block per currency, never added together; what went unpriced. */
export function IncomeReport({ report, days }: ReportViewProps) {
  const t = useTranslations('reports');
  const { income } = report;
  if (!income) return null;

  return (
    <div className="flex flex-col gap-6">
      {income.currencies.length === 0 ? (
        <EmptyState
          icon={Payments}
          title={t('income.title')}
          description={t('income.empty')}
        />
      ) : (
        income.currencies.map((currency) => (
          <CurrencyIncomeBlock
            key={currency.currency}
            currency={currency}
            report={report}
            days={days}
          />
        ))
      )}
      {income.unpriced > 0 ? (
        <p className="text-body-md text-text-secondary">
          {t('income.unpriced', { count: income.unpriced })}
        </p>
      ) : null}
    </div>
  );
}

function CurrencyIncomeBlock({
  currency,
  report,
  days,
}: {
  currency: IncomeCurrency;
  report: SpecialistReport;
  days: number;
}) {
  const t = useTranslations('reports');
  const bucketLabel = useBucketLabel(report);
  const code = currency.currency;
  const reasons = reasonsByIncome(currency);
  const money = (value: number) => formatExactMoney(value, code);

  return (
    <ReportSection
      title={t('income.titleIn', { currency: code })}
      caption={t('income.estimatedOwn')}
      plain
    >
      <div className="flex flex-col gap-4">
        <MetricCard
          icon={Payments}
          iconClassName="bg-success-light text-green-700"
          title={t('income.title')}
          value={formatHeadlineMoney(currency.total, code)}
          unit={t('income.appointments', { count: currency.appointments })}
          caption={t('previousDays', {
            value: formatHeadlineMoney(currency.previous.total, code),
            days,
          })}
          trend={trendOf(currency.total, currency.previous.total)}
        />
        <div className="rounded-2xl bg-pure-white p-4 shadow-md">
          <SeriesBars
            caption={t('income.titleIn', { currency: code })}
            periodHeader={t('table.period')}
            emptyText={t('series.empty')}
            shades={{ total: 'bg-green-500' }}
            formatValue={money}
            bars={currency.series.map((bucket) => ({
              key: bucket.bucket,
              axisLabel: formatBucket(bucket.bucket),
              label: bucketLabel(bucket.bucket),
              parts: [
                { key: 'total', label: t('table.amount'), value: bucket.total },
              ],
            }))}
          />
        </div>
        <div className="rounded-2xl bg-pure-white p-4 shadow-md">
          <h3 className="mb-3 text-title-md text-text-primary">
            {t('income.byReason', { currency: code })}
          </h3>
          <RankingList
            emptyText={t('income.empty')}
            entries={reasons.map((reason, index) => ({
              key: reason.reasonId ?? `none-${String(index)}`,
              label: reason.reasonName ?? t('income.withoutReason'),
              value: money(reason.total),
              share: shareOf(reason.total, reasons[0]?.total ?? 0),
              caption: t('income.appointments', { count: reason.appointments }),
            }))}
          />
        </div>
      </div>
    </ReportSection>
  );
}

/** «Reseñas»: the rating against before, by stars, of always, and how it moved. */
export function ReviewsReport({ report, days }: ReportViewProps) {
  const t = useTranslations('reports');
  const bucketLabel = useBucketLabel(report);
  const { reviews } = report;
  if (!reviews) return null;

  const stars = [5, 4, 3, 2, 1] as const;
  const most = Math.max(...stars.map((star) => reviews.distribution[star]));

  return (
    <div className="flex flex-col gap-6">
      <MetricCard
        icon={StarFill}
        iconClassName="bg-warning-light text-warning-500"
        title={t('reviews.average')}
        value={
          reviews.average === null ? missing : formatRating(reviews.average)
        }
        unit={t('reviews.count', { count: reviews.count })}
        caption={
          reviews.previous.average === null
            ? t('statistics.noPreviousReviews', { days })
            : t('previousDays', {
                value: formatRating(reviews.previous.average),
                days,
              })
        }
        trend={averageTrend(reviews)}
      />
      <ReportSection
        title={t('reviews.distributionTable')}
        caption={t('reviews.withComment', { count: reviews.withComment })}
      >
        <RankingList
          emptyText={t('statistics.noNewReviews')}
          entries={
            reviews.count === 0
              ? []
              : stars.map((star) => ({
                  key: String(star),
                  label: t('reviews.stars', { stars: star }),
                  value: formatFigure(reviews.distribution[star]),
                  share: shareOf(reviews.distribution[star], most),
                }))
          }
        />
        <p className="mt-4 text-body-md text-text-secondary">
          {reviews.allTime.count > 0 && reviews.allTime.average !== null
            ? t('reviews.allTime', {
                count: reviews.allTime.count,
                average: formatRating(reviews.allTime.average),
              })
            : t('reviews.allTimeEmptyOwn')}
        </p>
      </ReportSection>
      <ReportSection
        title={t('reviews.evolution')}
        caption={t('reviews.caption')}
      >
        <SeriesBars
          caption={t('reviews.evolution')}
          periodHeader={t('table.period')}
          emptyText={t('series.empty')}
          shades={{ average: 'bg-warning-500' }}
          formatValue={formatRating}
          max={5}
          bars={reviews.series
            .filter((bucket) => bucket.average !== null)
            .map((bucket) => ({
              key: bucket.bucket,
              axisLabel: formatBucket(bucket.bucket),
              label: bucketLabel(bucket.bucket),
              parts: [
                {
                  key: 'average',
                  label: t('reviews.average'),
                  value: bucket.average ?? 0,
                },
              ],
            }))}
        />
      </ReportSection>
    </div>
  );
}

/** «Motivos de consulta»: the most asked for, and the most attended. */
export function ReasonsReport({ report }: Omit<ReportViewProps, 'days'>) {
  const t = useTranslations('reports');
  const { reasons } = report;
  if (!reasons) return null;

  const byDemand = reasonsByDemand(reasons);
  const byCompleted = reasonsByCompleted(reasons).filter(
    (reason) => reason.completed > 0,
  );

  return (
    <div className="flex flex-col gap-6">
      <ReportSection
        title={t('reasons.title')}
        caption={
          reasons.withoutReason > 0
            ? t('reasons.withoutReason', { count: reasons.withoutReason })
            : null
        }
      >
        <RankingList
          emptyText={t('reasons.empty')}
          entries={byDemand.map((reason) => ({
            key: reason.reasonId,
            label: reason.reasonName ?? t('reasons.unnamed'),
            value: formatPercent(reason.share),
            share: shareOf(reason.total, byDemand[0]?.total ?? 0),
            caption: t('statistics.appointmentsCount', { count: reason.total }),
          }))}
        />
      </ReportSection>
      <ReportSection title={t('reasons.completedTitle')}>
        <RankingList
          emptyText={t('reasons.empty')}
          entries={byCompleted.map((reason) => ({
            key: reason.reasonId,
            label: reason.reasonName ?? t('reasons.unnamed'),
            value: formatFigure(reason.completed),
            share: shareOf(reason.completed, byCompleted[0]?.completed ?? 0),
            caption: t('reasons.completedOf', {
              completed: formatFigure(reason.completed),
              total: reason.total,
            }),
          }))}
        />
      </ReportSection>
    </div>
  );
}
