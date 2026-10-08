// @vitest-environment node
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { server } from '@/tests/msw/server';

import { fetchImageAsDataUri } from './images';

const photo = 'https://lh3.googleusercontent.com/a/photo=s96-c';
const pngBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);

describe('fetchImageAsDataUri', () => {
  it('embeds a PNG or JPEG photo', async () => {
    server.use(
      http.get(
        photo,
        () =>
          new HttpResponse(pngBytes, {
            headers: { 'Content-Type': 'image/png' },
          }),
      ),
    );

    await expect(fetchImageAsDataUri(photo)).resolves.toBe(
      `data:image/png;base64,${Buffer.from(pngBytes).toString('base64')}`,
    );
  });

  it('gives up on formats the renderer cannot draw', async () => {
    server.use(
      http.get(
        photo,
        () =>
          new HttpResponse(pngBytes, {
            headers: { 'Content-Type': 'image/webp' },
          }),
      ),
    );

    await expect(fetchImageAsDataUri(photo)).resolves.toBeNull();
  });

  it('gives up on a missing or oversized photo', async () => {
    server.use(http.get(photo, () => new HttpResponse(null, { status: 404 })));
    await expect(fetchImageAsDataUri(photo)).resolves.toBeNull();

    server.use(
      http.get(
        photo,
        () =>
          new HttpResponse(pngBytes, {
            headers: {
              'Content-Type': 'image/jpeg',
              'Content-Length': '5000000',
            },
          }),
      ),
    );
    await expect(fetchImageAsDataUri(photo)).resolves.toBeNull();
  });

  it('gives up when the network fails', async () => {
    server.use(http.get(photo, () => HttpResponse.error()));

    await expect(fetchImageAsDataUri(photo)).resolves.toBeNull();
  });
});
