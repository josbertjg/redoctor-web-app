import type { AppointmentSummary } from '@/app/lib/schemas/appointments';

export type WeekBlock = {
  appointment: AppointmentSummary;
  /** Its column: the day it falls on (YYYY-MM-DD). */
  day: string;
  /** Minutes from the grid's first hour to its start. */
  top: number;
  /** Its length in minutes. */
  height: number;
  /** Its place among the ones it overlaps, and how many share the width. */
  column: number;
  columns: number;
};

export type WeekLayout = {
  /** The grid's hours: from the first (included) to the last (excluded). */
  hours: { from: number; to: number };
  blocks: WeekBlock[];
};

/** The working day the grid shows at least (the frame's 8 AM onwards, to the evening). */
const workingDay = { from: 8, to: 18 };
/** What an appointment with no end lasts on the grid. */
const defaultLength = 30;

/** Minutes from midnight of a wall time (`HH:MM`). */
const minutesOf = (time: string) => {
  const [hour = 0, minute = 0] = time.split(':').map(Number);
  return hour * 60 + minute;
};

/*
 * The week as the designer's grid draws it (`4647:2160`): the days as
 * columns, the hours as rows, each appointment a block by its start and
 * length, in its office's wall time (the API's `startTime` and `endTime`).
 * The rows span the working day at least, and the week's earliest and
 * latest appointment. Appointments that overlap share their day's width
 * side by side: each takes the first column free at its start, and every
 * appointment of a run of overlaps takes as many columns as that run
 * needs at once.
 */
export function weekLayout(
  appointments: readonly AppointmentSummary[],
  days: readonly string[],
): WeekLayout {
  const inWeek = appointments
    .filter((appointment) => days.includes(appointment.date))
    .map((appointment) => {
      const start = minutesOf(appointment.startTime);
      const end = appointment.endTime ? minutesOf(appointment.endTime) : NaN;
      // An end at midnight closes the day; none, or a broken one, is the default.
      const close = end === 0 ? 24 * 60 : end;
      return {
        appointment,
        start,
        end:
          Number.isFinite(close) && close > start
            ? close
            : start + defaultLength,
      };
    })
    .sort((a, b) => a.start - b.start || a.end - b.end);

  const from = Math.min(
    workingDay.from,
    ...inWeek.map((item) => Math.floor(item.start / 60)),
  );
  const to = Math.max(
    workingDay.to,
    ...inWeek.map((item) => Math.min(24, Math.ceil(item.end / 60))),
  );

  const blocks: WeekBlock[] = [];
  for (const day of days) {
    let run: { item: (typeof inWeek)[number]; column: number }[] = [];
    /** Where each column is free again, in this run. */
    let columnEnds: number[] = [];
    let runEnd = -1;
    const closeRun = () => {
      for (const { item, column } of run) {
        blocks.push({
          appointment: item.appointment,
          day,
          top: item.start - from * 60,
          height: item.end - item.start,
          column,
          columns: columnEnds.length,
        });
      }
      run = [];
      columnEnds = [];
    };
    for (const item of inWeek.filter(
      (entry) => entry.appointment.date === day,
    )) {
      if (item.start >= runEnd) closeRun();
      const free = columnEnds.findIndex((end) => end <= item.start);
      const column = free === -1 ? columnEnds.length : free;
      columnEnds[column] = item.end;
      run.push({ item, column });
      runEnd = Math.max(runEnd, item.end);
    }
    closeRun();
  }
  return { hours: { from, to }, blocks };
}
