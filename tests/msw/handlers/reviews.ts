import { http, HttpResponse } from 'msw';

import { buildReviewsResponse } from '../../factories/reviews';
import { apiUrl } from '../api-url';

export const reviewsHandlers = [
  http.get(apiUrl('/reviews/specialists/:specialistId'), () =>
    HttpResponse.json(buildReviewsResponse()),
  ),
];
