# Redoctor Web

The web of [Redoctor](https://redoctorapp.com), a platform that connects
patients with verified health specialists in Venezuela. During the pilot,
patients have no app: everything they do happens here, from the links their
specialist sends by WhatsApp and from the API's emails. Specialists use the
mobile app; on the web they have their panel (M14): their agenda, their
statistics and their subscription, paid here (M13).

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

## What exists today

| Path                                                                      | What it is                                                                                                                                                                                                                                                                                                                                                                                                       |
| ------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/`                                                                       | The landing (M9), after the middle mockup of Figma «LANDING PAGE»: the search box live (M16), the plans the API's when it answers the landing (the mockup's until then), «Comenzar» leading a patient to the search and a specialist to the sign-in                                                                                                                                                              |
| `/s/{specialistId}`                                                       | Public profile of a specialist (M8): server-rendered, with its own preview image, its schema.org data and words for search engines, and «Agendar cita» (M15); an unknown id is a real 404. The sitemap lists every profile                                                                                                                                                                                       |
| `/home/*`                                                                 | Bridges: they say what opens in the app and offer «Abrir en la app»                                                                                                                                                                                                                                                                                                                                              |
| `/sign-in?redirect=`                                                      | Sign in with Google or Apple (M2), the same accounts as the app; comes back to the same-origin path given                                                                                                                                                                                                                                                                                                        |
| `/panel`                                                                  | The specialist's panel (M14), where a specialist lands after signing in and stays until signing out: the plan and its notice, today's patients, the statistics, what stays in the app; a browser whose session is a specialist's never sees the landing                                                                                                                                                          |
| `/panel/agenda`, `/panel/agenda/{YYYY-MM-DD}`                             | One day of the specialist's agenda (M14), read only: the daily summary's «Ver mi agenda»                                                                                                                                                                                                                                                                                                                         |
| `/panel/appointments`                                                     | The specialist's appointments history (M14): search, state, dates and office, in the address                                                                                                                                                                                                                                                                                                                     |
| `/panel/reports`                                                          | The specialist's statistics (M14): the summary and the four reports of the app, a PDF or a CSV when the plan allows it                                                                                                                                                                                                                                                                                           |
| `/panel/profile`                                                          | «Mi perfil» (M14), read only: whether patients find the profile and, if not, what is missing; the profile as the app shows it to its owner, with «Vista previa» and «Compartir perfil» (email 18)                                                                                                                                                                                                                |
| `/panel/specialties`                                                      | «Mis especialidades» (M14), read only: each specialty and where its review stands, the rejected first, with the reason (email 16)                                                                                                                                                                                                                                                                                |
| `/sign-up?redirect=`                                                      | The sign-up (M3): patients sign up here; a specialist is shown the way to the app (support while it is in testing, the store's QR once published)                                                                                                                                                                                                                                                                |
| `/i/{token}`                                                              | The invitation (M4): the appointment a specialist booked for a patient with no account, claimed right there after signing in (and finishing the sign-up first when it is open), for oneself or for someone in one's care                                                                                                                                                                                         |
| `/a/{appointmentId}`                                                      | The appointment (M5): its state and details for its patient, who confirms it inside its window, reschedules it to another free hour, cancels it or adds it to a calendar; its specialist reads it (the patient, and the way back to their agenda)                                                                                                                                                                |
| `/book/{specialistId}`                                                    | Booking from a profile (M15): the app's four steps — office, day and hour, reason and for whom, summary — with the patient's session; the web's own page, out of `/s/*`, never indexed                                                                                                                                                                                                                           |
| `/search`                                                                 | The search for specialists (M16): the search in the address (a text or a specialty, the place, the app's filters), the first page rendered on the server, the rest and the map in the browser; no session, never indexed; `/api/search`, `/api/search/suggestions` and `/api/places/*` (Google Places through the server) serve the browser                                                                      |
| `/appointments`                                                           | My appointments (M6): the patient's «Próximas» and «Pasadas», each card opening its appointment; a finished consultation not rated yet holds the page with its review first (M7)                                                                                                                                                                                                                                 |
| `/panel/subscription`                                                     | «Mi suscripción» (M13): the plan, where it stands and what it asks for, and everything about it as in the app — cancelling and resuming, dropping one unpaid, a coupon on the plan in force, the billing data, the balance and the latest receipts; the billing emails' «Abrir Redoctor»                                                                                                                         |
| `/panel/subscription/invoices[?status=]`                                  | The receipts (M13), the newest first, filtered by status in the address                                                                                                                                                                                                                                                                                                                                          |
| `/panel/subscription/invoices/{id}`                                       | A receipt: what it covers, the payments applied in bolívares, the payments reported, the adjustments, whom it is issued to; «Pagar ahora» while something is owed                                                                                                                                                                                                                                                |
| `/panel/subscription/balance`                                             | The balance and its movements (M13)                                                                                                                                                                                                                                                                                                                                                                              |
| `/panel/subscription/coupons`                                             | «Mis cupones» (M13): save a code for later, see the personal ones                                                                                                                                                                                                                                                                                                                                                |
| `/pay`                                                                    | The payment (M13): the plans to take one (with a coupon), the plans to change to (`?view=plans`, «Cambiar de plan») and the change itself (`?plan={slug}`, also what a missing feature invites to), Redoctor's accounts with the amount in bolívares, the report and its review; `?invoice={id}` pays the receipt its page chose. Out of `/panel/`, in the panel's frame: no app lists it, so none ever opens it |
| `/daily-summary/unsubscribe?token=…`                                      | Daily-summary opt-out from the API's email (a Server Action)                                                                                                                                                                                                                                                                                                                                                     |
| `/terms`, `/privacy`                                                      | The terms of use and the privacy policy (M10): drafted from what the web and the app do, the base the lawyer reviews; every word in the catalog (`legal.*`), the company's identification a placeholder until the owner fills it                                                                                                                                                                                 |
| `/delete-account`                                                         | How to have an account deleted (M10): through support until the API deletes on request (REDOC-352); the page the stores ask for                                                                                                                                                                                                                                                                                  |
| `/.well-known/apple-app-site-association`, `/.well-known/assetlinks.json` | Universal Links and App Links of the mobile app, byte-exact                                                                                                                                                                                                                                                                                                                                                      |

Every path is English and says who it is for: the specialist's pages live
under `/panel/`, and on a phone where the app is installed it opens only the
ones it shows, listed one by one; the payment lives at `/pay`, which no app
opens. The old names redirect for good (AGENTS.md §6, the one list of
public links).

Every page with a session carries the notifications' bell (M17): the unread
count, the inbox as a menu that unfolds from it, the API's live channel
(Socket.IO) that brings each notice as it is born — a banner, the count, and
what the notice leaves stale read again — and, with the VAPID key, the web
push through a service worker of ours for when no tab is in view, offered
from the menu. No sound on the web.

Next: legal and account (M10) and the rest of AGENTS.md §1, one module at a
time.

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
  with axe on every page, served on :3300 so it never meets `pnpm dev` on
  :3000. The public profile and the opt-out tests reach api-dev for real.
  To test a deployed preview:

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

Vercel builds every branch as a preview and `master` as production, on
`redoctorapp.com` since 2026-10-12 (`www` redirects to it). After a deploy
that touches a public link or `.well-known`, run the e2e `well-known` and
`bridges` specs against production (AGENTS.md §6 "Domain cutover").

## Conventions

Code, comments and commits in English; the product speaks Spanish through
`app/lib/i18n/messages/es.json`. Commits are one line,
`vX.Y.Z, description`, with the version bumped in `package.json` first.
