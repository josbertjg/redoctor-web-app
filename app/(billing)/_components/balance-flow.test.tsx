import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { http, HttpResponse } from 'msw';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { pageNamespaces } from '@/app/lib/i18n/client-messages';

import { buildBalanceMovement, usd } from '@/tests/factories/billing';
import { stubIntersectionObserver } from '@/tests/intersection-observer';
import { renderPanel } from '@/tests/panel';

import { BalanceFlow } from './balance-flow';
import { apiUrl, errorEnvelope } from '../../../tests/msw/api-url';
import { balanceHandler } from '../../../tests/msw/handlers/billing';
import { server } from '../../../tests/msw/server';

afterEach(() => {
  vi.unstubAllGlobals();
});

const renderBalance = () =>
  renderPanel(<BalanceFlow />, pageNamespaces.subscription);

/** Movements, the newest first: credits and the uses of the balance. */
const movements = (count: number) =>
  Array.from({ length: count }, (_, index) =>
    buildBalanceMovement({
      id: `movement-${String(index)}`,
      label: `Movimiento ${String(index)}`,
      type: index % 2 === 0 ? 'CREDIT' : 'DEBIT',
      amount: usd(100),
      invoiceId: null,
    }),
  );

/*
 * «Saldo a favor» (`/panel/subscription/balance`): how much there is and
 * what it is for, with every movement, a page at a time.
 */
describe('BalanceFlow', () => {
  it('tells the balance and its movements, each signed, one about a receipt opening it', async () => {
    server.use(
      balanceHandler(500, [
        buildBalanceMovement(),
        buildBalanceMovement({
          id: 'movement-debit',
          type: 'DEBIT',
          amount: usd(300),
          label: 'Usado en tu mensualidad',
          reason: 'Recibo R-2026-000123',
          invoiceId: null,
        }),
      ]),
    );
    const { container } = renderBalance();

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Saldo a favor' }),
    ).toBeInTheDocument();
    expect(screen.getByText('$ 5')).toBeInTheDocument();
    expect(
      screen.getByText('Se usa solo en tu próxima mensualidad.'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /Pagaste de más/ }),
    ).toHaveAttribute(
      'href',
      '/panel/subscription/invoices/2d2d2d2d-2d2d-4d2d-8d2d-2d2d2d2d2d2d',
    );
    expect(screen.getByText('+ $ 5')).toBeInTheDocument();
    expect(screen.getByText('- $ 3')).toBeInTheDocument();
    expect(screen.getByText('Recibo R-2026-000123')).toBeInTheDocument();
    expect(screen.getByText('No hay más movimientos')).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it('brings the next page by itself while the end of the list is in view', async () => {
    // The foot is in view as soon as it is watched: a short page asks for the next.
    stubIntersectionObserver({ inView: true });
    server.use(balanceHandler(100, movements(25)));
    renderBalance();

    expect(await screen.findByText('Movimiento 24')).toBeInTheDocument();
    expect(screen.getByText('No hay más movimientos')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Ver más' }),
    ).not.toBeInTheDocument();
  });

  it('says a balance at zero with no history plainly', async () => {
    renderBalance();

    expect(
      await screen.findByText(
        'Ahora no tienes saldo. Aquí verás lo que sumes si pagas de más o te hacemos un ajuste.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByText('Todavía no hay movimientos')).toBeInTheDocument();
  });

  it('says when it cannot be read and offers to try again', async () => {
    server.use(
      http.get(apiUrl('/billing/me/balance'), () =>
        HttpResponse.json(errorEnvelope('ERR_1002', 'Validation failed'), {
          status: 400,
        }),
      ),
    );
    renderBalance();

    expect(
      await screen.findByRole('heading', {
        level: 2,
        name: 'No pudimos cargar tu saldo',
      }),
    ).toBeInTheDocument();
    server.use(balanceHandler(500, [buildBalanceMovement()]));
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByText('$ 5')).toBeInTheDocument();
  });
});
