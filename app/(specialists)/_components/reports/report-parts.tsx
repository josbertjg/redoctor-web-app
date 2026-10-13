import { useId, type ReactNode } from 'react';

import TrendingDown from '@material-symbols/svg-400/rounded/trending_down.svg?svgr';
import TrendingFlat from '@material-symbols/svg-400/rounded/trending_flat.svg?svgr';
import TrendingUp from '@material-symbols/svg-400/rounded/trending_up.svg?svgr';
import { useTranslations } from 'next-intl';

import { formatFigure, formatPercent } from '@/app/lib/format/figures';
import type { Trend } from '@/app/lib/reports/figures';
import { cn } from '@/app/lib/utils';

import { Icon, type IconComponent } from '@/app/ui/icons';

/*
 * The pieces the statistics are built of (M14), the app's report widgets
 * drawn with the tokens: a figure's card with how it moved, a section, a
 * bar split by its parts, a ranking. No chart library: bars are boxes of a
 * share's width, and each one says its numbers in words for every reader.
 */

/** How a figure moved against the period before: an arrow, the change, and the words for it. */
export function TrendMark({ trend }: { trend: Trend }) {
  const t = useTranslations('reports.trend');
  const icon =
    trend.direction === 'up'
      ? TrendingUp
      : trend.direction === 'down'
        ? TrendingDown
        : TrendingFlat;

  return (
    <span className="inline-flex items-center gap-1 text-label-md text-text-secondary">
      <Icon icon={icon} size={18} className="shrink-0" />
      {trend.change !== null && trend.direction !== 'flat' ? (
        <span aria-hidden="true">{formatPercent(Math.abs(trend.change))}</span>
      ) : null}
      <span className="sr-only">{t(trend.direction)}</span>
    </span>
  );
}

type MetricCardProps = {
  icon: IconComponent;
  /** The icon's tone; the brand's blue by default. */
  iconClassName?: string;
  title: string;
  value: string;
  /** Beside the figure: «de 12», «3 reseñas». */
  unit?: string | null;
  /** Under it: the period before, or why there is no figure. */
  caption?: string | null;
  trend?: Trend | null;
};

/** A figure of the period, as the app's metric card: what, how much, against before. */
export function MetricCard({
  icon,
  iconClassName,
  title,
  value,
  unit,
  caption,
  trend,
}: MetricCardProps) {
  return (
    <div className="flex min-w-0 break-inside-avoid flex-col gap-2 rounded-2xl bg-pure-white p-4 shadow-md">
      <div className="flex items-center gap-2">
        <span
          className={cn(
            'flex size-8 shrink-0 items-center justify-center rounded-full bg-info-light text-primary',
            iconClassName,
          )}
        >
          <Icon icon={icon} size={18} />
        </span>
        <h3 className="min-w-0 text-label-lg text-text-secondary">{title}</h3>
      </div>
      <p className="flex flex-wrap items-baseline gap-x-1.5">
        <span className="text-headline-sm text-text-primary">{value}</span>
        {unit ? (
          <span className="text-body-md text-text-secondary">{unit}</span>
        ) : null}
      </p>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        {trend ? <TrendMark trend={trend} /> : null}
        {caption ? (
          <p className="text-body-sm text-text-secondary">{caption}</p>
        ) : null}
      </div>
    </div>
  );
}

/** A block of a report: its title, a line under it, and its content in a card. */
export function ReportSection({
  title,
  caption,
  children,
  plain = false,
  titleHidden = false,
}: {
  title: string;
  caption?: string | null;
  children: ReactNode;
  /** Without the card: the content brings its own (the metric cards). */
  plain?: boolean;
  /** For screen readers only: a tab of the same name already says it on screen. */
  titleHidden?: boolean;
}) {
  const headingId = useId();
  return (
    <section
      aria-labelledby={headingId}
      className="flex animate-fade-up break-inside-avoid flex-col gap-3"
    >
      <div className={cn('flex flex-col gap-0.5', titleHidden && 'sr-only')}>
        <h2 id={headingId} className="text-title-lg text-text-primary">
          {title}
        </h2>
        {caption ? (
          <p className="text-body-sm text-text-secondary">{caption}</p>
        ) : null}
      </div>
      {plain ? (
        children
      ) : (
        <div className="rounded-2xl bg-pure-white p-4 shadow-md">
          {children}
        </div>
      )}
    </section>
  );
}

export type BarPart = {
  key: string;
  label: string;
  value: number;
  /** The part's fill: one of the tokens' shades. */
  className: string;
};

/**
 * A whole split by its parts, in one bar (how the appointments ended), with
 * the legend that says each part's number: the bar itself is decoration.
 */
export function SplitBar({ parts }: { parts: readonly BarPart[] }) {
  const total = parts.reduce((sum, part) => sum + part.value, 0);
  return (
    <div className="flex flex-col gap-3">
      <div
        aria-hidden="true"
        className="flex h-4 w-full overflow-hidden rounded-full bg-surface-variant"
      >
        {total > 0
          ? parts
              .filter((part) => part.value > 0)
              .map((part) => (
                <span
                  key={part.key}
                  className={cn('h-full', part.className)}
                  style={{ width: `${String((part.value / total) * 100)}%` }}
                />
              ))
          : null}
      </div>
      <ul className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
        {parts.map((part) => (
          <li key={part.key} className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className={cn('size-3 shrink-0 rounded-full', part.className)}
            />
            <span className="text-body-md text-text-secondary">
              {part.label}{' '}
              <span className="font-semibold text-text-primary">
                {formatFigure(part.value)}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export type RankEntry = {
  key: string;
  label: string;
  /** The figure as written: «12», «$ 450», «47 %». */
  value: string;
  /** The bar's length, 0 to 1 of the first entry. */
  share: number;
  /** A line under the label: «3 de 5 citas atendidas». */
  caption?: string;
};

/** A ranking, the app's: the label, its figure, a bar of its weight against the first. */
export function RankingList({
  entries,
  emptyText,
}: {
  entries: readonly RankEntry[];
  emptyText: string;
}) {
  if (entries.length === 0) {
    return <p className="text-body-md text-text-secondary">{emptyText}</p>;
  }
  return (
    <ol className="flex flex-col gap-3">
      {entries.map((entry) => (
        <li key={entry.key} className="flex flex-col gap-1">
          <div className="flex items-baseline justify-between gap-3">
            <span className="min-w-0 text-body-md break-words text-text-primary">
              {entry.label}
            </span>
            <span className="shrink-0 text-label-lg text-text-primary">
              {entry.value}
            </span>
          </div>
          <span
            aria-hidden="true"
            className="block h-2 overflow-hidden rounded-full bg-surface-variant"
          >
            {/* A sliver for the smallest share; none for nothing. */}
            <span
              className="block h-full rounded-full bg-primary"
              style={{
                width: `${String((entry.share > 0 ? Math.max(entry.share, 0.02) : 0) * 100)}%`,
              }}
            />
          </span>
          {entry.caption ? (
            <span className="text-body-sm text-text-secondary">
              {entry.caption}
            </span>
          ) : null}
        </li>
      ))}
    </ol>
  );
}
