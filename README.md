# Redoctor Web

The web of [Redoctor](https://redoctorapp.com), a platform that connects
patients with verified health specialists in Venezuela. During the pilot,
patients have no app: everything they do happens here, from the links their
specialist sends by WhatsApp and from the API's emails. Specialists use the
mobile app; the web only opens it for them, and lets them pay (M13).

**`AGENTS.md` is the contract of this repository**: product rules, stack,
layout, design tokens, API facts, privacy and the open decisions. Read it
before changing anything.

## Requirements

- Node 24 (`.nvmrc`)
- pnpm 12 (pinned in `package.json` → `packageManager`; `corepack enable`)

## Getting started

```bash
pnpm install
cp .env.example .env.local   # public values for development; see the comments
pnpm dev                     # http://localhost:3000
```

Public pages render on the server and call the API from there (no CORS
needed). The browser calls the API only in authenticated flows; until the
API allows the web's origin (REDOC-362), `next dev` forwards
`/api-proxy/*` to `API_PROXY_TARGET` (or `NEXT_PUBLIC_API_URL`). That proxy
never exists in a build.

## Scripts

| Script                              | What it does                                                                  |
| ----------------------------------- | ----------------------------------------------------------------------------- |
| `pnpm dev`                          | Development server (Turbopack)                                                |
| `pnpm build` · `pnpm start`         | Production build and server                                                   |
| `pnpm typecheck`                    | Route types (`next typegen`) and `tsc --noEmit`                               |
| `pnpm lint`                         | Route types and ESLint (layer boundaries included)                            |
| `pnpm format` · `pnpm format:check` | Prettier                                                                      |
| `pnpm test`                         | Unit and component tests (Vitest, MSW, jest-axe)                              |
| `pnpm test:e2e`                     | Playwright on iPhone 13 and Pixel 7 profiles (builds and starts the app)      |
| `pnpm check`                        | typecheck + lint + format:check + test + build: green before anything is done |

Git hooks (Husky): lint-staged on commit, typecheck and tests on push.

## What exists today (M1)

| Path                                                                                                                    | What it is                                                                                                                                        |
| ----------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/`                                                                                                                     | The landing (M9), after the middle mockup of Figma «LANDING PAGE»: the look and the structure; search, sign-in and plans get their logic later    |
| `/s/{specialistId}`                                                                                                     | Public profile of a specialist (M8): read-only, server-rendered, with its own preview image                                                       |
| `/panel/subscription`, `/panel/agenda`, `/panel/agenda/{YYYY-MM-DD}`, `/panel/specialties`, `/panel/profile`, `/home/*` | Bridges: they say what opens in the app and offer «Abrir en la app»                                                                               |
| `/sign-in?redirect=`                                                                                                    | Sign in with Google or Apple (M2), the same accounts as the app; comes back to the same-origin path given                                         |
| `/panel`                                                                                                                | A signed-in specialist's page: the app's options, each opening the app through its bridge                                                         |
| `/sign-up?redirect=`                                                                                                    | The sign-up (M3): patients sign up here; a specialist is shown the way to the app (support while it is in testing, the store's QR once published) |
| `/daily-summary/unsubscribe?token=…`                                                                                    | Daily-summary opt-out from the API's email (a Server Action)                                                                                      |
| `/.well-known/apple-app-site-association`, `/.well-known/assetlinks.json`                                               | Universal Links and App Links of the mobile app, byte-exact                                                                                       |

Every path is English and says who it is for: the specialist's pages that
the app opens live under `/panel/`. The old Spanish names redirect for good
(AGENTS.md §6, the one list of public links).

Next: invitation (M4), appointment (M5) and the rest of
AGENTS.md §1, one module at a time.

## Layout

```
app/(module)/     one route group per module, with its private _components/
app/ui/           every shared component (primitives and domain pieces)
app/lib/          every piece of non-React logic (API client, schemas, data, env…)
app/hooks/        shared client hooks
tests/            MSW handlers, factories, setup and the Playwright specs
public/           .well-known, brand assets, illustrations
```

Details and the rules that keep this shape: AGENTS.md §3.

## Environment variables

Every variable is listed in `.env.example` and validated in
`app/lib/env.ts`: a missing or malformed one fails the build by name.
`NEXT_PUBLIC_*` values reach the browser and are public by design. Client
components read them from `app/lib/public-env.ts`. Preview and production
values live in Vercel.

## Tests

- **Unit and components** (`pnpm test`): colocated `*.test.ts(x)` files;
  every API call goes through MSW handlers built from the API's shapes; UI
  primitives run axe.
- **End-to-end** (`pnpm test:e2e`): a production build on mobile profiles,
  with axe on every page. The public profile and the opt-out tests reach
  api-dev for real. To test a deployed preview:

  ```bash
  PLAYWRIGHT_BASE_URL=https://<preview>.vercel.app pnpm test:e2e
  ```

  If previews have Deployment Protection, also set
  `VERCEL_AUTOMATION_BYPASS_SECRET`.

## CI

| Workflow      | When                                    | What                                                                       |
| ------------- | --------------------------------------- | -------------------------------------------------------------------------- |
| `ci.yml`      | every pull request and push to `master` | `pnpm check`                                                               |
| `preview.yml` | Vercel finishes a preview deployment    | Playwright and Lighthouse (budgets of AGENTS.md §8.10) against the preview |
| `audit.yml`   | Mondays                                 | `pnpm audit --audit-level high`                                            |

Renovate (`renovate.json`) proposes updates weekly once its GitHub app is
installed on the repository. Majors wait for approval.

## Observability and analytics

Both are **off unless their variables are set**, and each loads in its own
chunk only when it is on.

- **Sentry** (`NEXT_PUBLIC_SENTRY_DSN`): errors only. It collects no user
  data, cookies, headers, bodies, query strings or local variables. URLs
  lose their tokens before leaving (`app/lib/observability/scrub.ts`).
  Source maps upload when the build has `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`
  and `SENTRY_PROJECT`.
- **PostHog** (`NEXT_PUBLIC_POSTHOG_KEY`): only the events the web sends on
  purpose (`web_link_opened` today), with the link's origin and never
  personal data. In the PostHog project, enable "Discard client IP data".

## Deployment

Vercel builds every branch as a preview and `master` as production. The
domain `redoctorapp.com` still points to the previous prototype; the
cutover (M12) is in AGENTS.md §6. Until then, iOS reads the prototype's
`apple-app-site-association`.

## Conventions

Code, comments and commits in English; the product speaks Spanish through
`app/lib/i18n/messages/es.json`. Commits are one line,
`vX.Y.Z, description`, with the version bumped in `package.json` first.
