// @vitest-environment node
import { describe, expect, it } from 'vitest';

import { googleCalendarUrl, toIcs, type CalendarEvent } from './calendar';

const event: CalendarEvent = {
  uid: '8f2c1a3e-6b7d-4c2e-9a1f-3d4e5f6a7b8c@redoctorapp.com',
  title: 'Cita con Dra. María González',
  startsAt: '2026-10-22T19:00:00.000Z',
  endsAt: '2026-10-22T19:30:00.000Z',
  location: 'Clínica Canaima, Av. Francisco de Miranda; piso 3',
  url: 'https://redoctorapp.com/a/8f2c1a3e-6b7d-4c2e-9a1f-3d4e5f6a7b8c',
  description: 'Tu cita en Redoctor.',
};

describe('toIcs', () => {
  const ics = toIcs(event, new Date('2026-10-12T12:00:00.000Z')) ?? '';

  it('writes one event with its UTC times and CRLF lines', () => {
    expect(ics.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true);
    expect(ics).toContain('DTSTART:20261022T190000Z\r\n');
    expect(ics).toContain('DTEND:20261022T193000Z\r\n');
    expect(ics).toContain('DTSTAMP:20261012T120000Z\r\n');
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true);
  });

  it('escapes commas and semicolons in text', () => {
    expect(ics).toContain(
      'LOCATION:Clínica Canaima\\, Av. Francisco de Miranda\\; piso 3',
    );
  });

  it('folds lines longer than 75 octets', () => {
    const long = toIcs({ ...event, description: 'á'.repeat(80) }) ?? '';
    for (const line of long.split('\r\n')) {
      expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
    }
  });

  it('lasts half an hour when the end is missing, and needs a start', () => {
    expect(toIcs({ ...event, endsAt: null })).toContain(
      'DTEND:20261022T193000Z',
    );
    expect(toIcs({ ...event, startsAt: 'soon' })).toBeNull();
  });
});

describe('googleCalendarUrl', () => {
  it('fills Google Calendar’s template', () => {
    const url = new URL(googleCalendarUrl(event) ?? '');
    expect(url.origin).toBe('https://calendar.google.com');
    expect(url.searchParams.get('action')).toBe('TEMPLATE');
    expect(url.searchParams.get('dates')).toBe(
      '20261022T190000Z/20261022T193000Z',
    );
    expect(url.searchParams.get('text')).toBe('Cita con Dra. María González');
  });
});
