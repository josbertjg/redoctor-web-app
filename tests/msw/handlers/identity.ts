import { http, HttpResponse } from 'msw';

import {
  documentQuerySchema,
  patientCompletionBodySchema,
  patientRegistrationBodySchema,
} from '@/app/lib/schemas/identity';

import {
  buildMeResponse,
  patientFacet,
  takenDocumentNumber,
} from '../../factories/identity';
import { apiUrl, errorEnvelope } from '../api-url';

/** The bearer the handlers accept; anything else is a stranger. */
export const validToken = 'valid-id-token';

export const isStranger = (request: Request) =>
  request.headers.get('authorization') !== `Bearer ${validToken}`;

export const unauthorized = () =>
  HttpResponse.json(errorEnvelope('ERR_1001', 'Unauthorized'), {
    status: 401,
  });

/** The body the web sent breaks the contract: what the API would answer. */
export const badRequest = () =>
  HttpResponse.json(errorEnvelope('ERR_1002', 'Validation failed'), {
    status: 400,
  });

export const identityHandlers = [
  http.get(apiUrl('/identity/me'), ({ request }) => {
    if (isStranger(request)) return unauthorized();
    return HttpResponse.json(buildMeResponse());
  }),

  http.post(apiUrl('/identity/register'), async ({ request }) => {
    if (isStranger(request)) return unauthorized();
    const body = patientRegistrationBodySchema.safeParse(await request.json());
    if (!body.success) return badRequest();
    return HttpResponse.json(
      buildMeResponse({
        displayName: `${body.data.firstName} ${body.data.lastName}`,
        registrationStatus: 'PENDING_COMPLETE_PATIENT',
        profiles: {
          patient: patientFacet({ status: 'PENDING_PERSONAL_DATA' }),
          specialist: { exists: false },
        },
      }),
    );
  }),

  http.post(apiUrl('/identity/complete-registration'), async ({ request }) => {
    if (isStranger(request)) return unauthorized();
    const body = patientCompletionBodySchema.safeParse(await request.json());
    if (!body.success) return badRequest();
    return HttpResponse.json(buildMeResponse());
  }),

  http.post(apiUrl('/identity/public/check-document'), async ({ request }) => {
    const body = documentQuerySchema.safeParse(await request.json());
    if (!body.success) return badRequest();
    return HttpResponse.json({
      available: body.data.documentNumber !== takenDocumentNumber,
    });
  }),
];
