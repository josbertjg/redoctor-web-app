// @vitest-environment node
import { describe, expect, it } from 'vitest';

import { env } from './env';
import { publicEnv } from './public-env';

describe('publicEnv', () => {
  it('says what the validated env says', () => {
    expect(publicEnv).toEqual({
      siteUrl: env.NEXT_PUBLIC_SITE_URL,
      androidPackage: env.NEXT_PUBLIC_ANDROID_PACKAGE,
      appStoreId: env.NEXT_PUBLIC_APP_STORE_ID,
      playStoreId: env.NEXT_PUBLIC_PLAY_STORE_ID,
    });
  });
});
