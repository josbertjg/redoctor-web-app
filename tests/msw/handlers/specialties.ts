import { http, HttpResponse } from 'msw';

import { buildSpecialtiesTreeResponse } from '../../factories/specialties';
import { apiUrl } from '../api-url';

export const specialtiesHandlers = [
  http.get(apiUrl('/specialties/tree'), () =>
    HttpResponse.json(buildSpecialtiesTreeResponse()),
  ),
];
