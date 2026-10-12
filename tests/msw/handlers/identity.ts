import { http, HttpResponse } from 'msw';

import { buildMeResponse } from '../../factories/identity';
import { apiUrl, errorEnvelope } from '../api-url';

/** The bearer the handlers accept; anything else is a stranger. */
export const validToken = 'valid-id-token';

export const identityHandlers = [
  http.get(apiUrl('/identity/me'), ({ request }) => {
    if (request.headers.get('authorization') !== `Bearer ${validToken}`) {
      return HttpResponse.json(errorEnvelope('ERR_1001', 'Unauthorized'), {
        status: 401,
      });
    }
    return HttpResponse.json(buildMeResponse());
  }),
];
