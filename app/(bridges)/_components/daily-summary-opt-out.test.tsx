import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import messages from '@/app/lib/i18n/messages/es.json';

import { apiUrl, errorEnvelope } from '@/tests/msw/api-url';
import { validOptOutToken } from '@/tests/msw/handlers/notifications';
import { server } from '@/tests/msw/server';

import { DailySummaryOptOut } from './daily-summary-opt-out';

const labels = messages.dailySummary;

describe('DailySummaryOptOut', () => {
  it('changes nothing until asked, then lets the specialist undo it', async () => {
    const { container } = render(
      <DailySummaryOptOut token={validOptOutToken} labels={labels} />,
    );

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'Resumen diario de tu agenda',
      }),
    ).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();

    await userEvent.click(
      screen.getByRole('button', { name: 'Dejar de recibirlo' }),
    );
    expect(
      await screen.findByRole('heading', {
        name: 'Listo, ya no te enviaremos el resumen diario',
      }),
    ).toBeInTheDocument();

    await userEvent.click(
      screen.getByRole('button', { name: 'Volver a recibirlo' }),
    );
    expect(
      await screen.findByRole('heading', {
        name: 'Volverás a recibir el resumen diario',
      }),
    ).toBeInTheDocument();
  });

  it('explains an invalid link instead of failing', async () => {
    render(<DailySummaryOptOut token="forged" labels={labels} />);

    await userEvent.click(
      screen.getByRole('button', { name: 'Dejar de recibirlo' }),
    );
    expect(
      await screen.findByRole('heading', {
        name: 'Este enlace ya no es válido',
      }),
    ).toBeInTheDocument();
  });

  it('shows the invalid link right away when the token is missing', () => {
    render(<DailySummaryOptOut token={undefined} labels={labels} />);

    expect(
      screen.getByRole('heading', { name: 'Este enlace ya no es válido' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button')).toBe(null);
  });

  it('keeps the button and says what to do when the change is not saved', async () => {
    server.use(
      http.post(apiUrl('/notifications/daily-summary/unsubscribe'), () =>
        HttpResponse.json(errorEnvelope('ERR_1001', 'bad request'), {
          status: 400,
        }),
      ),
    );
    render(<DailySummaryOptOut token={validOptOutToken} labels={labels} />);

    await userEvent.click(
      screen.getByRole('button', { name: 'Dejar de recibirlo' }),
    );
    expect(await screen.findByRole('alert')).toHaveTextContent(labels.failed);
    expect(
      screen.getByRole('button', { name: 'Dejar de recibirlo' }),
    ).toBeInTheDocument();
  });
});
