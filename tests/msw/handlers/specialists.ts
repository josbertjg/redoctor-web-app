import { http, HttpResponse } from 'msw';

import {
  buildPublicProfileResponse,
  knownSpecialistId,
} from '../../factories/specialists';
import { apiUrl, errorEnvelope } from '../api-url';

export const specialistsHandlers = [
  http.get(
    apiUrl('/specialists/:specialistId/public-profile'),
    ({ params }) => {
      if (params.specialistId !== knownSpecialistId) {
        return HttpResponse.json(
          errorEnvelope('ERR_3030', 'SpecialistProfile not found'),
          { status: 404 },
        );
      }
      return HttpResponse.json(buildPublicProfileResponse());
    },
  ),
];
