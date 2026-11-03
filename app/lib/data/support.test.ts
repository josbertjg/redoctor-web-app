// @vitest-environment node
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { apiUrl } from '@/tests/msw/api-url';
import { server } from '@/tests/msw/server';

import { getSupportContact } from './support';

describe('getSupportContact', () => {
  it('reads the support lines the API publishes, in their order', async () => {
    await expect(getSupportContact()).resolves.toEqual({
      whatsapp: [{ label: 'Redoctor', phone: '+58 424 0000002' }],
      calls: [{ label: 'General', phone: '+58 414 0000001' }],
    });
  });

  it('leaves the page without support lines when the API does not answer', async () => {
    server.use(
      http.get(apiUrl('/config/support'), () =>
        HttpResponse.json({ code: 'ERR_1007' }, { status: 429 }),
      ),
    );

    await expect(getSupportContact()).resolves.toEqual({
      whatsapp: [],
      calls: [],
    });
  });
});
