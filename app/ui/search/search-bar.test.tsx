import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithIntl } from '@/tests/render';

import { SearchBar } from './search-bar';
import { useSearchBarWords } from './search-bar-words';
import { server } from '../../../tests/msw/server';

import type { SearchCatalog } from './search-bar-types';

const navigation = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: navigation.push, replace: vi.fn() }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

const catalog: SearchCatalog = [
  { id: 'a0000000-0000-4000-8000-000000000001', name: 'Medicina' },
  { id: 'a0000000-0000-4000-8000-000000000002', name: 'Cardiología' },
  { id: 'a0000000-0000-4000-8000-000000000003', name: 'Odontología' },
];

/** The most booked, in the API's order (REDOC-182): not the catalog's. */
const topSpecialties: SearchCatalog = [
  { id: 'a0000000-0000-4000-8000-000000000003', name: 'Odontología' },
  { id: 'a0000000-0000-4000-8000-000000000002', name: 'Cardiología' },
];

/** The box with its words, as a page gives them (translated on the server). */
function Box({ variant = 'hero' }: { variant?: 'hero' | 'bar' | 'page' }) {
  const words = useSearchBarWords();
  return (
    <SearchBar
      variant={variant}
      label="Buscar especialistas"
      words={words}
      catalog={catalog}
      topSpecialties={topSpecialties}
    />
  );
}

const renderBox = (variant?: 'hero' | 'bar' | 'page') =>
  renderWithIntl(
    <QueryClientProvider client={new QueryClient()}>
      <Box {...(variant ? { variant } : {})} />
    </QueryClientProvider>,
  );

const whatBox = () =>
  screen.getByRole('combobox', {
    name: 'Especialidad o nombre del especialista',
  });
const whereBox = () => screen.getByRole('combobox', { name: 'Ubicación' });

/** jsdom has no geolocation: the test gives the browser one, and takes it back. */
function stubGeolocation(getCurrentPosition: unknown) {
  Object.defineProperty(navigator, 'geolocation', {
    value: { getCurrentPosition },
    configurable: true,
  });
}

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  Reflect.deleteProperty(navigator, 'geolocation');
});

describe('SearchBar', () => {
  it('offers the most booked specialties on focus and the catalog’s that match as one types', async () => {
    const user = userEvent.setup();
    const { container } = renderBox();

    await user.click(whatBox());
    const list = screen.getByRole('listbox', { name: 'Sugerencias' });
    const top = within(list).getByRole('group', {
      name: 'Especialidades destacadas',
    });
    expect(
      within(top)
        .getAllByRole('option')
        .map((option) => option.textContent),
    ).toEqual(['Odontología', 'Cardiología']);

    await user.type(whatBox(), 'cardio');
    expect(
      within(list).getByRole('option', { name: 'Buscar «cardio»' }),
    ).toBeInTheDocument();
    const specialty = within(list).getByRole('option', { name: 'Cardiología' });
    expect(specialty.querySelector('mark')).toHaveTextContent('Cardio');
    expect(
      within(list).queryByRole('option', { name: 'Odontología' }),
    ).not.toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it('suggests the specialists whose name holds the text, from the API', async () => {
    const user = userEvent.setup();
    renderBox();

    await user.type(whatBox(), 'ana');
    const row = await screen.findByRole('option', { name: /Ana Pérez/ });
    expect(row).toHaveTextContent('Cardióloga');

    await user.click(row);
    expect(navigation.push).toHaveBeenCalledWith(
      '/s/a0af9566-a53d-4887-8d16-1dfc589c2f3d',
    );
  });

  it('searches a specialty of the catalog by its id, and remembers it', async () => {
    const user = userEvent.setup();
    renderBox();

    await user.type(whatBox(), 'odont');
    await user.click(screen.getByRole('option', { name: 'Odontología' }));
    await waitFor(() => {
      expect(navigation.push).toHaveBeenCalledWith(
        '/search?specialty=a0000000-0000-4000-8000-000000000003',
      );
    });
    expect(whatBox()).toHaveValue('Odontología');

    await user.clear(whatBox());
    await user.click(whatBox());
    const recent = screen.getByRole('group', { name: 'Búsquedas recientes' });
    expect(
      within(recent).getByRole('option', { name: /Odontología/ }),
    ).toBeInTheDocument();
  });

  it('searches the text on Enter, and the arrows walk the list', async () => {
    const user = userEvent.setup();
    renderBox();

    await user.type(whatBox(), 'cardio{ArrowDown}{ArrowDown}');
    expect(whatBox()).toHaveAttribute(
      'aria-activedescendant',
      screen.getByRole('option', { name: 'Cardiología' }).id,
    );
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();

    await user.keyboard('{Enter}');
    await waitFor(() => {
      expect(navigation.push).toHaveBeenCalledWith('/search?q=cardio');
    });
  });

  it('asks for something to look for before searching', async () => {
    const user = userEvent.setup();
    renderBox();

    await user.click(screen.getByRole('button', { name: 'Buscar' }));
    expect(
      screen.getByText(
        'Debes realizar una búsqueda o seleccionar una especialidad',
      ),
    ).toBeVisible();
    expect(navigation.push).not.toHaveBeenCalled();
    expect(whatBox()).toHaveFocus();
  });

  it('takes a place typed, from Google through the web’s server', async () => {
    const user = userEvent.setup();
    renderBox();

    await user.type(whereBox(), 'mara');
    const places = await screen.findByRole('group', { name: 'Lugares' });
    const option = within(places).getByRole('option', { name: /Maracaibo/ });
    expect(option.querySelector('mark')).toHaveTextContent('Mara');
    expect(option).toHaveTextContent('Zulia, Venezuela');
    await user.click(option);
    await waitFor(() => {
      expect(whereBox()).toHaveValue('Maracaibo');
    });

    await user.type(whatBox(), 'ana{Enter}');
    await waitFor(() => {
      expect(navigation.push).toHaveBeenCalledWith(
        '/search?q=ana&lat=10.65&lng=-71.64&near=Maracaibo',
      );
    });
  });

  it('resolves a place typed and never picked on the search', async () => {
    const user = userEvent.setup();
    renderBox();

    await user.type(whereBox(), 'maracay');
    await user.type(whatBox(), 'ana{Enter}');
    await waitFor(() => {
      expect(navigation.push).toHaveBeenCalledWith(
        '/search?q=ana&lat=10.65&lng=-71.64&near=Maracaibo',
      );
    });
  });

  it('shows it is busy while it places what was typed, and searches once', async () => {
    const user = userEvent.setup();
    renderBox();
    await user.type(whereBox(), 'maracay');
    await user.type(whatBox(), 'ana');

    // Google answers late: the second tap comes while it is placing.
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    server.use(
      http.get('*/api/places/details', async () => {
        await gate;
        return HttpResponse.json({
          coordinates: { lat: 10.65, lng: -71.64 },
        });
      }),
    );
    const submit = screen.getByRole('button', { name: 'Buscar' });
    await user.click(submit);
    await waitFor(() => {
      expect(submit).toHaveAttribute('aria-busy', 'true');
    });
    await user.click(submit);
    release();

    await waitFor(() => {
      expect(navigation.push).toHaveBeenCalled();
    });
    expect(navigation.push).toHaveBeenCalledOnce();
  });

  it('says when the places cannot be read, and keeps typing', async () => {
    server.use(
      http.get('*/api/places/suggestions', () =>
        HttpResponse.json({ code: 'ERR_PLACES' }, { status: 502 }),
      ),
    );
    const user = userEvent.setup();
    renderBox();

    await user.type(whereBox(), 'mara');
    expect(
      await screen.findByText('No pudimos buscar lugares. Intenta de nuevo.'),
    ).toBeInTheDocument();
  });

  it('uses the device’s position when asked, rounded', async () => {
    const user = userEvent.setup();
    const getCurrentPosition = vi.fn(
      (success: (position: GeolocationPosition) => void) => {
        success({
          coords: { latitude: 10.49123, longitude: -66.87988 },
        } as GeolocationPosition);
      },
    );
    stubGeolocation(getCurrentPosition);
    renderBox();

    await user.click(screen.getByRole('button', { name: 'Usar mi ubicación' }));
    await waitFor(() => {
      expect(whereBox()).toHaveValue('Ubicación actual');
    });

    await user.type(whatBox(), 'ana{Enter}');
    await waitFor(() => {
      expect(navigation.push).toHaveBeenCalledWith(
        '/search?q=ana&lat=10.49&lng=-66.88&by=device',
      );
    });
  });

  it('dims the page while a field is in use, until the person leaves the box or taps the shade', async () => {
    const user = userEvent.setup();
    renderWithIntl(
      <QueryClientProvider client={new QueryClient()}>
        <Box />
        <button type="button">Fuera del buscador</button>
      </QueryClientProvider>,
    );
    const shade = () => document.querySelector('[data-search-shade]');

    // Nothing over the page before the box is used.
    expect(shade()).toBeNull();
    await user.click(whatBox());
    expect(shade()).toHaveAttribute('data-open');
    // From one field to the other, the page stays dimmed.
    await user.click(whereBox());
    expect(shade()).toHaveAttribute('data-open');
    await user.click(
      screen.getByRole('button', { name: 'Fuera del buscador' }),
    );
    expect(shade()).not.toHaveAttribute('data-open');

    // A tap on the shade itself leaves the box, list and all.
    await user.click(whatBox());
    const open = shade();
    if (!open) throw new Error('The shade should be there');
    await user.click(open);
    expect(shade()).not.toHaveAttribute('data-open');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('closes its lists once the focus leaves the box, as when the docked bar hides it', async () => {
    const user = userEvent.setup();
    renderBox('bar');

    // Scrolling back up turns the docked bar inert: the browser takes the
    // focus away, naming nothing new, and the list must leave with it
    // instead of waiting open for the bar's next docking.
    await user.click(whatBox());
    expect(
      screen.getByRole('listbox', { name: 'Sugerencias' }),
    ).toBeInTheDocument();
    act(() => {
      whatBox().blur();
    });
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();

    await user.click(whereBox());
    expect(
      screen.getByRole('listbox', { name: 'Ubicación' }),
    ).toBeInTheDocument();
    act(() => {
      whereBox().blur();
    });
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('tells in the docked bar what is missing, until a tap elsewhere or Escape puts it away', async () => {
    const user = userEvent.setup();
    renderWithIntl(
      <QueryClientProvider client={new QueryClient()}>
        <Box variant="bar" />
        <p>Fuera del buscador</p>
      </QueryClientProvider>,
    );
    const missing =
      'Debes realizar una búsqueda o seleccionar una especialidad';

    await user.click(screen.getByRole('button', { name: 'Buscar' }));
    expect(screen.getByText(missing)).not.toHaveAttribute('aria-hidden');
    expect(whatBox()).toHaveAccessibleDescription(missing);
    expect(navigation.push).not.toHaveBeenCalled();

    // The line floats over the page: a tap elsewhere puts it away…
    await user.click(screen.getByText('Fuera del buscador'));
    expect(screen.getByText(missing)).toHaveAttribute('aria-hidden', 'true');

    // …until the next try, which tells it again; and Escape puts it away too.
    await user.click(screen.getByRole('button', { name: 'Buscar' }));
    expect(screen.getByText(missing)).not.toHaveAttribute('aria-hidden');
    await user.keyboard('{Escape}');
    expect(screen.getByText(missing)).toHaveAttribute('aria-hidden', 'true');
  });

  it('tells in the docked bar when the browser refuses the position', async () => {
    const user = userEvent.setup();
    stubGeolocation(
      vi.fn(
        (
          _success: PositionCallback,
          failure: (error: GeolocationPositionError) => void,
        ) => {
          failure({
            code: 1,
            PERMISSION_DENIED: 1,
            message: 'denied',
          } as GeolocationPositionError);
        },
      ),
    );
    renderBox('bar');

    await user.click(screen.getByRole('button', { name: 'Usar mi ubicación' }));
    expect(
      await screen.findByText(
        'Necesitamos tu permiso de ubicación para buscar cerca de ti.',
      ),
    ).not.toHaveAttribute('aria-hidden');
  });

  it('tells what the browser said of the position, even after an empty search', async () => {
    const user = userEvent.setup();
    stubGeolocation(
      vi.fn(
        (
          _success: PositionCallback,
          failure: (error: GeolocationPositionError) => void,
        ) => {
          failure({
            code: 1,
            PERMISSION_DENIED: 1,
            message: 'denied',
          } as GeolocationPositionError);
        },
      ),
    );
    renderBox('bar');

    await user.click(screen.getByRole('button', { name: 'Buscar' }));
    // The latest thing done gets its answer: the place, not the old line.
    await user.click(screen.getByRole('button', { name: 'Usar mi ubicación' }));
    expect(
      await screen.findByText(
        'Necesitamos tu permiso de ubicación para buscar cerca de ti.',
      ),
    ).not.toHaveAttribute('aria-hidden');
    expect(
      screen.queryByText(
        'Debes realizar una búsqueda o seleccionar una especialidad',
      ),
    ).not.toBeInTheDocument();
  });

  it('says so when the browser refuses the position', async () => {
    const user = userEvent.setup();
    const getCurrentPosition = vi.fn(
      (
        _success: PositionCallback,
        failure: (error: GeolocationPositionError) => void,
      ) => {
        failure({
          code: 1,
          PERMISSION_DENIED: 1,
          message: 'denied',
        } as GeolocationPositionError);
      },
    );
    stubGeolocation(getCurrentPosition);
    renderBox();

    await user.click(screen.getByRole('button', { name: 'Usar mi ubicación' }));
    expect(
      await screen.findByText(
        'Necesitamos tu permiso de ubicación para buscar cerca de ti.',
      ),
    ).toBeVisible();
  });
});
