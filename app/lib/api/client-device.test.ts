import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { apiUrl } from '@/tests/msw/api-url';
import { server } from '@/tests/msw/server';

import { apiFetch } from './client';

describe('apiFetch in the browser', () => {
  it('names this browser on every request, as its push registration does (REDOC-358)', async () => {
    const devices: (string | null)[] = [];
    server.use(
      http.get(apiUrl('/ping'), ({ request }) => {
        devices.push(request.headers.get('x-device-id'));
        return HttpResponse.json({ ok: true });
      }),
    );

    await apiFetch({ path: '/ping', schema: z.object({ ok: z.boolean() }) });
    await apiFetch({ path: '/ping', schema: z.object({ ok: z.boolean() }) });

    const stored = window.localStorage.getItem('redoctor-device-id');
    expect(stored).toMatch(/^[0-9a-f-]{36}$/);
    expect(devices).toEqual([stored, stored]);
  });
});
