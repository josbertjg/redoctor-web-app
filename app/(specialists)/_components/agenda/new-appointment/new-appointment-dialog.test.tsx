import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { pageNamespaces } from '@/app/lib/i18n/client-messages';

import { agendaToday } from '@/tests/factories/agenda';
import { buildSubscription } from '@/tests/factories/billing';
import { subscriptionHandler } from '@/tests/msw/handlers/billing';
import { server } from '@/tests/msw/server';
import { freezeClock, renderPanel, specialistUser } from '@/tests/panel';

import { NewAppointmentDialog } from './new-appointment-dialog';

function renderDialog(onSeeDay = vi.fn()) {
  const view = renderPanel(
    <NewAppointmentDialog
      open
      user={specialistUser}
      today={agendaToday}
      onClose={vi.fn()}
      onSeeDay={onSeeDay}
    />,
    pageNamespaces.agenda,
  );
  return { ...view, onSeeDay };
}

const dialog = () => screen.findByRole('dialog');

/** Thursday 15 October, the first free day after today, at a free hour. */
async function chooseSlot(hour = /^8:30/) {
  const sheet = await screen.findByRole('dialog', { name: 'Nueva cita' });
  await userEvent.click(
    await within(sheet).findByRole('button', {
      name: 'jueves 15 de octubre de 2026',
    }),
  );
  await userEvent.click(
    await within(sheet).findByRole('radio', { name: hour }),
  );
  await userEvent.click(
    within(sheet).getByRole('button', { name: 'Siguiente' }),
  );
}

async function fillSomeoneNew(dateOfBirth = '2020-01-10') {
  await userEvent.type(await screen.findByLabelText('Nombre'), 'Pedro');
  await userEvent.type(screen.getByLabelText('Apellido'), 'Gil');
  await userEvent.type(
    screen.getByLabelText('Fecha de nacimiento'),
    dateOfBirth,
  );
  await userEvent.click(screen.getByRole('radio', { name: 'Hombre' }));
  await userEvent.type(screen.getByLabelText('Teléfono'), '4141234567');
}

beforeEach(() => {
  freezeClock();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('«Nueva cita»', () => {
  beforeEach(() => {
    server.use(subscriptionHandler(buildSubscription({ status: 'ACTIVE' })));
  });

  it('asks for a day and an hour, and is accessible', async () => {
    const { container } = renderDialog();
    const sheet = await screen.findByRole('dialog', { name: 'Nueva cita' });
    expect(await within(sheet).findByText('Clínica Canaima')).toBeVisible();

    await userEvent.click(
      within(sheet).getByRole('button', { name: 'Siguiente' }),
    );
    expect(
      within(sheet).getByText('Selecciona un día y un horario para continuar.'),
    ).toBeVisible();
    expect(await axe(container)).toHaveNoViolations();
  });

  it('books someone new, and offers their invitation', async () => {
    renderDialog();
    await chooseSlot();
    await fillSomeoneNew();
    // Nobody by that name: the fields register them.
    expect(
      await screen.findByText('No encontramos a este paciente'),
    ).toBeVisible();
    expect(
      screen.getByText(
        'Aún no tiene 9 años y un mes: no hace falta su cédula.',
      ),
    ).toBeVisible();

    await userEvent.click(screen.getByRole('button', { name: 'Agendar cita' }));

    const done = await screen.findByRole('dialog', { name: '¡Todo listo!' });
    expect(
      within(done).getByText('¡La cita ha sido agendada con éxito!'),
    ).toBeVisible();
    expect(
      within(done).getByText(
        'El paciente todavía no tiene cuenta: compártele su invitación para que acceda a la cita y la confirme.',
      ),
    ).toBeVisible();
    expect(
      within(done).getByRole('button', { name: 'Compartir invitación' }),
    ).toBeVisible();
  });

  it('books a registered patient found by their document, with what their account lacks', async () => {
    const { onSeeDay } = renderDialog();
    await chooseSlot();

    await userEvent.type(
      await screen.findByLabelText('Cédula de identidad'),
      '12345678',
    );
    const found = await screen.findByRole('list', {
      name: 'Pacientes encontrados',
    });
    await userEvent.click(
      within(found).getByRole('button', { name: /Laura Gómez/ }),
    );
    expect(await screen.findByText('Paciente registrado')).toBeVisible();

    // Another one, by name: Jorge's account lacks his document.
    await userEvent.click(
      screen.getByRole('button', { name: 'Cambiar por otro paciente' }),
    );
    await userEvent.type(await screen.findByLabelText('Nombre'), 'Jorge');
    await userEvent.click(
      within(
        await screen.findByRole('list', { name: 'Pacientes encontrados' }),
      ).getByRole('button', { name: /Jorge Ruiz/ }),
    );
    expect(
      await screen.findByText(
        'A su cuenta le falta la cédula: pídeselo para completarla.',
      ),
    ).toBeVisible();

    await userEvent.click(screen.getByRole('button', { name: 'Agendar cita' }));
    const done = await screen.findByRole('dialog', { name: '¡Todo listo!' });
    expect(
      within(done).queryByRole('button', { name: 'Compartir invitación' }),
    ).not.toBeInTheDocument();
    await userEvent.click(
      within(done).getByRole('button', { name: 'Ver citas' }),
    );
    expect(onSeeDay).toHaveBeenCalledWith('2026-10-15');
  });

  it('asks the document from 9 years and a month, and sends nothing without it', async () => {
    renderDialog();
    await chooseSlot();
    await fillSomeoneNew('2010-01-01');
    await userEvent.click(screen.getByRole('button', { name: 'Agendar cita' }));

    expect(
      screen.getByLabelText('Cédula de identidad'),
    ).toHaveAccessibleDescription(/Este campo es requerido/);
    expect(screen.queryByRole('dialog', { name: '¡Todo listo!' })).toBeNull();
  });

  it('goes back to the hours when the one chosen was just taken', async () => {
    renderDialog();
    await chooseSlot(/^10:00/);
    await fillSomeoneNew();
    await userEvent.click(screen.getByRole('button', { name: 'Agendar cita' }));

    expect(
      await screen.findByText('Ese horario ya no está libre'),
    ).toBeVisible();
    expect(
      screen.getByText(
        'Reservaron esa franja mientras completabas los datos del paciente. Elige otro horario.',
      ),
    ).toBeVisible();
  });
});

describe('«Nueva cita» without a plan', () => {
  it('offers the plans instead of the form', async () => {
    renderDialog();
    await dialog();
    expect(
      await screen.findByRole('heading', {
        name: 'Para agendar citas necesitas un plan activo',
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver planes' })).toHaveAttribute(
      'href',
      '/pay?view=plans',
    );
  });
});
