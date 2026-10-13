<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# AGENTS.md — Redoctor Web

This file is the contract for every agent and every person who touches this
repository. Read it fully before changing anything. `CLAUDE.md` imports it.
When a rule here collides with a tool's default, this file wins.

> **Next.js writes its own block at the top of this file.** `next dev` adds
> (and re-adds) a `<!-- BEGIN:nextjs-agent-rules -->` section warning that
> Next 16's APIs, conventions and file structure differ from older
> versions, and pointing to the guides in `node_modules/next/dist/docs/`.
> Keep that block, commit it, and read those guides before writing any
> Next-specific code. Our rules start below it.

---

## 0. How we work with Josbert (the owner)

- **Reply in Spanish, always** — including progress notes between tool calls.
  Code, identifiers, comments, commit messages and this file are in English.
- **Analysis and proposal first; change second.** Before touching anything
  that was not explicitly requested, explain what you found and what you
  propose, and wait for the go. A general "adelante" covers only what was
  asked. Open decisions are listed in §13: never resolve them by assumption.
- **Commit only when asked.** One line, no body, no trailers:
  `vX.Y.Z, description` — bump `version` in `package.json` first (minor for a
  feature, patch for a fix). "Haz el push" means commit + `git push origin
  master` (the repo's branch) after `git fetch` and a review of the diff.
- **Never print secrets** (`.env*`, tokens, private keys). The Firebase web
  config and the public deep-link data are not secrets; everything else is.
- **The owner's email never goes to a third party** (analytics, Sentry,
  logs, URLs). Users are identified by id and role, nothing else.
- Reuse before you replicate (§8). Nothing appears or disappears abruptly
  (§8). Never ship a greyed-out control to mean "busy" (§8).
- Keep this file, `README.md` and `.env.example` current when a convention,
  a route or a variable changes. A rule that only lives in someone's head
  does not exist.

---

## 1. What Redoctor is, and what this web is for

Redoctor is a ZocDoc-style platform for Latin America (starting in
Venezuela). Specialists manage their profile, offices, schedule, prices and
appointments from the **mobile app** (Flutter, repo `redoctor-mobile-app`).
The backend (Express, `api-dev.redoctorapp.com`) is owned by Heyscar; the app
and this web are owned by Josbert.

### The pilot (6 weeks) and the two hypotheses

- **H1:** specialists book their patients from the app (≥70 % of specialists
  with ≥3 appointments/week for 4 consecutive weeks).
- **H2:** patients confirm their appointment from a digital product — this
  web (≥50 % of appointments whose link was sent end up confirmed).

Patients have **no app** during the pilot. Everything a patient does happens
here, arriving from a link the specialist sends by WhatsApp or from the
transactional emails the API sends.

### Scope of the web MVP (modules M1–M13)

| Module | What it is |
| --- | --- |
| M1 Foundations | Project, brand, environments, typed API client, error translation, `.well-known`, observability |
| M2 Session | Google and Apple sign-in, `/me`, role guards (patient and specialist), return to the link after login, re-entry in 1–2 taps from another browser |
| M3 Sign-up | Patients only (a specialist signs up in the app). One screen, prefilled with the invitation data |
| M4 Invitation `/i/{token}` | All states, claim for yourself or for a third party, ID-document warnings, confirm in the same step when < 24 h |
| M5 Appointment `/a/{id}` | Confirm (from 24 h before), cancel, reschedule, directions, add to calendar |
| M6 My appointments `/appointments` | Upcoming, past, pending reviews |
| M7 Review | Stars, comment, "your review is public / anonymous by default" notice |
| M8 Public profile `/s/{id}` | Read-only: photo, verified specialties, offices with directions, service prices, rating and reviews, "Pronto podrás agendar aquí" |
| M9 Landing | Designed by the designer; copy in the doc «Landing de Redoctor» |
| M10 Legal and account | Privacy, terms, account deletion (texts from the lawyer) |
| M11 Bridges | `/panel/subscription`, `/panel/agenda`, `/panel/specialties`, `/panel/profile` (specialist pages that open the app) and `/daily-summary/unsubscribe` (daily-summary email opt-out) |
| M13 Specialist payment | `/pay` (the owner's name, 2026-10-12): the subscription and the receipt it owes, choose a plan with a coupon, Pago Móvil and transfer data in Bs from the API, report the payment, see it in review; changing plan, cancelling and the rest stay in the app for now (§13, Decided) |
| M12 Release | PostHog funnel by origin, tests on real phones from WhatsApp and Gmail, domain cutover |

**Explicitly out of the pilot:** searching and booking from the web,
favorites, notifications inbox, the specialist's panel. They come after.

### Non-negotiable product rules (decided with Josbert)

- The web is **the mirror of the app** in what matters: same quality bar,
  same domain language (entities, names, rules), foundations built for every
  role — even though today it only serves the patient flows and the
  specialist's payment. It is **not** a copy of the app's folder tree: the
  web follows Next.js conventions (§3). No "pilot-only" shortcuts in anything
  that will be base; something temporary lives inside its route segment or
  module and can be removed without touching the rest.
- **Spanish only** for now, but every user-facing string goes through i18n
  from day one (§9).
- **A link never signs anyone in.** Sign-in is always a deliberate Google or
  Apple action — the same accounts as the app. There is no email/password.
- Before claiming an invitation, the page says **which email the appointment
  will be saved under**, so nobody saves it into a relative's account by
  mistake.
- **Soft review wall:** `/appointments` is blocked until a pending review is given;
  pages reached through a link (`/i`, `/a`, `/s`) are never blocked.
- **Where signing in leads (2026-10-12):** a **patient** stays on the
  landing — the search lives there — or returns to the link they came from.
  A **specialist** lands on `/panel`, a page with the app's options
  (agenda, specialties, profile, subscription, each opening the app through
  its bridge) where the payment (M13) will join. An **admin** gets the same
  page with a note that their tools are in the app.
- Public profile `/s/{id}` is read-only during the pilot and says "Pronto
  podrás agendar aquí; por ahora pídele tu cita a tu especialista".
- **Another browser, another session.** Gmail, Instagram and Facebook open
  links in their own browsers. The web handles it: sign-in in one or two
  taps, a clear message instead of an error, straight back to the
  appointment, and — in Instagram/Facebook, where Google blocks OAuth inside
  web views — step-by-step instructions to open the link in Chrome or Safari.

---

## 2. Stack (majors pinned; record the exact versions in `package.json`)

| Concern | Choice | Notes |
| --- | --- | --- |
| Framework | **Next.js 16** (App Router, React 19, Turbopack) | No `src/` folder, `typedRoutes`, `reactStrictMode`; APIs differ from older Next — the guides in `node_modules/next/dist/docs/` are the reference |
| Language | **TypeScript 5.9**, `strict` | `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `verbatimModuleSyntax`. TypeScript 7 (the native compiler) waits until typescript-eslint supports it (peer range `<6.1` today) |
| Styling | **Tailwind CSS 4** (CSS-first, `@theme`) | All design tokens live in `app/ui/tokens.css` (§7) |
| Primitives | **shadcn/ui** (Radix-based) | Installed into `app/ui`, restyled to our tokens; never used raw |
| Data | **TanStack Query 5** | Client-side server state; server components use `fetch` with cache tags |
| Validation | **Zod 4** | Every API boundary and every env variable |
| Env | `@t3-oss/env-nextjs` | `app/lib/env.ts`; build fails on a missing variable. Client components read public values from `app/lib/public-env.ts` (validated at build, keeps zod out of the browser) |
| i18n | **next-intl 4** | Single locale `es`, no URL prefix, messages mirror the app's keys |
| Forms | react-hook-form + `@hookform/resolvers/zod` | Field-level errors, same patterns as the app's inputs |
| Auth | **Firebase Web SDK 13** (Auth only) | Google + Apple providers; project `redoctor-3acf8` (shared with the app) |
| Analytics | **PostHog** (`posthog-js`, slim build without external scripts) | Funnel by `origin`; no personal data (§11); off while the key is empty |
| Errors | **Sentry** (`@sentry/nextjs` 11) | `dataCollection` all off (v11's successor of `sendDefaultPii: false`); same privacy rules as the app; off while the DSN is empty |
| Icons | **Material Symbols Rounded** as inline SVG per icon (`@material-symbols/svg-400`) | Same family as the app; only the icons in use ship — never the variable icon font (several MB) |
| Font | **Urbanist** via `next/font/google` | Weights 300–700, `display: swap`, exposed as `--font-urbanist` |
| Animation | **Motion** (`framer-motion` 14, the library behind the `motion` wrapper) | One door, `app/ui/motion` (§8.11): `MotionProvider` loads the features after the first render, `m`, the hooks, timings read from `tokens.css`, `StaggeredText`. Nothing imports `framer-motion` elsewhere (lint). `framer-motion` and not `motion`: the wrapper's `export *` barrel defeats Turbopack's tree shaking (40 KB in the initial JS instead of 10, measured). CSS keeps hover, accordion and menu; the marquee rolls by CSS until JavaScript takes it over to be dragged |
| Splash | **Rive** (`@rive-app/react-canvas-lite`) | The app's own `splash_logo.riv` (`public/animations`), landing only, a session's first visit (§13). Its runtime compiles WebAssembly: `'wasm-unsafe-eval'` in the CSP |
| Unit/component tests | **Vitest 5** + Testing Library + **MSW 3** | jsdom; `jest-axe` for accessibility; MSW handlers built from the OpenAPI shapes |
| E2E | **Playwright** + `@axe-core/playwright` | Mobile viewports first (iPhone 13 / Pixel 7 profiles) |
| Lint/format | **ESLint 10** (flat) + typescript-eslint `strictTypeChecked` + `eslint-plugin-import-x` + `jsx-a11y` + `react-hooks`; **Prettier** + `prettier-plugin-tailwindcss` | Layer boundaries enforced with `import-x/no-restricted-paths` (`eslint-plugin-import` crashes under ESLint 10). Unused code is ESLint's job: `next dev` generates a route validator with unused imports, so `noUnusedLocals` stays off in tsconfig |
| Git hooks | Husky + lint-staged | `--no-verify` is forbidden |
| Package manager | **pnpm 12** | `packageManager` field pinned; `.nvmrc` = Node 24 LTS |
| Hosting | **Vercel** | Preview per PR; production on `redoctorapp.com` |

Do not add a dependency without saying why in the PR/commit description and
checking that nothing in `app/lib` or `app/ui` already does it.

---

## 3. Repository layout: `app/` is the application, one folder per module

Simple on purpose, and the shape of Vercel's own Next.js course: `app/`
holds the routes, the UI and the logic; the root holds configuration, tests
and `public/`. Two conventions make it ours:

- **A module is a route group in `app/`, named after the module.** The group
  folder (`(appointments)`, `(billing)`, …) holds the module's routes — whose
  folder names are the URL segments, which the app's shared links fix for
  us (`/s`, `/i`, `/a`) — plus the module's private `_components/` and,
  when needed, its own `layout`, `loading` and `error`. The parentheses mean
  "organize, don't change the URL": `app/(appointments)/appointments/page.tsx`
  is still `/appointments`.
- **Everything UI lives in `app/ui`; everything that is not React lives in
  `app/lib`.** A component is promoted from a module's `_components/` to
  `app/ui/<domain>/` the day a second module needs it.

Nothing here mirrors the mobile app's layers on purpose: the two codebases
share the **domain language** (entities, names, rules), not the folder tree.

```
app/                                  # The application: routes, UI and logic
  layout.tsx                          #   <html lang="es">, fonts, providers, base metadata
  error.tsx · not-found.tsx · global-error.tsx   # no root loading.tsx, on purpose (§4)
  robots.ts · sitemap.ts · manifest.ts · opengraph-image.tsx · icon.png
  providers.tsx                       #   'use client': QueryClient, next-intl, PostHog, Sentry wiring
  (marketing)/                        # module: landing (M9)
    page.tsx                          #   /
    _components/                      #   hero, sections, faq, splash/ (the Rive veil) — this module only
  (auth)/                             # module: session (M2)
    sign-in/page.tsx                  #   /sign-in?redirect= — Google and Apple, the same accounts as the app
    sign-up/page.tsx                  #   /sign-up?redirect= — the patient's sign-up (M3)
    _components/                      #   sign-in-card, sign-up-flow, role-choice, patient-sign-up-form, sign-up-done
  (invitations)/                      # module: the invitation link (M4)
    layout.tsx · error.tsx            #   the bar with the account; the error under it
    i/[token]/page.tsx                #   /i/{token} — read in the browser, claimed right there
    _components/                      #   invitation-flow, claim-form, invitation-details
  (appointments)/                     # module: appointments (M5, M6, M7)
    layout.tsx · error.tsx            #   the bar with the account; the error under it
    a/[appointmentId]/page.tsx        #   /a/{id} — read in the browser with the patient's session
    appointments/layout.tsx · page.tsx · loading.tsx      # /appointments (M6, M7) — layout = <RequireSession facet="patient">
    _components/                      #   appointment-flow, -view, -actions, -record; cancel-sheet, reschedule-sheet, month-calendar, calendar-menu; appointments-flow, -list, -skeleton, appointment-card; review-wall, review-form
  (specialists)/                      # module: public profile (M8) and the specialist's own page (M2)
    s/[specialistId]/page.tsx · loading.tsx · not-found.tsx · opengraph-image.tsx   # /s/{id}
    panel/layout.tsx · page.tsx · loading.tsx · error.tsx   # /panel — layout = <PageFrame><RequireSession facet="specialist">
    _components/
  (account)/                          # module: account and legal (M10)
    account/layout.tsx · page.tsx     #   /account — layout = <RequireSession>
    privacy/page.tsx · terms/page.tsx · delete-account/page.tsx
  (billing)/                          # module: specialist payment (M13)
    error.tsx                         #   the root error, for what fails above /pay's frame
    pay/layout.tsx · page.tsx · loading.tsx · error.tsx   # /pay — layout = <PageFrame><RequireSession facet="specialist">; its error inside the frame, under the bar
    _components/                      #   pay-flow, subscription-view, notice-panel, plans-view, pay-view, method-step, payment-step, payment-totals, coupon-sheet, bank-picker, different-amount-sheet, payment-done, copy-button, detail-list, pay-skeleton
  (bridges)/                          # module: pages that only open the app, noindex (M11)
    layout.tsx
    panel/subscription/ · panel/agenda/[[...date]]/ · panel/specialties/ · panel/profile/
                                      #   /panel/* opens the app; /panel itself is (specialists)'s page
    home/[[...rest]]/
    daily-summary/unsubscribe/page.tsx   # daily-summary opt-out — a Server Action
  api/                                # route handlers only when the browser must not call the API (none yet)
  ui/                                 # ALL shared UI
    button.tsx · text-field.tsx · text-area.tsx · checkbox.tsx · choice-cards.tsx · stars-input.tsx · tabs.tsx · field-error.tsx · sheet.tsx · skeleton.tsx · toast.tsx · empty-state.tsx · status-card.tsx · avatar.tsx …
    messages-scope.tsx                #   a page's own client messages (§9)
    layout/                           #   site-header, page-frame (a page's column and its main, in the guarded layouts), bottom-actions
    auth/                             #   session-provider, session-button, require-session, sign-in-buttons, sign-in-legal-note, account-error-state, in-app-browser-help, provider-logos
    app-bridge/                       #   open-in-app-button, store-badges, app-access (a specialist's way to the app), store-qr
    appointments/ · specialists/ · billing/ · reviews/   # domain components used by two or more modules (appointments/: headline, details)
    analytics/ · og/                  #   link-origin-tracker; the Open Graph brand card (next/og)
    motion/                           #   the one door to Motion: provider, m, tokens, staggered-text (§8.11)
    icons.tsx                         #   the Icon primitive (not icon.tsx: that name is a Next.js metadata file)
    fonts.ts · tokens.css · globals.css
  lib/                                # ALL non-React logic
    api/                              #   client.ts (fetch wrapper), errors.ts (ApiError + codes), retry.ts, write-once.ts
    schemas/                          #   zod schemas + inferred types per domain — THE contract with the API
    data/                             #   server-only fetchers for Server Components (fetch + cache tags → DTOs)
    queries/                          #   TanStack queryOptions + mutation functions per domain (client)
    actions/                          #   Server Actions — only where no user token is needed
    firebase/                         #   client.ts: Firebase Auth, loaded on demand (client-only)
    auth/                             #   account (the account's model and rules, no zod), session-hint (the cookie), last-provider, token (the bearer's source), destination, sign-up (the plan)
    format/                           #   names, phone (+58), identity-document, date-of-birth — the forms' rules; money, appointment-time, dates — prices and billing amounts, days and hours
    billing/                          #   banks.ts: the app's list of Venezuelan banks (the API publishes none)
    analytics/ · i18n/
    observability/                    #   report.ts (the seam), scrub.ts (what never leaves), sentry.ts
    security/                         #   csp.ts (the nonce policy proxy.ts sends)
    env.ts · public-env.ts · routes.ts · deep-links.ts · site.ts · support.ts · utils.ts · calendar.ts (.ics, Google Calendar)
  hooks/                              # shared client hooks: use-session, use-sign-in-tracking, use-focus-heading, use-link-origin, use-device, use-in-app-browser
tests/                                # setup.ts · msw/ (server + handlers per domain) · factories/ · e2e/ (Playwright)
public/                               # .well-known/ (§6) · brand/ (logo.svg, logo-white.svg, icons) · illustrations/ · animations/ (the app's splash_logo.riv)
proxy.ts                              # Next 16's name for middleware: the CSP nonce per request, /.well-known excluded — nothing else
instrumentation.ts · instrumentation-client.ts   # Sentry and PostHog, each only when its variable is set
next.config.ts · eslint.config.mjs · postcss.config.mjs · tsconfig.json · vitest.config.mts · playwright.config.ts
lighthouserc.cjs · renovate.json · .github/workflows/   # budgets on the preview, weekly updates, CI (§10)
```

No `src/` folder (the alias `@/*` points at the root, as in the scaffold), no
`tailwind.config` (Tailwind 4 is CSS-first: the tokens are the config), unit
tests colocated next to what they test (`button.test.tsx`), `tests/` only
for what is shared (setup, MSW, factories) and for Playwright.

### The rules that keep it this shape

1. **One module, one group.** Every feature of §1 is exactly one
   `app/(module)/` folder. A route lives in the module it belongs to; a
   module never reaches into another module's `_components/`.
2. **Pages are thin.** A `page.tsx` reads `params`/`searchParams`, calls
   `app/lib/data/*` when it renders on the server, and composes components.
   No business logic, no JSX walls: when a page grows, split it into
   `_components`.
3. **Colocate first, promote on the second use.** Module-only UI stays in
   the module's `_components/` (a private folder: never routable). The moment
   a second module needs it, it moves to `app/ui/<domain>/` — primitives
   (button, input, sheet…) go straight to `app/ui/`.
4. **Special files do the UX plumbing.** `loading.tsx` is the segment's
   skeleton with final dimensions; `error.tsx` its recoverable error with a
   retry; `not-found.tsx` its 404; `opengraph-image.tsx` its preview;
   `generateMetadata` its title and robots. Don't hand-roll what a
   convention file already gives you.
5. **Server first; session where it is needed.** Components are Server
   Components unless they need state, effects or browser APIs — then
   `'use client'` at the smallest leaf. `app/lib/data/*` imports
   `server-only`; Firebase Auth and PostHog code imports `client-only`.
   Segments that need a session (`appointments`, `account`, `pay`) wrap their
   `layout.tsx` in `<RequireSession>`, which shows a skeleton until `/me`
   resolves; `/i` and `/a` load without a session and ask for it inside.
   Authenticated mutations run in the browser through `app/lib/queries`
   (the Firebase token lives there); Server Actions only where no user token
   is needed (the opt-out POST of `/daily-summary/unsubscribe`).
6. **One contract, three consumers.** `app/lib/schemas` holds the zod
   schemas; `app/lib/data` (server), `app/lib/queries` (client) and
   `tests/msw` all parse with them. No duplicated types.
7. **Domain names are shared with the app** — `appointments`,
   `invitations`, `specialists`, `billing`, `reviews`, `account`, `auth` —
   in module folders, `app/ui/<domain>`, schemas, query keys, i18n keys and
   PostHog events.
8. **Naming.** Folders and files kebab-case (`appointment-card.tsx` exports
   `AppointmentCard`); module groups in English; user-facing URL segments in
   English too, the paths shared with the app included (`/appointments`,
   `/account`, `/sign-in`, `/privacy`; the owner's call of 2026-10-12), and
   the path says who it is for: the specialist's pages that the app opens
   live under `/panel/` (§6); dynamic params in English camelCase
   (`[specialistId]`).
9. **Lint-enforced boundaries** (`import/no-restricted-paths`): nothing
   imports from a module group except that module; `app/ui` imports only
   `app/lib` and `app/hooks`; `app/lib` imports no React; `app/lib/data` is
   never imported from client files (also guaranteed by `server-only`).
10. **Advanced routing when it improves the experience, never for show:**
    intercepting + parallel routes for a URL-addressable sheet (for example
    `a/[appointmentId]/(.)cancel`), `template.tsx` for per-navigation
    transitions. `generateStaticParams` does not apply: the data lives in
    the API.

Every route path is built from one place, `app/lib/routes.ts` (the app has
`AppRoutes` for the same reason); the paths shared with the app and the
`origin` values live in `app/lib/deep-links.ts`.

---

## 4. Server and client: who renders what

- **Public pages** (`/`, `/s/[id]`, legal, bridges): **Server Components**,
  `fetch` on the server with `next: { revalidate, tags }`. Server-side calls
  are not subject to CORS, so the public profile works today even though the
  API has not opened CORS yet (§5).
- **Authenticated flows** (`/i`, `/a`, `/appointments`, `/account`, payment):
  **Client Components** + TanStack Query, calling the API from the browser
  with the Firebase ID token. These need the API's CORS allow-list
  (REDOC-362). Until it ships, develop against MSW or the dev-only proxy in
  `next.config.ts` (`/api-proxy/* → NEXT_PUBLIC_API_URL`), which **must not
  exist in production builds**.
- **Route handlers** only for things the browser must not do itself (none
  are needed for the pilot). **Server Actions** only for writes that carry no
  user token — the daily-summary opt-out, whose credential is the signed
  token in the link. Every authenticated write runs in the browser: the API
  is the backend and the Firebase token lives there.
- **Metadata** per route with `generateMetadata`. Private pages (`/i`, `/a`,
  `/appointments`, `/account`, payment) are `noindex, nofollow`.
- Loading states are **skeletons with the final dimensions** (`loading.tsx`
  or Suspense boundaries), never spinners in the middle of empty space.
  Consequence to know: a page under a `loading.tsx` streams, so a
  `notFound()` inside it answers **200 + `noindex`** with the not-found UI
  (Next.js docs, not-found.md); only bots that cannot run JavaScript get a
  real 404 (their metadata blocks). A real 404 needs the route not to match
  or a check in `proxy.ts`. There is **no root `loading.tsx`** (decided
  2026-10-08): every page is dynamic because of the CSP nonce, and a root
  skeleton made each one flash grey bars for a few hundred ms before React
  revealed the streamed content — on `/` too, with nothing to wait for. A
  page without a loading state of its own now renders whole before its
  HTML goes out. Only `/s/[specialistId]` keeps one, because its data comes
  from the API; so it still answers 200 + `noindex` for an unknown id.
- `error.tsx` and `not-found.tsx` at the root and in each route group, using
  the design system's empty/error state.

---

## 5. The API (facts you must respect)

- Base URL: `https://api-dev.redoctorapp.com/api/v1`. OpenAPI:
  `https://api-dev.redoctorapp.com/api/v1/docs.json` — read it before
  writing a datasource; it is the contract. There is **no production API
  yet**: dev, preview and production of the web all point to `api-dev`.
- Auth: `Authorization: Bearer <Firebase ID token>`. Roles the API knows:
  `SUPER_ADMIN | ADMIN | SPECIALIST | PATIENT`. `GET /identity/me` returns
  `profiles.patient` and `profiles.specialist` (`exists`, `id`, `status`,
  `nextStep`): one account can be both, and `role` describes the specialist
  facet when both exist. Guard by facet, not only by `role` — but the
  facet as `toAccount` derives it: `profiles` where it marks the facet, and
  `role` + `registrationStatus` otherwise, as the app reads them (its
  screens gate by role). The API does not mark a PATIENT account's patient
  facet (2026-10-12); trusting `profiles.*.exists` alone locked patients
  out of `/appointments`.
- Public endpoints used by SSR: `GET /specialists/{id}/public-profile`,
  `GET /specialties/tree`. Everything about an appointment or an invitation
  needs a session, except reading an invitation by its token (the token is
  the credential).
- Error envelope: `{ code: 'ERR_xxxx', message, details? }`. Map to a typed
  `ApiError`; translate known codes to our copy (e.g. `ERR_2010` registration
  incomplete, `ERR_5052` subscription required, billing `ERR_50xx/51xx`);
  unknown codes get a generic message **and** a Sentry event with method,
  path, status and code — never the body. An answer a flow handles as part
  of its course (a 404 on a wrong link, another account's appointment, a
  409 explained in place) is declared `expected` in its `apiFetch` call and
  never reported. In place, a failed write says what `failureMessageKey`
  (`app/lib/api/errors.ts`) finds: nothing for a connectivity problem (the
  global notice says it), the code's copy, or the flow's plain «No pudimos…».
- **Retry policy** (mirror of the app): GET/PUT/PATCH retry twice with
  backoff on timeouts, network errors, 408, 429 and 5xx; POST/DELETE retry
  only when the request never reached the server (offline *before*
  sending, or a connection that failed to open — going offline after the
  request left proves nothing). The body is read inside the time budget. A
  POST/DELETE that went out and got no answer is an **uncertain outcome**:
  writes that must not land twice (claim, confirm, cancel, reschedule,
  review, report payment, subscribe) go through a write-once guard that
  looks for what the write would have left before re-sending — after a lost
  answer, a 2xx whose body breaks the contract, or a 5xx alike — and shares
  one run between two taps at the same time.
- **Network failures** are reported once, globally and throttled (one
  neutral notice), never once per widget. Business errors are shown where
  they happen, by code.
- Rate limit: **100 requests/min per IP**. Cache public data on the server;
  request a patient's data from their own device; never poll.
- Times arrive in **UTC**: show them in `America/Caracas`, in Spanish:
  «jueves 1 de octubre de 2026», «3:00 p. m.». Calendar dates
  (`YYYY-MM-DD`) are not instants — never shift them through a timezone.
- Prices are USD with a type (`fixed`, `from`, `range`): «$ 45», «Desde
  $ 25», «$ 25 – $ 50» (compact) and «Desde $ 25 hasta $ 50 (USD)»
  (detailed). Bolívar amounts and bank accounts come from the API's payment
  attempt, never from our configuration.
- Pending on the API side (do not work around silently; keep the hook
  isolated): CORS allow-list and pilot environment (REDOC-362), business
  configuration endpoint with `webPaymentUrl` and support phones (REDOC-357),
  services inside the public profile (REDOC-367), invitation hardening
  (REDOC-314/315/316), anonymous reviews (REDOC-251), account deletion
  `DELETE /identity/me` (REDOC-352). The daily-summary opt-out endpoints
  exist (`POST /notifications/daily-summary/unsubscribe|subscribe`) and
  the web's action calls them.

---

## 6. Routes shared with the mobile app: deep links, bridges and `.well-known`

The app and the web share one public URL space on `redoctorapp.com`. The
app declares these paths as App Links (Android) and Universal Links (iOS);
when the app is installed, tapping them opens the app; when it is not, they
open **this web**, which must render something useful.

Every public link is a contract among three: this web serves the page and
the AASA, the app claims the path and maps it to a screen, and the API
writes it into its emails. This section is the one list of them; the app's
docs point here instead of copying it.

### Paths the app opens when installed

| Path | For | On the web | Who sends it |
| --- | --- | --- | --- |
| `/s/{specialistId}` | public | Full read-only profile (M8) + "Abrir en la app" | the app («Compartir perfil»); emails 14 and 17 |
| `/i/{token}` | patient | Full invitation experience (M4); "Abrir en la app" once the app is published (patients have none in the pilot, §13) | the app (the specialist's WhatsApp); the API's `invitationUrl` |
| `/a/{appointmentId}` | patient (and specialist in the app) | Full appointment experience (M5) + "Abrir en la app" | the app (reminders, confirmation); emails 11–13 and 15 |
| `/panel/subscription` | specialist | Bridge only: the app handles it. Never render billing here | billing emails 01–05 and 07–09 (REDOC-356) |
| `/panel/agenda`, `/panel/agenda/{YYYY-MM-DD}` | specialist | Bridge; a malformed date opens today in the app | the daily summary, email 10 (REDOC-359) |
| `/panel/specialties` | specialist | Bridge | email 16 (REDOC-360) |
| `/panel/profile` | specialist | Bridge | email 18 (REDOC-360) |
| `/home/*` | app internals | Bridge to the home / store; not a web route | the app's own paths |

The specialist's pages live under `/panel/`, and the app opens
**everything** there: one AASA entry (`/panel/*`) and one Android
`pathPrefix="/panel/"`. `/panel` itself is the web's page with the app's
options (§1). So a new specialist page under `/panel/` needs only the app's
router and the web's bridge: no AASA, no manifest, no wait for Apple's CDN.
In the app these links need a specialist's session (without one it asks to
sign in; another role stays on its home). "Abrir en la app" uses the same
path: `redoctor://redoctorapp.com/panel/agenda/2026-10-08`.

Paths only the web serves that others write: the daily-summary opt-out
`/daily-summary/unsubscribe?token=…` (the API's `url_baja`, REDOC-359), the
payment `/pay` (the admin's `webPaymentUrl`, REDOC-357) and the home page
(`/?origin=email-14`). Push notifications carry ids, not links.

**A renamed path never dies.** Until 2026-10-12 the specialist's paths were
Spanish (`/suscripcion`, `/agenda[/…]`, `/especialidades`, `/perfil`), the
opt-out was `/resumen/baja`, and the API's `invitationUrl` still points at
`/citas/invitacion/{token}` (REDOC-255), a path nobody served. The web
redirects every old name for good (`next.config.ts`, 308, query kept); the
AASA lists only the current paths since the app learned `/panel/*`
(2026-10-12).

Reserved for the app's internal paths: `/home`. Patient web routes
therefore live under `/appointments` and `/account`, never under those
segments.

#### Adding or renaming a public link

1. **Web:** the page or bridge and its builder in `app/lib/routes.ts`;
   outside `/panel/`, `universalLinkPaths` and the AASA too (a test keeps
   them equal); a renamed path gets its redirect in `next.config.ts`;
   `robots.ts`; the e2e.
2. **App** (`redoctor-mobile-app`): `AppDeepLinks.resolve` and its test;
   outside `/panel/`, the Android manifest too.
3. **API:** the email templates (the app repo's `emails/`, zipped to
   REDOC-354) and any link it builds in code (`invitationUrl`, `url_baja`).
4. **The table above.**
5. **In that order:** a copy of the app from before does not know a new
   path, so the emails switch last.

### The payment route is NOT an app path

The specialist pays on the web (M13) at `/pay` (the owner's name,
2026-10-12). The route must **never** appear in the AASA, in
`assetlinks.json` or in the app's manifest, nor under `/panel/`, where the
app opens everything (a unit test keeps it out), and the app never links to it —
Apple's rules in Venezuela forbid the app from pointing to an external
purchase. The billing emails offer it only when the API's `webPaymentUrl`
has a value.

### The `.well-known` files (served from `public/`, byte-exact)

`/.well-known/apple-app-site-association` — **no extension**, `200`,
`Content-Type: application/json`, never behind a redirect, auth or the
`proxy.ts` matcher (exclude `/.well-known`):

```json
{
  "applinks": {
    "details": [
      {
        "appIDs": ["SLAQ84BD94.com.redoctor.mobileapp"],
        "components": [
          { "/": "/s/*" },
          { "/": "/i/*" },
          { "/": "/a/*" },
          { "/": "/panel/*" },
          { "/": "/home/*" }
        ]
      }
    ]
  }
}
```

`app/lib/deep-links.ts` (`universalLinkPaths`) lists the same paths in the
same order, and a unit test fails if the two drift apart.

`/.well-known/assetlinks.json` — package `com.redoctor.mobileapp`, relation
`delegate_permission/common.handle_all_urls`, and the SHA-256 fingerprints
of every signing certificate (debug, upload key and Play App Signing). Copy
the current file from the previous repo (`redoctor-connect-care/public/
.well-known/`); the source of truth for fingerprints is Play Console → App
signing plus the upload and debug keystores.

Rules: Android verifies the domain from `assetlinks.json` alone (routes live
in the app's manifest); iOS reads the **routes from the AASA**, so a new
path outside `/panel/` needs the AASA updated **and** Apple's CDN to pick it
up (`https://app-site-association.cdn-apple.com/a/v1/redoctorapp.com`) —
verify with `curl` after deploying, and expect a reinstall of the app on the
test iPhone. Both files are versioned here and have an e2e test that fetches
them and checks status, content type and content.

### The app bridge ("Abrir en la app")

Every shared path renders, besides its content, a way to open the app:

- The scheme link is **the same URL with the scheme swapped and nothing
  else**: `redoctor://redoctorapp.com/a/{id}`. The app only reads the path.
  A domain-less `redoctor://a/{id}` is not valid.
- Always a **button**, never an automatic redirect: iOS asks for
  confirmation and Chrome blocks schemes without a user gesture. On Android
  Chrome use `intent://redoctorapp.com/a/{id}#Intent;scheme=https;package=
  com.redoctor.mobileapp;end` so a missing app falls back cleanly. **As
  built:** the port of the prototype's `app-bridge.js` uses
  `scheme=redoctor` plus `S.browser_fallback_url` (this same page, or the
  Play listing once it exists). Which scheme stays is open (§13).
- Store buttons, the iOS Smart App Banner and any store redirect stay **off**
  while `NEXT_PUBLIC_APP_STORE_ID` / `NEXT_PUBLIC_PLAY_STORE_ID` are empty
  (the pilot runs on TestFlight and Play internal testing).
- On desktop there is no app to open: show the note, not the button.
- The bridge reads nothing from the API and uses no session. Port the logic
  of `app-bridge.js` from the previous repo into a typed React component.

### `?origin=` (measurement) and privacy of links

- Links handed to patients carry `?origin=` with one of:
  `whatsapp-invitation`, `whatsapp-reminder`, `whatsapp-confirm`,
  `whatsapp-admin`, `share-invitation`, `share-admin`, `share-profile`
  (from the app) and `email-11` … `email-15` (from the API's emails, N = the
  email number). The web reads it **only** to tag the PostHog funnel (link
  opened → signed in → claimed → confirmed), then strips it from canonical
  URLs and from anything it shares. The app ignores it.
- `/i/{token}`: the token is a credential. Never log it, never send it to
  analytics or Sentry, `noindex`, and the `<meta og:*>` preview is generic
  (brand image, "Tienes una cita en Redoctor") — no names, no dates. Same
  for `/a/{id}`. `/s/{id}` may have a rich preview (name, specialty, photo):
  that is public information.

### Domain cutover (done 2026-10-12)

`redoctorapp.com` serves this web since 2026-10-12 (the Vite prototype
before: the `.well-known` files and static bridges for `/s`, `/i`, `/a` and
`/suscripcion`). The apex is the primary domain and answers directly;
`www.redoctorapp.com` answers 308 to it, path and query kept. Keep it that
way round: the app claims only the apex (`applinks:redoctorapp.com`, the
Android host `redoctorapp.com`), and neither Apple's CDN nor Android's
verifier follow a redirect to a `.well-known` file. Publishing is a push to
`master` (Vercel's Git integration).

After a deploy that touches a public link or `.well-known`, test production
itself: the e2e `well-known` and `bridges` specs with
`PLAYWRIGHT_BASE_URL=https://redoctorapp.com` (Vercel and `next start` do
not always redirect alike), Google's verdict at
`https://digitalassetlinks.googleapis.com/v1/statements:list?source.web.site=https://redoctorapp.com&relation=delegate_permission/common.handle_all_urls`,
and Apple's copy (above; each layer of its CDN keeps it 6 h).

### Auth return URL

Firebase Auth's `authDomain` should be `redoctorapp.com`, with
`/__/auth/*` proxied to `redoctor-3acf8.firebaseapp.com` in
`next.config.ts` (Firebase's recommended setup for `signInWithRedirect`
under Safari's tracking protection). Register
`https://redoctorapp.com/__/auth/handler` in the Google OAuth client and in
the Apple Services ID. Inside in-app browsers that block OAuth, show the
"open in Chrome/Safari" steps (§1) instead of attempting the redirect.
When the proxy is built, exclude `/__/auth/` from `X-Frame-Options: DENY`
(next.config.ts) and from the `proxy.ts` matcher (`frame-ancestors 'none'`):
Firebase frames `/__/auth/iframe`, and sign-in would break.

---

## 7. Design tokens (the app's theme, verbatim)

All tokens live in `app/ui/tokens.css` as Tailwind 4 `@theme` variables
(the kickoff ships this file). **No raw hex, px or ms outside that file.**
Figma is the source for layout and composition; these tokens are the source
for values. If Figma and the tokens disagree, say so — don't invent a third
value.

### Color scales (50 → 900; `500` is the base)

| Scale | 50 | 100 | 200 | 300 | 400 | **500** | 600 | 700 | 800 | 900 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| blue (primary) | #E6E6FC | #B0B0F4 | #8A8AEF | #5454E8 | #3333E3 | **#0000DC** | #0000C8 | #00009C | #000079 | #00005C |
| green (secondary) | #EAF7F2 | #BFE0D7 | #9FDAC4 | #74C9A9 | #59BF98 | **#2FAF7E** | #2B9F73 | #217C59 | #1A6045 | #144A35 |
| grey (neutral) | #F2F2F2 | #D8D8D8 | #C5C5C5 | #AAAAAA | #999999 | **#808080** | #747474 | #5B5B5B | #464646 | #363636 |
| white (surfaces) | #FDFDFD | #F8F8F8 | #F4F4F4 | #F0F0F0 | #EDEDED | **#E8E8E8** | #D3D3D3 | #A5A5A5 | #808080 | #616161 |
| error | #FDEDED | #F8C8C8 | #F5AEAE | #F18989 | #EE7272 | **#EA4F4F** | #D54848 | #A63838 | #812B2B | #622121 |
| verified | #ECF2FE | #C3D8FC | #A6C5FA | #7EABF8 | #659AF7 | **#3E81F5** | #3875DF | #2C5CAE | #224787 | #1A3667 |
| warning | #FCF8EA | #F6E9BE | #F2DE9E | #ECCF72 | #E8C556 | **#E2B72C** | #CEA728 | #A0821F | #7C6518 | #5F4D12 |
| orange (accent) | #FFF1E6 | #FFD8B0 | #FFC08A | #FFA454 | #FF9233 | **#FF7700** | #E86C00 | #B55400 | #8C4100 | #6B3200 |
| silver (accent, blue-tinted) | #F2F4F7 | #E0E4EB | #CBD1DC | #B7BECD | #A8B1C2 | **#9AA3B7** | #818CA2 | #626D84 | #4B5468 | #373F4E |

Pure white `#FFFFFF`, pure black `#000000`.

### Semantic aliases — light theme (the one that ships)

| Token | Value | Token | Value |
| --- | --- | --- | --- |
| primary / on-primary | blue-500 / white-50 | secondary / on-secondary | green-500 / white-50 |
| background | white-50 `#FDFDFD` | surface / surface-variant | white-100 / white-300 |
| on-background / on-surface | grey-900 / grey-800 | text-primary / text-secondary / text-disabled | grey-900 / grey-600 / grey-400 |
| text-on-primary / text-contrast | white-50 / #FFFFFF | border / divider | grey-300 / grey-200 |
| success / success-light | green-500 / green-100 | error / error-light | error-500 / error-100 |
| warning / warning-light | warning-500 / warning-100 | verified / verified-light | verified-500 / verified-100 |
| info / info-light | blue-400 / blue-50 | shadow | `rgb(0 0 0 / 0.10)` |

Known open point: the app's screens actually paint Material's scaffold
background `#FBF8FF` (a lilac-tinted white) while its token says `#FDFDFD`;
the app has not decided which one is right. Follow Figma for the page
background and keep the token in one place so the decision costs one line.

A dark theme is **defined in the app but not wired**. Mirror that: define
the dark aliases in `tokens.css` under `@media (prefers-color-scheme: dark)`
guarded by `:root:not([data-theme="light"])`, keep them updated, do not
expose a toggle until asked.

### Typography — Urbanist

Role scale (size / weight / line-height / letter-spacing):

| Role | Size | Weight | Line-height | Tracking |
| --- | --- | --- | --- | --- |
| display-lg / md / sm | 57 / 45 / 36 | 700 / 600 / 600 | 1.12 / 1.16 / 1.22 | −0.25 / 0 / 0 |
| headline-lg / md / sm | 32 / 28 / 24 | 700 / 600 / 600 | 1.25 / 1.29 / 1.33 | 0 |
| title-lg / md / sm | 22 / 18 / 14 | 700 / 600 / 600 | 1.27 / 1.33 / 1.43 | 0 / 0.15 / 0.1 |
| body-lg / md / sm | 16 / 14 / 12 | 400 | 1.5 / 1.43 / 1.33 | 0.5 / 0.25 / 0.4 |
| label-lg / md / sm | 14 / 12 / 11 | 600 | 1.43 / 1.33 / 1.45 | 0.1 / 0.5 / 0.5 |

Compact names the app's screens use everywhere (keep them as aliases so the
two codebases speak the same language): `title-xxxl` 60, `title-xxl` 42,
`title-xl` 36, `subtitle-l` 30, `subtitle-m` 22, `subtitle-s` 18,
`body-xs` 16, `body-xxs` 14, `body-xxxs` 12. Weights: light 300, regular
400, medium 500, semibold 600, bold 700.

### Radii, shadows, motion

- Radii: `xs` 2 (checkboxes, as the app's Material checkbox), `sm` 8
  (alerts), `md` 10 (inputs, 40 px tall), `lg` 12 (compact
  cards), `xl` 20 (cards, inked containers), `2xl` 30 (sheet top corners),
  `full` (pills, chips).
- Shadows (black at the given alpha):
  `xs` = `0 1px 3px 0 / .10`;
  `sm` = `0 1px 3px 1px / .15, 0 2px 2px 0 / .12`;
  `md` (default) = `0 2px 3px 1px / .15, 0 3px 7px 0 / .12`;
  `lg` = `0 4px 6px -1px / .10, 0 10px 15px -3px / .15`;
  `shrink` (small pills) = `0 1px 1px 1px / .15, 0 1px 0.5px 0 / .30`.
- Motion: **200–300 ms, `ease-in-out`** for anything that enters, leaves or
  changes size; 250 ms is the house default. Respect
  `prefers-reduced-motion` (reduce to opacity-only or none).

### Icons

Material Symbols **Rounded**, `FILL 0` by default (`FILL 1` for a selected
or emphasized state), sizes 16 / 18 / 20 / 24. One icon family only. Each
icon is an inline SVG imported from `@material-symbols/svg-400/rounded`
(the `-fill` files for the filled state), rendered through one `Icon`
primitive in `app/ui` that takes size and color from the tokens.

---

## 8. UI rules (the ones that get broken most often)

1. **Search before you build.** `grep` `app/ui` and the module's
   `_components` for the kind of piece you need (Button, Sheet, Card,
   Chip, Input, EmptyState). If one fits, use it; if one almost fits,
   **extend it with an optional prop whose default reproduces the current
   look exactly**; only if nothing comes close, write a new one — in
   `app/ui/<domain>` (or as a primitive in `app/ui`) if two modules could
   use it, in the module's `_components` otherwise.
2. **Nothing appears or disappears abruptly.** Every element that enters or
   leaves (badge, banner, empty state, error, a section that fills in) fades,
   scales or slides in 200–300 ms. Keep the last valid value while an element
   animates out (a counter that goes to 0, a message that is cleared) and
   keep the element mounted across rebuilds so it does not re-enter on every
   render. Skeleton → content with the **same dimensions**: zero layout
   shift.
3. **Never disable a control to mean "busy".** Keep it clickable, show the
   loading state inside it, and guard inside the handler
   (`if (isPending) return`). A greyed-out button reads as broken. Whatever
   can be pressed shows the hand: Tailwind 4's preflight leaves buttons
   with the arrow, so `globals.css` restores `cursor: pointer` on enabled
   buttons; a card or row that only answers the pointer (the landing's
   hover cards) declares `cursor-pointer` itself.
4. **Design tokens only** (§7). No `#hex`, no magic `px`, no inline
   `style={{}}` for things a token or a utility covers.
5. **Mobile first.** Patients arrive from WhatsApp on phones: design at
   360–390 px, then widen. Touch targets ≥ 44 px, 16 px side gutters, no
   horizontal scroll, safe-area aware bottom actions.
6. **Accessibility is part of done:** semantic HTML, labels on every input,
   visible focus, color never the only signal, `aria-live` for toasts,
   WCAG 2.2 AA contrast. New pages run `axe` in their tests.
7. **Copy is design material.** Spanish, warm and direct, from the user's
   side («Tu cita», «Confirmar mi cita»). Buttons say what happens. Errors
   say what went wrong and how to fix it. No developer vocabulary on screen.
   Urbanist draws the ordinal «º» as «o»: write «N.°». An hour takes its
   article: «a la 1:30», «a las 3:30» (`hourAgreement`, through a select in
   the message). The button that tries a failed read again says
   «Reintentar», everywhere (owner, 2026-10-13). Dollars are written the
   locale's way on every page: «$ 36,99», «$ 1.234,50», «$ 30» when whole
   (owner, 2026-10-13).
8. **Sheets and dialogs** go through one `Sheet` primitive
   (`app/ui/sheet.tsx`, since M5: Radix's dialog, dragged down from its
   handle through Motion): bottom sheet on mobile, centered dialog on
   desktop, drag-to-close, keyboard-safe height, primary action always
   visible. One sheet at a time; a sheet that opens another pushes inside
   the same sheet instead of stacking.
9. **Empty, error and loading states** are first-class components
   (`EmptyState`, `ErrorState`, `Skeleton`), never ad-hoc text.
10. **Performance budgets** (checked in CI with Lighthouse on the preview):
    LCP ≤ 2.5 s and INP ≤ 200 ms on a mid-range phone over 4G, CLS ≤ 0.05,
    ≤ 150 KB gzipped JS on public pages, images through `next/image`,
    fonts preloaded, no client-side data fetching on public pages.
    Measured on 2026-10-07 (module scripts, gzip, analytics off): `/` 198 KB,
    `/s/{id}` 225 KB, bridges 208 KB, of which React 19 + Next.js 16 are
    ≈140 KB. Sentry adds ≈54 KB and PostHog ≈52 KB where they are on. On
    2026-10-08 the landing weighs 261 KB (242 before Motion and the
    splash; the splash's Rive runtime, ≈56 KB plus ≈360 KB of WebAssembly,
    loads apart and only on a session's first visit). The JS budget is a
    warning in `lighthouserc.cjs` until it is decided (§13).
11. **Animation beyond CSS goes through Motion, through one door.**
    `app/ui/motion` exports `m`, the hooks, `MotionProvider` (mounted where
    the `m` components live; the features load after the first render) and
    helpers that read every timing from `tokens.css`, so CSS and JavaScript
    share one clock and reduced motion collapses both. Entrances (the
    landing's choreography, `(marketing)/_components/choreography.ts`) take
    `--duration-entrance` (500 ms) with `--ease-entrance`, a stronger
    ease-in-out, so pieces settle instead of snapping; UI feedback keeps
    §7's 200–300 ms. A section with several pieces entering on scroll uses
    `Choreographed`: a Motion sequence by selector over server-rendered
    pieces (`data-piece`); the HTML arrives visible, and what is still out
    of view hides after hydration until it enters, as `Reveal` does.
    Nothing imports `framer-motion` elsewhere (lint). CSS keeps what CSS does well: hover,
    the accordion, the menu; the marquee rolls by CSS until JavaScript takes
    it over where it stands, to make it draggable (`RoadmapBelt`, whose
    frame loop runs only while it drives the ribbon on screen). Above the
    fold the hero's pieces enter after the splash; their first frame is
    written into the HTML (`Entrance`, `StaggeredText`), so each carries
    `data-entrance`, and a rule in globals.css shows them settled under
    reduced motion from the first paint — the server cannot know the
    setting — and the landing repeats it in a `<noscript>`. Under reduced
    motion everything is plain content, no entrance. A box taller than the
    screen enters at the share of it the screen can show (`Choreographed`).
    Animated text goes through `StaggeredText`: assistive technology reads
    the sentence, the letters are hidden from it; a price that counts up is
    read whole, never mid-count.

Composites to mirror from the app (names first, then build when a module
needs them): `Button` (primary / secondary / white / error; small / large;
block; loading), `TextField` (40 px, radius 10, shadow sm, animated error
line), `Sheet`, `Card`, `Skeleton`, `Toast` (floating, top, 5 s,
dismissible), `EmptyState`, `Chip` / `FilterChip`, `StateChip` (positive /
accent / neutral / warning / error tones), `Avatar`, `StarsRating`,
`CountBadge`, `TintedNote`, `DetailRow`, `ScrollFadingEdges`.

---

## 9. Data, state, i18n and forms

- **TanStack Query**: keys by domain and id (`['appointment', id]`,
  `['invitation', token]`), `queryOptions` and mutations in
  `app/lib/queries/<domain>.ts`, explicit `staleTime`, invalidate
  after every write, optimistic updates only where the app does them. No
  global stores for server state.
- **Session** (`SessionProvider` in `app/ui/auth`, mounted by
  `app/providers.tsx`; `app/hooks/use-session.ts`; `<RequireSession>` from
  `app/ui/auth` in the layout of each segment that needs it): Firebase
  Auth loaded on demand (`app/lib/firebase/client.ts`, `import()` so the
  landing's JS stays without it), `onIdTokenChanged`, the token never
  stored by the web (`app/lib/auth/token.ts` asks Firebase for a fresh one),
  `/identity/me` through TanStack Query keyed by uid, resolved **before**
  the first paint of any authenticated route (the segment's skeleton; never
  a flash of the wrong UI), facet guards (the facets `toAccount` derives
  from `profiles`, or from `role` and `registrationStatus` when `profiles`
  does not mark one, §5; an admin passes the specialist gate), "return to
  where you were" through a same-origin `redirect` query only. Signing in
  opens the provider's window (`signInWithPopup`: Safari and iOS are fine
  with it; the redirect flow waits for the `/__/auth/*` proxy of §6).
  Inside Instagram's or Facebook's browser the buttons give way to the
  steps to open the link in Chrome or Safari. A cookie `redoctor-session=1`
  (nothing else in it) tells the server a session is likely, so the bar
  renders a placeholder instead of «Entrar» until Firebase answers. The
  last provider used wears «Última vez» and goes first (localStorage).
  Sign-out clears the Query cache, the hint, the PostHog identity and
  Sentry's user — also when Firebase ends the session by itself (another
  tab, a revoked account) or another person signs in. The `/me` reader
  (zod and the contract) loads on demand, with the first signed-in page;
  the account's rules live apart, without zod (`app/lib/auth/account.ts`).
  «Entrar» in a page's bar brings the person back to that page.
- **i18n**: next-intl, locale `es`, messages in
  `app/lib/i18n/messages/es.json` with **dot keys that mirror the app's
  `assets/translations/es.json`** (e.g. `appointments.confirm.title`) so
  copy can be shared with the app. Dates and numbers through `Intl` with
  `es-VE` and `America/Caracas`. No string literal reaches the user.
  Client components only see the namespaces sent to the browser: the
  ones every page needs (`clientNamespaces` in
  `app/lib/i18n/client-messages.ts`, sent by the root layout) and, for a
  page whose client components read more, its own (`pageNamespaces`,
  wrapped in `MessagesScope` from `app/ui`). A client component reading a
  namespace that was not sent shows the raw key in production while a test
  that loads the whole catalog passes: a page's flow is tested with
  `renderWithPageMessages` (`tests/render.tsx`), which sends only what the
  page sends and fails on any key it lacks. Server components may read any.
- **Forms**: react-hook-form + zod schemas from `app/lib/schemas`;
  validate on blur, show the error under the field, disable nothing;
  Venezuelan ID (`V/E/P/J/G` + 6–8 digits) and phone (`+58`) validators live
  in `app/lib/format`.
- **Analytics (PostHog)**: events named `web_<area>_<action>`
  (`web_link_opened`, `web_signin_completed`, `web_invitation_claimed`,
  `web_appointment_confirmed`), with `origin` and `role` as properties.
  **Never** names, emails, phones, IDs, tokens or appointment reasons. The
  final event list is closed in M12 before building funnels.

---

## 10. Quality gates and tooling

Scripts (all must pass before anything is called done):

```
pnpm dev            # next dev (Turbopack is the default bundler in Next 16)
pnpm build          # production build (fails on type or lint errors)
pnpm start
pnpm typecheck      # next typegen + tsc --noEmit
pnpm lint           # next typegen + eslint . (route types must exist first)
pnpm format         # prettier --write .   (format:check in CI)
pnpm test           # vitest run
pnpm test:e2e       # playwright test
pnpm check          # typecheck + lint + format:check + test + build
```

- **Husky**: pre-commit → lint-staged (`eslint --fix`, `prettier`);
  pre-push → `pnpm typecheck && pnpm test`. Never `--no-verify`.
- **CI (GitHub Actions)**: `pnpm check` on every PR and push to master
  (`ci.yml`, building with `.env.test`); Playwright and Lighthouse against
  each Vercel preview (`preview.yml`, on `deployment_status`; Lighthouse
  blocks third parties so CI traffic never reaches analytics or Sentry);
  `pnpm audit` every Monday (`audit.yml`); Renovate weekly (`renovate.json`,
  majors wait for approval). Locally Playwright builds and serves the app
  on :3300, never on :3000 (`pnpm dev`'s, which it would otherwise reuse);
  a server started by hand on :3300 must be stopped.
- **Tests**: domain logic, mappers and zod schemas (unit); `app/ui`
  primitives (component + axe); every API call behind MSW; e2e for the
  critical patient path (open `/i/{token}` → sign in (mocked) → claim →
  confirm) and for the `.well-known` files.
- **Definition of done**: `pnpm check` green · a11y checked · i18n keys
  added · tokens only · budgets respected · no `console.*` left · README /
  `.env.example` / this file updated if something changed · the change was
  requested or approved.

---

## 11. Security and privacy

- This is a **health** product. Collect the minimum, show the minimum,
  retain the minimum. Appointment reasons never appear in previews, emails
  the web triggers, analytics or logs.
- Sentry: `sendDefaultPii: false` (in v11: every `dataCollection` category
  off, local variables included), no tracing, screenshots or replays,
  user = id + role, `beforeSend`/`beforeBreadcrumb` scrub `/i/{token}`, the
  API's `/scheduling/invitations/{token}` and every query string
  (`app/lib/observability/scrub.ts`); console breadcrumbs are dropped.
  Unknown API codes are reported with method, route template, status and
  code only.
- PostHog: no autocapture of text, `person_profiles: 'identified_only'`,
  identify by user id only, mask inputs in any session recording (off by
  default). As built: no pageviews either (URLs can carry tokens), no
  surveys, flags or external scripts, `localStorage` persistence and URLs
  scrubbed in `before_send`. Turn on "Discard client IP data" in the
  PostHog project.
- HTTP headers: a strict CSP with a per-request nonce set in `proxy.ts`
  (allow Firebase Auth, PostHog, Sentry, Google Fonts; `'wasm-unsafe-eval'`
  so the splash's Rive runtime can compile WebAssembly, never eval), and in
  `next.config.ts` HSTS, `frame-ancestors 'none'`,
  `Referrer-Policy: strict-origin-when-cross-origin`, a restrictive
  `Permissions-Policy`.
- No secret ever reaches the browser: only `NEXT_PUBLIC_*` variables are
  public, and the only ones that exist are public by design (Firebase web
  config, PostHog key, Sentry DSN, store ids). Server-only variables are
  validated in `env.ts` and never imported from client code.
- Firebase web API key: restrict it in Google Cloud by HTTP referrer to
  `redoctorapp.com` and the Vercel preview domain. Any Google Maps browser
  key created for `/s/{id}` directions is a **new** key restricted by
  referrer — never the app's key.
- Dependencies: `pnpm audit` in CI, Renovate weekly, lockfile committed.

---

## 12. Environment variables (validated in `app/lib/env.ts`)

Environments: `development` (local), `preview` (Vercel PR), `production`
(`redoctorapp.com`). All three point to the same API today.

| Variable | Scope | Value / notes |
| --- | --- | --- |
| `NEXT_PUBLIC_APP_ENV` | all | `development` · `preview` · `production` |
| `NEXT_PUBLIC_SITE_URL` | all | `https://redoctorapp.com` (canonical, OG, deep links); preview uses its Vercel URL |
| `NEXT_PUBLIC_API_URL` | all | `https://api-dev.redoctorapp.com/api/v1` |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | all | `AIzaSyCt6Rzgu06_atWspSTVq2jZxPWSk9shxqI` (web app of project `redoctor-3acf8`; restrict by referrer) |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | all | `redoctorapp.com` once the `/__/auth/*` proxy exists; `redoctor-3acf8.firebaseapp.com` meanwhile |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | all | `redoctor-3acf8` |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | all | `1:640755008477:web:3a195209f27154b9e56c34` |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | all | `640755008477` |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | all | `redoctor-3acf8.firebasestorage.app` |
| `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` | all | `G-3ZB1NQ7NHG` (Analytics stays off unless asked) |
| `NEXT_PUBLIC_POSTHOG_KEY` / `NEXT_PUBLIC_POSTHOG_HOST` | all | From the PostHog project Josbert creates; empty disables analytics |
| `NEXT_PUBLIC_SENTRY_DSN` | preview, production | Empty in development disables Sentry |
| `SENTRY_ORG` / `SENTRY_PROJECT` / `SENTRY_AUTH_TOKEN` | CI only | Source-map upload; never in `NEXT_PUBLIC_*` |
| `NEXT_PUBLIC_APP_STORE_ID` / `NEXT_PUBLIC_PLAY_STORE_ID` | all | **Empty during the pilot** (TestFlight / internal testing). Play id will be `com.redoctor.mobileapp` |
| `NEXT_PUBLIC_IOS_BUNDLE_ID` | all | `com.redoctor.mobileapp` |
| `NEXT_PUBLIC_APPLE_TEAM_ID` | all | `SLAQ84BD94` |
| `NEXT_PUBLIC_ANDROID_PACKAGE` | all | `com.redoctor.mobileapp` |
| `NEXT_PUBLIC_SUPPORT_WHATSAPP` | all | `Redoctor\|+584227362867` (`Label\|number`); provisional until REDOC-357 |
| `NEXT_PUBLIC_SUPPORT_PHONES` | all | `Soporte 1\|+584145598216,Soporte 2\|+584245582129`; provisional until REDOC-357 |
| `API_PROXY_TARGET` | development only | Dev-only proxy for authenticated calls until CORS (REDOC-362); must be absent in preview/production. Without it, `next dev` proxies to `NEXT_PUBLIC_API_URL` |
| `VERCEL_AUTOMATION_BYPASS_SECRET` | GitHub Actions secret | Only if previews have Deployment Protection: Playwright and Lighthouse use it for one request and browse with Vercel's cookie |
| `PLAYWRIGHT_BASE_URL` · `E2E_SPECIALIST_ID` | testing | Run the e2e suite against a deployed URL; the public profile the e2e and Lighthouse runs use (api-dev's test profile by default) |

`.env.example` lists every variable with a comment; `.env*.local` are
git-ignored. Vercel holds the preview/production values. Client components
read public values from `app/lib/public-env.ts` (each `process.env.NEXT_PUBLIC_*`
written out in full, or Next.js does not inline it).

---

## 13. Open decisions — ask, don't assume

1. The page background: `#FDFDFD` (token) vs `#FBF8FF` (what the app paints).
2. PostHog event list and funnel definition (M12).
3. Patient screens design (Figma) — the designer is working on them; the
   landing design and copy are hers too («Landing de Redoctor» doc).
4. When REDOC-362 (CORS, pilot environment) and REDOC-357 (configuration
   endpoint) ship; until then the dev-only proxy and the provisional
   constants stay isolated.
5. Legal texts (privacy, terms, account deletion) — from the lawyer; the
   pages exist with placeholders marked as such, never with invented text.
6. Store ids — empty until the apps are published.
7. The JS budget of §8.10: 150 KB gzip is below what React 19 + Next.js 16
   weigh on their own (≈140 KB); today's public pages ship 198–225 KB.
   Decide the budget (and whether Sentry and PostHog count) before M12.
8. The Android `intent://` scheme: `https` (§6 text) or `redoctor` (what the
   prototype shipped and the port does).
9. The daily-summary opt-out link: the web serves
    `/daily-summary/unsubscribe?token=…` (the API's own words) and redirects
    the first name, `/resumen/baja`. REDOC-359 must be updated so the API's
    email builds the new one (`url_baja`), confirmed by Heyscar; the
    endpoints (`POST /notifications/daily-summary/unsubscribe|subscribe`)
    are in the OpenAPI already.
10. Figma vs this file: the Snackbar is filled with color (blue, green, red,
    yellow, dark grey with white text) while our Toast is a light card; the
    «secondary» button is blue outline in Figma and green in §8.

### Decided (2026-10-08)

- **Stars color:** `warning-500`. The app's `#F9BF24` stays out of
  `tokens.css`.
- **iOS and the specialist bridges:** no change to the prototype. The
  domain moves to this web as soon as possible, and this web must be ready
  for it (§6 "Domain cutover"). It moved on 2026-10-12.
- **Unknown ids under a valid route answer 200 + `noindex`:** accepted for
  now (see Improvements).
- **First steps are development:** Vercel, Sentry, PostHog, the GitHub
  secret and Renovate wait until the web works in development. Vercel went
  first, with the domain, on 2026-10-12 (§6 "Domain cutover").
- **The landing (M9) follows the middle mockup of Figma «LANDING PAGE»**
  (`4464:341`), copy included, over the landing doc's copy; the bar stays
  as designed for now. No mobile design exists: the phone layout is ours.
  Where the mockup and the tokens disagree, the tokens won and the gap is
  listed here for the owner: radius 80 → `2xl` (30), 25 → `xl` (20),
  15 → `lg` (12), except the hero's search bar, a pill as the owner's
  screenshot of the mockup shows it (2026-10-08; the node says 15); the
  80 px hero line got its own token (`display-xl`);
  brand green on white is text only as `green-700` (the 500 fails AA, as
  the doc warns), and the green card of «Del mensaje a la consulta» is
  `green-600` so its white text reaches 3:1; the landing's buttons use the
  new `shape="soft"`. Still
  sample data: specialties (the API's catalog comes with the logic),
  plans and prices (the mockup's; the doc keeps prices off the landing
  while the app links here, §6), the footer channels (REDOC-357), the
  plans' one-line descriptions (not in the mockup). «Entrar», «Comenzar»,
  «Seleccionar plan», the search and the chips are visual until their
  modules exist. Two sections are deliberately smaller than the mockup
  (owner's request, same day): «Del mensaje a la consulta» (container
  64 rem, title 42 px, words sized by the card through container queries)
  and «Así de simple» (container 56 rem, one type step smaller, 40 px
  badges). The trust cards keep words and picture in separate areas, so a
  longer line grows the card instead of running under the illustration.
  The designer's update of 2026-10-08 (same frame, `4464:341`; `4585:3077`
  is her copy of the previous version) is in: the second trust card is
  brand green (green-500, the owner's decision the same day over a
  green-700 that passed AA: its 16 px white words measure 2.8:1, and the
  e2e audit lists that card as its one accepted contrast exception) and
  the third blue with white words, and the plans show a bigger price
  (42 px), 16 px words and benefits and a visible «Recomendado» tag. Two slips of that update stay out: the second
  and third plans both named «Corporativo» (the second keeps «Profesional»)
  and prices with a decimal point (the locale's comma stays, §5).

- **Animation (2026-10-08): Motion, not GSAP**, through `app/ui/motion`
  (§8.11). GSAP only if a piece ever needs pinned or scrubbed scroll or SVG
  morphing, and then isolated in that piece.
- **The splash (2026-10-08):** the app's `splash_logo.riv` over the landing
  only, on a session's first visit (session cookie `redoctor-splash`): the
  logo's entrance (`Timeline 1`, 1.5 s as measured — the runtime never
  reports a one-shot timeline's end, so the veil counts from `Play`; the
  app's waiting bob, `Timeline 2`, has nothing to wait for here) and a
  200 ms fade; a tap or Escape skips it; no veil under reduced motion, nor
  on 2G or with data saving on; never on `/i`, `/a`, `/s`. The runtime's
  WebAssembly (~360 KB gzip) is served from this origin and preloaded; the
  CSS alone fades the veil at 2.5 s when JavaScript never runs.
  Then the hero's choreography (`(marketing)/_components/choreography.ts`):
  the bar slides down, the slogan's first line enters letter by letter and
  the second word by word, the search bar fades up and the specialist rises
  out of it, the chips enter from the middle of the row outwards, and the
  cursor sweeps in from below right along a curve and clicks every 5 s.
- **The sections' entrances (2026-10-08)**, one `Choreographed` each, on
  scroll, every piece on `--duration-entrance`: «Del mensaje a la consulta»
  fades its box in, the side cards slide out from behind the middle one and
  the photos come in from their card's edges 200 ms apart; on hover each
  card hides its photo a little and grows its words (CSS on `translate`
  and `scale`, which Motion's `transform` never touches). «Así de simple»:
  each role card builds itself (the patients' card 100 ms behind): the
  avatar pops in, the words rise, the four steps are dealt one from under
  the other 100 ms apart — the words block is opaque and above them, so no
  step ever paints over text — with their badge popping 67 ms after its
  row, then the button. Hover: the avatar nods, the steps lean right in a
  67 ms cascade; a step lifts, its badge's tint sweeps across the row from
  the left (a `::before` scaled from the left edge, 300 ms) and its words
  take the tone's lightest shade that keeps 4.5:1 on that tint (blue-500,
  green-700, orange-800, warning-800). «Sí, puedes confiar»: the chip pops,
  the title and paragraph rise, the first card fades up and the other three
  come out from behind the card above them, or else the one before (offsets
  measured from the layout: `Choreographed` takes `hidden` as a function
  of the box; no card crosses over another's words), each
  number popping 67 ms after its card and each picture rising from the
  card's bottom edge 150 ms after; hover lifts the card, its picture peeks
  up and a wave of the opposite surface washes over it (a `::before` whose
  `clip-path` circle or ellipse grows from the wave's origin): green up
  from the bottom on the first, white from the top right on the second,
  white from the bottom left on the third, green out of the specialist's
  circle at the bottom centre on the fourth. «Prepárate para lo que
  viene»: the rocket flies in on one arc
  from below left, the lead line and the title rise, the pin drops, and the
  cards land on the rolling ribbon from the right 100 ms apart with their
  badges popping after. The ribbon can be dragged (`RoadmapBelt`:
  JavaScript takes the CSS marquee over where it stands, four copies so a
  drag of a screen's width either way finds cards, the same pace, no
  momentum so it rolls on from where it is let go, paused under the pointer
  or a visible focus; not on touch screens, where it scrolls by hand);
  hover lifts a card, grows its badge and fills the card with the badge's
  tint growing out of the badge (a `::before` clipped to a circle centred
  on it), the green words one shade darker to keep AA on the tint. «Elige
  el plan ideal»: the box fades in, the chip, title and line follow, the
  recommended plan grows into place and the other two slide out from
  behind it (measured, so in a column they come from above and below it),
  each price counts up from zero as its card lands (a MotionValue in the
  sequence writing the locale's format into the amount's span), the tag
  pops, the benefits step in 70 ms apart and the buttons rise. «Preguntas
  frecuentes»: the chip, title and line, then the questions step in from
  the left 70 ms apart, each chevron turning into place with its row
  (Motion's `transform` on top of the open state's `rotate`), each
  separator — a drawn line, not a border — drawing itself from the left a
  beat after, and the first answer, open on arrival, settling in under its
  question; hover steps a question right and grows its chevron. Nothing
  hides after it has painted: a section already on screen when the page
  loads (a reload keeps the scroll) shows no entrance, by design (§8.2).
- **The bar docks (2026-10-08, owner's request, no mockup):** at rest the
  links sit beside the logo, not centred. Once the hero's search bar slips
  under the bar (`heroSearchId`, watched by an IntersectionObserver
  through `useSyncExternalStore`), the bar rises to the top edge and widens
  to the screen at the same height, the wordmark narrows to the «Re» mark
  (`public/brand/logo-mark.svg`, the app's `logo-short` with blue letters;
  the width is measured and animated by Motion, the two cross-fade), a
  search of its own (`SearchBar variant="bar"`, inert until then) opens
  between the mark and the links and takes the free room, which slides the
  links over to «Entrar». CSS transitions on `data-docked`, 300 ms, house
  curve; scrolling back undoes it. Two search landmarks need two names
  (`landing.hero.search.barLabel`).
- **No root `loading.tsx` (2026-10-08):** §4.

### Decided (2026-10-12)

- **The session (M2) as built:** `/sign-in` is a page, not a sheet (it has a
  URL, carries `redirect` and serves from the emails); its card mirrors the
  app's login: «Inicia sesión de manera rápida y segura», the two provider
  buttons in their brands' colours (Google white with the «G», Apple black
  with the logo, 48 px, `shape="soft"`), the last-used one first with the
  «Última vez» chip, the legal line as text until M10 links it. A patient
  stays on the landing; a specialist lands on `/panel` (his pick of
  2026-10-12), the page with the app's
  options; an account with no sign-up behind it goes to `/sign-up` (M3),
  with a word about Apple's private email when the address is a relay
  one. The landing's bar shows «Entrar», or the avatar with its
  menu, from tablets up, and the phone menu holds the same.
- **Firebase SDK 13 (2026-10-12):** the major's breaking changes are all in
  AI Logic (`@firebase/ai` 3.0.0); App and Auth moved by a patch, so the
  owner took it. §2 says 13.
- **A brand-new Firebase account on `/identity/me` (read from the app,
  2026-10-12):** a 200 with `registrationStatus: PENDING_REGISTRATION` (a
  missing value counts as that) and no facets; the app sends it to the
  sign-up form, and the web does the same from M3 (`needsSignUp`). The
  API closes a session only with a 401, 403 or 404 on `/me`: the web signs
  out and says «Tu sesión ha caducado» (`auth.sessionExpired`); any other
  failure offers a retry. A status this version does not know is
  `unknown` and never sends anyone to sign up again. The web's sign-up
  (M3) is for patients only: a specialist signs up in the app, so the web
  points them to support (phone, WhatsApp) — or to the store's QR once the
  app is published.
- **The sign-up (M3) as built (2026-10-12):** `/sign-up?redirect=`, in
  `(auth)`, needs a session (a stranger signs in first and comes back,
  query included). What it asks comes from the account
  (`app/lib/auth/sign-up.ts`): a brand-new account says who it is
  («¿Quién eres?», the app's two cards); a patient fills the app's form —
  names and the three consents (`POST /identity/register`) — and, only
  when the flow needs it (claiming an invitation: `redirect` is `/i/…`),
  the personal data of the app's «Finalizar registro» on the same screen
  (`POST /identity/complete-registration`, allowed once the account is
  `PENDING_COMPLETE_PATIENT`), the document checked against other accounts
  first (`POST /identity/public/check-document`), as the app does. Then a
  fresh ID token (its claims carry the registration status) and a fresh
  `/me`; the names alone end with a toast and the way back, the personal
  data with «¡Todo listo!» and «Reclamar mi cita». Both writes go through
  the write-once guard; a 409 on the registration and a 403 on the
  completion read `/me` and count as done if the account moved past that
  step. A specialist — new, or with an open sign-up (`/panel` shows it
  too) — gets `AppAccess`: while the app is in testing, WhatsApp (a
  written message that says nothing about the person: the link passes
  through wa.me) and the support phones (`NEXT_PUBLIC_SUPPORT_*`,
  provisional until REDOC-357); once the store ids exist, a QR code per
  store on a computer (drawn on the server with `uqr`, 7.6 KB gzip, no
  dependencies: the owner asked for the QR) and the store's button on a
  phone. Where the web differs from the app's form, on purpose and to
  confirm: names follow the API (letters with spaces, hyphens or
  apostrophes, 1–100) where the app wants 3+ letters and no hyphens; the
  document types and length follow the API (V, E, P, J, G; 6–8 digits) —
  the app also offers R and 9 digits, which the API refuses; the phone is a
  Venezuelan mobile (+58, 412/414/416/422/424/426) where the app has a
  country picker; the sex is not preselected (the app preselects
  «Hombre») and offers the app's two options; an adult (18+) only, as the
  app. Errors the API may answer with codes we do not know yet (a phone
  already in use) say «No pudimos guardar tus datos» and reach Sentry.
- **Two M2 slips fixed with M3 (2026-10-12):** the sign-in buttons read
  Firebase's failures from `apiErrors`, which no page sent to the browser
  (a failed sign-in would have shown a raw key): `/sign-in` now sends it
  (`pageNamespaces.signIn`); the admin's note on `/panel` read
  `specialistHome` in the browser: it now gets its text from the server.
- **English URLs (2026-10-12, owner):** every route of the web is English,
  the paths shared with the app included, and the path says who it is for
  (§3.8, §6). `/sign-in` and `/sign-up` were `/entrar` and `/registro`
  (never deployed); the modules to come get `/appointments`, `/account`,
  `/privacy`, `/terms`, `/delete-account` and `/pay` (§13, Decided); the
  specialist's pages the app opens moved under `/panel/` (`/suscripcion`,
  `/agenda`, `/especialidades` and `/perfil` became `/panel/subscription`,
  `/panel/agenda`, `/panel/specialties` and `/panel/profile`); the opt-out
  `/resumen/baja` became `/daily-summary/unsubscribe`. `/s`, `/i` and `/a`
  stay: short for chats and already shared. Old names redirect for good.
  The change ran in order (§6): this web, then the app (the manifest's
  `/panel/` prefix and the email templates, zipped to REDOC-354 the same
  day; the AASA then dropped the old names), and last the API. The API's
  part, pending: the new templates, `url_baja`
  (REDOC-359), `webPaymentUrl` refusing every path the app opens
  (REDOC-357), and the one link it already builds in code: `invitationUrl`,
  `${APP_PUBLIC_URL}/citas/invitacion/{token}` (REDOC-255, finished; the
  appointments and REDOC-228's endpoint return it), which becomes
  `/i/{token}`; the app uses the token instead since v0.120.2, so nothing
  broke. REDOC-349, the
  `link.redoctorapp.com` plan, is superseded. Every other link the API
  must change is still only in tickets: no email has been sent yet
  (REDOC-354).
- **The invitation (M4) as built (2026-10-12):** `/i/{token}` loads with no
  session and reads the invitation in the browser (the public
  `GET /scheduling/invitations/{token}`; a 404 says the link leads nowhere
  and is not reported). Its states follow the app's invitation screen,
  decided by the invitation's status alone (`planInvitationView`): over
  (expired, cancelled), claimed by this account or another, and pending.
  Pending, a stranger signs in right there with the Google and Apple
  buttons (one tap, §1); a patient claims it with the app's form: «¿Para
  quién es esta cita?» (SELF, or DEPENDENT for someone in their care; an
  invitation with no document can only be claimed by a representative),
  the birth date and sex of that person when the invitation lacks them,
  and «Confirmar mi asistencia», on by default when the API says
  `canConfirmNow` (`confirm: true` in the same claim). The claim goes
  through the write-once guard; a refusal because this account already
  holds it counts as done; the API's reasons for refusing a SELF claim
  (409 `ERR_4014`) are explained in place with the app's words. **The
  patient finishes the sign-up first** (owner, 2026-10-12): an account
  whose patient sign-up is not done is sent to
  `/sign-up?redirect=/i/{token}?for=self|dependent`, and with `for=self`
  the form starts from the invitation's birth date, phone, document and
  sex (not the names, as in the app); «Reclamar mi cita» brings the
  answer back. A specialist's or an admin's account is told the
  invitation is their patient's (the app sends them home). Where the web
  differs from the app, on purpose and to confirm: nothing is preselected
  in «¿Para quién es esta cita?» (the app preselects by comparing the
  account's document, which the web's `/me` does not carry), nor the sex
  of the person in one's care (the app: «Hombre»); the page says which
  account the appointment goes to («La cita quedará en tu cuenta …», §1),
  which the app does not; a stranger sees who, when, where, the price and
  the invited name, while the document, birth date, sex and reason wait
  for a signed-in person, and an invitation that is over or someone
  else's shows nothing of the appointment (REDOC-315: the API answers it
  all to anyone with the token); a signed-out viewer of a claimed
  invitation is offered to sign in, in case it was them; and «Abrir en la
  app» is not on `/i` while the app is unpublished, since patients cannot
  have it in the pilot (§6). Once claimed, «Ver mi cita» opens `/a/{id}`
  (M5). Production needs the API's CORS (REDOC-362): the e2e answers the
  API's call in the browser itself (`page.route`). With M4 the avatar's
  initials went to grey-700 (6:1; grey-600 measured 4.1:1 on the
  surface).

- **The appointment (M5) as built (2026-10-12):** `/a/{id}` needs the
  session and asks for it right there (the Google and Apple buttons;
  nothing is read before), then reads `GET /scheduling/appointments/{id}`
  in the browser: a 403 says the appointment is in another account, with
  «Entrar con otra cuenta»; a 404 (or an id the API refuses) says the link
  leads nowhere. The page follows the app's patient detail: the state
  chip, who and when, what can be done — first on the page, as email 12
  promises (REDOC-360) —, the office with «Cómo llegar», the price, the
  patient (someone in one's care in full, the reason, the notes) and the
  record (every reschedule, struck out → new; the cancellation, by whom,
  when and why). «Confirmar cita» while pending and inside its window
  (`canConfirmNow`), and before it the hour it opens; «Reprogramar» (a
  sheet: the same office's month, its days with free hours, that day's
  free hours by morning, afternoon and evening; the API moves an
  appointment inside its office only) and «Cancelar» (a sheet that asks;
  no reason, as in the app). The three writes go through the write-once
  guard and the page then shows the appointment the API answered; a
  closed window (`ERR_4013`) and an hour just taken (`ERR_4002`) are said
  where they happen. A specialist or an admin who is not the patient sees
  it read-only, with «Abrir en la app» (they have the app; patients do
  not, so the patient's page has no bridge, as `/i`). Where the web
  differs from the app, on purpose and to confirm: nothing changes once
  the appointment has started (REDOC-308; the app allows it until it
  ends); the reschedule sheet chooses nothing for the person and lists
  only the free hours (the app preselects the first and shows the taken
  ones); «Agregar al calendario» (Google Calendar, or an .ics for Apple,
  Outlook and the rest; the event carries who, when, where and this
  page's link, never the reason), which the app does not have; the cancel
  sheet stays open until the API answers, so a failure shows there; the
  dates carry the year. Production needs the API's CORS (REDOC-362): the
  e2e covers the page without a session, the component tests (MSW) the
  rest. With M5: `Sheet` (§8.8) and `StatusCard` in `app/ui`, the
  invitation's headline and details promoted to `app/ui/appointments`, an
  hour never broken across lines (no-break spaces), the calendar's days
  44 px tall, and `renderWithPageMessages` (§9), which found the five
  namespaces `/a` was not sending.

- **My appointments (M6) and the review (M7) as built (2026-10-12):**
  `/appointments` needs the patient facet (`RequireSession facet="patient"`:
  an account with no sign-up behind it goes to `/sign-up` and comes back; a
  specialist without the facet gets the way out) and reads two things in
  the browser: `GET /reviews/pending` and `GET /scheduling/appointments`
  (no filters; the API paginates nothing here). While a finished
  consultation waits for its rating, the page is the review wall, as the
  app's `/pending-review`: the oldest first, «Califica tu consulta» with
  «1 de N», the consultation (the headline of M4/M5, then the reason, the
  office and «Asistió {name}» when it was for someone in one's care),
  «¿Cómo calificarías la cita?» with five stars, «Comentario (opcional)»
  with its count out of 1000, the two notices (final; published with the
  name) and «Enviar calificación», never disabled: without a star it says
  «Toca una estrella para poder continuar.» and sends nothing.
  `POST /reviews/appointments/{id}` goes through the write-once guard: a
  409, or a lost answer, counts as done once the consultation has left the
  pending list — what the app does too (it reloads pending and moves on).
  If the pending list cannot be read, the list shows (the app lets the
  person in as well). Then «Mis citas»: two tabs with their counts,
  «Próximas» (not over by status and not ended by the clock, the soonest
  first; one under way stays here until it ends) and «Pasadas» (the latest
  first); a patient with nothing ahead lands on «Pasadas»; with nothing at
  all, the page says how appointments reach them in the pilot. Each card
  (the app's: when, the state's bar and chip, who, why, where) opens
  `/a/{id}`, whose patient view gained «Ver mis citas»; the account menu
  gained «Mis citas» for anyone with the patient facet. Where the web
  differs from the app, on purpose and to confirm: the two tabs instead of
  the app's «Más recientes» (one list, the furthest ahead first) with
  «Calendario» and filters (status, Hoy/Mañana, dates) — a pilot patient
  has one or two appointments and the web books nothing (owner's pick,
  2026-10-12); the wall does not lock the bar (the app's only exit is
  signing out) and has no «Más tarde», as the app; a failed list shows an
  error state with «Refrescar» (the app shows an alert over an empty
  list); «1 estrella» in the singular (the app says «1 estrellas»); the
  cards' dates carry the year. The notice keeps the app's words, «junto a
  tu nombre»: the API decides anonymity by specialty (REDOC-251) and offers
  no choice, and M8 publishes «María P.». With M6–M7: `Tabs` (promoted
  from the profile's TrainingTabs), `StarsInput` and `TextArea` in
  `app/ui`; `RequireSession` sends an account with no sign-up to
  `/sign-up` (before, it showed «Esta página es para…», on `/panel` too).
  Production needs the API's CORS (REDOC-362): the e2e covers the page
  without a session, the component tests (MSW) the rest.

- **The payment (M13) as built (2026-10-12):** `/pay` (the owner's name;
  the provisional `NEXT_PUBLIC_PAYMENT_PATH` is gone, the route is a
  literal) needs the specialist facet (`RequireSession facet="specialist"`;
  an account the billing API refuses with a 403 — an admin's — is told the
  page is for specialists) and reads in the browser
  `GET /billing/me/subscription` and, when a receipt may be owed
  (INCOMPLETE, PAST_DUE or a pending upgrade), the oldest open receipt of
  the subscription with its attempts (`GET /billing/me/invoices?status=OPEN`,
  then its detail), as the app's SubscriptionCubit does. The page is «Mi
  suscripción»: the plan (the crown in its tier's metal by slug, the
  status chip, the price «al mes»), the status message or the notice — in
  the app's precedence: in review > past due > rejected (with the admin's
  reason) > unpaid > upgrade pending — with «Pagar ahora», and the period
  rows (period, next plan, coupon, free months). Without a plan, or once it
  expired unpaid, «Todavía no tienes un plan» → «Ver planes»: the plans on
  offer (active, with a price; the cheapest first), each with its benefits
  derived as the app derives them, the first one chosen; «Seleccionar plan»
  opens the payment. The payment has **two steps** where the app has seven
  pages, one transaction: (1) «¿Cómo vas a pagar?», with the totals (the
  plan, the coupon and the total; or the receipt's lines, what was settled
  and what is left to pay) and the two methods, Pago móvil and
  Transferencia; taking a plan creates the subscription when the method is
  chosen (`POST /billing/me/subscription`, through the write-once guard; a
  409 ERR_5071 for this same plan unpaid continues with it, any other
  returns to the subscription; ERR_5074 returns to the plans) and fixes the
  amount in bolívares (`POST …/payment-intents`; no rate of the day,
  ERR_5085, is said in place with the retry a tap away); the coupon sheet
  («Ver descuento» validates without spending the code, «Aplicar cupón»,
  the saved coupons good for the plan; a refusal is read in the field, by
  the API's `details.reason` before its code) and, when it covers the
  month, «Activar mi plan» instead of a method. (2) «Realiza el pago»: the
  amount in Bs, big, with «Copiar» (it copies `1198,39`, as the bank wants
  it typed), its dollars and the day's rate, until when it holds,
  Redoctor's account for the method with «Copiar» per datum and «Copiar
  todos los datos», and the report on the same page — the reference (6 to
  22 digits), the bank (a sheet with the app's list of 27 banks, searched
  without accents, only the code travels), the phone (+58) for a Pago móvil
  or the account's digits for a transfer, the day (a date field, today by
  default, never the future) and the amount (prefilled with what was
  asked; another one is explained before sending: what is missing stays
  pending on the receipt, what is over becomes balance) — sent with
  `POST …/report` through the write-once guard; an expired amount
  (ERR_5083) is renewed and what was typed kept, a report already in
  review (ERR_5084) sends the person back to the subscription. Then
  «Estamos verificando tu pago» with the summary (amount, bank, method,
  day), or «¡Tu plan ha sido activado!», and «Ir al inicio» to `/panel`,
  whose «Suscripción» card now leads here (the bridge `/panel/subscription`
  stays for the app and the emails). Money as the web writes it
  everywhere (`$ 36,99` — the owner's call of 2026-10-13 over the app's
  `$ 36.99` —, `Bs 1.198,39`, the rate `Bs 39,95`), the dates in words. Where the web
  differs from the app, on purpose and to confirm: two steps instead of
  seven pages; no «Pegar» button for the reference (the keyboard pastes);
  the day is a date field instead of «Hoy / Ayer / Otra fecha»; the phone
  is always asked (the web's `/me` carries none to confirm); the benefits
  unfold inside the plan's card. **Left for later, on the owner's word
  (2026-10-12), all still in the app:** changing plan (preview and
  proration), cancelling and resuming, abandoning an unpaid subscription,
  undoing a scheduled change, the receipts' history, «Saldo a favor», «Mis
  cupones» (saving and listing) and «Datos de cobro»; no email sends anyone
  to the web for them. With M13 the billing copy entered `es.json` under
  the app's `billing.*` keys, and `app/lib/format/dates.ts` writes instants
  as days and hours in Caracas for anything that is not an appointment.
  Production needs the API's CORS (REDOC-362): the e2e covers the page
  without a session, the component tests (MSW) the rest.

### Decided (2026-10-13)

- **The deep review (2026-10-13, owner's request: «busca errores… y aplica
  las soluciones»).** Nine reviews over the whole web; what they found was
  fixed where it was a defect and kept the flows, and the product calls
  were left to the owner (memory, «what is pending»). What a person can
  now see or hear differently:
  - **Sign-up:** a brand-new account reached `/sign-up` and was sent there
    again in a loop (since v0.17.0, when the guard began sending accounts
    with no sign-up there): the guard lives in the flow now and lets the
    sign-up page's own account in (`allowUnregistered`).
  - **Email 15 («Dejar mi reseña» → `/a/{id}`):** a finished consultation
    still to rate shows the stars first on its page; it never holds the
    page (pages reached by a link are never blocked, §1).
  - **The appointment page** follows the clock without polling: at the hour
    its confirmation opens it reads the appointment again (the API says
    whether it can be confirmed), at its start the changes go. A failed
    re-read after a write keeps the appointment on screen (the same on
    `/i`, `/appointments` and `/pay`). After cancelling, the sheet closes
    with its animation; «Hemos notificado al especialista» only when the
    patient cancelled.
  - **Rescheduling:** the chosen day is judged by its own month (browsing
    another month never hides the choice that will be sent); tapping it
    again keeps the hour; the days and the hours that fail to load say so
    with «Reintentar»; the calendar reads «…, sin cupos» to screen readers.
  - **The invitation:** while the session answers, nothing of a claimed
    invitation shows (REDOC-315); its heading is there from the first
    frame; «…y tu asistencia está confirmada» and `web_invitation_claimed`
    say what the API did, not what was asked; claiming refreshes «Mis
    citas»; the previews of `/i` and `/a` keep the brand image.
  - **Session:** a sign-in whose `/me` the API refuses leaves the buttons
    ready for another try; the buttons hold their place until the device
    and the session are known (they no longer swap under the finger); a
    sign-out made by Firebase (another tab, a revoked account) forgets the
    person here too; «Entrar» brings back to the page; «Reintentar» shows
    it is busy; names accept accents pasted as separate marks; a document
    with letters is refused with «Escribe solo los números de la cédula,
    sin letras.» instead of losing them.
  - **The payment (M13):** an approved payment no longer leaves «Estamos
    verificando tu pago» beside an active plan; ERR_5071 refreshes and,
    for another plan unpaid, says the app's `acquire.otherUnpaid`; an
    expired amount renewed at the same figure is reported again by itself
    (another figure: the warning, as before), and a renewal that fails
    says why; reference and account take pasted dashes and spaces (only
    the digits travel); the report validates on blur (§9); the amount is
    read strictly (`parseBolivares`: no letters, signs, third decimals or
    two amounts pasted together); «Copiar» falls back to the old way and,
    if refused too, says to copy by hand (`billing.pay.copyFailed`); the
    coupon sheet starts clean each time it opens and refuses a code of an
    impossible length in place; a 404 from a receipt is no coupon refusal;
    the open receipts are read 100 at a time.
  - **`/panel`:** an admin's account without the specialist facet does not
    see «Suscripción» (`/pay` is not for it). Errors on `/pay` and
    `/panel` keep the bar (`PageFrame` and `PageError`).
  - **Public profile:** the name takes up to two lines; the OG card's name
    two at most, a size down when long; one read of the profile per
    request (React `cache`).
  - **Accessibility:** closing a sheet gives the focus back to what opened
    it, and dragging it down moves it on phones (the entrance no longer
    holds its transform); each step a person takes (sign-up, payment,
    review wall, claim, opt-out) takes the focus to its title
    (`useFocusHeading`); an error under a field is never read once fixed
    and is read again when it comes back; hints are tied to their field
    (`TextField`'s `hint`); toast descriptions grey-700 (4.4:1 → AA), empty
    stars grey-500 (non-text 3:1), «Elegir el banco» grey-600; the toast's
    ✕ sits at the end; «Ver perfil» and the coupon links are a touch
    target tall; the menu returns the focus to its button on Escape; a
    counting price is read whole.
  - **The landing:** a section taller than the screen (the plans on a small
    phone, any section in landscape) enters instead of staying hidden;
    without JavaScript, or with reduced motion, the hero is there from the
    first paint (`data-entrance`); a visit asking to save data skips the
    splash and its download; the veil no longer cuts the logo on a slow
    start; the search never reloads the page with what was typed in the
    address (§11); the ribbon's frame loop runs only when it drives the
    ribbon on screen; the dock line no longer moves after the first undock.
  - **Weight and privacy:** the message catalog no longer ships with the
    global error boundary to every page, nor zod and t3-env with the
    session (the landing's entry JavaScript went from 167 to 134 KB gzip,
    measured on the build's entry chunks); Sentry's contexts and extras and
    every URL property PostHog attaches (by name, `$session_entry_*`
    included) are scrubbed; `/i`, `/a`, the opt-out and the auth pages are
    no longer in robots.txt, so crawlers read their noindex, and they
    answer `X-Robots-Tag: noindex, nofollow`.
  - **Tooling:** Playwright serves its build on :3300; Vitest clears mocks
    between tests; MSW listeners never leak between tests.
  - **The owner's calls on the review (same day):** dollars as «$ 36,99» on
    `/pay` too, like the landing and the prices (§8.7); «a la 1:30» and
    «antes de la cita» where the copy said «a las 1:30» and «antes a la
    cita»; «Reintentar» on every retry (it was «Refrescar» on the load
    errors); the «Última vez» chip stays brand green (2.8:1, accepted like
    the green trust card). The landing's inert search and buttons are
    finished bit by bit; the minimum `/panel`, patient search and booking
    wait for his word (memory).

### Improvements noted (not scheduled)

- The FAQ's closed answers are not in the HTML (Radix renders them on
  opening): search engines and Ctrl+F miss five of six. `forceMount` would
  break the closing animation as Radix measures it; worth a proper look
  when the landing's SEO is worked on.

- A real 404 for unknown profiles and paths (§4): a check in `proxy.ts`, or
  routes that do not match.
- The e2e of the critical path with a mocked sign-in (§10: open `/i` →
  sign in → claim → confirm) needs a way to sign in under Playwright —
  the Firebase Auth emulator is the clean one. Until then the signed-in
  flows of `/i` and `/a` are covered by the component tests (MSW).

---

## 14. Working with Claude Code in this repo

- `CLAUDE.md` imports this file. Project memory for Claude lives outside the
  repo; nothing personal goes into these files.
- `.claude/settings.json` allow-lists the `pnpm` scripts and read-only git;
  destructive git operations and `--no-verify` are denied.
- Skills in `.claude/skills/`: `new-module` (route group with its first
  route, `_components`, `loading`, `error`, metadata, i18n keys and an e2e
  stub), `new-ui-primitive` (component in `app/ui` + fixture + axe test),
  `promote-component` (move a piece from a module's `_components` to
  `app/ui/<domain>` and rewrite imports), `api-schema` (zod schema +
  `lib/data` fetcher + `lib/queries` entry + MSW handler from an OpenAPI
  path).
- Before saying "done": `pnpm check`, then a short Spanish summary of what
  changed and what was verified (and what was not).
