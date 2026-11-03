import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { pageNamespaces } from '@/app/lib/i18n/client-messages';

import { agendaIds } from '@/tests/factories/agenda';
import { apiUrl } from '@/tests/msw/api-url';
import { server } from '@/tests/msw/server';
import { freezeClock, renderPanel } from '@/tests/panel';

import { AgendaView } from './agenda-view';

const navigation = vi.hoisted(() => ({
  push: vi.fn(),
  listeners: new Set<() => void>(),
}));

vi.mock('next/navigation', async () => {
  const { useSyncExternalStore } = await import('react');
  const subscribe = (listener: () => void) => {
    navigation.listeners.add(listener);
    return () => {
      navigation.listeners.delete(listener);
    };
  };
  return {
    useRouter: () => ({ push: navigation.push, replace: vi.fn() }),
    usePathname: () => window.location.pathname,
    // Next.js keeps useSearchParams in step with the history: so does the mock.
    useSearchParams: () =>
      new URLSearchParams(
        useSyncExternalStore(subscribe, () => window.location.search),
      ),
  };
});

// The browser's own, kept before any spy replaces them.
const pushState = History.prototype.pushState.bind(window.history);
const replaceState = History.prototype.replaceState.bind(window.history);
const notify = () => {
  navigation.listeners.forEach((listener) => {
    listener();
  });
};
const originalMatchMedia = window.matchMedia.bind(window);

/** A laptop's screen (the week fits) or a phone's. */
function screenWidth(wide: boolean) {
  window.matchMedia = (query: string) =>
    ({
      matches: wide && query === '(min-width: 64rem)',
      media: query,
      onchange: null,
      addListener: () => undefined,
      removeListener: () => undefined,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => false,
    }) as MediaQueryList;
}

function renderAgenda(path = '/panel/agenda', wide = false) {
  screenWidth(wide);
  replaceState(null, '', path);
  const [pathname = ''] = path.split('?');
  const pathDate = pathname.split('/')[3] ?? null;
  return renderPanel(<AgendaView pathDate={pathDate} />, pageNamespaces.agenda);
}

beforeEach(() => {
  freezeClock();
  vi.spyOn(window.history, 'pushState').mockImplementation((...args) => {
    pushState(...args);
    notify();
  });
  vi.spyOn(window.history, 'replaceState').mockImplementation((...args) => {
    replaceState(...args);
    notify();
  });
  vi.spyOn(window.history, 'back').mockImplementation(() => {
    // The entry before «Ver cita»: the agenda without it.
    const params = new URLSearchParams(window.location.search);
    params.delete('appointment');
    const query = params.toString();
    replaceState(
      null,
      '',
      `${window.location.pathname}${query ? `?${query}` : ''}`,
    );
    notify();
  });
});

afterEach(() => {
  window.matchMedia = originalMatchMedia;
  vi.useRealTimers();
});

describe('«Citas»', () => {
  it('lists the day on a phone, each card with its status, and is accessible', async () => {
    const { container } = renderAgenda();

    expect(
      await screen.findByRole('heading', { name: 'Agenda de hoy' }),
    ).toBeInTheDocument();
    expect(screen.getByText('4 citas')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Luisa Méndez/ }),
    ).toHaveTextContent('Confirmada');
    // The week's days across the top, today's holding four.
    expect(
      screen.getByRole('link', {
        name: 'miércoles 14 de octubre de 2026, 4 citas',
      }),
    ).toHaveAttribute('aria-current', 'date');
    // Nothing of the week view on a phone.
    expect(
      screen.queryByRole('group', { name: 'Ver por' }),
    ).not.toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it('draws the week on a computer, each appointment in its day', async () => {
    const { container } = renderAgenda('/panel/agenda', true);

    expect(
      await screen.findByRole('heading', { name: /^12 – 18 oct\.? 2026$/ }),
    ).toBeInTheDocument();
    expect(screen.getByText('5 citas esta semana')).toBeInTheDocument();
    const wednesday = screen.getByRole('list', {
      name: 'miércoles 14 de octubre de 2026',
    });
    expect(within(wednesday).getAllByRole('button')).toHaveLength(4);
    expect(
      within(
        screen.getByRole('list', { name: 'martes 13 de octubre de 2026' }),
      ).getByRole('button', {
        name: /^Rosa Lima, martes 13 de octubre de 2026, 9:00\sa\.\sm\., Finalizada$/,
      }),
    ).toBeInTheDocument();
    expect(
      within(screen.getByRole('group', { name: 'Ver por' })).getByRole('link', {
        name: 'Semana',
      }),
    ).toHaveAttribute('aria-current', 'true');
    expect(await axe(container)).toHaveNoViolations();
  });

  it('moves to tomorrow, and keeps only the status asked for', async () => {
    renderAgenda();

    expect(await screen.findByRole('link', { name: 'Mañana' })).toHaveAttribute(
      'href',
      '/panel/agenda/2026-10-15',
    );
    await userEvent.selectOptions(
      screen.getByRole('combobox', { name: 'Estado de las citas' }),
      'CONFIRMED',
    );

    // A phone shows the day whatever the screen: the address says so.
    expect(window.location.search).toBe('?view=day&status=CONFIRMED');
    expect(await screen.findByText('1 cita')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Luisa Méndez/ })).toBeVisible();
    expect(
      screen.queryByRole('button', { name: /Pedro Gil/ }),
    ).not.toBeInTheDocument();
  });

  it('opens an appointment over the agenda, its steps inside the same sheet', async () => {
    renderAgenda();

    await userEvent.click(
      await screen.findByRole('button', { name: /Luisa Méndez/ }),
    );
    const dialog = await screen.findByRole('dialog', { name: 'Ver cita' });
    expect(window.location.search).toBe(
      `?view=day&appointment=${agendaIds.lateMorning}`,
    );
    expect(
      within(dialog).getByRole('heading', { name: 'Luisa Méndez' }),
    ).toBeVisible();
    expect(within(dialog).getByText('Detalles')).toBeVisible();
    expect(
      within(dialog).getByRole('button', { name: 'Finalizar consulta' }),
    ).toBeVisible();

    // A step takes the same sheet, and goes back to the appointment.
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Reprogramar' }),
    );
    expect(
      await screen.findByRole('dialog', { name: 'Reprogramar cita' }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole('dialog')).toHaveLength(1);
    await userEvent.click(screen.getByRole('button', { name: 'Volver' }));
    expect(
      await screen.findByRole('dialog', { name: 'Ver cita' }),
    ).toBeInTheDocument();

    // Closing it takes the address back.
    await userEvent.click(screen.getByRole('button', { name: 'Cerrar' }));
    await waitFor(() => {
      expect(window.location.search).toBe('?view=day');
    });
  });

  it('finishes a consultation from the agenda, and the agenda shows it', async () => {
    renderAgenda();

    await userEvent.click(
      await screen.findByRole('button', { name: /Luisa Méndez/ }),
    );
    const dialog = await screen.findByRole('dialog', { name: 'Ver cita' });
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Finalizar consulta' }),
    );
    const confirm = await screen.findByRole('dialog', {
      name: 'Finalizar consulta',
    });
    await userEvent.click(
      within(confirm).getByRole('button', { name: 'Finalizar consulta' }),
    );

    // Back on the appointment, closed: nothing left to do with it.
    const closed = await screen.findByRole('dialog', { name: 'Ver cita' });
    expect(await within(closed).findByText('Finalizada')).toBeVisible();
    expect(
      within(closed).queryByRole('button', { name: 'No asistió' }),
    ).not.toBeInTheDocument();
  });

  it('opens a link’s appointment from the week it already read', async () => {
    // Its own read answers at once that it is not there: the week's copy
    // is what opens.
    server.use(
      http.get(apiUrl('/scheduling/appointments/:appointmentId'), () =>
        HttpResponse.json(
          { code: 'ERR_4001', message: 'Not found' },
          { status: 404 },
        ),
      ),
    );
    renderAgenda(`/panel/agenda?appointment=${agendaIds.lateMorning}`);

    const dialog = await screen.findByRole('dialog', { name: 'Ver cita' });
    expect(
      within(dialog).getByRole('heading', { name: 'Luisa Méndez' }),
    ).toBeVisible();
  });

  it('says so when the appointment a link opens is not there', async () => {
    renderAgenda(
      '/panel/agenda?appointment=aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    );

    expect(
      await screen.findByRole('heading', { name: 'No encontramos esta cita' }),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole('heading', {
        name: 'Agenda de hoy',
        hidden: true,
      }),
    ).toBeInTheDocument();
  });
});
