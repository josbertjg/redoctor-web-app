import { notificationsHandlers } from './notifications';
import { reviewsHandlers } from './reviews';
import { specialistsHandlers } from './specialists';
import { specialtiesHandlers } from './specialties';

import type { HttpHandler } from 'msw';

/*
 * Request handlers shared by every unit test, one file per API domain, built
 * from the factories so the mocks never drift from the zod contract.
 */
export const handlers: HttpHandler[] = [
  ...specialistsHandlers,
  ...reviewsHandlers,
  ...specialtiesHandlers,
  ...notificationsHandlers,
];
