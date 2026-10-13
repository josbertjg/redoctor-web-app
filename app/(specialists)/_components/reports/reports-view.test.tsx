import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { pageNamespaces } from '@/app/lib/i18n/client-messages';

import { buildSpecialistReport } from '@/tests/factories/agenda';
import { freezeClock, renderPanel } from '@/tests/panel';

import { ReportsView } from './reports-view';
import { apiUrl } from '../../../../tests/msw/api-url';
import { server } from '../../../../tests/msw/server';

const navigation = vi.hoisted(() => ({
  params: new URLSearchParams(),
  replace: vi.fn(),
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: navigation.replace, push: vi.fn() }),
  useSearchParams: () => navigation.params,
  usePathname: () => '/panel/reports',
}));

const renderReports = (query = '') => {
  navigation.params = new URLSearchParams(query);
  return renderPanel(<ReportsView />, pageNamespaces.reports);
};

/** The API's answer with `canExport` as the plan says. */
const reportWith = (canExport: boolean) =>
  http.get(apiUrl('/reports/specialist'), ({ request }) => {
    const params = new URL(request.url).searchParams;
    return HttpResponse.json(
      buildSpecialistReport({
        canExport,
        range: {
          from: params.get('from'),
          to: params.get('to'),
          granularity: params.get('granularity'),
          timezone: 'America/Caracas',
        },
      }),
    );
  });

beforeEach(() => {
  freezeClock();
  navigation.replace.mockClear();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('ReportsView', () => {
  it('sums this month up as the app’s dashboard does', async () => {
    const { container } = renderReports();

    expect(
      screen.getByRole('heading', { level: 1, name: 'Estadísticas' }),
    ).toBeInTheDocument();
    // This month, counted to today, by days.
    expect(
      screen.getByText(/^1 – 14 oct\.? 2026 · por días$/),
    ).toBeInTheDocument();

    const attended = (
      await screen.findByRole('heading', { name: 'Citas atendidas' })
    ).closest('div')?.parentElement;
    if (!attended) throw new Error('No attended card');
    expect(within(attended).getByText('6')).toBeInTheDocument();
    expect(within(attended).getByText('de 12')).toBeInTheDocument();
    expect(
      within(attended).getByText('5 en los 14 días anteriores'),
    ).toBeInTheDocument();
    expect(
      within(attended).getByText('Sube frente al periodo anterior'),
    ).toBeInTheDocument();

    expect(screen.getByText('$ 210')).toBeInTheDocument();
    expect(screen.getByText('4,6')).toBeInTheDocument();
    expect(screen.getByText('5 reseñas')).toBeInTheDocument();
    expect(screen.getByText('2 ya te conocían')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Cómo terminaron tus citas' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/^martes, 9:00/)).toBeInTheDocument();
    expect(screen.getAllByText('Primera consulta').length).toBeGreaterThan(0);
    expect(await axe(container)).toHaveNoViolations();
  });

  it('opens each report in its tab', async () => {
    renderReports();
    await screen.findByRole('heading', { name: 'Citas atendidas' });

    await userEvent.click(screen.getByRole('tab', { name: 'Ingresos' }));
    expect(
      await screen.findByRole('heading', { name: 'Ingresos estimados en USD' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Ingresos por motivo en USD' }),
    ).toBeInTheDocument();

    await userEvent.click(screen.getByRole('tab', { name: 'Reseñas' }));
    expect(
      await screen.findByText('Desde siempre: 4,7 de nota media en 18 reseñas'),
    ).toBeInTheDocument();
  });

  it('keeps the period in the address', async () => {
    renderReports();
    await screen.findByRole('heading', { name: 'Citas atendidas' });

    await userEvent.selectOptions(
      screen.getByRole('combobox', { name: 'Periodo' }),
      'thisWeek',
    );
    expect(navigation.replace).toHaveBeenLastCalledWith(
      '/panel/reports?period=thisWeek',
      { scroll: false },
    );
  });

  it('says the plan does not include downloads, with support', async () => {
    server.use(reportWith(false));
    renderReports();
    await screen.findByRole('heading', { name: 'Citas atendidas' });

    await userEvent.click(screen.getByRole('button', { name: 'Descargar' }));
    const sheet = await screen.findByRole('dialog', {
      name: 'Tu plan no incluye descargas',
    });
    expect(
      within(sheet).queryByRole('button', { name: /PDF/ }),
    ).not.toBeInTheDocument();
  });

  it('offers the PDF and the spreadsheet when the plan allows it', async () => {
    server.use(reportWith(true));
    const createObjectURL = vi.fn(() => 'blob:report');
    const revokeObjectURL = vi.fn();
    vi.stubGlobal(
      'URL',
      Object.assign(URL, { createObjectURL, revokeObjectURL }),
    );
    renderReports();
    await screen.findByRole('heading', { name: 'Citas atendidas' });

    await userEvent.click(screen.getByRole('button', { name: 'Descargar' }));
    const sheet = await screen.findByRole('dialog', {
      name: 'Descargar el reporte',
    });
    expect(
      within(sheet).getByRole('button', { name: /PDF/ }),
    ).toBeInTheDocument();
    await userEvent.click(
      within(sheet).getByRole('button', { name: /Hoja de cálculo/ }),
    );
    expect(createObjectURL).toHaveBeenCalledOnce();
    vi.unstubAllGlobals();
  });
});
