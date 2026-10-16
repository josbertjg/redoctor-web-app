import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { screen, waitFor, within } from '@testing-library/react';
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

/** The box with its words, as a page gives them (translated on the server). */
function Box({ variant = 'hero' }: { variant?: 'hero' | 'bar' | 'page' }) {
  const words = useSearchBarWords();
  return (
    <SearchBar
      variant={variant}
      label="Buscar especialistas"
      words={words}
      catalog={catalog}
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
  it('offers the catalog on focus and the specialties that match as one types', async () => {
    const user = userEvent.setup();
    const { container } = renderBox();

    await user.click(whatBox());
    const list = screen.getByRole('listbox', { name: 'Sugerencias' });
    expect(
      within(list).getByRole('group', { name: 'Especialidades destacadas' }),
    ).toBeInTheDocument();
    expect(within(list).getAllByRole('option')).toHaveLength(3);

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
