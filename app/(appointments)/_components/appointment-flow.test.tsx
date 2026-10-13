import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';

import { pageNamespaces } from '@/app/lib/i18n/client-messages';
import { meResponseSchema, toAccount } from '@/app/lib/schemas/identity';

import { Toaster } from '@/app/ui/toast';
import {
  appointmentIds,
  buildPendingReviews,
} from '@/tests/factories/appointments';
import { renderWithPageMessages } from '@/tests/render';

import {
  noSession,
  SessionContext,
  type Session,
} from '@/app/hooks/use-session';

import { AppointmentFlow } from './appointment-flow';
import {
  buildMeResponse,
  buildSpecialistMeResponse,
} from '../../../tests/factories/identity';
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

function signedIn(me = buildMeResponse()): Session {
  return {
    status: 'signed-in',
    expected: true,
    user,
    account: toAccount(meResponseSchema.parse(me)),
    accountStatus: 'ready',
    accountError: null,
    accountRetrying: false,
    retryAccount: vi.fn(),
    signOut: vi.fn(() => Promise.resolve()),
  };
}

function renderAppointment(id: string, session: Session = signedIn()) {
  return renderWithPageMessages(
    <QueryClientProvider client={new QueryClient()}>
      <SessionContext.Provider value={session}>
        <AppointmentFlow appointmentId={id} />
      </SessionContext.Provider>
      <Toaster regionLabel="Notificaciones" closeLabel="Cerrar" />
    </QueryClientProvider>,
    pageNamespaces.appointment,
  );
}

const status = (name: string) => screen.findByText(name, { selector: 'span' });

describe('AppointmentFlow', () => {
  it('asks a stranger to sign in, and shows nothing of the appointment', async () => {
    const { container } = renderAppointment(appointmentIds.upcoming, noSession);

    expect(
      await screen.findByRole('heading', { name: 'Entra para ver tu cita' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Continuar con Google/ }),
    ).toBeInTheDocument();
    expect(screen.queryByText('Clínica Canaima')).not.toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it('says when a link leads nowhere', async () => {
    renderAppointment(appointmentIds.missing);
    expect(
      await screen.findByRole('heading', { name: 'No se encontró la cita' }),
    ).toBeInTheDocument();
  });

  it('tells another account it is not theirs, with the way to switch', async () => {
    const session = signedIn();
    renderAppointment(appointmentIds.someoneElse, session);

    expect(
      await screen.findByRole('heading', {
        name: 'Esta cita está en otra cuenta',
      }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Entraste como ana@example.com/)).toBeVisible();
    await userEvent.click(
      screen.getByRole('button', { name: 'Entrar con otra cuenta' }),
    );
    expect(session.signOut).toHaveBeenCalled();
  });

  it('says when the confirmation opens and offers the changes', async () => {
    const { container } = renderAppointment(appointmentIds.upcoming);

    expect(
      await screen.findByRole('heading', { name: 'Dra. María González' }),
    ).toBeInTheDocument();
    expect(await status('Pendiente')).toBeVisible();
    // The hour is not the sentence's end: «p. m.» never meets a full stop.
    expect(
      screen.getByText(/^A partir del .+ m\. podrás confirmar tu cita\.$/),
    ).toBeVisible();
    expect(
      screen.queryByRole('button', { name: 'Confirmar cita' }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Reprogramar' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Cancelar' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Control pediátrico')).toBeVisible();
    expect(await axe(container)).toHaveNoViolations();
  });

  it('confirms inside the window', async () => {
    renderAppointment(appointmentIds.confirmable);

    await userEvent.click(
      await screen.findByRole('button', { name: 'Confirmar cita' }),
    );

    expect(await status('Confirmada')).toBeVisible();
    expect(await screen.findByText('Cita confirmada')).toBeVisible();
    expect(
      screen.queryByRole('button', { name: 'Confirmar cita' }),
    ).not.toBeInTheDocument();
  });

  it('says why a confirmation was refused', async () => {
    server.use(
      http.post(apiUrl('/scheduling/appointments/:appointmentId/confirm'), () =>
        HttpResponse.json(errorEnvelope('ERR_4013', 'Outside the window'), {
          status: 409,
        }),
      ),
    );
    renderAppointment(appointmentIds.confirmable);

    await userEvent.click(
      await screen.findByRole('button', { name: 'Confirmar cita' }),
    );
    expect(
      await screen.findByText('No se pudo confirmar la cita'),
    ).toBeVisible();
  });

  it('cancels after asking, and keeps the record', async () => {
    renderAppointment(appointmentIds.upcoming);

    await userEvent.click(
      await screen.findByRole('button', { name: 'Cancelar' }),
    );
    const sheet = await screen.findByRole('dialog', {
      name: '¿Cancelar esta cita?',
    });
    expect(
      within(sheet).getByText(/Tu cita con Dra. María González/),
    ).toBeVisible();
    await userEvent.click(
      within(sheet).getByRole('button', { name: 'Cancelar cita' }),
    );

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
    expect(await status('Cancelada')).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Cancelación' })).toBeVisible();
    expect(screen.getByText('el paciente')).toBeVisible();
    expect(
      screen.queryByRole('button', { name: 'Reprogramar' }),
    ).not.toBeInTheDocument();
  });

  it('moves it to a free hour of another day, back to pending', async () => {
    renderAppointment(appointmentIds.confirmed);

    await userEvent.click(
      await screen.findByRole('button', { name: 'Reprogramar' }),
    );
    const sheet = await screen.findByRole('dialog', {
      name: 'Reprogramar cita',
    });
    expect(
      within(sheet).getByText('Selecciona un día y un horario para continuar.'),
    ).toBeVisible();

    // Next month is all ahead: its Mondays have free hours.
    await userEvent.click(
      within(sheet).getByRole('button', { name: 'Mes siguiente' }),
    );
    const [monday] = await within(sheet).findAllByRole('button', {
      name: /^lunes /,
    });
    if (!monday) throw new Error('No Monday in the month');
    const day = monday.getAttribute('aria-label') ?? '';
    await userEvent.click(monday);

    await userEvent.click(
      await within(sheet).findByRole('radio', { name: /^2:00/ }),
    );
    expect(
      within(sheet).queryByRole('radio', { name: /^9:00/ }),
    ).not.toBeInTheDocument();
    await userEvent.click(
      within(sheet).getByRole('button', { name: 'Confirmar reprogramación' }),
    );

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
    expect(await status('Pendiente')).toBeVisible();
    expect(screen.getAllByText(day, { exact: false }).length).toBeGreaterThan(
      0,
    );
  });

  it('asks for another hour when the chosen one was just taken', async () => {
    renderAppointment(appointmentIds.upcoming);

    await userEvent.click(
      await screen.findByRole('button', { name: 'Reprogramar' }),
    );
    const sheet = await screen.findByRole('dialog', {
      name: 'Reprogramar cita',
    });
    await userEvent.click(
      within(sheet).getByRole('button', { name: 'Mes siguiente' }),
    );
    const [monday] = await within(sheet).findAllByRole('button', {
      name: /^lunes /,
    });
    if (!monday) throw new Error('No Monday in the month');
    await userEvent.click(monday);
    await userEvent.click(
      await within(sheet).findByRole('radio', { name: /^10:00/ }),
    );
    await userEvent.click(
      within(sheet).getByRole('button', { name: 'Confirmar reprogramación' }),
    );

    expect(
      await within(sheet).findByText(
        'Ese horario se acaba de ocupar. Elige otro.',
      ),
    ).toBeVisible();
    expect(
      within(sheet).getByRole('radio', { name: /^10:00/ }),
    ).not.toBeChecked();
  });

  it('adds it to a calendar without the reason', async () => {
    renderAppointment(appointmentIds.upcoming);

    await userEvent.click(
      await screen.findByRole('button', { name: 'Agregar al calendario' }),
    );
    const google = await screen.findByRole('menuitem', {
      name: 'Google Calendar',
    });
    const href = decodeURIComponent(
      (google.getAttribute('href') ?? '').replaceAll('+', ' '),
    );
    expect(href).toContain('calendar.google.com');
    expect(href).toContain('Cita con Dra. María González');
    expect(href).toContain(`/a/${appointmentIds.upcoming}`);
    expect(href).not.toContain('Control pediátrico');
    expect(
      screen.getByRole('menuitem', { name: 'Apple, Outlook u otro (.ics)' }),
    ).toBeInTheDocument();
  });

  it('changes nothing once it has started', async () => {
    renderAppointment(appointmentIds.started);

    expect(await status('Confirmada')).toBeVisible();
    expect(
      screen.queryByRole('button', { name: 'Reprogramar' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Agregar al calendario' }),
    ).not.toBeInTheDocument();
  });

  it('shows who cancelled it and why', async () => {
    renderAppointment(appointmentIds.cancelled);

    expect(await status('Cancelada')).toBeVisible();
    expect(screen.getByText('el especialista')).toBeVisible();
    expect(
      screen.getByText('Tuve una emergencia en el hospital.'),
    ).toBeVisible();
    expect(
      screen.queryByRole('button', { name: 'Cancelar' }),
    ).not.toBeInTheDocument();
  });

  it('names who attends when it is for someone in one’s care', async () => {
    renderAppointment(appointmentIds.dependent);

    expect(await screen.findByText('Sofía Pérez')).toBeVisible();
    expect(screen.getByText('Fecha de nacimiento:')).toBeVisible();
    expect(screen.getByText('Mujer')).toBeVisible();
    expect(
      screen.getByText(
        'La consulta es para esta persona, no para el titular de la cuenta',
      ),
    ).toBeVisible();
  });

  it('shows a specialist the appointment without the patient’s actions', async () => {
    renderAppointment(
      appointmentIds.upcoming,
      signedIn(buildSpecialistMeResponse({ id: 'specialist-user-1' })),
    );

    expect(
      await screen.findByRole('heading', {
        name: 'Gestiona esta cita desde la app',
      }),
    ).toBeInTheDocument();
    // The specialist looks for the patient, and goes back to their day.
    expect(screen.getAllByText('Paciente').length).toBeGreaterThan(0);
    expect(
      screen.getByRole('link', { name: 'Volver a mi agenda' }),
    ).toHaveAttribute(
      'href',
      expect.stringMatching(/^\/panel\/agenda\/\d{4}-\d{2}-\d{2}$/),
    );
    // On a computer the panel is where they are: no note to go to the phone.
    expect(
      screen.queryByText(
        'Abre este enlace desde tu teléfono, donde tienes la app de Redoctor.',
      ),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Reprogramar' }),
    ).not.toBeInTheDocument();
  });

  it('lets the patient rate a finished consultation on its own page, as email 15 promises', async () => {
    server.use(pendingReviewsHandler(buildPendingReviews()));
    renderAppointment(appointmentIds.completed);

    expect(
      await screen.findByRole('heading', { name: 'Califica tu consulta' }),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole('radio', { name: '5 estrellas' }));
    await userEvent.click(
      screen.getByRole('button', { name: 'Enviar calificación' }),
    );

    expect(
      await screen.findByText(/Gracias por calificar a/),
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(
        screen.queryByRole('heading', { name: 'Califica tu consulta' }),
      ).not.toBeInTheDocument();
    });
  });

  it('asks for no rating when the consultation was rated already', async () => {
    renderAppointment(appointmentIds.completed);

    expect(await status('Finalizada')).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: 'Califica tu consulta' }),
    ).not.toBeInTheDocument();
  });
});
