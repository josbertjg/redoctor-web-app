import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';

import type { SessionUser } from '@/app/lib/firebase/client';
import { latestAdultBirthDate } from '@/app/lib/format/date-of-birth';

import { renderWithIntl } from '@/tests/render';

import { PatientSignUpForm, type SignUpParts } from './patient-sign-up-form';
import {
  buildNewAccountMeResponse,
  takenDocumentNumber,
} from '../../../tests/factories/identity';
import { apiUrl } from '../../../tests/msw/api-url';
import { validToken } from '../../../tests/msw/handlers/identity';
import { server } from '../../../tests/msw/server';

function sessionUser(): SessionUser & { getToken: ReturnType<typeof vi.fn> } {
  return {
    id: `uid-${String(Math.random())}`,
    email: 'ana@example.com',
    name: 'Ana Pérez',
    photo: null,
    provider: 'google',
    getToken: vi.fn(() => Promise.resolve(validToken)),
  };
}

function renderForm(parts: SignUpParts, onDone = vi.fn()) {
  const user = sessionUser();
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const view = renderWithIntl(
    <QueryClientProvider client={client}>
      <PatientSignUpForm
        user={user}
        parts={parts}
        submitLabel="Continuar"
        onDone={onDone}
      />
    </QueryClientProvider>,
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

describe('PatientSignUpForm', () => {
  it('asks for the names and the consents, and is accessible', async () => {
    const { container } = renderForm({ register: true, personalData: false });

    expect(screen.getByRole('textbox', { name: 'Nombre' })).toBeInTheDocument();
    expect(
      screen.getByRole('textbox', { name: 'Apellido' }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole('checkbox')).toHaveLength(3);
    expect(screen.queryByLabelText('Teléfono')).not.toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it('says what is missing, field by field', async () => {
    const { onDone } = renderForm({ register: true, personalData: false });

    await userEvent.type(
      screen.getByRole('textbox', { name: 'Nombre' }),
      'Ana2',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Continuar' }));

    expect(
      await screen.findByText('Usa solo letras, sin números ni símbolos.'),
    ).toBeInTheDocument();
    expect(screen.getByText('Este campo es requerido.')).toBeInTheDocument();
    expect(screen.getAllByText('Debes aceptar para continuar.')).toHaveLength(
      2,
    );
    expect(onDone).not.toHaveBeenCalled();
  });

  it('registers the patient with clean names and refreshes the token', async () => {
    const writes = recordWrites();
    const { onDone, user } = renderForm({
      register: true,
      personalData: false,
    });

    await userEvent.type(
      screen.getByRole('textbox', { name: 'Nombre' }),
      '  María  José ',
    );
    await userEvent.type(
      screen.getByRole('textbox', { name: 'Apellido' }),
      'D’Ambrosio',
    );
    await userEvent.click(screen.getByRole('checkbox', { name: /He leído/ }));
    await userEvent.click(screen.getByRole('checkbox', { name: /Autorizo/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Continuar' }));

    await waitFor(() => {
      expect(onDone).toHaveBeenCalledOnce();
    });
    expect(writes).toEqual([
      {
        path: '/api/v1/identity/register',
        body: {
          firstName: 'María José',
          lastName: "D'Ambrosio",
          acceptedTerms: true,
          acceptedSensitiveData: true,
          acceptedNewsletter: false,
          role: 'PATIENT',
        },
      },
    ]);
    expect(user.getToken).toHaveBeenCalledWith(true);
  });

  it('stays busy once saved, and leaves reading the account to the page', async () => {
    const accountReads: string[] = [];
    server.events.on('request:start', ({ request }) => {
      if (
        request.method === 'GET' &&
        new URL(request.url).pathname.endsWith('/identity/me')
      ) {
        accountReads.push(request.url);
      }
    });
    const { onDone } = renderForm({ register: true, personalData: false });

    await userEvent.type(
      screen.getByRole('textbox', { name: 'Nombre' }),
      'Ana',
    );
    await userEvent.type(
      screen.getByRole('textbox', { name: 'Apellido' }),
      'Pérez',
    );
    await userEvent.click(screen.getByRole('checkbox', { name: /He leído/ }));
    await userEvent.click(screen.getByRole('checkbox', { name: /Autorizo/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Continuar' }));

    await waitFor(() => {
      expect(onDone).toHaveBeenCalledOnce();
    });
    // The page moves on now (under the colour, at the end of a sign-up):
    // back to its words, the button would flash where the colour starts.
    expect(screen.getByRole('button', { name: 'Continuar' })).toHaveAttribute(
      'aria-busy',
      'true',
    );
    // The account read again is what moves the page: the page asks for it.
    expect(accountReads).toEqual([]);
  });

  async function fillPersonalData(documentNumber = '12.345.678') {
    await userEvent.type(
      screen.getByLabelText('Fecha de nacimiento'),
      '1990-01-15',
    );
    await userEvent.type(
      screen.getByRole('textbox', { name: 'Teléfono' }),
      '0414-123.45.67',
    );
    await userEvent.selectOptions(
      screen.getByRole('combobox', { name: 'Tipo de documento' }),
      'E',
    );
    await userEvent.type(
      screen.getByRole('textbox', { name: 'Cédula de identidad' }),
      documentNumber,
    );
    await userEvent.click(screen.getByRole('radio', { name: 'Mujer' }));
  }

  it('completes the personal data as the API takes it', async () => {
    const writes = recordWrites();
    const { onDone } = renderForm({ register: false, personalData: true });

    await fillPersonalData();
    await userEvent.click(screen.getByRole('button', { name: 'Continuar' }));

    await waitFor(() => {
      expect(onDone).toHaveBeenCalledOnce();
    });
    expect(writes.map((write) => write.path)).toEqual([
      '/api/v1/identity/public/check-document',
      '/api/v1/identity/complete-registration',
    ]);
    expect(writes[1]?.body).toEqual({
      dateOfBirth: '1990-01-15',
      phone: '+584141234567',
      documentType: 'E',
      documentNumber: '12345678',
      sex: 'FEMALE',
    });
  });

  it('refuses a minor and a number that is not a Venezuelan mobile', async () => {
    renderForm({ register: false, personalData: true });
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
    const { onDone } = renderForm({ register: true, personalData: true });

    await userEvent.type(
      screen.getByRole('textbox', { name: 'Nombre' }),
      'Ana',
    );
    await userEvent.type(
      screen.getByRole('textbox', { name: 'Apellido' }),
      'Pérez',
    );
    await fillPersonalData(takenDocumentNumber);
    await userEvent.click(screen.getByRole('checkbox', { name: /He leído/ }));
    await userEvent.click(screen.getByRole('checkbox', { name: /Autorizo/ }));
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

  it('says it could not save when the API fails, and keeps the form', async () => {
    server.use(
      http.post(apiUrl('/identity/register'), () =>
        HttpResponse.json(
          { code: 'ERR_9999', message: 'Boom' },
          { status: 500 },
        ),
      ),
      // A 5xx may hide a write that landed: the account says it did not.
      http.get(apiUrl('/identity/me'), () =>
        HttpResponse.json(buildNewAccountMeResponse()),
      ),
    );
    const { onDone } = renderForm({ register: true, personalData: false });

    await userEvent.type(
      screen.getByRole('textbox', { name: 'Nombre' }),
      'Ana',
    );
    await userEvent.type(
      screen.getByRole('textbox', { name: 'Apellido' }),
      'Pérez',
    );
    await userEvent.click(screen.getByRole('checkbox', { name: /He leído/ }));
    await userEvent.click(screen.getByRole('checkbox', { name: /Autorizo/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Continuar' }));

    expect(
      await screen.findByText(
        'No pudimos guardar tus datos. Inténtalo de nuevo en un momento.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Nombre' })).toHaveValue('Ana');
    expect(onDone).not.toHaveBeenCalled();
  });
});
