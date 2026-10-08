/*
 * Lighthouse CI against a Vercel preview (.github/workflows/preview.yml),
 * with the performance budgets of AGENTS.md §8.10 on a mid-range phone over
 * 4G (Lighthouse's default mobile profile).
 *
 * - PREVIEW_URL: the preview to audit.
 * - PREVIEW_COOKIE: the Deployment Protection cookie, when previews are
 *   protected. It is a header on every request, so third parties are blocked:
 *   they never see it, and CI traffic never reaches analytics or Sentry.
 * - E2E_SPECIALIST_ID: the public profile to audit (api-dev's test profile).
 */
const previewUrl = process.env.PREVIEW_URL;
if (!previewUrl) throw new Error('PREVIEW_URL is required');

const specialistId =
  process.env.E2E_SPECIALIST_ID ?? 'a0af9566-a53d-4887-8d16-1dfc589c2f3d';
const cookie = process.env.PREVIEW_COOKIE;

const pages = ['/', `/s/${specialistId}`, '/suscripcion'];

module.exports = {
  ci: {
    collect: {
      url: pages.map((page) => new URL(page, previewUrl).toString()),
      numberOfRuns: 3,
      settings: {
        blockedUrlPatterns: [
          '*posthog.com*',
          '*sentry.io*',
          '*googleusercontent.com*',
          '*googleapis.com*',
          '*firebasestorage.app*',
        ],
        ...(cookie ? { extraHeaders: { Cookie: cookie } } : {}),
      },
    },
    assert: {
      assertions: {
        'largest-contentful-paint': [
          'error',
          { maxNumericValue: 2500, aggregationMethod: 'median-run' },
        ],
        'cumulative-layout-shift': [
          'error',
          { maxNumericValue: 0.05, aggregationMethod: 'median-run' },
        ],
        // The lab stand-in for INP ≤ 200 ms.
        'total-blocking-time': [
          'warn',
          { maxNumericValue: 200, aggregationMethod: 'median-run' },
        ],
        // 150 KB gzip of JS (AGENTS.md §8.10). A warning until the budget is
        // decided: React 19 + Next.js 16 alone weigh about 140 KB.
        'resource-summary:script:size': [
          'warn',
          { maxNumericValue: 153_600, aggregationMethod: 'median-run' },
        ],
        'categories:accessibility': ['error', { minScore: 0.95 }],
      },
    },
    upload: { target: 'filesystem', outputDir: './lighthouse-reports' },
  },
};
