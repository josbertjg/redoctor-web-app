// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => {
  vi.resetModules();
});

async function loadWithAppStoreId(appStoreId: string) {
  vi.stubEnv('NEXT_PUBLIC_APP_STORE_ID', appStoreId);
  return import('./app-bridge');
}

describe('smartAppBanner', () => {
  it('stays off while the App Store id is empty (pilot)', async () => {
    const { smartAppBanner } = await loadWithAppStoreId('');

    expect(smartAppBanner('/suscripcion')).toEqual({});
  });

  it('opens the app on the same page once the listing exists', async () => {
    const { smartAppBanner } = await loadWithAppStoreId('1234567890');

    expect(smartAppBanner('/suscripcion')).toEqual({
      itunes: {
        appId: '1234567890',
        appArgument: 'http://localhost:3000/suscripcion',
      },
    });
  });
});
