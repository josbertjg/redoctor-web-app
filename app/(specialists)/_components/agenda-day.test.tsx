import { screen, within } from '@testing-library/react';
import { axe } from 'jest-axe';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { pageNamespaces } from '@/app/lib/i18n/client-messages';

import { agendaIds } from '@/tests/factories/agenda';
import { freezeClock, renderPanel } from '@/tests/panel';

import { AgendaDay } from './agenda-day';
import { apiUrl, errorEnvelope } from '../../../tests/msw/api-url';
import { server } from '../../../tests/msw/server';

const renderAgenda = (day: string | null) =>
  renderPanel(<AgendaDay day={day} />, pageNamespaces.agenda);

beforeEach(() => {
  freezeClock();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('AgendaDay', () => {
  it('lists today’s appointments by the hour, read only, with the day’s tally', async () => {
    const { container } = renderAgenda(null);

    expect(
      screen.getByRole('heading', {
        level: 2,
        name: 'miércoles 14 de octubre de 2026',
      }),
    ).toBeInTheDocument();
    await screen.findByText('Carlos Rivas');
    const cards = within(screen.getByRole('list')).getAllByRole('link');
    expect(cards.map((card) => card.getAttribute('href'))).toEqual([
      `/a/${agendaIds.earlyCompleted}`,
      `/a/${agendaIds.lateMorning}`,
      `/a/${agendaIds.afternoonPending}`,
      `/a/${agendaIds.afternoonCancelled}`,
    ]);
    // The specialist reads the patient and their document, not themselves.
    const [first] = cards;
    if (!first) throw new Error('No card for the day');
    expect(within(first).getByText('Carlos Rivas')).toBeInTheDocument();
    expect(within(first).getByText('V-12345678')).toBeInTheDocument();
    expect(
      screen.getByText('4 citas · 1 atendida · 1 cancelada'),
    ).toBeInTheDocument();
    // Today needs no way back to it.
    expect(
      screen.queryByRole('link', { name: 'Volver a hoy' }),
    ).not.toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it('steps to the days around it, each with its address', async () => {
    renderAgenda('2026-10-13');

    expect(await screen.findByText('Rosa Lima')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Día anterior' })).toHaveAttribute(
      'href',
      '/panel/agenda/2026-10-12',
    );
    expect(screen.getByRole('link', { name: 'Día siguiente' })).toHaveAttribute(
      'href',
      '/panel/agenda/2026-10-14',
    );
    expect(screen.getByRole('link', { name: 'Volver a hoy' })).toHaveAttribute(
      'href',
      '/panel/agenda',
    );
  });

  it('says so when the day has no appointments', async () => {
    renderAgenda('2026-10-02');

    expect(
      await screen.findByRole('heading', {
        name: 'No tienes citas para este día',
      }),
    ).toBeInTheDocument();
  });

  it('tells an account that is not a specialist’s the section is not for it', async () => {
    server.use(
      http.get(apiUrl('/scheduling/specialist/appointments'), () =>
        HttpResponse.json(errorEnvelope('ERR_1003', 'Forbidden'), {
          status: 403,
        }),
      ),
    );
    renderAgenda(null);

    expect(
      await screen.findByRole('heading', {
        name: 'Esta sección es para especialistas',
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ir a mi panel' })).toHaveAttribute(
      'href',
      '/panel',
    );
  });
});
