import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { http, HttpResponse } from 'msw';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { pageNamespaces } from '@/app/lib/i18n/client-messages';

import { buildInvoice, buildPaidInvoice, usd } from '@/tests/factories/billing';
import {
  enterAll,
  stubIntersectionObserver,
} from '@/tests/intersection-observer';
import { renderPanel } from '@/tests/panel';

import { InvoicesFlow } from './invoices-flow';
import { apiUrl, errorEnvelope } from '../../../tests/msw/api-url';
import { invoicesHandler } from '../../../tests/msw/handlers/billing';
import { server } from '../../../tests/msw/server';

const navigation = vi.hoisted(() => ({
  params: new URLSearchParams(),
  replace: vi.fn(),
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: navigation.replace, push: vi.fn() }),
  useSearchParams: () => navigation.params,
  usePathname: () => '/panel/subscription/invoices',
}));

/** The item at `index`, which the test knows is there. */
function nth<T>(items: readonly T[], index: number): T {
  const item = items[index];
  if (item === undefined) throw new Error(`No item ${String(index)}`);
  return item;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

const renderInvoices = (query = '') => {
  navigation.params = new URLSearchParams(query);
  return renderPanel(<InvoicesFlow />, pageNamespaces.subscription);
};

/** A year of paid months, the newest first. */
const paidMonths = (count: number) =>
  Array.from({ length: count }, (_, index) =>
    buildPaidInvoice({
      id: `invoice-${String(index)}`,
      number: `R-2026-${String(index).padStart(6, '0')}`,
    }),
  );

/*
 * «Recibos» (`/panel/subscription/invoices`): every receipt, the newest
 * first, with the app's status chips in the address, a page at a time.
 */
describe('InvoicesFlow', () => {
  it('lists the receipts with what each covers, costs and where it stands', async () => {
    server.use(
      invoicesHandler([
        buildInvoice({ paid: usd(1000), pending: usd(2000) }),
        buildPaidInvoice(),
      ]),
    );
    const { container } = renderInvoices();

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Recibos' }),
    ).toBeInTheDocument();
    const links = await screen.findAllByRole('link', { name: /N.° R-2026/ });
    expect(links).toHaveLength(2);
    expect(within(nth(links, 0)).getByText('Por pagar')).toBeInTheDocument();
    expect(within(nth(links, 0)).getByText('Faltan $ 20')).toBeInTheDocument();
    expect(links[0]).toHaveAttribute(
      'href',
      '/panel/subscription/invoices/2a2a2a2a-2a2a-4a2a-8a2a-2a2a2a2a2a2a',
    );
    expect(within(nth(links, 1)).getByText('Pagado')).toBeInTheDocument();
    expect(screen.getByText('No hay más recibos')).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Mi suscripción' }),
    ).toHaveAttribute('href', '/panel/subscription');
    expect(await axe(container)).toHaveNoViolations();
  });

  it('keeps the status chosen in the address', async () => {
    server.use(invoicesHandler([buildInvoice(), buildPaidInvoice()]));
    renderInvoices('status=paid');

    const links = await screen.findAllByRole('link', { name: /N.° R-2026/ });
    expect(links).toHaveLength(1);
    expect(screen.getByRole('radio', { name: 'Pagados' })).toBeChecked();

    await userEvent.click(screen.getByText('Por pagar'));
    expect(navigation.replace).toHaveBeenLastCalledWith(
      '/panel/subscription/invoices?status=open',
      { scroll: false },
    );
    await userEvent.click(screen.getByText('Todos'));
    expect(navigation.replace).toHaveBeenLastCalledWith(
      '/panel/subscription/invoices',
      { scroll: false },
    );
  });

  it('brings the next page by itself as the end of the list comes into view', async () => {
    stubIntersectionObserver();
    server.use(invoicesHandler(paidMonths(23)));
    renderInvoices();

    expect(
      await screen.findAllByRole('link', { name: /N.° R-2026/ }),
    ).toHaveLength(20);
    expect(
      screen.queryByRole('button', { name: 'Ver más' }),
    ).not.toBeInTheDocument();
    enterAll();
    expect(
      await screen.findByRole('link', { name: /R-2026-000022/ }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /N.° R-2026/ })).toHaveLength(
      23,
    );
    expect(screen.getByText('No hay más recibos')).toBeInTheDocument();
  });

  it('stops at a page that fails, keeping what it shows, until «Reintentar»', async () => {
    stubIntersectionObserver();
    let failed = false;
    server.use(
      http.get(apiUrl('/billing/me/invoices'), ({ request }) => {
        const page = new URL(request.url).searchParams.get('page');
        if (page !== '2' || failed) return undefined;
        failed = true;
        return HttpResponse.json(
          errorEnvelope('ERR_1002', 'Validation failed'),
          { status: 400 },
        );
      }),
      invoicesHandler(paidMonths(23)),
    );
    renderInvoices();

    await screen.findAllByRole('link', { name: /N.° R-2026/ });
    enterAll();
    expect(
      await screen.findByText('No pudimos cargar más recibos.'),
    ).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /N.° R-2026/ })).toHaveLength(
      20,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(
      await screen.findByRole('link', { name: /R-2026-000022/ }),
    ).toBeInTheDocument();
  });

  it('says when there are none yet', async () => {
    renderInvoices();

    expect(
      await screen.findByRole('heading', {
        level: 2,
        name: 'Todavía no tienes recibos',
      }),
    ).toBeInTheDocument();
  });

  it('says when they cannot be read and offers to try again', async () => {
    server.use(
      http.get(apiUrl('/billing/me/invoices'), () =>
        HttpResponse.json(errorEnvelope('ERR_1002', 'Validation failed'), {
          status: 400,
        }),
      ),
    );
    renderInvoices();

    expect(
      await screen.findByRole('heading', {
        level: 2,
        name: 'No pudimos cargar tus recibos',
      }),
    ).toBeInTheDocument();
    server.use(invoicesHandler([buildPaidInvoice()]));
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(
      await screen.findByRole('link', { name: /N.° R-2026/ }),
    ).toBeInTheDocument();
  });
});
