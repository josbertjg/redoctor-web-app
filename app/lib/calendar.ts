/*
 * «Agregar al calendario» (M5): an .ics file for any calendar app (iPhone,
 * Outlook, Android's calendars) and a Google Calendar link, built in the
 * browser from what the page already has. The event says who, when and
 * where, and links back to the appointment; never the reason, which is
 * health information and calendars sync to other companies (AGENTS.md §11).
 */

export type CalendarEvent = {
  /** Stable id: the same appointment replaces itself when added again. */
  uid: string;
  title: string;
  /** Instants (ISO). Without an end, the slot's length or half an hour. */
  startsAt: string;
  endsAt: string | null;
  location: string | null;
  /** Usually the appointment's address on the web. */
  url: string;
  description: string;
};

const halfAnHour = 30 * 60_000;

function instants(event: CalendarEvent): { start: Date; end: Date } | null {
  const start = new Date(event.startsAt);
  if (Number.isNaN(start.getTime())) return null;
  const end = event.endsAt ? new Date(event.endsAt) : null;
  return {
    start,
    end:
      end && !Number.isNaN(end.getTime()) && end > start
        ? end
        : new Date(start.getTime() + halfAnHour),
  };
}

/** `20261022T190000Z`, the calendars' UTC form. */
const utcStamp = (date: Date) =>
  date
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '');

/** Text values escape `\`, `;`, `,` and line breaks (RFC 5545 §3.3.11). */
const escapeText = (value: string) =>
  value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');

/** Lines longer than 75 octets continue on the next one, after a space. */
function fold(line: string): string {
  const encoder = new TextEncoder();
  if (encoder.encode(line).length <= 75) return line;
  const parts: string[] = [];
  let current = '';
  for (const character of line) {
    const limit = parts.length === 0 ? 75 : 74;
    if (encoder.encode(current + character).length > limit) {
      parts.push(current);
      current = character;
    } else {
      current += character;
    }
  }
  parts.push(current);
  return parts.join('\r\n ');
}

/** The event as an .ics file's text, or null when it has no valid start. */
export function toIcs(
  event: CalendarEvent,
  now: Date = new Date(),
): string | null {
  const times = instants(event);
  if (times === null) return null;
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Redoctor//Web//ES',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${event.uid}`,
    `DTSTAMP:${utcStamp(now)}`,
    `DTSTART:${utcStamp(times.start)}`,
    `DTEND:${utcStamp(times.end)}`,
    `SUMMARY:${escapeText(event.title)}`,
    ...(event.location ? [`LOCATION:${escapeText(event.location)}`] : []),
    `DESCRIPTION:${escapeText(event.description)}`,
    `URL:${event.url}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  return `${lines.map(fold).join('\r\n')}\r\n`;
}

/** The same event as a Google Calendar link, or null without a valid start. */
export function googleCalendarUrl(event: CalendarEvent): string | null {
  const times = instants(event);
  if (times === null) return null;
  const url = new URL('https://calendar.google.com/calendar/render');
  url.searchParams.set('action', 'TEMPLATE');
  url.searchParams.set('text', event.title);
  url.searchParams.set(
    'dates',
    `${utcStamp(times.start)}/${utcStamp(times.end)}`,
  );
  url.searchParams.set('details', event.description);
  if (event.location) url.searchParams.set('location', event.location);
  return url.toString();
}
