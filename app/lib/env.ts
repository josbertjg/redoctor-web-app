import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

import { isAppOwnedPath } from './deep-links';

/*
 * Every variable of AGENTS.md §12, validated once. `next.config.ts` imports
 * this module, so a build with a missing or malformed variable fails early
 * with the variable's name. Server variables never reach the browser:
 * reading one there throws.
 */

const appEnvironment = z.enum(['development', 'preview', 'production']);
const url = z.url();
const nonEmpty = z.string().min(1);
const optional = z.string().min(1).optional();

// `Label|+58XXXXXXXXXX`; lists are comma-separated. Provisional until REDOC-357.
const phoneEntry = String.raw`[^|,]+\|\+\d{8,15}`;
const supportWhatsapp = z
  .string()
  .regex(new RegExp(`^${phoneEntry}$`), 'expected "Label|+number"');
const supportPhones = z
  .string()
  .regex(
    new RegExp(`^${phoneEntry}(,${phoneEntry})*$`),
    'expected "Label|+number" entries separated by commas',
  );

const appStoreId = z
  .string()
  .regex(/^\d+$/, 'expected the numeric App Store id')
  .optional();
const playStoreId = z
  .string()
  .regex(/^[A-Za-z]\w*(\.[A-Za-z]\w*)+$/, 'expected an Android package name')
  .optional();
const sitePath = z
  .string()
  .regex(/^\/[a-z0-9-]+(\/[a-z0-9-]+)*$/, 'expected a path like /pagar');

type IssuePath = NonNullable<
  Parameters<
    NonNullable<Parameters<typeof createEnv>[0]['onValidationError']>
  >[0][number]['path']
>;

function formatPath(path: IssuePath | undefined): string {
  return (path ?? [])
    .map((segment) =>
      typeof segment === 'object' ? String(segment.key) : String(segment),
    )
    .join('.');
}

export const env = createEnv({
  server: {
    SENTRY_ORG: optional,
    SENTRY_PROJECT: optional,
    SENTRY_AUTH_TOKEN: optional,
    API_PROXY_TARGET: url.optional(),
  },
  client: {
    NEXT_PUBLIC_APP_ENV: appEnvironment,
    NEXT_PUBLIC_SITE_URL: url,
    NEXT_PUBLIC_API_URL: url,
    NEXT_PUBLIC_FIREBASE_API_KEY: nonEmpty,
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: nonEmpty,
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: nonEmpty,
    NEXT_PUBLIC_FIREBASE_APP_ID: nonEmpty,
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: nonEmpty,
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: nonEmpty,
    NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID: nonEmpty,
    NEXT_PUBLIC_POSTHOG_KEY: optional,
    NEXT_PUBLIC_POSTHOG_HOST: url.default('https://us.i.posthog.com'),
    NEXT_PUBLIC_SENTRY_DSN: url.optional(),
    NEXT_PUBLIC_APP_STORE_ID: appStoreId,
    NEXT_PUBLIC_PLAY_STORE_ID: playStoreId,
    NEXT_PUBLIC_IOS_BUNDLE_ID: nonEmpty,
    NEXT_PUBLIC_APPLE_TEAM_ID: nonEmpty,
    NEXT_PUBLIC_ANDROID_PACKAGE: nonEmpty,
    NEXT_PUBLIC_SUPPORT_WHATSAPP: supportWhatsapp,
    NEXT_PUBLIC_SUPPORT_PHONES: supportPhones,
    NEXT_PUBLIC_PAYMENT_PATH: sitePath,
  },
  runtimeEnv: {
    SENTRY_ORG: process.env.SENTRY_ORG,
    SENTRY_PROJECT: process.env.SENTRY_PROJECT,
    SENTRY_AUTH_TOKEN: process.env.SENTRY_AUTH_TOKEN,
    API_PROXY_TARGET: process.env.API_PROXY_TARGET,
    NEXT_PUBLIC_APP_ENV: process.env.NEXT_PUBLIC_APP_ENV,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN:
      process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    NEXT_PUBLIC_FIREBASE_PROJECT_ID:
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID:
      process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET:
      process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID:
      process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
    NEXT_PUBLIC_POSTHOG_KEY: process.env.NEXT_PUBLIC_POSTHOG_KEY,
    NEXT_PUBLIC_POSTHOG_HOST: process.env.NEXT_PUBLIC_POSTHOG_HOST,
    NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
    NEXT_PUBLIC_APP_STORE_ID: process.env.NEXT_PUBLIC_APP_STORE_ID,
    NEXT_PUBLIC_PLAY_STORE_ID: process.env.NEXT_PUBLIC_PLAY_STORE_ID,
    NEXT_PUBLIC_IOS_BUNDLE_ID: process.env.NEXT_PUBLIC_IOS_BUNDLE_ID,
    NEXT_PUBLIC_APPLE_TEAM_ID: process.env.NEXT_PUBLIC_APPLE_TEAM_ID,
    NEXT_PUBLIC_ANDROID_PACKAGE: process.env.NEXT_PUBLIC_ANDROID_PACKAGE,
    NEXT_PUBLIC_SUPPORT_WHATSAPP: process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP,
    NEXT_PUBLIC_SUPPORT_PHONES: process.env.NEXT_PUBLIC_SUPPORT_PHONES,
    NEXT_PUBLIC_PAYMENT_PATH: process.env.NEXT_PUBLIC_PAYMENT_PATH,
  },
  emptyStringAsUndefined: true,
  createFinalSchema: (shape, isServer) =>
    z.object(shape).check((ctx) => {
      const {
        NEXT_PUBLIC_PAYMENT_PATH,
        NEXT_PUBLIC_APP_ENV,
        API_PROXY_TARGET,
      } = ctx.value;

      if (isAppOwnedPath(NEXT_PUBLIC_PAYMENT_PATH)) {
        ctx.issues.push({
          code: 'custom',
          input: NEXT_PUBLIC_PAYMENT_PATH,
          path: ['NEXT_PUBLIC_PAYMENT_PATH'],
          message:
            'uses a path the mobile app owns; the payment route is never an app path',
        });
      }

      if (
        isServer &&
        NEXT_PUBLIC_APP_ENV !== 'development' &&
        API_PROXY_TARGET !== undefined
      ) {
        ctx.issues.push({
          code: 'custom',
          input: API_PROXY_TARGET,
          path: ['API_PROXY_TARGET'],
          message:
            'is development-only; it must be absent in preview and production',
        });
      }
    }),
  onValidationError: (issues) => {
    const details = issues
      .map((issue) => `${formatPath(issue.path)}: ${issue.message}`)
      .join('\n  ');
    throw new Error(`Invalid environment variables:\n  ${details}`);
  },
  onInvalidAccess: (variable) => {
    throw new Error(
      `${variable} is a server-only variable and was read in the browser`,
    );
  },
});

export type Env = typeof env;
