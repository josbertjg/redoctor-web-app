import { useTranslations } from 'next-intl';

import { formatDateTime } from '@/app/lib/format/dates';
import {
  formatBucket,
  formatDayRange,
  formatHour,
  formatPercent,
  formatRating,
  formatWeekday,
} from '@/app/lib/format/figures';
import { formatLocale } from '@/app/lib/i18n/config';
import type { CsvReport, CsvTable } from '@/app/lib/reports/csv';
import { outcomeOf, reasonsByDemand } from '@/app/lib/reports/figures';
import type { SpecialistReport } from '@/app/lib/schemas/reports';

const amountFormat = new Intl.NumberFormat(formatLocale, {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

/** The report's statuses in the app's order, with their words' keys. */
const statusKeys = [
  ['PENDING_CONFIRMATION', 'pendingConfirmation'],
  ['CONFIRMED', 'confirmed'],
  ['RESCHEDULE_PROPOSED', 'rescheduleProposed'],
  ['CANCELLED', 'cancelled'],
  ['COMPLETED', 'completed'],
  ['NO_SHOW', 'noShow'],
] as const;

/*
 * The spreadsheet of the statistics (M14), the tables of the app's CSV:
 * the appointments' summary, their evolution, by state, by day and hour;
 * the income by currency and by reason; the reviews; the reasons. Figures
 * in the locale's way (Excel reads «1.234,5» in a Spanish locale), money
 * without its sign, the currency in its own column.
 */
export function useReportCsv(
  report: SpecialistReport,
  officeName: string | null,
): { report: CsvReport; fileName: string } {
  const t = useTranslations('reports');
  const { appointments, income, reviews, reasons, range } = report;
  const bucketLabel = (bucket: string) =>
    range.granularity === 'week'
      ? t('series.weekOf', { date: formatBucket(bucket) })
      : formatBucket(bucket);

  const tables: CsvTable[] = [];

  if (appointments) {
    const outcome = outcomeOf(appointments);
    tables.push(
      {
        title: t('tables.appointmentsSummary'),
        headers: [
          t('table.concept'),
          t('table.thisPeriod'),
          t('table.previousPeriod'),
        ],
        rows: [
          [t('appointments.total'), outcome.total, appointments.previous.total],
          [
            t('appointments.completed'),
            outcome.completed,
            appointments.previous.completed,
          ],
          [
            t('appointments.cancelled'),
            outcome.cancelled,
            appointments.previous.cancelled,
          ],
          [
            t('appointments.noShow'),
            outcome.noShow,
            appointments.previous.noShow,
          ],
          [t('patients.new'), appointments.newPatients, ''],
          [t('patients.returning'), appointments.returningPatients, ''],
          [t('patients.unclaimed'), appointments.unclaimed, ''],
        ],
      },
      {
        title: t('tables.appointmentsSeries'),
        headers: [
          t('table.period'),
          t('appointments.total'),
          t('appointments.completed'),
          t('appointments.cancelled'),
          t('appointments.noShow'),
        ],
        rows: appointments.series.map((bucket) => [
          bucketLabel(bucket.bucket),
          bucket.total,
          bucket.completed,
          bucket.cancelled,
          bucket.noShow,
        ]),
      },
      {
        title: t('tables.byStatus'),
        headers: [t('table.status'), t('table.appointments')],
        rows: statusKeys.map(([status, key]) => [
          t(`status.${key}`),
          appointments.byStatus[status],
        ]),
      },
      {
        title: t('tables.weekdayHours'),
        headers: [t('table.day'), t('table.hour'), t('table.appointments')],
        rows: appointments.byWeekdayHour
          .filter((cell) => cell.total > 0)
          .map((cell) => [
            formatWeekday(cell.weekday),
            formatHour(cell.hour),
            cell.total,
          ]),
      },
    );
  }

  if (income) {
    tables.push({
      title: t('income.summaryTable'),
      headers: [
        t('table.currency'),
        t('table.amount'),
        t('table.appointments'),
        t('table.previousPeriod'),
      ],
      rows: [
        ...income.currencies.map((currency) => [
          currency.currency,
          amountFormat.format(currency.total),
          currency.appointments,
          amountFormat.format(currency.previous.total),
        ]),
        [t('income.unpricedRow'), '', income.unpriced, ''],
      ],
    });
    for (const currency of income.currencies) {
      tables.push({
        title: t('income.byReason', { currency: currency.currency }),
        headers: [
          t('table.reason'),
          t('table.amount'),
          t('table.appointments'),
        ],
        rows: currency.byReason.map((reason) => [
          reason.reasonName ?? t('income.withoutReason'),
          amountFormat.format(reason.total),
          reason.appointments,
        ]),
      });
    }
  }

  if (reviews) {
    tables.push(
      {
        title: t('reviews.summaryTable'),
        headers: [t('table.concept'), t('table.figure')],
        rows: [
          [
            t('reviews.average'),
            reviews.average === null ? '' : formatRating(reviews.average),
          ],
          [t('table.reviews'), reviews.count],
          [
            t('reviews.withComment', { count: reviews.withComment }),
            reviews.withComment,
          ],
          [
            t('reviews.allTimeRow'),
            reviews.allTime.average === null
              ? ''
              : formatRating(reviews.allTime.average),
          ],
        ],
      },
      {
        title: t('reviews.distributionTable'),
        headers: [t('table.stars'), t('table.reviews')],
        rows: ([5, 4, 3, 2, 1] as const).map((star) => [
          t('reviews.stars', { stars: star }),
          reviews.distribution[star],
        ]),
      },
    );
  }

  if (reasons) {
    tables.push({
      title: t('reasons.title'),
      headers: [
        t('table.reason'),
        t('table.appointments'),
        t('appointments.completed'),
        t('table.share'),
      ],
      rows: reasonsByDemand(reasons).map((reason) => [
        reason.reasonName ?? t('reasons.unnamed'),
        reason.total,
        reason.completed,
        formatPercent(reason.share),
      ]),
    });
  }

  const details: [string, string][] = [
    [t('export.csvPeriod'), formatDayRange(range.from, range.to)],
    [
      t('export.csvGeneratedAt'),
      formatDateTime(new Date().toISOString()) ?? '',
    ],
  ];
  if (officeName) details.push([t('statistics.officeLabel'), officeName]);

  return {
    report: { title: t('export.documentTitle'), details, tables },
    fileName: t('export.fileName', { from: range.from, to: range.to }),
  };
}
