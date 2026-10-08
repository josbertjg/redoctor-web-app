import { setupServer } from 'msw/node';

import { handlers } from './handlers';

/** The MSW server shared by every unit test (started in tests/setup.ts). */
export const server = setupServer(...handlers);
