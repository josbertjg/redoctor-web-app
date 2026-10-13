import type {
  AppointmentsSection,
  IncomeCurrency,
  IncomeSection,
  ReasonsSection,
  ReviewsSection,
} from '../schemas/reports';

/*
 * The readings the statistics make of the API's numbers (M14), the app's
 * own (`ReportTrend`, `mainCurrency`, `busiestSlots`, `byDemand`): how a
 * figure moved against the period before, the currency that sums up the
 * income, the busiest hours, the reasons in order.
 */

export type TrendDirection = 'up' | 'down' | 'flat';

export type Trend = {
  direction: TrendDirection;
  /** Relative change, 0.25 for 25 % more; null when there was nothing before to measure against. */
  change: number | null;
};

export function trendOf(current: number, previous: number): Trend {
  return {
    direction: current > previous ? 'up' : current < previous ? 'down' : 'flat',
    change: previous === 0 ? null : (current - previous) / previous,
  };
}

/** How the period's appointments ended; `open` are still to confirm or to attend. */
export type Outcome = {
  total: number;
  completed: number;
  cancelled: number;
  noShow: number;
  open: number;
};

export function outcomeOf(appointments: AppointmentsSection): Outcome {
  const { COMPLETED, CANCELLED, NO_SHOW } = appointments.byStatus;
  const resolved = COMPLETED + CANCELLED + NO_SHOW;
  return {
    total: appointments.total,
    completed: COMPLETED,
    cancelled: CANCELLED,
    noShow: NO_SHOW,
    open: Math.max(appointments.total - resolved, 0),
  };
}

/** Attended appointments against the period before. */
export function completedTrend(appointments: AppointmentsSection): Trend {
  return trendOf(
    appointments.byStatus.COMPLETED,
    appointments.previous.completed,
  );
}

/**
 * The currency in which the specialist attended most appointments: the one
 * that sums up their income where only one figure fits. Adding currencies
 * together would make up a figure that does not exist. Null when no
 * attended appointment had a price.
 */
export function mainCurrency(income: IncomeSection): IncomeCurrency | null {
  let main: IncomeCurrency | null = null;
  for (const currency of income.currencies) {
    if (main === null || currency.appointments > main.appointments) {
      main = currency;
    }
  }
  return main;
}

/** The rating against the period before; nothing to measure without both averages. */
export function averageTrend(reviews: ReviewsSection): Trend | null {
  const { average } = reviews;
  const before = reviews.previous.average;
  if (average === null || before === null) return null;
  return trendOf(average, before);
}

export type WeekdayHour = AppointmentsSection['byWeekdayHour'][number];

/** The day-and-hour slots from most to fewest appointments; a tie goes to the earlier in the week. */
export function busiestSlots(appointments: AppointmentsSection): WeekdayHour[] {
  return appointments.byWeekdayHour
    .filter((cell) => cell.total > 0)
    .sort(
      (a, b) => b.total - a.total || a.weekday - b.weekday || a.hour - b.hour,
    );
}

export type ReasonItem = ReasonsSection['items'][number];

/** The reasons from most to fewest appointments. */
export function reasonsByDemand(reasons: ReasonsSection): ReasonItem[] {
  return [...reasons.items].sort((a, b) => b.total - a.total);
}

/** The reasons from most to fewest attended. */
export function reasonsByCompleted(reasons: ReasonsSection): ReasonItem[] {
  return [...reasons.items].sort((a, b) => b.completed - a.completed);
}

/** A currency's reasons from most to least invoiced. */
export function reasonsByIncome(
  currency: IncomeCurrency,
): IncomeCurrency['byReason'] {
  return [...currency.byReason].sort((a, b) => b.total - a.total);
}

/** The share of a part in a whole, 0 when there is no whole. */
export function shareOf(part: number, whole: number): number {
  return whole > 0 ? part / whole : 0;
}
