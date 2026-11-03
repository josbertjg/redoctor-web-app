import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { describe, expect, it, vi } from 'vitest';

import type { SessionUser } from '@/app/lib/firebase/client';
import { latestAdultBirthDate } from '@/app/lib/format/date-of-birth';
import { pageNamespaces } from '@/app/lib/i18n/client-messages';

import { renderWithPageMessages } from '@/tests/render';

import { SpecialistSignUpForm } from './specialist-sign-up-form';
import { takenDocumentNumber } from '../../../tests/factories/identity';
import { validToken } from '../../../tests/msw/handlers/identity';
import { server } from '../../../tests/msw/server';

function sessionUser(): SessionUser & { getToken: ReturnType<typeof vi.fn> } {
  return {
    id: `uid-${String(Math.random())}`,
    email: 'luis@example.com',
    name: 'Luis Gómez',
    photo: null,
    provider: 'google',
    getToken: vi.fn(() => Promise.resolve(validToken)),
  };
}

function renderForm(onDone = vi.fn()) {
  const user = sessionUser();
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const view = renderWithPageMessages(
    <QueryClientProvider client={client}>
      <SpecialistSignUpForm user={user} onDone={onDone} />
    </QueryClientProvider>,
    pageNamespaces.signUp,
  );
  return { ...view, user, onDone };
}

/** Records the bodies the form sends, in order. */
function recordWrites() {
  const writes: { path: string; body: unknown }[] = [];
  server.events.on('request:start', ({ request }) => {
    if (request.method !== 'POST') return;
    void request
      .clone()
      .json()
      .then((body: unknown) => {
        writes.push({ path: new URL(request.url).pathname, body });
      });
  });
  return writes;
}

async function fillAll(documentNumber = '12.345.678') {
  await userEvent.type(
    screen.getByRole('textbox', { name: 'Nombre' }),
    '  Luis ',
  );
  await userEvent.type(
    screen.getByRole('textbox', { name: 'Apellido' }),
    'Gómez',
  );
  await userEvent.type(
    screen.getByLabelText('Fecha de nacimiento'),
    '1985-03-02',
  );
  await userEvent.type(
    screen.getByRole('textbox', { name: 'Cédula de identidad' }),
    documentNumber,
  );
  await userEvent.click(screen.getByRole('radio', { name: 'Hombre' }));
  await userEvent.type(
    screen.getByRole('textbox', { name: 'Teléfono' }),
    '0414-123.45.67',
  );
  await userEvent.click(screen.getByRole('checkbox', { name: /He leído/ }));
  await userEvent.click(screen.getByRole('checkbox', { name: /Autorizo/ }));
}

describe('SpecialistSignUpForm', () => {
  it('asks what the app asks a specialist, and is accessible', async () => {
    const { container } = renderForm();

    expect(screen.getByRole('textbox', { name: 'Nombre' })).toBeInTheDocument();
    expect(
      screen.getByRole('textbox', { name: 'Apellido' }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Fecha de nacimiento')).toBeInTheDocument();
    expect(
      screen.getByRole('textbox', { name: 'Cédula de identidad' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Hombre' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Mujer' })).toBeInTheDocument();
    expect(
      screen.getByRole('textbox', { name: 'Teléfono' }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole('checkbox')).toHaveLength(3);
    expect(
      screen.getByRole('button', { name: 'Continuar' }),
    ).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it('refuses a minor and a number that is not a Venezuelan mobile', async () => {
    renderForm();
    const tooYoung = latestAdultBirthDate().replace(/^(\d{4})/, (year) =>
      String(Number(year) + 1),
    );

    await userEvent.type(
      screen.getByLabelText('Fecha de nacimiento'),
      tooYoung,
    );
    await userEvent.type(
      screen.getByRole('textbox', { name: 'Teléfono' }),
      '0212 555 1234',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Continuar' }));

    expect(
      await screen.findByText('Debes tener al menos 18 años.'),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'Escribe un número de celular venezolano, como 0414 123 4567.',
      ),
    ).toBeInTheDocument();
  });

  it('stops before writing anything when another account has the document', async () => {
    const writes = recordWrites();
    const { onDone } = renderForm();

    await fillAll(takenDocumentNumber);
    await userEvent.click(screen.getByRole('button', { name: 'Continuar' }));

    expect(
      await screen.findByText(
        'Ya existe una cuenta con esta cédula. Cámbiala para poder registrarte.',
      ),
    ).toBeInTheDocument();
    expect(writes.map((write) => write.path)).toEqual([
      '/api/v1/identity/public/check-document',
    ]);
    expect(onDone).not.toHaveBeenCalled();
  });

  it('registers the specialist with the API’s body and a fresh token', async () => {
    const writes = recordWrites();
    const { onDone, user } = renderForm();

    await fillAll();
    await userEvent.click(screen.getByRole('button', { name: 'Continuar' }));

    await waitFor(() => {
      expect(onDone).toHaveBeenCalledOnce();
    });
    expect(writes).toEqual([
      {
        path: '/api/v1/identity/public/check-document',
        body: { documentType: 'V', documentNumber: '12345678' },
      },
      {
        path: '/api/v1/identity/register',
        body: {
          role: 'SPECIALIST',
          firstName: 'Luis',
          lastName: 'Gómez',
          phone: '+584141234567',
          dateOfBirth: '1985-03-02',
          sex: 'MALE',
          documentType: 'V',
          documentNumber: '12345678',
          acceptedTerms: true,
          acceptedSensitiveData: true,
          acceptedNewsletter: false,
        },
      },
    ]);
    expect(user.getToken).toHaveBeenCalledWith(true);
    // Done, the button stays busy: the page moves on under the colour.
    expect(screen.getByRole('button', { name: 'Continuar' })).toHaveAttribute(
      'aria-busy',
      'true',
    );
  });
});
