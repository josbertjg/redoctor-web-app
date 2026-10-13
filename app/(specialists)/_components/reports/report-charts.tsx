import { useId } from 'react';

import { useTranslations } from 'next-intl';

import {
  formatFigure,
  formatHour,
  formatWeekday,
} from '@/app/lib/format/figures';
import type { WeekdayHour } from '@/app/lib/reports/figures';
import { cn } from '@/app/lib/utils';

/*
 * The statistics' two drawings (M14): bars over the period and the week's
 * busiest hours. Drawn with boxes (their sizes are the data, so they go
 * inline); each one also holds its numbers as a table for screen readers,
 * which skip the drawing.
 */

export type SeriesPart = { key: string; label: string; value: number };

export type SeriesBar = {
  key: string;
  /** Under the axis: «13 oct». */
  axisLabel: string;
  /** In words, for the table: «Semana del 6 oct». */
  label: string;
  parts: readonly SeriesPart[];
};

type SeriesBarsProps = {
  /** What the drawing shows, for screen readers. */
  caption: string;
  bars: readonly SeriesBar[];
  /** One shade per part key: completed, cancelled… */
  shades: Readonly<Record<string, string>>;
  /** The table's first column: «Periodo». */
  periodHeader: string;
  /** A figure as written in the table (money keeps its sign). */
  formatValue?: (value: number) => string;
  /** The top of the scale; the tallest bar by default (5 for a rating). */
  max?: number;
  emptyText: string;
};

/** Bars over the period, one per bucket, stacked by their parts. */
export function SeriesBars({
  caption,
  bars,
  shades,
  periodHeader,
  formatValue = formatFigure,
  max: scale,
  emptyText,
}: SeriesBarsProps) {
  const captionId = useId();
  const totals = bars.map((bar) =>
    bar.parts.reduce((sum, part) => sum + part.value, 0),
  );
  const tallest = Math.max(0, ...totals);
  const max = scale ?? tallest;
  if (bars.length === 0 || tallest === 0) {
    return <p className="text-body-md text-text-secondary">{emptyText}</p>;
  }
  const middle = bars[Math.floor((bars.length - 1) / 2)];
  const first = bars[0];
  const last = bars.at(-1);
  const partKeys = bars[0]?.parts ?? [];

  return (
    <figure aria-labelledby={captionId} className="flex flex-col gap-2">
      <div aria-hidden="true" className="flex h-40 items-end gap-px sm:gap-1">
        {bars.map((bar, index) => {
          const total = totals[index] ?? 0;
          return (
            <div
              key={bar.key}
              title={`${bar.label}: ${formatValue(total)}`}
              className="flex h-full min-w-0 flex-1 flex-col justify-end"
            >
              {/* A few buckets stay bars, never blocks: capped at 3 rem. */}
              <div
                className="mx-auto flex w-full max-w-12 flex-col-reverse overflow-hidden rounded-t-sm"
                style={{ height: `${String((total / max) * 100)}%` }}
              >
                {bar.parts.map((part) =>
                  part.value > 0 ? (
                    <span
                      key={part.key}
                      className={cn('w-full', shades[part.key])}
                      style={{
                        height: `${String((part.value / total) * 100)}%`,
                      }}
                    />
                  ) : null,
                )}
              </div>
            </div>
          );
        })}
      </div>
      <div
        aria-hidden="true"
        className="flex justify-between gap-2 text-label-sm text-text-secondary"
      >
        <span>{first?.axisLabel}</span>
        {bars.length > 2 && middle ? <span>{middle.axisLabel}</span> : null}
        {bars.length > 1 ? <span>{last?.axisLabel}</span> : null}
      </div>
      {partKeys.length > 1 ? (
        <ul aria-hidden="true" className="flex flex-wrap gap-x-4 gap-y-1">
          {partKeys.map((part) => (
            <li
              key={part.key}
              className="flex items-center gap-2 text-body-sm text-text-secondary"
            >
              <span className={cn('size-3 rounded-full', shades[part.key])} />
              {part.label}
            </li>
          ))}
        </ul>
      ) : null}
      <figcaption id={captionId} className="sr-only">
        {caption}
      </figcaption>
      {/* A table never shrinks to 1 px: the box around it hides it whole. */}
      <div className="sr-only">
        <table>
          <thead>
            <tr>
              <th scope="col">{periodHeader}</th>
              {partKeys.map((part) => (
                <th key={part.key} scope="col">
                  {part.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {bars.map((bar) => (
              <tr key={bar.key}>
                <th scope="row">{bar.label}</th>
                {bar.parts.map((part) => (
                  <td key={part.key}>{formatValue(part.value)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </figure>
  );
}

/** The five shades of the heatmap, from none to the busiest. */
const heatShades = [
  'bg-surface-variant',
  'bg-blue-100',
  'bg-blue-200',
  'bg-blue-300',
  'bg-blue-500',
];

/** The week's days by hours, the busier the darker; the hours with any appointment only. */
export function WeekdayHourHeatmap({
  cells,
  emptyText,
}: {
  cells: readonly WeekdayHour[];
  emptyText: string;
}) {
  const t = useTranslations('reports');
  const busy = cells.filter((cell) => cell.total > 0);
  if (busy.length === 0) {
    return <p className="text-body-md text-text-secondary">{emptyText}</p>;
  }
  const first = Math.min(...busy.map((cell) => cell.hour));
  const last = Math.max(...busy.map((cell) => cell.hour));
  const hours = Array.from({ length: last - first + 1 }, (_, i) => first + i);
  const max = Math.max(...busy.map((cell) => cell.total));
  const countOf = (weekday: number, hour: number) =>
    cells.find((cell) => cell.weekday === weekday && cell.hour === hour)
      ?.total ?? 0;
  const shadeOf = (count: number) =>
    heatShades[count === 0 ? 0 : Math.max(1, Math.ceil((count / max) * 4))];

  return (
    <div className="flex flex-col gap-3">
      <table className="w-full table-fixed border-separate border-spacing-0.5">
        <caption className="sr-only">{t('heatmap.title')}</caption>
        <thead>
          <tr>
            <td className="w-10" />
            {hours.map((hour) => (
              <th
                key={hour}
                scope="col"
                className="text-label-sm font-normal text-text-secondary"
              >
                {/* Every other hour, so the labels fit a phone. */}
                <span aria-hidden="true">
                  {(hour - first) % 2 === 0 ? t('heatmap.hour', { hour }) : ''}
                </span>
                <span className="sr-only">{formatHour(hour)}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {[1, 2, 3, 4, 5, 6, 7].map((weekday) => (
            <tr key={weekday}>
              <th
                scope="row"
                className="text-left text-label-sm font-normal text-text-secondary first-letter:uppercase"
              >
                {formatWeekday(weekday, 'short')}
              </th>
              {hours.map((hour) => {
                const count = countOf(weekday, hour);
                return (
                  <td key={hour} className="p-0">
                    <span
                      aria-hidden="true"
                      title={t('heatmap.cell', {
                        day: formatWeekday(weekday),
                        from: formatHour(hour),
                        to: formatHour((hour + 1) % 24),
                        count: formatFigure(count),
                      })}
                      className={cn('block h-5 rounded-xs', shadeOf(count))}
                    />
                    <span className="sr-only">{formatFigure(count)}</span>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <div
        aria-hidden="true"
        className="flex items-center justify-end gap-1.5 text-label-sm text-text-secondary"
      >
        {t('heatmap.less')}
        {heatShades.map((shade) => (
          <span key={shade} className={cn('size-3 rounded-xs', shade)} />
        ))}
        {t('heatmap.more', { max: formatFigure(max) })}
      </div>
    </div>
  );
}
