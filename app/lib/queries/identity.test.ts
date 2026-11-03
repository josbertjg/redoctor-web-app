// @vitest-environment node
import { QueryClient } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import {
  completePatientRegistration,
  isDocumentAvailable,
  meQueryOptions,
  refreshIdToken,
  registerAccount,
  takenIdentityField,
} from './identity';
import {
  buildMeResponse,
  buildPendingSpecialistMeResponse,
  knownUserId,
  takenDocumentNumber,
} from '../../../tests/factories/identity';
import { apiUrl, errorEnvelope } from '../../../tests/msw/api-url';
import { validToken } from '../../../tests/msw/handlers/identity';
import { server } from '../../../tests/msw/server';
import { ApiError, isApiError } from '../api/errors';

const client = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false } } });

const user = (id = 'uid-1', token = validToken) => ({
  id,
  getToken: () => Promise.resolve(token),
});

const registrationBody = {
  firstName: 'Ana',
  lastName: 'Pérez',
  acceptedTerms: true,
  acceptedSensitiveData: true,
  acceptedNewsletter: false,
  role: 'PATIENT',
} as const;

const specialistBody = {
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
  acceptedNewsletter: true,
} as const;

const completionBody = {
  dateOfBirth: '1990-01-15',
  phone: '+584141234567',
  documentType: 'V',
  documentNumber: '12345678',
  sex: 'FEMALE',
} as const;

describe('meQueryOptions', () => {
  it('reads the account with the bearer and maps it', async () => {
    const account = await client().query(meQueryOptions(user()));

    expect(account).toMatchObject({
      id: knownUserId,
      name: 'Ana Pérez',
      role: 'patient',
      patient: { exists: true, isComplete: true },
    });
  });

  it('fails as an ApiError when the token is not accepted', async () => {
    await expect(
      client().query(meQueryOptions(user('uid-2', 'expired'))),
    ).rejects.toSatisfy((error) => isApiError(error) && error.status === 401);
  });
});

describe('the patient sign-up', () => {
  it('registers the patient and answers the account', async () => {
    const account = await registerAccount(user('uid-3'), registrationBody);

    expect(account.registration).toBe('pendingCompletePatient');
    expect(account.patient).toMatchObject({
      exists: true,
      status: 'pendingPersonalData',
      isIncomplete: true,
    });
  });

  it('takes a 409 for a registration that already happened', async () => {
    server.use(
      http.post(apiUrl('/identity/register'), () =>
        HttpResponse.json(errorEnvelope('ERR_2002', 'Already registered'), {
          status: 409,
        }),
      ),
    );

    const account = await registerAccount(user('uid-4'), registrationBody);

    expect(account.registration).toBe('completed');
  });

  it('completes the registration with the personal data', async () => {
    const account = await completePatientRegistration(
      user('uid-5'),
      completionBody,
    );

    expect(account.patient.isComplete).toBe(true);
  });

  it('takes a 403 for a completion that already happened, and fails otherwise', async () => {
    server.use(
      http.post(apiUrl('/identity/complete-registration'), () =>
        HttpResponse.json(errorEnvelope('ERR_2010', 'Not allowed'), {
          status: 403,
        }),
      ),
    );
    await expect(
      completePatientRegistration(user('uid-6'), completionBody),
    ).resolves.toMatchObject({ registration: 'completed' });

    server.use(
      http.get(apiUrl('/identity/me'), () =>
        HttpResponse.json(
          buildMeResponse({
            registrationStatus: 'PENDING_COMPLETE_PATIENT',
            profiles: {
              patient: { exists: true, status: 'PENDING_PERSONAL_DATA' },
              specialist: { exists: false },
            },
          }),
        ),
      ),
    );
    await expect(
      completePatientRegistration(user('uid-7'), completionBody),
    ).rejects.toSatisfy((error) => isApiError(error) && error.status === 403);
  });

  it('asks whether a document is free', async () => {
    await expect(
      isDocumentAvailable({ documentType: 'V', documentNumber: '12345678' }),
    ).resolves.toBe(true);
    await expect(
      isDocumentAvailable({
        documentType: 'V',
        documentNumber: takenDocumentNumber,
      }),
    ).resolves.toBe(false);
  });
});

describe('the specialist sign-up', () => {
  it('registers a specialist with the API’s body', async () => {
    let received: unknown = null;
    server.use(
      http.post(apiUrl('/identity/register'), async ({ request }) => {
        received = await request.clone().json();
        // Nothing answered here: the default handler answers.
      }),
    );

    const account = await registerAccount(user('uid-20'), specialistBody);

    expect(received).toEqual(specialistBody);
    expect(account.registration).toBe('pendingCompleteSpecialist');
    expect(account.role).toBe('specialist');
    expect(account.specialist).toMatchObject({
      exists: true,
      status: 'pendingSpecialties',
      isIncomplete: true,
    });
  });

  it('counts a registration already done as done', async () => {
    server.use(
      http.post(apiUrl('/identity/register'), () =>
        HttpResponse.json(errorEnvelope('ERR_2002', 'Already registered'), {
          status: 409,
        }),
      ),
      http.get(apiUrl('/identity/me'), () =>
        HttpResponse.json(buildPendingSpecialistMeResponse()),
      ),
    );

    const account = await registerAccount(user('uid-21'), specialistBody);

    expect(account.registration).toBe('pendingCompleteSpecialist');
  });
});

describe('takenIdentityField', () => {
  const refusal = (
    status: number,
    code: string,
    details?: Record<string, unknown>,
  ) =>
    new ApiError({
      kind: 'http',
      method: 'POST',
      path: '/identity/register',
      status,
      code,
      details,
    });

  it('names the field another account has', () => {
    expect(takenIdentityField(refusal(409, 'ERR_2011'))).toBe('document');
    expect(
      takenIdentityField(refusal(409, 'ERR_1005', { phone: 'taken' })),
    ).toBe('phone');
  });

  it('names nothing for any other failure', () => {
    expect(takenIdentityField(refusal(409, 'ERR_1005'))).toBeNull();
    expect(takenIdentityField(refusal(500, 'ERR_9999'))).toBeNull();
    expect(takenIdentityField(new Error('offline'))).toBeNull();
  });
});

describe('refreshIdToken', () => {
  it('asks for a fresh token, and shrugs off a failure', async () => {
    const asked: (boolean | undefined)[] = [];
    await refreshIdToken({
      getToken: (force) => {
        asked.push(force);
        return Promise.reject(new Error('offline'));
      },
    });

    expect(asked).toEqual([true]);
  });
});
