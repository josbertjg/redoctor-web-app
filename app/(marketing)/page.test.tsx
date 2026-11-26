import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { forgetPlansRefusal } from '@/app/lib/data/plans';

import { buildPlans } from '@/tests/factories/billing';
import { searchIds } from '@/tests/factories/search';
import { buildPopularSpecialtiesResponse } from '@/tests/factories/search-highlights';
import { apiUrl } from '@/tests/msw/api-url';
import { server } from '@/tests/msw/server';
import { renderWithIntl } from '@/tests/render';

import HomePage from './page';

// The splash has played this session: the page is the landing alone. The
// panel hint is the test's to set: a specialist's browser goes to the panel.
const hints = vi.hoisted(() => ({ panel: false }));
vi.mock('next/headers', () => ({
  cookies: () =>
    Promise.resolve({
      has: () => true,
      get: (name: string) =>
        name === 'redoctor-panel' && hints.panel ? { value: '1' } : undefined,
    }),
  headers: () => Promise.resolve(new Headers()),
}));

const navigation = vi.hoisted(() => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`redirect:${path}`);
  }),
  replace: vi.fn(),
}));
vi.mock('next/navigation', () => ({
  redirect: navigation.redirect,
  useRouter: () => ({ replace: navigation.replace, push: vi.fn() }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

// The search box reads its suggestions through TanStack Query.
const renderHome = async () =>
  renderWithIntl(
    <QueryClientProvider client={new QueryClient()}>
      {await HomePage()}
    </QueryClientProvider>,
  );

describe('HomePage', () => {
  // The API answers the plans to specialists only (MSW's default); the
  // landing remembers that between reads, so each test starts afresh.
  beforeEach(() => {
    forgetPlansRefusal();
  });

  it('renders the landing without accessibility violations', async () => {
    const { container } = await renderHome();

    const heroHeading = screen.getByRole('heading', {
      level: 1,
      name: 'Confianza, salud y gestión eficiente, en un solo click.',
    });
    expect(heroHeading).toHaveAttribute(
      'aria-label',
      'Confianza, salud y gestión eficiente, en un solo click.',
    );
    expect(
      screen.getByRole('region', {
        name: 'Confianza, salud y gestión eficiente, en un solo click.',
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('search', { name: 'Buscar especialistas' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 2, name: 'Así de simple.' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 2, name: 'Elige el plan ideal' }),
    ).toBeInTheDocument();
    expect(document.querySelector('[data-splash]')).toBeNull();
    expect(await axe(container)).toHaveNoViolations();
  }, 20_000);

  it('unfolds the menu on small screens and folds it on a choice', async () => {
    await renderHome();

    await userEvent.click(
      screen.getByRole('button', { name: 'Abrir el menú' }),
    );
    const close = screen.getByRole('button', { name: 'Cerrar el menú' });
    expect(close).toHaveAttribute('aria-expanded', 'true');

    // The desktop links are only hidden by CSS: the unfolded menu's come last.
    const menuLink = screen.getAllByRole('link', { name: 'Planes' }).at(-1);
    if (!menuLink) throw new Error('The menu has no links');

    await userEvent.click(menuLink);
    expect(
      screen.getByRole('button', { name: 'Abrir el menú' }),
    ).toHaveAttribute('aria-expanded', 'false');
  });

  it('answers one question at a time', async () => {
    await renderHome();

    const first = screen.getByRole('button', {
      name: '¿Tengo que descargar una app?',
    });
    const second = screen.getByRole('button', { name: '¿Cuánto cuesta?' });
    expect(first).toHaveAttribute('aria-expanded', 'true');
    expect(second).toHaveAttribute('aria-expanded', 'false');

    await userEvent.click(second);

    expect(second).toHaveAttribute('aria-expanded', 'true');
    expect(first).toHaveAttribute('aria-expanded', 'false');
    expect(
      screen.getByText(/Redoctor es gratis para los pacientes/),
    ).toBeVisible();
  });

  it('keeps the mockup’s plans while the API answers them to specialists only', async () => {
    await renderHome();

    expect(
      screen.getByRole('heading', { level: 3, name: 'Plan Profesional' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Recomendado')).toBeInTheDocument();
    const buttons = screen.getAllByRole('link', { name: 'Seleccionar plan' });
    expect(buttons).toHaveLength(3);
    for (const button of buttons) {
      expect(button).toHaveAttribute('href', '/pay?view=plans');
    }
  });

  it('offers the API’s plans, the professional one recommended, each opening the payment with it chosen', async () => {
    server.use(
      http.get(apiUrl('/billing/plans'), () =>
        HttpResponse.json({ plans: buildPlans() }),
      ),
    );

    await renderHome();

    expect(
      screen.getByRole('heading', { level: 3, name: 'Esencial' }),
    ).toBeInTheDocument();
    expect(screen.queryByText('Antiguo')).not.toBeInTheDocument();
    const professional = screen
      .getByRole('heading', { level: 3, name: 'Profesional' })
      .closest('article');
    if (!professional) throw new Error('The plan has no card');
    expect(professional).toHaveTextContent('Recomendado');
    expect(professional).toHaveTextContent('30,00');
    expect(professional).toHaveTextContent('Para consultas en varias sedes.');
    expect(professional).toHaveTextContent('Máximo 3 consultorios');
    expect(
      within(professional).getByRole('link', { name: 'Seleccionar plan' }),
    ).toHaveAttribute('href', '/pay?plan=profesional');
  });

  it('says so when the plans cannot be read', async () => {
    server.use(
      http.get(apiUrl('/billing/plans'), () =>
        HttpResponse.json(
          { code: 'ERR_9999', message: 'Something broke' },
          { status: 500 },
        ),
      ),
    );

    await renderHome();

    expect(
      screen.getByRole('heading', {
        level: 3,
        name: 'Los planes no están disponibles ahora mismo',
      }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: 'Seleccionar plan' }),
    ).not.toBeInTheDocument();
  });

  it('offers the most booked specialties under the search bar, each a search for it', async () => {
    await renderHome();

    const chips = within(
      screen.getByRole('navigation', { name: 'Especialidades' }),
    ).getAllByRole('link');

    expect(chips.map((chip) => chip.textContent)).toEqual([
      'Cardiología',
      'Ginecología y Obstetricia',
      'Medicina General',
      'Medicina',
    ]);
    expect(chips[0]).toHaveAttribute('href', '/search?specialty=s2');
  });

  it('offers the catalog under the search bar when the most booked cannot be read', async () => {
    server.use(
      http.get(apiUrl('/search/specialties/popular'), () =>
        HttpResponse.json({ code: 'ERR_1007' }, { status: 429 }),
      ),
    );

    await renderHome();

    const chips = within(
      screen.getByRole('navigation', { name: 'Especialidades' }),
    ).getAllByRole('link');
    expect(chips.map((chip) => chip.textContent)).toEqual([
      'Medicina',
      'Medicina General',
      'Cardiología',
      'Ginecología y Obstetricia',
    ]);
  });

  it('shows no specialty with three or fewer booked, keeping the search', async () => {
    server.use(
      http.get(apiUrl('/search/specialties/popular'), () =>
        HttpResponse.json(buildPopularSpecialtiesResponse({ count: 3 })),
      ),
    );

    await renderHome();

    expect(
      screen.queryByRole('navigation', { name: 'Especialidades' }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('search', { name: 'Buscar especialistas' }),
    ).toBeInTheDocument();
  });

  it('shows the best rated specialists, each opening the profile and its days the booking', async () => {
    await renderHome();

    const section = screen.getByRole('region', {
      name: 'Los mejor valorados por sus pacientes',
    });
    const cards = within(section).getAllByRole('article');
    expect(cards.map((card) => card.getAttribute('aria-labelledby'))).toEqual([
      `specialist-${searchIds.specialist}-name`,
      'specialist-b1b2b3b4-0000-4000-8000-000000000002-name',
    ]);
    const first = within(section).getByRole('article', { name: 'Ana Pérez' });
    expect(
      within(first).getByRole('heading', { level: 3, name: /^Ana Pérez/ }),
    ).toBeInTheDocument();
    expect(
      within(first).getByRole('link', { name: 'Ana Pérez' }),
    ).toHaveAttribute('href', `/s/${searchIds.specialist}`);
    // The national ranking: no point, so no distance.
    expect(within(first).queryByText(/km/)).not.toBeInTheDocument();
    expect(
      within(section).getByRole('link', { name: 'Ver más especialistas' }),
    ).toHaveAttribute('href', '/search');
  });

  it('leaves the best rated out when the API cannot answer them', async () => {
    server.use(
      http.get(apiUrl('/search/specialists/featured'), () =>
        HttpResponse.json({ code: 'ERR_1007' }, { status: 429 }),
      ),
    );

    await renderHome();

    expect(
      screen.queryByRole('region', {
        name: 'Los mejor valorados por sus pacientes',
      }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 2, name: 'Así de simple.' }),
    ).toBeInTheDocument();
  });

  it('offers Redoctor’s channels in the footer: the email, the API’s lines and the Instagram', async () => {
    await renderHome();

    const contact = within(screen.getByRole('list', { name: 'Contáctanos' }));
    expect(
      contact.getAllByRole('link').map((link) => link.textContent),
    ).toEqual([
      'gerencia@redoctorapp.com',
      'WhatsApp +58 424 0000002',
      '+58 414 0000001',
      '@redoctorapp',
    ]);
  });

  it('leads a specialist to the sign-up and a patient to the search from «Comenzar»', async () => {
    await renderHome();

    const [specialist, patient] = screen.getAllByRole('link', {
      name: 'Comenzar',
    });
    expect(specialist).toHaveAttribute('href', '/sign-up?as=specialist');
    expect(patient).toHaveAttribute('href', '/search');
  });

  it('sends a specialist’s browser to the panel before painting the landing', async () => {
    hints.panel = true;
    try {
      await expect(HomePage()).rejects.toThrow('redirect:/panel');
    } finally {
      hints.panel = false;
    }
  });
});
