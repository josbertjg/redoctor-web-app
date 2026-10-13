import { screen, within } from '@testing-library/react';
import { axe } from 'jest-axe';
import { describe, expect, it } from 'vitest';

import { pageNamespaces } from '@/app/lib/i18n/client-messages';

import {
  buildIntent,
  buildInvoice,
  buildPaidInvoice,
  buildReported,
  intentIds,
  invoiceIds,
  usd,
  ves,
} from '@/tests/factories/billing';
import { renderPanel } from '@/tests/panel';

import { InvoiceFlow } from './invoice-flow';
import { invoiceDetailHandler } from '../../../tests/msw/handlers/billing';
import { server } from '../../../tests/msw/server';

const renderReceipt = (invoiceId: string | null) =>
  renderPanel(
    <InvoiceFlow invoiceId={invoiceId} />,
    pageNamespaces.subscription,
  );

/*
 * A receipt (`/panel/subscription/invoices/{id}`): what it covers and how
 * the amount owed is reached, the payments applied in bolívares, the
 * payments reported, the adjustments, whom it is issued to, and «Pagar
 * ahora» while something is owed and no payment waits.
 */
describe('InvoiceFlow', () => {
  it('tells everything that happened on a receipt', async () => {
    const paid = buildPaidInvoice({
      total: usd(3000),
      credited: usd(500),
      balanceApplied: usd(500),
      paid: usd(2000),
      pending: usd(0),
    });
    server.use(
      invoiceDetailHandler(
        paid,
        [
          buildIntent({
            id: intentIds.inReview,
            invoiceId: paid.id,
            status: 'SUCCEEDED',
            reported: buildReported(79893),
          }),
          buildIntent({
            id: intentIds.rejected,
            invoiceId: paid.id,
            status: 'FAILED',
            reported: buildReported(),
            failureReason: 'La referencia no aparece en el estado de cuenta.',
          }),
        ],
        {
          allocations: [
            {
              paymentId: 'payment-1',
              amount: usd(2000),
              paymentAmountVes: ves(79893),
              rate: '39.94633333',
              confirmedAt: '2026-09-13T15:00:00.000Z',
            },
          ],
          adjustments: [
            {
              number: 'NC-2026-000001',
              label: 'Ajuste por días sin servicio',
              amount: usd(500),
              reason: 'Dos días sin agenda por mantenimiento.',
              createdAt: '2026-09-13T15:00:00.000Z',
            },
          ],
        },
      ),
    );
    const { container } = renderReceipt(paid.id);

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Recibo' }),
    ).toBeInTheDocument();
    const header = screen.getByRole('region', { name: 'N.° R-2026-000101' });
    expect(within(header).getByText('Pagado')).toBeInTheDocument();
    expect(within(header).getByText('Mensualidad')).toBeInTheDocument();
    expect(within(header).getByText('Pagado el')).toBeInTheDocument();

    const concepts = screen.getByRole('region', { name: 'Lo que cubre' });
    expect(
      within(concepts).getByText('Plan Profesional · 12 sept – 11 oct 2026'),
    ).toBeInTheDocument();
    expect(
      within(concepts).getByText('Saldo a favor aplicado'),
    ).toBeInTheDocument();
    expect(within(concepts).getByText('- $ 20')).toBeInTheDocument();
    expect(within(concepts).getByText('$ 0')).toBeInTheDocument();

    const applied = screen.getByRole('region', { name: 'Pagos aplicados' });
    expect(
      within(applied).getByText('$ 20 · Bs 798,93 · Tasa Bs 39,95'),
    ).toBeInTheDocument();

    const reported = screen.getByRole('region', {
      name: 'Tus pagos reportados',
    });
    expect(within(reported).getByText('Aprobado')).toBeInTheDocument();
    expect(within(reported).getByText('Rechazado')).toBeInTheDocument();
    expect(
      within(reported).getByText(
        'La referencia no aparece en el estado de cuenta.',
      ),
    ).toBeInTheDocument();
    expect(within(reported).getAllByText('(0134) Banesco')).toHaveLength(2);

    expect(
      screen.getByText('Dos días sin agenda por mantenimiento.'),
    ).toBeInTheDocument();
    const billedTo = screen.getByRole('region', { name: 'A nombre de' });
    expect(within(billedTo).getByText('Luis Gómez')).toBeInTheDocument();
    expect(within(billedTo).getByText('V-12345678')).toBeInTheDocument();
    expect(
      screen.getByText('Recibo interno. No es un documento fiscal.'),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: 'Pagar ahora' }),
    ).not.toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it('pays a receipt still owed from its page', async () => {
    server.use(invoiceDetailHandler(buildInvoice()));
    renderReceipt(invoiceIds.unpaid);

    expect(
      await screen.findByRole('link', { name: 'Pagar ahora' }),
    ).toHaveAttribute('href', `/pay?invoice=${invoiceIds.unpaid}`);
    expect(
      screen.getByText('Por pagar', { selector: 'span' }),
    ).toBeInTheDocument();
  });

  it('offers no payment while one waits for an admin', async () => {
    server.use(
      invoiceDetailHandler(buildInvoice(), [
        buildIntent({ status: 'IN_REVIEW', reported: buildReported() }),
      ]),
    );
    renderReceipt(invoiceIds.unpaid);

    expect(await screen.findByText('En verificación')).toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: 'Pagar ahora' }),
    ).not.toBeInTheDocument();
  });

  it('says a receipt was not found, and leads to the list', async () => {
    renderReceipt('not-a-receipt');

    expect(
      await screen.findByRole('heading', {
        level: 2,
        name: 'No encontramos este recibo',
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Ver mis recibos' }),
    ).toHaveAttribute('href', '/panel/subscription/invoices');
  });

  it('says so without asking the API when the address holds no receipt id', async () => {
    renderReceipt(null);

    expect(
      await screen.findByRole('heading', {
        level: 2,
        name: 'No encontramos este recibo',
      }),
    ).toBeInTheDocument();
  });
});
