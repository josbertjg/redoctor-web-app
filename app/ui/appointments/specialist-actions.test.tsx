import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
  type MockInstance,
} from 'vitest';

import { publicEnv } from '@/app/lib/public-env';
import {
  appointmentSchema,
  toAppointmentSummary,
} from '@/app/lib/schemas/appointments';

import { toast } from '@/app/ui/toast';
import {
  appointmentIds,
  buildAppointment,
} from '@/tests/factories/appointments';
import { specialistUser } from '@/tests/panel';
import { renderWithIntl } from '@/tests/render';

import { SpecialistActions } from './specialist-actions';

let success: MockInstance<typeof toast.success>;
beforeEach(() => {
  success = vi.spyOn(toast, 'success');
});

afterEach(() => {
  Reflect.deleteProperty(navigator, 'clipboard');
});

// Monday 12 October 2026, 11:00 in Caracas.
const now = new Date('2026-10-12T15:00:00.000Z');

const at = (
  start: string,
  overrides: Parameters<typeof buildAppointment>[0] = {},
) =>
  toAppointmentSummary(
    appointmentSchema.parse(
      buildAppointment(
        { id: appointmentIds.confirmed, status: 'CONFIRMED', ...overrides },
        new Date(start),
      ),
    ),
  );

function renderActions(
  appointment = at('2026-10-12T19:00:00.000Z'),
  onChanged = vi.fn(),
) {
  const view = renderWithIntl(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <SpecialistActions
        appointment={appointment}
        user={specialistUser}
        now={now}
        onChanged={onChanged}
      />
    </QueryClientProvider>,
  );
  return { ...view, onChanged };
}

describe('SpecialistActions', () => {
  it('offers on the appointment’s day what the app offers, and is accessible', async () => {
    const { container } = renderActions();

    expect(
      screen.getByRole('button', { name: 'Finalizar consulta' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'No asistió' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Reprogramar' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeVisible();
    expect(
      screen.getByText(
        'Tienes hasta 24 horas después de la cita para indicar qué ocurrió.',
      ),
    ).toBeVisible();
    expect(await axe(container)).toHaveNoViolations();
  });

  it('only moves or cancels one of another day, and offers nothing once closed', () => {
    const tomorrow = renderActions(at('2026-10-13T15:00:00.000Z'));
    expect(
      screen.queryByRole('button', { name: 'Finalizar consulta' }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reprogramar' })).toBeVisible();
    tomorrow.unmount();

    const { container } = renderActions(
      at('2026-10-12T19:00:00.000Z', { status: 'COMPLETED' }),
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('finishes the consultation once the specialist confirms it', async () => {
    const { onChanged } = renderActions();

    await userEvent.click(
      screen.getByRole('button', { name: 'Finalizar consulta' }),
    );
    const sheet = await screen.findByRole('dialog', {
      name: 'Finalizar consulta',
    });
    expect(
      within(sheet).getByText(/La consulta quedará finalizada/),
    ).toBeVisible();
    await userEvent.click(
      within(sheet).getByRole('button', { name: 'Finalizar consulta' }),
    );

    await waitFor(() => {
      expect(onChanged).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'COMPLETED' }),
      );
    });
    expect(success).toHaveBeenCalledWith('Consulta finalizada', {
      description: 'El paciente ya puede calificar la consulta.',
    });
  });

  it('marks the patient as not attended', async () => {
    const { onChanged } = renderActions();

    await userEvent.click(screen.getByRole('button', { name: 'No asistió' }));
    const sheet = await screen.findByRole('dialog', { name: 'No asistió' });
    await userEvent.click(
      within(sheet).getByRole('button', { name: 'No asistió' }),
    );

    await waitFor(() => {
      expect(onChanged).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'NO_SHOW' }),
      );
    });
  });

  it('cancels naming whose appointment, the day and the hour', async () => {
    const { onChanged } = renderActions();

    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    const sheet = await screen.findByRole('dialog', {
      name: '¿Cancelar esta cita?',
    });
    expect(
      within(sheet).getByText(/La cita de Ana Pérez agendada para el/),
    ).toBeVisible();
    await userEvent.click(
      within(sheet).getByRole('button', { name: 'Cancelar cita' }),
    );

    await waitFor(() => {
      expect(onChanged).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'CANCELLED',
          cancelledBy: 'SPECIALIST',
        }),
      );
    });
    expect(success).toHaveBeenCalledWith('Cita cancelada', {
      description:
        'Hemos notificado al paciente que la cita ha sido cancelada.',
    });
  });

  it('says in the sheet an hour someone just took', async () => {
    renderActions();

    await userEvent.click(screen.getByRole('button', { name: 'Reprogramar' }));
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
  });

  it('shares the invitation nobody claimed, without the patient’s name', async () => {
    renderActions(
      at('2026-10-13T15:00:00.000Z', {
        id: appointmentIds.invited,
        patientUserId: null,
      }),
    );

    await userEvent.click(
      screen.getByRole('button', { name: 'Compartir invitación' }),
    );
    const sheet = await screen.findByRole('dialog', {
      name: 'Compartir invitación',
    });
    const whatsapp = await within(sheet).findByRole('link', {
      name: 'Enviar invitación por WhatsApp',
    });
    const href = whatsapp.getAttribute('href') ?? '';
    expect(href).toMatch(/^https:\/\/wa\.me\/584141234567\?text=/);
    // Built from the token, as the app does: the API's URL names an old path.
    const link = new URL('/i/tok-invited', publicEnv.siteUrl).toString();
    const text = decodeURIComponent(href.split('text=')[1] ?? '');
    expect(text).toContain(`${link}?origin=whatsapp-invitation`);
    expect(text).not.toContain('citas/invitacion');
    expect(text).not.toContain('Ana');

    // Copied whole, it says it was shared by hand.
    const writeText = vi.fn(() => Promise.resolve());
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });
    await userEvent.click(
      within(sheet).getByRole('button', { name: 'Copiar mensaje' }),
    );
    expect(writeText).toHaveBeenCalledWith(
      expect.stringContaining(`${link}?origin=share-invitation`),
    );
    expect(writeText).toHaveBeenCalledWith(
      expect.stringContaining('He agendado tu cita para:'),
    );
    await waitFor(() => {
      expect(success).toHaveBeenCalledWith('Mensaje copiado');
    });
  });
});
