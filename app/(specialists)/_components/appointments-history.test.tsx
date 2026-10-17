import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { pageNamespaces } from '@/app/lib/i18n/client-messages';

import { buildOffices, caracasAt } from '@/tests/factories/agenda';
import { buildAppointment, officeId } from '@/tests/factories/appointments';
import {
  enterAll,
  stubIntersectionObserver,
  watching,
} from '@/tests/intersection-observer';
import { freezeClock, renderPanel } from '@/tests/panel';

import { AppointmentsHistory } from './appointments-history';
import { apiUrl } from '../../../tests/msw/api-url';
import { server } from '../../../tests/msw/server';

const navigation = vi.hoisted(() => ({
  params: new URLSearchParams(),
  replace: vi.fn(),
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: navigation.replace, push: vi.fn() }),
  useSearchParams: () => navigation.params,
  usePathname: () => '/panel/appointments',
}));

const renderHistory = (query = '') => {
  navigation.params = new URLSearchParams(query);
  window.history.replaceState(
    null,
    '',
    `/panel/appointments${query ? `?${query}` : ''}`,
  );
  return renderPanel(<AppointmentsHistory />, pageNamespaces.agenda);
};

beforeEach(() => {
  freezeClock();
  navigation.replace.mockClear();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('AppointmentsHistory', () => {
  it('lists every appointment, the latest first, grouped by day', async () => {
    const { container } = renderHistory();

    expect(await screen.findByText('7 citas')).toBeInTheDocument();
    expect(
      screen
        .getAllByRole('heading', { level: 2 })
        .map((heading) => heading.textContent),
    ).toEqual([
      'martes 20 de octubre de 2026',
      'miércoles 14 de octubre de 2026',
      'martes 13 de octubre de 2026',
      'jueves 1 de octubre de 2026',
    ]);
    expect(await axe(container)).toHaveNoViolations();
  });

  it('shows ten at a time, the next ten as the end of the list comes into view', async () => {
    stubIntersectionObserver();
    // 25 attended consultations, one a day of September, the latest first.
    const many = Array.from({ length: 25 }, (_, index) =>
      buildAppointment(
        {
          id: `history-${String(index)}`,
          attendee: { firstName: 'Paciente', lastName: String(index + 1) },
          status: 'COMPLETED',
          persistedStatus: 'COMPLETED',
        },
        caracasAt(`2026-09-${String(index + 1).padStart(2, '0')}`, 9),
      ),
    );
    server.use(
      http.get(apiUrl('/scheduling/specialist/appointments'), () =>
        HttpResponse.json({
          appointments: many,
          total: many.length,
          page: 1,
          pageSize: 100,
        }),
      ),
    );
    renderHistory();

    expect(await screen.findByText('25 citas')).toBeInTheDocument();
    expect(screen.getAllByText(/^Paciente \d+$/)).toHaveLength(10);
    expect(
      screen.queryByRole('button', { name: 'Ver más' }),
    ).not.toBeInTheDocument();

    // The list arrives in a transition (its skeleton crossfades into it):
    // its foot is watched once it has mounted.
    await waitFor(() => {
      expect(watching()).toBeGreaterThan(0);
    });
    enterAll();
    expect(await screen.findByText('Paciente 15')).toBeInTheDocument();
    expect(screen.getAllByText(/^Paciente \d+$/)).toHaveLength(20);
    await waitFor(() => {
      expect(watching()).toBeGreaterThan(0);
    });
    enterAll();
    expect(await screen.findByText('Paciente 1')).toBeInTheDocument();
    expect(screen.getAllByText(/^Paciente \d+$/)).toHaveLength(25);
  });

  it('keeps the filters in the address', async () => {
    renderHistory();
    await screen.findByText('7 citas');

    await userEvent.click(screen.getByRole('radio', { name: 'Cancelada' }));
    expect(navigation.replace).toHaveBeenLastCalledWith(
      '/panel/appointments?status=CANCELLED',
      { scroll: false },
    );

    await userEvent.type(screen.getByLabelText('Buscar'), 'rosa');
    // The search waits for a pause in the typing.
    await waitFor(
      () => {
        expect(navigation.replace).toHaveBeenLastCalledWith(
          '/panel/appointments?q=rosa',
          { scroll: false },
        );
      },
      { timeout: 1500 },
    );
  });

  it('reads the filters from the address and clears them', async () => {
    renderHistory('status=CANCELLED');

    expect(await screen.findByText('1 cita')).toBeInTheDocument();
    expect(screen.getByText('Ana Pérez')).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Cancelada' })).toBeChecked();
    await userEvent.click(screen.getByRole('button', { name: 'Quitar' }));
    expect(navigation.replace).toHaveBeenLastCalledWith('/panel/appointments', {
      scroll: false,
    });
  });

  it('says so when no appointment matches, with the way to clear the filters', async () => {
    renderHistory('q=nadie');

    expect(
      await screen.findByRole('heading', { name: 'No se encontraron citas' }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Quitar' })).toHaveLength(2);
  });

  it('refuses dates the wrong way round, and offers the offices when there are two', async () => {
    server.use(
      http.get(apiUrl('/specialists/offices'), () =>
        HttpResponse.json(
          buildOffices([
            { id: officeId, name: 'Clínica Canaima' },
            { id: 'office-2', name: 'Torre Médica' },
          ]),
        ),
      ),
    );
    renderHistory('from=2026-10-14&to=2026-10-01');

    expect(
      await screen.findByText('La fecha «Desde» debe ser anterior a «Hasta».'),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole('combobox', { name: 'Consultorio' }),
    ).toBeInTheDocument();
  });
});
