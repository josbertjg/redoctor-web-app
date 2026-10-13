import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';

import { pageNamespaces } from '@/app/lib/i18n/client-messages';
import { meResponseSchema, toAccount } from '@/app/lib/schemas/identity';

import { Toaster } from '@/app/ui/toast';
import {
  appointmentIds,
  buildAppointment,
  buildPendingReviews,
  hoursFromNow,
  type AppointmentPayload,
} from '@/tests/factories/appointments';
import { buildCreatedReview } from '@/tests/factories/reviews';
import { renderWithPageMessages } from '@/tests/render';

import { SessionContext, type Session } from '@/app/hooks/use-session';

import { AppointmentsFlow } from './appointments-flow';
import { buildMeResponse } from '../../../tests/factories/identity';
import { apiUrl, errorEnvelope } from '../../../tests/msw/api-url';
import { validToken } from '../../../tests/msw/handlers/identity';
import { pendingReviewsHandler } from '../../../tests/msw/handlers/reviews';
import { server } from '../../../tests/msw/server';

const user = {
  id: 'uid-1',
  email: 'ana@example.com',
  name: 'Ana Pérez',
  photo: null,
  provider: 'google' as const,
  getToken: () => Promise.resolve(validToken),
};

const signedIn: Session = {
  status: 'signed-in',
  expected: true,
  user,
  account: toAccount(meResponseSchema.parse(buildMeResponse())),
  accountStatus: 'ready',
  accountError: null,
  retryAccount: vi.fn(),
  signOut: vi.fn(() => Promise.resolve()),
};

/** As app/providers.tsx builds it: no retries, so a failure shows at once. */
const queryClient = () =>
  new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

function renderAppointments() {
  return renderWithPageMessages(
    <QueryClientProvider client={queryClient()}>
      <SessionContext.Provider value={signedIn}>
        <AppointmentsFlow />
      </SessionContext.Provider>
      <Toaster regionLabel="Notificaciones" closeLabel="Cerrar" />
    </QueryClientProvider>,
    pageNamespaces.appointments,
  );
}

const listOf = (appointments: AppointmentPayload[]) =>
  http.get(apiUrl('/scheduling/appointments'), () =>
    HttpResponse.json({ appointments }),
  );

const badRequest = () =>
  HttpResponse.json(errorEnvelope('ERR_1002', 'Validation failed'), {
    status: 400,
  });

const hrefsIn = (panel: HTMLElement) =>
  within(panel)
    .getAllByRole('link')
    .map((link) => link.getAttribute('href'));

describe('AppointmentsFlow', () => {
  it('lists what is to come first, the soonest first, each card opening its appointment', async () => {
    const { container } = renderAppointments();

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Mis citas' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Próximas (6)' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(hrefsIn(screen.getByRole('tabpanel'))).toEqual(
      [
        appointmentIds.started,
        appointmentIds.confirmable,
        appointmentIds.confirmed,
        appointmentIds.upcoming,
        appointmentIds.dependent,
        appointmentIds.rescheduled,
      ].map((id) => `/a/${id}`),
    );
    expect(screen.getAllByText('Dra. María González').length).toBe(6);
    expect(screen.getAllByText('Control pediátrico').length).toBe(6);
    expect(screen.getAllByText('Pendiente').length).toBe(4);
    expect(screen.getAllByText('Confirmada').length).toBe(2);
    expect(await axe(container)).toHaveNoViolations();
  });

  it('shows what is over under «Pasadas», the latest first', async () => {
    renderAppointments();

    await userEvent.click(
      await screen.findByRole('tab', { name: 'Pasadas (4)' }),
    );

    expect(hrefsIn(screen.getByRole('tabpanel'))).toEqual(
      [
        appointmentIds.cancelled,
        appointmentIds.completed,
        appointmentIds.completedDependent,
        appointmentIds.reviewed,
      ].map((id) => `/a/${id}`),
    );
    expect(screen.getByText('Cancelada')).toBeInTheDocument();
    expect(screen.getAllByText('Finalizada')).toHaveLength(3);
    expect(screen.getByText('Dr. Luis Gómez')).toBeInTheDocument();
  });

  it('opens on «Pasadas» when nothing is ahead', async () => {
    server.use(
      listOf([
        buildAppointment(
          { id: appointmentIds.completed, status: 'COMPLETED' },
          hoursFromNow(-72),
        ),
      ]),
    );
    renderAppointments();

    expect(
      await screen.findByRole('tab', { name: 'Pasadas (1)' }),
    ).toHaveAttribute('aria-selected', 'true');
    await userEvent.click(screen.getByRole('tab', { name: 'Próximas (0)' }));
    expect(
      screen.getByRole('heading', { name: 'No tienes citas próximas' }),
    ).toBeInTheDocument();
  });

  it('tells a patient with no appointments how they arrive', async () => {
    server.use(listOf([]));
    renderAppointments();

    expect(
      await screen.findByRole('heading', { name: 'Aún no tienes citas' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('tab')).not.toBeInTheDocument();
  });

  it('says when the list could not load, and tries again', async () => {
    let attempts = 0;
    server.use(
      http.get(apiUrl('/scheduling/appointments'), () => {
        attempts += 1;
        return attempts === 1
          ? badRequest()
          : HttpResponse.json({ appointments: [] });
      }),
    );
    renderAppointments();

    expect(
      await screen.findByRole('heading', {
        name: 'No pudimos cargar tus citas',
      }),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Refrescar' }));
    expect(
      await screen.findByRole('heading', { name: 'Aún no tienes citas' }),
    ).toBeInTheDocument();
  });

  it('shows the list when the pending reviews could not be read', async () => {
    server.use(http.get(apiUrl('/reviews/pending'), () => badRequest()));
    renderAppointments();

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Mis citas' }),
    ).toBeInTheDocument();
  });

  describe('the review wall', () => {
    it('holds the page until each finished consultation is rated, the oldest first', async () => {
      const sent: unknown[] = [];
      server.use(
        pendingReviewsHandler(buildPendingReviews()),
        http.post(
          apiUrl('/reviews/appointments/:appointmentId'),
          async ({ request, params }) => {
            sent.push(await request.json());
            return HttpResponse.json(
              {
                review: buildCreatedReview({
                  appointmentId: String(params.appointmentId),
                }),
              },
              { status: 201 },
            );
          },
        ),
      );
      const { container } = renderAppointments();

      expect(
        await screen.findByRole('heading', {
          level: 1,
          name: 'Califica tu consulta',
        }),
      ).toBeInTheDocument();
      expect(screen.getByText('1 de 2')).toBeVisible();
      expect(
        screen.getByText(/Te quedan 2 consultas por calificar/),
      ).toBeVisible();
      // The oldest first: ten days ago, for someone in her care.
      expect(
        screen.getByRole('heading', { name: 'Dr. Luis Gómez' }),
      ).toBeInTheDocument();
      expect(screen.getByText('Asistió Sofía Pérez')).toBeVisible();
      expect(screen.getByText('Dolor de garganta')).toBeVisible();
      expect(
        screen.queryByRole('heading', { name: 'Mis citas' }),
      ).not.toBeInTheDocument();
      expect(await axe(container)).toHaveNoViolations();

      // Without a star nothing is sent, and the button stays a button.
      await userEvent.click(
        screen.getByRole('button', { name: 'Enviar calificación' }),
      );
      expect(
        await screen.findByText('Toca una estrella para poder continuar.'),
      ).toBeVisible();
      expect(sent).toHaveLength(0);

      await userEvent.click(screen.getByRole('radio', { name: '4 estrellas' }));
      await userEvent.type(
        screen.getByRole('textbox', { name: 'Comentario (opcional)' }),
        'Muy amable.',
      );
      expect(screen.getByText('11/1000')).toBeInTheDocument();
      await userEvent.click(
        screen.getByRole('button', { name: 'Enviar calificación' }),
      );

      expect(
        await screen.findByText('Gracias por calificar a Dr. Luis Gómez'),
      ).toBeVisible();
      expect(sent).toEqual([{ rating: 4, comment: 'Muy amable.' }]);

      // The next one, on a clean form.
      expect(await screen.findByText('2 de 2')).toBeVisible();
      expect(
        screen.getByRole('heading', { name: 'Dra. María González' }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole('textbox', { name: 'Comentario (opcional)' }),
      ).toHaveValue('');
      await userEvent.click(screen.getByRole('radio', { name: '5 estrellas' }));
      await userEvent.click(
        screen.getByRole('button', { name: 'Enviar calificación' }),
      );

      expect(
        await screen.findByRole('heading', { level: 1, name: 'Mis citas' }),
      ).toBeInTheDocument();
      expect(sent[1]).toEqual({ rating: 5 });
    });

    it('moves on when the consultation was rated meanwhile', async () => {
      let reads = 0;
      server.use(
        http.get(apiUrl('/reviews/pending'), () => {
          reads += 1;
          return HttpResponse.json({
            appointments:
              reads === 1
                ? [
                    buildAppointment(
                      { id: appointmentIds.reviewed, status: 'COMPLETED' },
                      hoursFromNow(-480),
                    ),
                  ]
                : [],
          });
        }),
      );
      renderAppointments();

      await userEvent.click(
        await screen.findByRole('radio', { name: '3 estrellas' }),
      );
      await userEvent.click(
        screen.getByRole('button', { name: 'Enviar calificación' }),
      );

      // The API refuses it (409); the pending list no longer has it: done.
      expect(
        await screen.findByRole('heading', { level: 1, name: 'Mis citas' }),
      ).toBeInTheDocument();
    });

    it('says when the rating could not be sent, and keeps the form', async () => {
      server.use(
        pendingReviewsHandler(buildPendingReviews()),
        http.post(apiUrl('/reviews/appointments/:appointmentId'), () =>
          badRequest(),
        ),
      );
      renderAppointments();

      await userEvent.click(
        await screen.findByRole('radio', { name: '2 estrellas' }),
      );
      await userEvent.click(
        screen.getByRole('button', { name: 'Enviar calificación' }),
      );

      expect(
        await screen.findByText(
          'No pudimos enviar tu calificación. Inténtalo de nuevo en un momento.',
        ),
      ).toBeVisible();
      expect(
        screen.getByRole('heading', { level: 1, name: 'Califica tu consulta' }),
      ).toBeInTheDocument();
      expect(screen.getByRole('radio', { name: '2 estrellas' })).toBeChecked();
    });
  });
});
