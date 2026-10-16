// @vitest-environment node
import { describe, expect, it } from 'vitest';

import { env } from './env';
import { publicEnv } from './public-env';

describe('publicEnv', () => {
  it('says what the validated env says', () => {
    expect(publicEnv).toEqual({
      siteUrl: env.NEXT_PUBLIC_SITE_URL,
      apiUrl: env.NEXT_PUBLIC_API_URL,
      androidPackage: env.NEXT_PUBLIC_ANDROID_PACKAGE,
      appStoreId: env.NEXT_PUBLIC_APP_STORE_ID,
      playStoreId: env.NEXT_PUBLIC_PLAY_STORE_ID,
      supportWhatsapp: env.NEXT_PUBLIC_SUPPORT_WHATSAPP,
      supportPhones: env.NEXT_PUBLIC_SUPPORT_PHONES,
      firebase: {
        apiKey: env.NEXT_PUBLIC_FIREBASE_API_KEY,
        authDomain: env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
        projectId: env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        appId: env.NEXT_PUBLIC_FIREBASE_APP_ID,
        messagingSenderId: env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
        vapidKey: env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
      },
      googleMaps: {
        apiKey: env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
        mapId: env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID,
      },
    });
  });
});
