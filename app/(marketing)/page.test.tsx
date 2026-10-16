import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { forgetPlansRefusal } from '@/app/lib/data/plans';

import { buildPlans } from '@/tests/factories/billing';
import { buildSpecialtiesTreeResponse } from '@/tests/factories/specialties';
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

    expect(
      screen.getByRole('heading', { level: 1, name: /en un solo click\./ }),
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

  it('offers the catalog’s specialties under the search bar, each a search for it', async () => {
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
    expect(chips[1]).toHaveAttribute('href', '/search?specialty=s1');
  });

  it('shows no specialty with three or fewer in the catalog, keeping the search', async () => {
    server.use(
      http.get(apiUrl('/specialties/tree'), () =>
        HttpResponse.json(buildSpecialtiesTreeResponse({ specialties: 2 })),
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

  it('leads a specialist to the sign-in and a patient to the search from «Comenzar»', async () => {
    await renderHome();

    const [specialist, patient] = screen.getAllByRole('link', {
      name: 'Comenzar',
    });
    expect(specialist).toHaveAttribute('href', '/sign-in');
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
