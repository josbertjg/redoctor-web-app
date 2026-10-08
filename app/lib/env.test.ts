// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';

/*
 * The module validates on import, so every case loads it fresh. It runs in
 * Node because the server-side rules (the development proxy) only apply when
 * no `window` exists, exactly as in `next build`.
 */
async function loadEnv() {
  vi.resetModules();
  return import('./env');
}

describe('env', () => {
  it('parses the test environment (.env.test)', async () => {
    const { env } = await loadEnv();

    expect(env.NEXT_PUBLIC_APP_ENV).toBe('development');
    expect(env.NEXT_PUBLIC_API_URL).toBe(
      'https://api-dev.redoctorapp.com/api/v1',
    );
    expect(env.NEXT_PUBLIC_PAYMENT_PATH).toBe('/pagar');
    expect(env.NEXT_PUBLIC_POSTHOG_KEY).toBeUndefined();
  });

  it('fails naming the variable when a required one is missing', async () => {
    vi.stubEnv('NEXT_PUBLIC_API_URL', '');

    await expect(loadEnv()).rejects.toThrow(/NEXT_PUBLIC_API_URL/);
  });

  it('fails when a variable has the wrong shape', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPPORT_WHATSAPP', 'Redoctor 0422-7362867');

    await expect(loadEnv()).rejects.toThrow(/NEXT_PUBLIC_SUPPORT_WHATSAPP/);
  });

  it('refuses the development proxy outside development', async () => {
    vi.stubEnv('NEXT_PUBLIC_APP_ENV', 'production');
    vi.stubEnv('API_PROXY_TARGET', 'https://api-dev.redoctorapp.com/api/v1');

    await expect(loadEnv()).rejects.toThrow(/API_PROXY_TARGET/);
  });

  it('refuses a payment path that the mobile app owns', async () => {
    vi.stubEnv('NEXT_PUBLIC_PAYMENT_PATH', '/suscripcion');

    await expect(loadEnv()).rejects.toThrow(/NEXT_PUBLIC_PAYMENT_PATH/);
  });
});
