import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { pageNamespaces } from '@/app/lib/i18n/client-messages';
import { searchResponseSchema, toSearchPage } from '@/app/lib/schemas/search';
import { emptySearchQuery, type SearchQuery } from '@/app/lib/search/query';

import { buildSearchResponse, searchIds } from '@/tests/factories/search';
import {
  enterAll,
  stubIntersectionObserver,
} from '@/tests/intersection-observer';
import { renderWithPageMessages } from '@/tests/render';

import { SearchNavigationProvider } from './search-navigation';
import { SearchResults } from './search-results';
import { server } from '../../../tests/msw/server';

const navigation = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: navigation.push, replace: vi.fn() }),
  usePathname: () => '/search',
}));

const catalog = [{ id: searchIds.specialty, name: 'Cardiología' }];
const today = '2026-10-14';

const caracas: SearchQuery = {
  ...emptySearchQuery,
  text: 'ana',
  location: {
    kind: 'place',
    coordinates: { lat: 10.49, lng: -66.88 },
    label: 'Caracas',
  },
  radius: 60,
};

const firstPage = () =>
  toSearchPage(searchResponseSchema.parse(buildSearchResponse()));

function renderResults(
  query: SearchQuery,
  initialPage = query.text === null && query.specialtyId === null
    ? null
    : firstPage(),
) {
  return renderWithPageMessages(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <SearchNavigationProvider>
        <SearchResults
          query={query}
          specialtyName={
            catalog.find((item) => item.id === query.specialtyId)?.name ?? null
          }
          initialPage={initialPage}
          catalog={catalog}
          today={today}
        />
      </SearchNavigationProvider>
    </QueryClientProvider>,
    pageNamespaces.search,
  );
}

beforeEach(() => {
  stubIntersectionObserver();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('SearchResults', () => {
  it('offers the catalog when nothing was asked', () => {
    renderResults(emptySearchQuery);
    expect(
      screen.getByRole('heading', {
        level: 1,
        name: '¿Qué especialista buscas?',
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Cardiología' })).toHaveAttribute(
      'href',
      `/search?specialty=${searchIds.specialty}`,
    );
  });

  it('shows the first page as the server read it: the card, its price, rating, office and days', async () => {
    const { container } = renderResults(caracas);

    expect(
      screen.getByRole('heading', { level: 1, name: '1 especialista' }),
    ).toBeInTheDocument();
    expect(screen.getByText('ana · cerca de Caracas')).toBeInTheDocument();

    const card = screen.getByRole('article', { name: 'Ana Pérez' });
    const profile = within(card).getByRole('link', { name: 'Ana Pérez' });
    expect(profile).toHaveAttribute('href', `/s/${searchIds.specialist}`);
    // The link stretches over the whole card (jsdom lays nothing out: the
    // classes say it), and the days stay above it.
    expect(profile).toHaveClass('after:absolute', 'after:inset-0');
    expect(
      within(card).getByRole('group', { name: 'Próximos días' }),
    ).toHaveClass('z-10');
    expect(within(card).getByText('Cardióloga')).toBeInTheDocument();
    expect(within(card).getByText('$ 45')).toBeInTheDocument();
    expect(within(card).getByText('(12 reseñas)')).toBeInTheDocument();
    expect(within(card).getByText(/a 3,2 km/)).toBeInTheDocument();
    expect(within(card).getByText(/y 1 más/)).toBeInTheDocument();

    const days = within(card).getByRole('group', { name: 'Próximos días' });
    const free = within(days).getByRole('link', {
      name: 'Agendar con Ana Pérez el jueves 15 de octubre de 2026',
    });
    expect(free).toHaveAttribute(
      'href',
      `/book/${searchIds.specialist}?office=${searchIds.office}&date=2026-10-15`,
    );
    expect(within(days).getByText('No disponible')).toBeInTheDocument();
    expect(
      within(days).getByRole('link', { name: 'Más fechas' }),
    ).toHaveAttribute(
      'href',
      `/book/${searchIds.specialist}?office=${searchIds.office}`,
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it('reads the first page itself when the server could not', async () => {
    renderResults(caracas, null);
    expect(
      await screen.findByRole('article', { name: 'Ana Pérez' }),
    ).toBeInTheDocument();
  });

  it('says when nothing matched and offers the whole country', async () => {
    const user = userEvent.setup();
    renderResults({ ...caracas, text: 'nadie' }, null);

    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'Vaya, no encontramos coincidencias',
      }),
    ).toBeInTheDocument();
    await user.click(
      screen.getByRole('button', { name: 'Buscar en toda Venezuela' }),
    );
    expect(navigation.push).toHaveBeenCalledWith('/search?q=nadie', {
      scroll: true,
    });
  });

  it('offers the way to try again when the search cannot be read', async () => {
    server.use(
      http.get('*/api/search', () =>
        HttpResponse.json({ code: 'ERR_UPSTREAM' }, { status: 502 }),
      ),
    );
    renderResults(caracas, null);
    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'No pudimos buscar especialistas.',
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Reintentar' }),
    ).toBeInTheDocument();
  });

  it('loads the next page as the list’s end comes into view', async () => {
    renderResults({ ...caracas, text: 'dos' }, null);
    expect(
      await screen.findByRole('article', { name: 'Ana Pérez' }),
    ).toBeInTheDocument();
    enterAll();
    expect(
      await screen.findByRole('article', { name: 'Luis Rojas' }),
    ).toBeInTheDocument();
    expect(
      within(screen.getByRole('article', { name: 'Luis Rojas' })).getByText(
        'A consultar',
      ),
    ).toBeInTheDocument();
  });

  it('changes the search from the filters, in the address', async () => {
    const user = userEvent.setup();
    renderResults(caracas);

    await user.click(screen.getByRole('button', { name: /Distancia: 60 km/ }));
    const sheet = screen.getByRole('dialog', { name: 'Distancia' });
    await user.click(
      within(sheet).getByRole('radio', { name: 'Todo el país' }),
    );
    await user.click(within(sheet).getByRole('button', { name: 'Aplicar' }));
    expect(navigation.push).toHaveBeenCalledWith(
      '/search?q=ana&lat=10.49&lng=-66.88&near=Caracas',
      { scroll: false },
    );

    await user.click(
      screen.getByRole('button', { name: /Disponibilidad: Lo antes posible/ }),
    );
    const availability = screen.getByRole('dialog', { name: 'Disponibilidad' });
    await user.click(
      within(availability).getByRole('radio', { name: 'Personalizado' }),
    );
    const day = within(availability).getByLabelText('Desde');
    await user.clear(day);
    await user.type(day, '2026-10-20');
    await user.click(
      within(availability).getByRole('button', { name: 'Aplicar' }),
    );
    expect(navigation.push).toHaveBeenLastCalledWith(
      '/search?q=ana&lat=10.49&lng=-66.88&near=Caracas&radius=60&from=2026-10-20',
      { scroll: false },
    );
  });
});
