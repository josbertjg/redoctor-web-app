import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { pageNamespaces } from '@/app/lib/i18n/client-messages';

import { Toaster } from '@/app/ui/toast';
import { buildCoupon } from '@/tests/factories/billing';
import { renderPanel } from '@/tests/panel';

import { CouponsFlow } from './coupons-flow';
import { apiUrl } from '../../../tests/msw/api-url';
import { server } from '../../../tests/msw/server';

/** The item at `index`, which the test knows is there. */
function nth<T>(items: readonly T[], index: number): T {
  const item = items[index];
  if (item === undefined) throw new Error(`No item ${String(index)}`);
  return item;
}

const renderCoupons = () =>
  renderPanel(
    <>
      <CouponsFlow />
      <Toaster regionLabel="Notificaciones" closeLabel="Cerrar" />
    </>,
    pageNamespaces.subscription,
  );

/*
 * «Mis cupones» (`/panel/subscription/coupons`): the codes kept for later
 * and the personal ones, the ones still to use first; saving one spends
 * nothing.
 */
describe('CouponsFlow', () => {
  it('lists the coupons, the ones still to use first, with what each takes off', async () => {
    server.use(
      http.get(apiUrl('/billing/me/coupons'), () =>
        HttpResponse.json({
          items: [
            {
              ...buildCoupon({ code: 'USADO10', percentOff: 10 }),
              savedCouponId: 'saved-used',
              state: 'USED',
            },
            {
              ...buildCoupon({
                code: 'SOLOPRO',
                personal: true,
                expiresAt: '2026-12-31T23:00:00.000Z',
              }),
              savedCouponId: 'saved-available',
              state: 'AVAILABLE',
            },
          ],
        }),
      ),
    );
    const { container } = renderCoupons();

    const list = await screen.findByRole('list', { name: 'Tus cupones' });
    const rows = within(list).getAllByRole('listitem');
    expect(
      rows.map((row) => row.querySelector('.truncate')?.textContent),
    ).toEqual(['SOLOPRO', 'USADO10']);
    expect(within(nth(rows, 0)).getByText('Para ti')).toBeInTheDocument();
    expect(
      within(nth(rows, 0)).getByText('Vence el 31 de diciembre de 2026'),
    ).toBeInTheDocument();
    expect(within(nth(rows, 1)).getByText('Usado')).toBeInTheDocument();
    expect(
      within(nth(rows, 1)).getByText(
        '10 % de descuento en tu primera mensualidad',
      ),
    ).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it('saves a code without spending it, and puts it in the list', async () => {
    // The API keeps what was saved: the list read again has it.
    const kept: unknown[] = [];
    server.use(
      http.get(apiUrl('/billing/me/coupons'), () =>
        HttpResponse.json({ items: kept }),
      ),
      http.post(apiUrl('/billing/me/coupons'), () => {
        const savedCoupon = {
          ...buildCoupon(),
          savedCouponId: 'saved-new',
          state: 'AVAILABLE',
        };
        kept.push(savedCoupon);
        return HttpResponse.json({ savedCoupon }, { status: 201 });
      }),
    );
    renderCoupons();

    expect(
      await screen.findByRole('heading', {
        level: 2,
        name: 'Todavía no tienes cupones',
      }),
    ).toBeInTheDocument();
    await userEvent.type(
      screen.getByLabelText('Código del cupón'),
      'redoctor20',
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Guardar cupón' }),
    );

    expect(await screen.findByText('Cupón guardado')).toBeInTheDocument();
    expect(
      await screen.findByRole('list', { name: 'Tus cupones' }),
    ).toHaveTextContent('REDOCTOR20');
    expect(screen.getByLabelText('Código del cupón')).toHaveValue('');
  });

  it('says in the field why a code cannot be saved', async () => {
    renderCoupons();

    await screen.findByRole('list', { name: 'Tus cupones' });
    await userEvent.click(
      screen.getByRole('button', { name: 'Guardar cupón' }),
    );
    expect(
      await screen.findByText('Escribe el código del cupón'),
    ).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText('Código del cupón'), 'vencido');
    await userEvent.click(
      screen.getByRole('button', { name: 'Guardar cupón' }),
    );
    expect(
      await screen.findByText('Este cupón ya venció.'),
    ).toBeInTheDocument();
  });
});
