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
| M3 Sign-up | One screen, prefilled with the invitation data |
| M4 Invitation `/i/{token}` | All states, claim for yourself or for a third party, ID-document warnings, confirm in the same step when < 24 h |
| M5 Appointment `/a/{id}` | Confirm (from 24 h before), cancel, reschedule, directions, add to calendar |
| M6 My appointments `/citas` | Upcoming, past, pending reviews |
| M7 Review | Stars, comment, "your review is public / anonymous by default" notice |
| M8 Public profile `/s/{id}` | Read-only: photo, verified specialties, offices with directions, service prices, rating and reviews, "Pronto podrás agendar aquí" |
| M9 Landing | Designed by the designer; copy in the doc «Landing de Redoctor» |
| M10 Legal and account | Privacy, terms, account deletion (texts from the lawyer) |
| M11 Bridges | `/suscripcion`, `/agenda`, `/especialidades`, `/perfil` (specialist pages that open the app) and `/resumen/baja` (daily-summary email opt-out) |
| M13 Specialist payment | Own route (name pending, e.g. `/pagar`): subscription and pending month, choose a plan with a coupon, Pago Móvil and transfer data in Bs from the API, report the payment, see it in review |
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
- **Soft review wall:** `/citas` is blocked until a pending review is given;
  pages reached through a link (`/i`, `/a`, `/s`) are never blocked.
- An **admin** who signs in is told that their account is used in the app.
  A **specialist** may sign in only to pay (M13).
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
| Auth | **Firebase Web SDK 12** (Auth only) | Google + Apple providers; project `redoctor-3acf8` (shared with the app) |
| Analytics | **PostHog** (`posthog-js`, slim build without external scripts) | Funnel by `origin`; no personal data (§11); off while the key is empty |
| Errors | **Sentry** (`@sentry/nextjs` 11) | `dataCollection` all off (v11's successor of `sendDefaultPii: false`); same privacy rules as the app; off while the DSN is empty |
| Icons | **Material Symbols Rounded** as inline SVG per icon (`@material-symbols/svg-400`) | Same family as the app; only the icons in use ship — never the variable icon font (several MB) |
| Font | **Urbanist** via `next/font/google` | Weights 300–700, `display: swap`, exposed as `--font-urbanist` |
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
  "organize, don't change the URL": `app/(appointments)/citas/page.tsx` is
  still `/citas`.
- **Everything UI lives in `app/ui`; everything that is not React lives in
  `app/lib`.** A component is promoted from a module's `_components/` to
  `app/ui/<domain>/` the day a second module needs it.

Nothing here mirrors the mobile app's layers on purpose: the two codebases
share the **domain language** (entities, names, rules), not the folder tree.

```
app/                                  # The application: routes, UI and logic
  layout.tsx                          #   <html lang="es">, fonts, providers, base metadata
  loading.tsx · error.tsx · not-found.tsx · global-error.tsx
  robots.ts · sitemap.ts · manifest.ts · opengraph-image.tsx · icon.png
  providers.tsx                       #   'use client': QueryClient, next-intl, PostHog, Sentry wiring
  (marketing)/                        # module: landing (M9)
    page.tsx                          #   /
    _components/                      #   hero, sections, faq — this module only
  (auth)/                             # module: session (M2)
    entrar/page.tsx                   #   /entrar?redirect=
  (invitations)/                      # module: the invitation link (M3, M4)
    i/[token]/page.tsx · loading.tsx · error.tsx          # /i/{token}
    _components/
  (appointments)/                     # module: appointments (M5, M6, M7)
    a/[appointmentId]/page.tsx · loading.tsx · error.tsx  # /a/{id}
    citas/layout.tsx · page.tsx · loading.tsx             # /citas — layout = <RequireSession>
    _components/
  (specialists)/                      # module: public profile (M8)
    s/[specialistId]/page.tsx · loading.tsx · not-found.tsx · opengraph-image.tsx   # /s/{id}
    _components/
  (account)/                          # module: account and legal (M10)
    cuenta/layout.tsx · page.tsx      #   /cuenta — layout = <RequireSession>
    privacidad/page.tsx · terminos/page.tsx · eliminar-cuenta/page.tsx
  (billing)/                          # module: specialist payment (M13) — route name pending
    pagar/layout.tsx · page.tsx · _components/
  (bridges)/                          # module: pages that only open the app, noindex (M11)
    layout.tsx
    suscripcion/ · agenda/[[...date]]/ · especialidades/ · perfil/ · home/[[...rest]]/
    resumen/baja/page.tsx             #   daily-summary opt-out — a Server Action
  api/                                # route handlers only when the browser must not call the API (none yet)
  ui/                                 # ALL shared UI
    button.tsx · input.tsx · sheet.tsx · skeleton.tsx · toast.tsx · empty-state.tsx · chip.tsx · avatar.tsx …
    layout/                           #   site-header, site-footer, page-frame, bottom-actions
    auth/                             #   require-session, sign-in-buttons, in-app-browser-help
    app-bridge/                       #   open-in-app-button, store-badges
    appointments/ · specialists/ · billing/ · reviews/   # domain components used by two or more modules
    analytics/ · og/                  #   link-origin-tracker; the Open Graph brand card (next/og)
    icons.tsx                         #   the Icon primitive (not icon.tsx: that name is a Next.js metadata file)
    fonts.ts · tokens.css · globals.css
  lib/                                # ALL non-React logic
    api/                              #   client.ts (fetch wrapper), errors.ts (ApiError + codes), retry.ts, write-once.ts
    schemas/                          #   zod schemas + inferred types per domain — THE contract with the API
    data/                             #   server-only fetchers for Server Components (fetch + cache tags → DTOs)
    queries/                          #   TanStack queryOptions + mutation functions per domain (client)
    actions/                          #   Server Actions — only where no user token is needed
    firebase/ · analytics/ · format/ · i18n/
    observability/                    #   report.ts (the seam), scrub.ts (what never leaves), sentry.ts
    security/                         #   csp.ts (the nonce policy proxy.ts sends)
    env.ts · public-env.ts · routes.ts · deep-links.ts · site.ts · utils.ts
  hooks/                              # shared client hooks: use-session, use-link-origin, use-device
tests/                                # setup.ts · msw/ (server + handlers per domain) · factories/ · e2e/ (Playwright)
public/                               # .well-known/ (§6) · brand/ (logo.svg, logo-white.svg, icons) · illustrations/
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
   Segments that need a session (`citas`, `cuenta`, `pagar`) wrap their
   `layout.tsx` in `<RequireSession>`, which shows a skeleton until `/me`
   resolves; `/i` and `/a` load without a session and ask for it inside.
   Authenticated mutations run in the browser through `app/lib/queries`
   (the Firebase token lives there); Server Actions only where no user token
   is needed (the opt-out POST of `/resumen/baja`).
6. **One contract, three consumers.** `app/lib/schemas` holds the zod
   schemas; `app/lib/data` (server), `app/lib/queries` (client) and
   `tests/msw` all parse with them. No duplicated types.
7. **Domain names are shared with the app** — `appointments`,
   `invitations`, `specialists`, `billing`, `reviews`, `account`, `auth` —
   in module folders, `app/ui/<domain>`, schemas, query keys, i18n keys and
   PostHog events.
8. **Naming.** Folders and files kebab-case (`appointment-card.tsx` exports
   `AppointmentCard`); module groups in English; user-facing URL segments in
   Spanish (`/citas`, `/cuenta`, `/entrar`, `/privacidad`); dynamic params
   in English camelCase (`[specialistId]`).
9. **Lint-enforced boundaries** (`import/no-restricted-paths`): nothing
   imports from a module group except that module; `app/ui` imports only
   `app/lib` and `app/hooks`; `app/lib` imports no React; `app/lib/data` is
   never imported from client files (also guaranteed by `server-only`).
10. **Advanced routing when it improves the experience, never for show:**
    intercepting + parallel routes for a URL-addressable sheet (for example
    `a/[appointmentId]/(.)cancelar`), `template.tsx` for per-navigation
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
- **Authenticated flows** (`/i`, `/a`, `/citas`, `/cuenta`, payment):
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
  `/citas`, `/cuenta`, payment) are `noindex, nofollow`.
- Loading states are **skeletons with the final dimensions** (`loading.tsx`
  or Suspense boundaries), never spinners in the middle of empty space.
  Consequence to know: a page under a `loading.tsx` streams, so a
  `notFound()` inside it answers **200 + `noindex`** with the not-found UI
  (Next.js docs, not-found.md); only bots that cannot run JavaScript get a
  real 404 (their metadata blocks). A real 404 needs the route not to match
  or a check in `proxy.ts`. Every page sits under the root `loading.tsx`.
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
  facet when both exist. Guard by facet, not only by `role`.
- Public endpoints used by SSR: `GET /specialists/{id}/public-profile`,
  `GET /specialties/tree`. Everything about an appointment or an invitation
  needs a session, except reading an invitation by its token (the token is
  the credential).
- Error envelope: `{ code: 'ERR_xxxx', message, details? }`. Map to a typed
  `ApiError`; translate known codes to our copy (e.g. `ERR_2010` registration
  incomplete, `ERR_5052` subscription required, billing `ERR_50xx/51xx`);
  unknown codes get a generic message **and** a Sentry event with method,
  path, status and code — never the body.
- **Retry policy** (mirror of the app): GET/PUT/PATCH retry twice with
  backoff on timeouts, network errors, 408, 429 and 5xx; POST/DELETE retry
  only when the request never reached the server. A POST/DELETE that went
  out and got no answer is an **uncertain outcome**: writes that must not
  land twice (claim, confirm, cancel, reschedule, review, report payment,
  subscribe) go through a write-once guard that looks for what the write
  would have left before re-sending.
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
  `DELETE /identity/me` (REDOC-352), daily-summary opt-out endpoints.

---

## 6. Routes shared with the mobile app: deep links, bridges and `.well-known`

The app and the web share one public URL space on `redoctorapp.com`. The
app declares these paths as App Links (Android) and Universal Links (iOS);
when the app is installed, tapping them opens the app; when it is not, they
open **this web**, which must render something useful.

### Paths owned by both (the app opens them when installed)

| Path | Who | On the web |
| --- | --- | --- |
| `/s/{specialistId}` | public | Full read-only profile (M8) + "Abrir en la app" |
| `/i/{token}` | patient | Full invitation experience (M4) + "Abrir en la app" |
| `/a/{appointmentId}` | patient (and specialist in the app) | Full appointment experience (M5) + "Abrir en la app" |
| `/suscripcion` | specialist | Bridge only: the app handles it. Never render billing here |
| `/home/*` | app internals | Bridge to the home / store; not a web route |
| `/agenda`, `/agenda/{YYYY-MM-DD}`, `/especialidades`, `/perfil` | specialist (app v0.161.0, same session and role rules as `/suscripcion`) | Bridge only: "Abrir en la app" with the same path (`redoctor://redoctorapp.com/agenda/2026-10-08`); a malformed date opens today in the app |

Reserved for the app's internal paths: `/home`. Patient web routes
therefore live under `/citas` and `/cuenta`, never under those segments.

### The payment route is NOT an app path

The specialist pays on the web (M13). Its route (**name pending**, e.g.
`/pagar`) must **never** appear in the AASA, in `assetlinks.json` or in the
app's manifest, and the app never links to it — Apple's rules in Venezuela
forbid the app from pointing to an external purchase. The billing emails
offer it only when the API's `webPaymentUrl` has a value.

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
          { "/": "/suscripcion" },
          { "/": "/home/*" },
          { "/": "/agenda" },
          { "/": "/agenda/*" },
          { "/": "/especialidades" },
          { "/": "/perfil" }
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
specialist bridge path needs the AASA updated **and** Apple's CDN to pick it
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

### Domain cutover (M12)

`redoctorapp.com` currently points to the Vite prototype on Vercel, which
serves the `.well-known` files and static bridge pages. The day DNS moves to
this project, those files and the bridge paths must already answer
identically here — run the e2e `.well-known` test against the preview URL
before switching.

### Auth return URL

Firebase Auth's `authDomain` should be `redoctorapp.com`, with
`/__/auth/*` proxied to `redoctor-3acf8.firebaseapp.com` in
`next.config.ts` (Firebase's recommended setup for `signInWithRedirect`
under Safari's tracking protection). Register
`https://redoctorapp.com/__/auth/handler` in the Google OAuth client and in
the Apple Services ID. Inside in-app browsers that block OAuth, show the
"open in Chrome/Safari" steps (§1) instead of attempting the redirect.

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

- Radii: `sm` 8 (alerts), `md` 10 (inputs, 40 px tall), `lg` 12 (compact
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
   (`if (isPending) return`). A greyed-out button reads as broken.
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
   Urbanist draws the ordinal «º» as «o»: write «N.°».
8. **Sheets and dialogs** go through one `Sheet` primitive: bottom sheet on
   mobile, centered dialog on desktop, drag-to-close, keyboard-safe height,
   primary action always visible. One sheet at a time; a sheet that opens
   another pushes inside the same sheet instead of stacking.
9. **Empty, error and loading states** are first-class components
   (`EmptyState`, `ErrorState`, `Skeleton`), never ad-hoc text.
10. **Performance budgets** (checked in CI with Lighthouse on the preview):
    LCP ≤ 2.5 s and INP ≤ 200 ms on a mid-range phone over 4G, CLS ≤ 0.05,
    ≤ 150 KB gzipped JS on public pages, images through `next/image`,
    fonts preloaded, no client-side data fetching on public pages.
    Measured on 2026-10-07 (module scripts, gzip, analytics off): `/` 198 KB,
    `/s/{id}` 225 KB, bridges 208 KB, of which React 19 + Next.js 16 are
    ≈140 KB. Sentry adds ≈54 KB and PostHog ≈52 KB where they are on. The JS
    budget is a warning in `lighthouserc.cjs` until it is decided (§13).

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
- **Session** (`app/providers.tsx`, `app/hooks/use-session.ts`, and
  `<RequireSession>` from `app/ui/auth` in the layout of each segment that
  needs it): Firebase `onIdTokenChanged`, token kept in
  memory, `/me` resolved **before** the first paint of any authenticated
  route (a route-level pending state; never a flash of the wrong UI), facet
  and role guards, "return to where you were" through a same-origin
  `redirect` query only. Sign-out clears Query cache and PostHog identity.
- **i18n**: next-intl, locale `es`, messages in
  `app/lib/i18n/messages/es.json` with **dot keys that mirror the app's
  `assets/translations/es.json`** (e.g. `appointments.confirm.title`) so
  copy can be shared with the app. Dates and numbers through `Intl` with
  `es-VE` and `America/Caracas`. No string literal reaches the user.
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
  majors wait for approval). Background servers started by hand (`next
  start`) must be stopped: Playwright reuses whatever listens on :3000.
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
  (allow Firebase Auth, PostHog, Sentry, Google Fonts), and in
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
| `NEXT_PUBLIC_PAYMENT_PATH` | all | `/pagar` until the final name is decided (§13) |
| `API_PROXY_TARGET` | development only | Dev-only proxy for authenticated calls until CORS (REDOC-362); must be absent in preview/production. Without it, `next dev` proxies to `NEXT_PUBLIC_API_URL` |
| `VERCEL_AUTOMATION_BYPASS_SECRET` | GitHub Actions secret | Only if previews have Deployment Protection: Playwright and Lighthouse use it for one request and browse with Vercel's cookie |
| `PLAYWRIGHT_BASE_URL` · `E2E_SPECIALIST_ID` | testing | Run the e2e suite against a deployed URL; the public profile the e2e and Lighthouse runs use (api-dev's test profile by default) |

`.env.example` lists every variable with a comment; `.env*.local` are
git-ignored. Vercel holds the preview/production values. Client components
read public values from `app/lib/public-env.ts` (each `process.env.NEXT_PUBLIC_*`
written out in full, or Next.js does not inline it).

---

## 13. Open decisions — ask, don't assume

1. The payment route's final name (`/pagar` or other) and whether changing
   plan and cancelling enter M13.
2. The page background: `#FDFDFD` (token) vs `#FBF8FF` (what the app paints).
3. PostHog event list and funnel definition (M12).
4. Patient screens design (Figma) — the designer is working on them; the
   landing design and copy are hers too («Landing de Redoctor» doc).
5. When REDOC-362 (CORS, pilot environment) and REDOC-357 (configuration
   endpoint) ship; until then the dev-only proxy and the provisional
   constants stay isolated.
6. Legal texts (privacy, terms, account deletion) — from the lawyer; the
   pages exist with placeholders marked as such, never with invented text.
7. Store ids — empty until the apps are published.
8. The JS budget of §8.10: 150 KB gzip is below what React 19 + Next.js 16
   weigh on their own (≈140 KB); today's public pages ship 198–225 KB.
   Decide the budget (and whether Sentry and PostHog count) before M12.
9. The Android `intent://` scheme: `https` (§6 text) or `redoctor` (what the
   prototype shipped and the port does).
10. The daily-summary opt-out link: the web serves `/resumen/baja?token=…`;
    the API's email must use that exact format (to confirm with Heyscar).
11. Figma vs this file: the Snackbar is filled with color (blue, green, red,
    yellow, dark grey with white text) while our Toast is a light card; the
    «secondary» button is blue outline in Figma and green in §8.

### Decided (2026-10-08)

- **Stars color:** `warning-500`. The app's `#F9BF24` stays out of
  `tokens.css`.
- **iOS and the specialist bridges:** no change to the prototype. The
  domain moves to this web as soon as possible, and this web must be ready
  for it (§6 "Domain cutover"). Until then iPhones open `/agenda`,
  `/especialidades` and `/perfil` in the old web.
- **Unknown ids under a valid route answer 200 + `noindex`:** accepted for
  now (see Improvements).
- **First steps are development:** Vercel, Sentry, PostHog, the GitHub
  secret and Renovate wait until the web works in development.
- **The landing (M9) follows the middle mockup of Figma «LANDING PAGE»**
  (`4464:341`), copy included, over the landing doc's copy; the bar stays
  as designed for now. No mobile design exists: the phone layout is ours.
  Where the mockup and the tokens disagree, the tokens won and the gap is
  listed here for the owner: radius 80 → `2xl` (30), 25 → `xl` (20),
  15 → `lg` (12); the 80 px hero line got its own token (`display-xl`);
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

### Improvements noted (not scheduled)

- A real 404 for unknown profiles and paths (§4): a check in `proxy.ts`, or
  routes that do not match.
- The home page fades its whole content in, so Chrome never records a
  contentful paint and Lighthouse fails it (`NO_FCP`). Solve it together
  with the splash-like loading animation planned for the web: content
  that arrives with the page must paint at once.
- The root `loading.tsx` costs every page a skeleton flash: the CSP nonce
  makes each page dynamic, so Next streams it behind that skeleton and
  React reveals the content a few hundred ms after the HTML has arrived —
  on `/` too, where there is nothing to wait for (seen 2026-10-08 in the
  e2e screencast, Chromium). Proposed: drop the root loading state and
  keep the per-module ones (`s/[specialistId]/loading.tsx`); without a
  boundary above the page, `notFound()` would also answer a real 404
  (§4). The e2e audit waits for the `main` landmark meanwhile.

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
