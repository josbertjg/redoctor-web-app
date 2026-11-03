import { describe, expect, it } from 'vitest';

import { agendaAddress, agendaHref, agendaInPlaceHref } from './agenda-address';

const today = '2026-10-12';
const read = (path: string | null, query = '', wide = true) =>
  agendaAddress(path, new URLSearchParams(query), wide, today);

describe('agendaAddress', () => {
  it('opens the week on a computer, the day on a phone', () => {
    expect(read(null)).toEqual({
      date: today,
      view: 'week',
      status: null,
      officeId: null,
      appointmentId: null,
    });
    expect(read(null, '', false).view).toBe('day');
    // A phone has no room for the week, whatever the address asks.
    expect(read(null, 'view=week', false).view).toBe('day');
  });

  it('opens a day the address names, and the week when asked', () => {
    expect(read('2026-10-14')).toMatchObject({
      date: '2026-10-14',
      view: 'day',
    });
    expect(read('2026-10-14', 'view=week').view).toBe('week');
    expect(read(null, 'view=day').view).toBe('day');
  });

  it('reads a malformed day as today, as the app does', () => {
    expect(read('2026-13-40')).toMatchObject({ date: today, view: 'day' });
  });

  it('keeps the filters and the open appointment, and ignores what it cannot read', () => {
    expect(
      read(
        '2026-10-14',
        'status=CONFIRMED&office=office-1&appointment=33333333-3333-4333-8333-333333333333',
      ),
    ).toMatchObject({
      status: 'CONFIRMED',
      officeId: 'office-1',
      appointmentId: '33333333-3333-4333-8333-333333333333',
    });
    expect(
      read(null, 'status=LOST&office=&appointment=%3Cscript%3E&view=month'),
    ).toEqual({
      date: today,
      view: 'week',
      status: null,
      officeId: null,
      appointmentId: null,
    });
  });
});

describe('agendaHref', () => {
  const address = read(null);

  it('writes only what the address does not already imply', () => {
    expect(agendaHref(address, today)).toBe('/panel/agenda');
    expect(agendaHref({ ...address, view: 'day' }, today)).toBe(
      '/panel/agenda?view=day',
    );
    expect(
      agendaHref({ ...address, date: '2026-10-13', view: 'day' }, today),
    ).toBe('/panel/agenda/2026-10-13');
    expect(
      agendaHref(
        {
          ...address,
          date: '2026-10-13',
          status: 'CONFIRMED',
          officeId: 'office-1',
          appointmentId: 'appt-1',
        },
        today,
      ),
    ).toBe(
      '/panel/agenda/2026-10-13?view=week&status=CONFIRMED&office=office-1&appointment=appt-1',
    );
  });

  it('reads back what it writes', () => {
    const written = {
      ...address,
      date: '2026-10-20',
      view: 'week' as const,
      status: 'NO_SHOW' as const,
    };
    const [path = '', query = ''] = agendaHref(written, today).split('?');
    expect(read(path.split('/')[3] ?? null, query)).toEqual(written);
  });
});

describe('agendaInPlaceHref', () => {
  it('keeps the path the page has, and what the path implies', () => {
    const address = read('2026-10-12', 'view=week');
    // Today named in the path still opens the day: the week is written.
    expect(
      agendaInPlaceHref({ ...address, appointmentId: 'appt-1' }, '2026-10-12'),
    ).toBe('/panel/agenda/2026-10-12?view=week&appointment=appt-1');
    expect(
      agendaInPlaceHref({ ...read(null), status: 'CONFIRMED' }, null),
    ).toBe('/panel/agenda?status=CONFIRMED');
  });
});
