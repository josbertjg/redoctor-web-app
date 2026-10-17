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

### Scope of the web MVP (modules M1–M15)

| Module | What it is |
| --- | --- |
| M1 Foundations | Project, brand, environments, typed API client, error translation, `.well-known`, observability |
| M2 Session | Google and Apple sign-in, `/me`, role guards (patient and specialist), return to the link after login, re-entry in 1–2 taps from another browser |
| M3 Sign-up | Patients only (a specialist signs up in the app). One screen, prefilled with the invitation data |
| M4 Invitation `/i/{token}` | All states, claim for yourself or for a third party, ID-document warnings, confirm in the same step when < 24 h |
| M5 Appointment `/a/{id}` | Confirm (from 24 h before), cancel, reschedule, directions, add to calendar |
| M6 My appointments `/appointments` | Upcoming, past, pending reviews |
| M7 Review | Stars, comment, "your review is public / anonymous by default" notice |
| M8 Public profile `/s/{id}` | Read-only: photo, verified specialties, offices with directions, service prices, rating and reviews, and «Agendar cita» toward the booking (M15). Found by search engines (2026-10-14): the sitemap lists every profile, each page carries its schema.org data and a title and description built from the profile, and an unknown id is a real 404 |
| M9 Landing | Designed by the designer; copy in the doc «Landing de Redoctor» |
| M10 Legal and account | `/terms`, `/privacy` and `/delete-account` (2026-10-14): the terms of use, the privacy policy and how to have an account deleted, drafted from what the web and the app do, as the base the lawyer reviews (the owner's word); the company's identification is a placeholder until he fills it (§13) |
| M11 Bridges | `/home/*` (pages that only open the app) and `/daily-summary/unsubscribe` (daily-summary email opt-out); `/panel/subscription`, `/panel/agenda`, `/panel/specialties` and `/panel/profile` were bridges until M14 made them pages |
| M13 Specialist payment | `/panel/subscription` («Mi suscripción»: the plan, its state and its notice) and `/pay` (the payment, out of the paths the app opens, since no app may charge; the owner's split of 2026-10-13): choose a plan with a coupon, Pago Móvil and transfer data in Bs from the API, report the payment, see it in review; changing plan — from «Mi suscripción» (`?view=plans`) or from a missing feature's invitation (`?plan=`) — and undoing a scheduled change (2026-10-13); and the rest of the app's «Mi suscripción» the same day (§13, Decided): cancelling and resuming, dropping an unpaid subscription, a coupon on the plan in force, the billing data, the receipts (`/panel/subscription/invoices[/{id}]`, each one payable from its page), the balance (`/panel/subscription/balance`) and «Mis cupones» (`/panel/subscription/coupons`) |
| M14 Specialist panel | `/panel` and its sections (2026-10-13): the home (the plan and its notice, today's patients, the statistics, what stays in the app), the day's agenda `/panel/agenda[/{date}]` and the history `/panel/appointments` (read only, each appointment opening `/a/{id}`), the statistics `/panel/reports` (the app's summary and four reports, PDF and CSV when the plan allows), «Mi perfil» `/panel/profile` (whether patients find the profile and, if not, why; the profile as the app shows it to its owner) and «Mis especialidades» `/panel/specialties` (each specialty and its review), both read only, the subscription (M13); a specialist stays in it until signing out |
| M15 Booking | `/book/{specialistId}` (the owner's «vamos con el agendar desde /s», 2026-10-13; built 2026-10-14): a patient books with the specialist of a public profile in the app's four steps — the office, the day and hour, the reason and for whom (oneself, someone in one's care, someone new), the summary — and «¡Todo listo!»; the appointment is born pending and is confirmed on `/a/{id}` from 24 h before. The web's own page, out of `/s/*` (§6) |
| M16 Search | `/search` (the owner's word, 2026-10-14: «darle vida a esa barra de búsqueda», with ZocDoc, Doctoralia and Webel as the references): the landing's search box live — a specialty of the catalog or a specialist's name offered as one types, the place («Usar mi ubicación», a Google place or one of the built-in cities, or the whole country) — and the results as patients know them: the cards (photo, name with the verified mark, specialties, rating, nearest office and how far, lowest price, the next days, each one a way into the booking), the app's filters (availability, distance), a Google map of the offices with «Buscar en esta zona», ten at a time. The web's own page, listed by no app (§6); public, the session asked for where the booking starts |
| M17 Notifications | The bell on every page with a session (the owner's word, 2026-10-14, «sumamente importante»): the unread count, the inbox as a menu that unfolds from it (the app's: read, read all, delete, empty), the API's live channel (Socket.IO) that brings each notice as it is born — a banner, the count, and what the notice leaves stale read again, as the app's `NotificationEffects` —, and the web push through a service worker of ours for when no tab is in view, offered from the menu and only with the VAPID key. No sound on the web |
| M12 Release | PostHog funnel by origin, tests on real phones from WhatsApp and Gmail, domain cutover |

**Explicitly out of the pilot:** favorites, and acting on appointments from
the specialist's panel (it reads them; the app changes them). They come
after. Booking from a profile (M15), searching from the web (M16) and the
notifications (M17, the inbox included) came on the owner's word
(2026-10-13 and 2026-10-14).

### Non-negotiable product rules (decided with Josbert)

- The web is **the mirror of the app** in what matters: same quality bar,
  same domain language (entities, names, rules), foundations built for every
  role — even though today it only serves the patient flows and the
  specialist's panel. It is **not** a copy of the app's folder tree: the
  web follows Next.js conventions (§3). No "pilot-only" shortcuts in anything
  that will be base; something temporary lives inside its route segment or
  module and can be removed without touching the rest.
- **Every link, three ways (owner, 2026-10-13).** On a phone with the app,
  a Redoctor link opens the app. On a phone without it, this web is not only
  the bridge but the mirror: it shows what the app would show there and lets
  the person do what the app lets them do (confirm, reschedule, cancel,
  rate, pay…). On a computer, the web is where it gets done. That is the
  target for every link of §6; a page that only says «open the app» falls
  short of it.
- **A feature the plan lacks invites to a plan that has it (owner,
  2026-10-13).** The web may sell — charging on the web is allowed and
  wanted —; neither app may (the stores forbid it, on Android as on iOS).
  So wherever the web meets a limit of the plan (downloading the
  statistics; the offices at the plan's cap on «Mi perfil»), it names
  the plan that includes it, with its price, and leads to it: the change
  to it, the plans with it chosen, or the receipt owed first. Never
  support instead.
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
  A **specialist** lands on `/panel`, their panel (M14). An **admin** gets
  the same page with a note that their tools are in the app.
- **A specialist stays in the panel until signing out (owner,
  2026-10-13).** The landing reads as an offer to book, which a specialist
  cannot: a browser whose session is a specialist's (or an admin's) carries
  the panel hint (§9), so the server sends `/` to `/panel` before painting
  it; the patients' «Mis citas» sends a specialist there too, unless the
  account is also a patient's. Links still open, since a link never breaks
  (`/a` read only, `/i`, `/s`, the panel's paths, the opt-out, the legal
  pages), and none of them offers booking: on their own profile a
  specialist reads «Así ven tu perfil tus pacientes». Signing in from a
  link goes back to it; from anywhere else, to the panel. Only «Cerrar
  sesión» leaves.
- Public profile `/s/{id}` offers «Agendar cita» (M15, the owner's word
  of 2026-10-13): the booking happens on `/book/{id}`, the web's own
  page, with the patient's session; a specialist is never offered it.
- **Searching needs no account (owner, 2026-10-14).** The box and
  `/search` answer anyone, as ZocDoc and Doctoralia do; the session is
  asked for where the booking starts. The address carries what is looked
  for — a text, or a specialty of the catalog —, the point searched from,
  rounded to about a kilometre, and the filters; never who is searching
  (§11). A search is not indexed (its address says what someone looked
  for and from where).
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
| Auth | **Firebase Web SDK 13** (Auth and Cloud Messaging) | Google + Apple providers; project `redoctor-3acf8` (shared with the app). Auth loads only where it has something to say: with the session hint, or where a page offers to sign in (§9). Cloud Messaging only for the notifications' web push (M17), loaded on demand with a signed-in page and the VAPID key |
| Realtime | **socket.io-client 4** | The API's notifications channel is Socket.IO (`/ws/notifications`, M17). Loaded on demand with a signed-in page (≈13 KB gzip, never on the landing); the reconnection is ours, with a fresh ID token per attempt (`app/lib/notifications/socket.ts`) |
| Analytics | **PostHog** (`posthog-js`, slim build without external scripts) | Funnel by `origin`; no personal data (§11); off while the key is empty |
| Errors | **Sentry** (`@sentry/nextjs` 11) | `dataCollection` all off (v11's successor of `sendDefaultPii: false`); same privacy rules as the app; off while the DSN is empty |
| Icons | **Material Symbols Rounded** as inline SVG per icon (`@material-symbols/svg-400`) | Same family as the app; only the icons in use ship — never the variable icon font (several MB) |
| Font | **Urbanist** via `next/font/google` | Weights 300–700, `display: swap`, exposed as `--font-urbanist` |
| Animation | **Motion** (`framer-motion` 14, the library behind the `motion` wrapper) | One door, `app/ui/motion` (§8.11): `MotionProvider` loads the features after the first render, `m`, the hooks, timings read from `tokens.css`, `StaggeredText`. Nothing imports `framer-motion` elsewhere (lint). `framer-motion` and not `motion`: the wrapper's `export *` barrel defeats Turbopack's tree shaking (40 KB in the initial JS instead of 10, measured). CSS keeps hover, accordion and menu; the marquee rolls by CSS until JavaScript takes it over to be dragged. Changing page: React's `<ViewTransition>` (19.3, in Next 16.4) and CSS, no library (§8.13) |
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
  (appointments)/                     # module: appointments (M5, M6, M7) and booking (M15)
    layout.tsx · error.tsx            #   the bar with the account; the error under it
    a/[appointmentId]/page.tsx        #   /a/{id} — read in the browser with the patient's session
    appointments/layout.tsx · page.tsx · loading.tsx      # /appointments (M6, M7) — layout = <RequireSession facet="patient">
    book/[specialistId]/page.tsx · not-found.tsx   # /book/{id} (M15) — the profile and the catalog read on the server, the steps in the browser; an unknown profile is a real 404
    _components/                      #   appointment-flow, -view, -actions, -record; cancel-sheet, reschedule-sheet, month-calendar, slot-picker (+ slot-choices, load-failure: the reschedule's and the booking's day and hour), calendar-menu; appointments-flow, -list, -skeleton; review-wall, review-form; booking/ (the flow and its notices, the four steps, the summary, «¡Todo listo!»)
  (specialists)/                      # module: public profile (M8) and the specialist's panel (M2, M14)
    s/[specialistId]/page.tsx · not-found.tsx · opengraph-image.tsx   # /s/{id} — the profile read before anything goes out (no loading.tsx), so an unknown id is a real 404; its schema.org data and its words for search engines (_components/profile-metadata.ts)
    panel/layout.tsx · page.tsx · error.tsx   # /panel — layout = <PanelFrame> (the bar, the sections, <RequireSession facet="specialist">); no loading.tsx, so a notFound() is a real 404
    panel/agenda/page.tsx · [date]/page.tsx   # /panel/agenda (today), /panel/agenda/{YYYY-MM-DD} (email 10); deeper paths match nothing: 404
    panel/appointments/page.tsx       #   the history, its filters in the address
    panel/reports/page.tsx            #   the statistics
    panel/profile/page.tsx · specialties/page.tsx   # «Mi perfil» and «Mis especialidades», read only (emails 18 and 16)
  (search)/                           # module: the search for specialists (M16)
    search/page.tsx · error.tsx       #   /search — the search in the address, the first page read on the server, the rest in the browser
    _components/                      #   search-header (+ -header-bar), search-navigation (the address as the one state, the pending line), search-results, result-card, availability-strip, search-filters, map-panel, results-map, map-markers, results-states
    _components/                      #   profile pieces; panel-*, agenda-*, appointments-history, booking-action and book-at-office (the profile's «Agendar cita», `useBookingOffer`), edit-in-app-card, plan-offer-card; reports/ (the statistics' views, charts, filters, export and the plan that downloads); my-profile/ (the view, its state, identity, offices, prices, schedules and training blocks); my-specialties/ (the view, the specialty card, support)
  (account)/                          # module: legal and account (M10)
    layout.tsx                        #   the bar with the account over the legal pages
    terms/page.tsx · privacy/page.tsx · delete-account/page.tsx   # /terms, /privacy, /delete-account — public, indexed; every word in the catalog (`legal.*`)
    _components/legal-document.tsx    #   a document: title and date, intro, contents, sections (rich messages: paragraphs, lists, links to the other pages, the email, the support WhatsApp)
    _data/legal-sections.ts           #   each document's sections, in order
    (account/page.tsx, /account, is not built: the account's own page waits for the API's deletion endpoint, REDOC-352)
  (billing)/                          # module: specialist payment (M13)
    layout.tsx · error.tsx            #   <PanelFrame width="narrow"> around every page below, kept as the person moves between them; the error inside it
    panel/subscription/page.tsx       #   /panel/subscription — «Mi suscripción»
    panel/subscription/invoices/page.tsx · [invoiceId]/page.tsx   # the receipts (`?status=`) and a receipt
    panel/subscription/balance/page.tsx · coupons/page.tsx        # the balance; «Mis cupones»
    pay/page.tsx                      #   /pay[?plan=|?view=plans|?invoice=] — the payment, the plans and the change of plan; out of `/panel/`, listed by no app (§6)
    _components/                      #   subscription-flow, subscription-view (+ entitlements-card, subscription-sections, subscription-action-sheet, apply-coupon-sheet, billing-account-sheet, collapse), subscription-load-error, invoices-flow, invoice-flow, invoice-card, balance-flow, balance-pieces, coupons-flow, coupon-pieces, paged-list-foot, list-notice, section-header, pay-flow, plans-view, plan-benefits, change-plan-view, pay-view, method-step, payment-step, payment-totals, coupon-sheet, bank-picker, different-amount-sheet, payment-done, copy-button, detail-list, pay-skeleton
  (bridges)/                          # module: pages that only open the app, noindex (M11)
    layout.tsx
    home/[[...rest]]/                 #   the app's internal paths; every page under /panel/ is the panel's own (M13, M14)
    daily-summary/unsubscribe/page.tsx   # daily-summary opt-out — a Server Action
  api/                                # route handlers only when the browser must not call the API
    search/route.ts · suggestions/route.ts   # the web's own search (M16): the API's public search through the web's server, cached (§4)
    places/suggestions/route.ts · details/route.ts   # Google Places through the web's server (M16): the places a text names, Venezuela only, and the point of the one chosen; the key stays here (§11)
  ui/                                 # ALL shared UI
    button.tsx · back-link.tsx · text-field.tsx · identity-document-field.tsx · select-field.tsx · text-area.tsx · checkbox.tsx · choice-cards.tsx · stars-input.tsx · tabs.tsx · filter-chips.tsx · field-error.tsx · sheet.tsx · skeleton.tsx · toast.tsx · empty-state.tsx · status-card.tsx · link-card.tsx · avatar.tsx · count-badge.tsx · fading-edges.ts (the faded sides of a row that scrolls) …
    messages-scope.tsx                #   a page's own client messages (§9)
    layout/                           #   site-header, page-frame (a page's column and its main, in the guarded layouts), panel-frame and panel-nav (the specialist's panel around each section), bottom-actions
    auth/                             #   session-provider, session-button (+ account-menu, loaded for a signed-in person only, and account-item), session-controls (the bell and the account, for a bar), require-session, sign-in-buttons, use-sign-in-arrival (an in-place sign-in under the blue wipe), sign-in-legal-note, account-error-state, in-app-browser-help, provider-logos
    notifications/                    #   the notifications (M17): notifications-provider (the inbox, the live channel, the effects, the push), notifications-bell (nothing for a stranger; bell-popover, the count and the menu from it, loads for a signed-in person), notifications-menu (+ -menu-skeleton), notification-banner (a live notice over the page, on the Toaster), notification-tone (icon and colour by family), use-push (the web push in this browser)
    app-bridge/                       #   open-in-app-button, store-badges, app-access (a specialist's way to the app), store-qr
    appointments/ · specialists/ · billing/ · reviews/   # domain components used by two or more modules (appointments/: headline, details, appointment-card; billing/: notice-panel, plan-emblem)
    search/                           #   the search box (M16), on the landing and on /search: search-bar (+ what-field, where-field, suggestion-popup, highlight, use-combobox, use-location-suggestions — Google's places —, use-remembered), its words from the server (search-bar-words)
    analytics/ · og/ · seo/           #   link-origin-tracker; the Open Graph brand card (next/og); the JSON-LD data block a page carries for search engines
    motion/                           #   the one door to Motion: provider, m, tokens, staggered-text (§8.11); the page transitions (§8.13): view-transitions (server-safe), page-transitions.css, directions, skeleton-hold, screen-wipe, navigation-progress (+ navigation-events)
    icons.tsx                         #   the Icon primitive (not icon.tsx: that name is a Next.js metadata file)
    fonts.ts · tokens.css · globals.css
  lib/                                # ALL non-React logic
    api/                              #   client.ts (fetch wrapper), errors.ts (ApiError + codes), retry.ts, write-once.ts
    schemas/                          #   zod schemas + inferred types per domain — THE contract with the API
    data/                             #   server-only fetchers for Server Components (fetch + cache tags → DTOs); places.ts asks Google Places for the search's places (M16); plans.ts reads the landing's plans with no session and remembers a refusal (M9); public-profiles.ts lists every public profile for the sitemap through the public search, a day at a time (M8)
    queries/                          #   TanStack queryOptions + mutation functions per domain (client)
    actions/                          #   Server Actions — only where no user token is needed
    firebase/                         #   client.ts: Firebase Auth; messaging.ts: Cloud Messaging for the push (the device token through our own worker); both loaded on demand (client-only)
    notifications/                    #   the inbox's logic (M17): socket.ts (the live channel: Socket.IO, our own reconnection with a fresh token), effects.ts (what a notice leaves stale, the keys to read again, one refresh per target), destination.ts (where a notice leads, by its ids before its kind), inbox.ts (the inbox after each action), time.ts («Hace 5 min»), push.ts (what this browser remembers of the push: device id, registration, heartbeat, «Ahora no»)
    auth/                             #   account (the account's model and rules, no zod), session-hint (the session and panel cookies), last-provider, token (the bearer's source), destination, sign-up (the plan)
    format/                           #   names, phone (+58), identity-document, date-of-birth — the forms' rules; money, appointment-time, dates — prices and billing amounts, days and hours; figures — the statistics' numbers, periods, weekdays and hours; distance — «3,2 km»
    search/                           #   the search's logic (M16): query.ts (the address ↔ the search ↔ the API's request), location.ts (the point, the app's radii), text.ts (matching case and accents aside), suggestions.ts, recent.ts and last-location.ts (what the browser remembers)
    maps/                             #   google-maps.ts: the Maps JavaScript API for the results' map, loaded on demand with the page's nonce (client-only)
    security/                         #   csp.ts (the nonce policy proxy.ts sends), rate-limit.ts (so many a minute per address, for the endpoints that spend Google's quota)
    billing/                          #   banks.ts: the app's list of Venezuelan banks (the API publishes none); plan-benefits.ts: what a plan includes, from its limits (the landing's plans and the payment's)
    seo/                              #   json-ld.ts (a schema.org document, serialized so a person's text cannot close its tag), specialist.ts (a public profile as a Physician or a Dentist: name, photos, specialties, offices, rating)
    reports/                          #   period.ts (the presets, the buckets), figures.ts (trends, the main currency, rankings), csv.ts (the spreadsheet)
    analytics/ · i18n/
    observability/                    #   report.ts (the seam), scrub.ts (what never leaves), sentry.ts
    env.ts · public-env.ts · routes.ts · deep-links.ts · site.ts · support.ts · clipboard.ts · utils.ts · calendar.ts (.ics, Google Calendar)
  hooks/                              # shared client hooks: use-session, use-notifications (the inbox, its count and the push, as the provider keeps them), use-sign-in-tracking, use-focus-heading, use-infinite-scroll, use-link-origin, use-device, use-in-app-browser, use-person-checks (a person's data as the API checks it), use-price-words, use-debounced-value, use-device-location (the position, asked for on a tap), use-fading-edges (which sides of a scrolling row have more beyond them)
tests/                                # env.ts · dom.ts (what jsdom lacks, before React loads) · setup.ts · msw/ (server + handlers per domain) · factories/ · e2e/ (Playwright)
public/                               # .well-known/ (§6) · brand/ (logo.svg, logo-white.svg, icons) · illustrations/ · animations/ (the app's splash_logo.riv) · notifications-sw.js (the push's service worker, plain JavaScript)
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
   Segments that need a session (`appointments`, `account`, `panel`) wrap their
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

- **Public pages** (`/`, `/s/[id]`, `/search`, legal, bridges): **Server
  Components**, `fetch` on the server with `next: { revalidate, tags }`.
  Server-side calls are not subject to CORS, so the public profile and the
  search's first page work today even though the API has not opened CORS
  yet (§5).
- **Authenticated flows** (`/i`, `/a`, `/appointments`, `/account`, the
  booking, payment):
  **Client Components** + TanStack Query, calling the API from the browser
  with the Firebase ID token. These need the API's CORS allow-list
  (REDOC-362). Until it ships, develop against MSW or the dev-only proxy in
  `next.config.ts` (`/api-proxy/* → NEXT_PUBLIC_API_URL`), which **must not
  exist in production builds**.
- **The notifications** (M17) live in the browser with the session: the
  inbox through TanStack Query (`GET /notifications/`, the one read that
  feeds the bell and the menu), the live channel over WebSocket (Socket.IO
  on the API's host; a WebSocket handshake is not subject to CORS, so it
  works today), and the push through a service worker of ours
  (`public/notifications-sw.js`), which shows a notice only while no tab is
  in view. Nothing of this touches the server or the landing's JavaScript:
  the inbox's reader, socket.io-client and Firebase Messaging load with the
  first signed-in page.
- **Route handlers** only for things the browser must not do itself. Two
  cases, both the search's (M16): `/api/search` and `/api/search/suggestions`
  hand the browser the API's public search — the pages after the first, the
  names the box suggests — because the browser cannot call the API (its
  CORS, REDOC-362) and because the web's server caches each search for
  every visitor (the endpoint takes 30 requests a minute from one address,
  and from Vercel every visitor is one): no session, no token, the same
  query the page's address carries, and the API's own answer back, parsed
  with the same contract on both sides; so many a minute per address, each
  endpoint counted apart (one address must not spend the API's minute for
  everyone). And `/api/places/suggestions` and
  `/api/places/details` ask Google Places for the places the box offers
  and the point of the one chosen, so the key stays on the server (§11);
  never cached (each answer belongs to its billing session), so many a
  minute per address (`app/lib/security/rate-limit.ts`). **Server Actions** only for writes that
  carry no user token — the daily-summary opt-out, whose credential is the
  signed token in the link. Every authenticated write runs in the browser:
  the API is the backend and the Firebase token lives there.
- **Metadata** per route with `generateMetadata`. Private pages (`/i`, `/a`,
  `/appointments`, `/account`, `/book`, payment) and a search (`/search`)
  are `noindex, nofollow`. **The sitemap** (`app/sitemap.ts`) lists the
  landing, the legal pages and every public profile the API lists
  (`app/lib/data/public-profiles.ts`), built per request from the Data
  Cache (a day) and never at build time; a public profile carries its
  schema.org data as JSON-LD (`app/lib/seo`, `app/ui/seo`) and a title and
  description built from the profile (§13, Decided 2026-10-14).
- Loading states are **skeletons with the final dimensions** (`loading.tsx`
  or Suspense boundaries), never spinners in the middle of empty space.
  Consequence to know: a page under a `loading.tsx` streams, so a
  `notFound()` inside it answers **200 + `noindex`** with the not-found UI
  (Next.js docs, not-found.md); only bots that cannot run JavaScript get a
  real 404 (their metadata blocks). A real 404 needs the check before the
  first byte: no loading state above the page (the data awaited before
  anything streams), the route not matching, or a check in `proxy.ts`.
  There is **no root `loading.tsx`** (decided 2026-10-08): every page is
  dynamic because of the CSP nonce, and a root skeleton made each one
  flash grey bars for a few hundred ms before React revealed the streamed
  content — on `/` too, with nothing to wait for. A page without a loading
  state of its own renders whole before its HTML goes out. Since
  2026-10-14 `/s/[specialistId]` has none either: the profile is read
  before anything goes out (cached five minutes, the stale copy served
  while it refreshes, so only a profile's first visit waits for the API),
  an unknown id is a real 404, as on `/book/[specialistId]`, and only the
  reviews stream in, under their own Suspense. What still answers 200 for
  an unknown thing cannot do otherwise, and is noindex: `/a`, `/i` and a
  receipt read with the browser's session or token, the agenda's malformed
  date (today, as in the app) and the bridges (`/home/*`).
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
  `GET /specialties/tree`, and `GET /search/specialists` (M16: the
  specialists visible around a point, the first free day first and then
  the nearest, with the nearest office and its next twelve days; it wants
  `lat` and `lng` and one of `search`, `specialtyId`, `name`,
  `specialistId`; `radiusMeters` 100–300 000 or none for the whole country;
  `search` matches specialists' and specialties' names by substring, case
  aside but accents not — «medico» finds no «Médico» —; it takes 30
  requests a minute from one address, measured 2026-10-14). Everything
  about an appointment or an invitation needs a session, except reading an
  invitation by its token (the token is the credential).
- **Notifications (M17), as the app reads them:** the inbox
  `GET /notifications/?limit≤100` (no pagination: `{ notifications,
  unreadCount }`, the count the person's and not the list's),
  `PATCH /notifications/{id}/read` (a 404 for one already gone: the list
  is old), `PATCH /notifications/read-all`, `DELETE /notifications/{id}`
  and `DELETE /notifications/` (both idempotent). The live channel is
  Socket.IO at `${API origin}/ws/notifications` — the API's host, not
  `/api/v1` —, websocket transport, `auth: { token: <ID token> }`, events
  `notification:created` `{ notification, unreadCount? }` and
  `notification:unread` `{ unreadCount }`. Measured on api-dev
  (2026-10-14): the server accepts the connection and only then checks the
  token — a bad or missing one gets an `error` event («Unauthorized…»)
  about 70 ms later and a disconnect by the server, which Socket.IO never
  retries by itself —, so the reconnection is the web's own, with a fresh
  token per attempt (2 s doubling to 60 s). The push registers this
  browser with `POST /notifications/device-tokens` (`platform: WEB`, a
  stable `deviceId`, the browser's name, the web's version), says it is in
  use with `POST /notifications/device-tokens/heartbeat` every 12 h
  (`registered: false` = a sign-out from afar) and leaves with
  `DELETE /notifications/device-tokens` before the session ends. A notice's
  `data` carries `kind` and the ids (`appointmentId`, `billingEventType`);
  the web decides by the ids first, as the app does, so a kind born
  tomorrow still works. `POST /notifications/test` fires a real notice to
  the caller when the API has `NOTIFICATIONS_TEST_ENDPOINT_ENABLED`.
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
  `DELETE /identity/me` (REDOC-352), one checkout with a quote for paying
  and changing plan (REDOC-363/368: the payment's two steps and the
  change of plan get rebuilt on it), and a public listing of the visible
  specialists for the sitemap (ids and `updatedAt`; until then the web
  derives it from the public search, `app/lib/data/public-profiles.ts`,
  §13 Decided 2026-10-14), devices addressed by Firebase Installation ID
  besides the registration token (Firebase 13 deprecates the token on the
  web; the API takes tokens, so the web keeps `getToken`, §13 Decided
  2026-10-14 «Notifications»), and the notifications channel checking the
  token before accepting the connection (today it accepts, then refuses).
  The daily-summary opt-out endpoints
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
| `/s/{specialistId}` | public | The full profile (M8), its «Agendar cita» toward `/book/{id}` (M15, the web's own) and "Abrir en la app" | the app («Compartir perfil»); emails 14 and 17 |
| `/i/{token}` | patient | Full invitation experience (M4); "Abrir en la app" once the app is published (patients have none in the pilot, §13) | the app (the specialist's WhatsApp); the API's `invitationUrl` |
| `/a/{appointmentId}` | patient (and specialist in the app) | Full appointment experience (M5); its specialist reads it, with the patient in full and the way back to the agenda | the app (reminders, confirmation); emails 11–13 and 15 |
| `/panel/subscription` | specialist | «Mi suscripción» (M13): the plan, its state, its notice and the way to pay | billing emails 01–05 and 07–09 (REDOC-356) |
| `/panel/agenda`, `/panel/agenda/{YYYY-MM-DD}` | specialist | The day's agenda (M14), read only; a malformed date is today, as in the app | the daily summary, email 10 (REDOC-359) |
| `/panel/appointments` | specialist | The appointments history (M14); the app opens its «Citas» (since its v0.169.1; an older build, its home) | the panel |
| `/panel/reports` | specialist | The statistics (M14); the app opens its «Estadísticas» (since its v0.169.1; an older build, its home) | the panel |
| `/panel/specialties` | specialist | «Mis especialidades» (M14), read only: each specialty and where its review stands | email 16 (REDOC-360) |
| `/panel/profile` | specialist | «Mi perfil» (M14), read only: whether patients find the profile and, if not, why; the profile as the app shows it to its owner | email 18 (REDOC-360) |
| `/home/*` | app internals | Bridge to the home / store; not a web route | the app's own paths |

The specialist's pages live under `/panel/`, but the app opens only the
ones it shows, **one by one** (the owner, 2026-10-13): the same list in
`universalLinkComponents`, the AASA, `assetlinks.json`'s dynamic rules
(Android 15 and later) and the app's Android manifest (all that Android 14
and older read). The rule:

- **A page of the web's alone is not listed**, under `/panel/` too: it
  opens in the browser, with the app or without it, and needs nothing on
  the app's side. So do `/panel` itself (the web's home of the panel,
  M14) and the receipts, a receipt, the balance and «Mis cupones»
  (`/panel/subscription/invoices[/{id}]`, `/panel/subscription/balance`,
  `/panel/subscription/coupons`, M13), the booking (`/book/{id}`,
  M15: out of `/s/*`, where the app has no booking path, so a shared
  booking link would open the app on a «not found») and the search
  (`/search`, M16; the app claims `/s/*` with the slash, so `/search` is
  not its): no link leaves the web with them, and moving between the
  web's pages never opens the app.
- **A page both have** goes into the app's manifest in the build that
  brings it, and into this list once that build is published: listed
  before, it would open an older build at its home on an iPhone. Then
  Apple's CDN must pick the AASA up (below).
- **The payment (`/pay`) is never listed** (below).

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
AASA lists none of them. One exception, on the owner's word (2026-10-13):
`/panel/subscription/pay`, the payment's address for a few hours
(v0.19.0–v0.22.0) before it went back to `/pay`, answers 404 — no link
that leaves the web ever named it (the emails, REDOC-354, 356 and 357 and
the app say `/pay`; REDOC-357's `webPaymentUrl` refuses any `/panel/`
path; without CORS nobody could pay there).

Reserved for the app's internal paths: `/home`. Patient web routes
therefore live under `/appointments` and `/account`, never under those
segments.

#### Adding or renaming a public link

1. **Web:** the page or bridge and its builder in `app/lib/routes.ts`; a
   renamed path gets its redirect in `next.config.ts`; `robots.ts`; the
   e2e. A page of the web's alone ends here.
2. **App** (`redoctor-mobile-app`), for a page it shows too:
   `AppDeepLinks.resolve` and its test, and the path's line in the Android
   manifest (it lists each page).
3. **Web, once that build of the app is published:** the path in
   `universalLinkComponents`, the AASA and `assetlinks.json`'s dynamic
   rules (a test keeps the three equal), and Apple's CDN checked (below).
4. **API:** the email templates (the app repo's `emails/`, zipped to
   REDOC-354) and any link it builds in code (`invitationUrl`, `url_baja`).
5. **The table above.**
6. **In that order:** a copy of the app from before does not know a new
   path, so the list waits for the build that knows it, and the emails
   switch last.

### The payment page is NOT an app path

The specialist pays on the web (M13) at `/pay`, out of `/panel/` on
purpose (the owner, 2026-10-13, after reviewing the panel with the app's
agent): what is the web's alone, and above all paying, must not hang on
exceptions inside the paths the app claims. Charging on the web is allowed
and wanted; what the stores forbid is an **app** charging, or pointing to
a charge — neither the iOS app nor the Android one may (owner,
2026-10-13). So a link to pay must reach this web even on a phone where
the app is installed, and it does on every system with no exception
anywhere: no AASA, no dynamic rule and no app manifest lists `/pay`, and
unit tests keep it out of `isAppOwnedPath`. (For a few hours the page was
`/panel/subscription/pay`, excluded before a `/panel/*`; Apple's CDN still
served the AASA without that exclusion that evening, so an iPhone with the
app would have opened the app there.)

- **Pending in the app (2026-10-13):** every flavor (dev, staging, prod)
  still sells on Android (`InAppPurchases.android`, set on 2026-10-08 to
  try real payments).

The app never links to the page. The billing emails offer it only when
the API's `webPaymentUrl` has a value (REDOC-357: `https://redoctorapp.com/pay`
once CORS is in production; it refuses any path the app could open).

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
          { "/": "/panel/subscription" },
          { "/": "/panel/agenda" },
          { "/": "/panel/agenda/*" },
          { "/": "/panel/appointments" },
          { "/": "/panel/reports" },
          { "/": "/panel/specialties" },
          { "/": "/panel/profile" },
          { "/": "/home/*" }
        ]
      }
    ]
  }
}
```

`app/lib/deep-links.ts` (`universalLinkComponents`) lists the same
components in the same order, and a unit test fails if the AASA or
`assetlinks.json`'s dynamic rules drift from it. The specialist's lines are
the `/panel/` lines of the app's Android manifest, one each.

`/.well-known/assetlinks.json` — package `com.redoctor.mobileapp`, relation
`delegate_permission/common.handle_all_urls`, and the SHA-256 fingerprints
of every signing certificate (debug, upload key and Play App Signing). Copy
the current file from the previous repo (`redoctor-connect-care/public/
.well-known/`); the source of truth for fingerprints is Play Console → App
signing plus the upload and debug keystores. Since 2026-10-13 its one
statement also carries the dynamic rules of Android 15+ (Google's
"Dynamic App Links"): `relation_extensions` →
`delegate_permission/common.handle_all_urls` →
`dynamic_app_link_components`, the AASA's components in the AASA's order
(`{ "/": "/s/*" }` … `{ "/": "/panel/subscription" }` …), with only the
keys Google documents (`/`, and `exclude` should one ever be needed: no
comments), and one list per site and app. They narrow what the manifest claims and
never widen it; a malformed one makes Android fall back to the manifest.

Rules: Android verifies the domain from `assetlinks.json`; its routes live
in the app's manifest, narrowed on Android 15+ by the dynamic rules; iOS
reads the **routes from the AASA**, so every new path the app opens needs
the AASA updated **and** Apple's CDN to pick it up
(`https://app-site-association.cdn-apple.com/a/v1/redoctorapp.com`) —
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
  analytics or Sentry (Firebase's sign-in window sees it, accepted: §11),
  `noindex`, and the `<meta og:*>` preview is generic
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
    read whole, never mid-count. Changing page is not Motion's: rule 13.

Composites to mirror from the app (names first, then build when a module
needs them): `Button` (primary / secondary / white / error; small / large;
block; loading), `TextField` (40 px, radius 10, shadow sm, animated error
line), `Sheet`, `Card`, `Skeleton`, `Toast` (floating, top, 5 s,
dismissible), `EmptyState`, `Chip` / `FilterChip`, `StateChip` (positive /
accent / neutral / warning / error tones), `Avatar`, `StarsRating`,
`CountBadge`, `TintedNote`, `DetailRow`, `ScrollFadingEdges` (as built:
`useFadingEdges` + `fadingEdgesClass`, on the tabs that scroll and the
search's strip of days).

12. **Images and Vercel's quota (owner, 2026-10-15).** Vercel bills each
    image its optimizer transforms: only our own static images that are
    shown very often (the landing's) go through `next/image`'s optimizer,
    as static imports (hashed, cached for good). A person's photo or any
    uploaded image is always `unoptimized` (`Avatar`, `Gallery`; a Google
    account photo is asked of Google at the size drawn, `sizedPhotoUrl`),
    and SVGs never are (Next skips them). `next.config.ts` holds the line:
    the optimizer takes `/_next/static/media/**` alone (`localPatterns`),
    nothing remote (`remotePatterns: []`) and few widths, so a request for
    any other image answers 400 instead of spending the quota. Before
    adding an image, ask: static and shown very often? Only then optimized.

13. **Page transitions (owner, 2026-10-16): one animation per kind of
    change, and the colour wipe for the big moments.** The browser's View
    Transitions through React's `<ViewTransition>` (React 19.3, in Next
    16.4: Next navigates inside transitions and hands a `<Link
    transitionTypes>` to React); no JavaScript of ours runs them, Motion
    takes no part, and a browser without them changes the page at once.
    All of it lives in `app/ui/motion`: `view-transitions.tsx` (server-safe:
    pages import it), `page-transitions.css` (every rule and every name),
    `directions.ts`, `skeleton-hold.ts`, `screen-wipe.tsx`,
    `navigation-progress.tsx` (+ `navigation-events.ts`); client code
    imports these files directly, never through the Motion barrel. What
    each change gets:
    - **Any page:** `PageTransition` around what the page shows under its
      bars, never the bar: the old page leaves in 150 ms, the new one rises
      14 px into place (400 ms, the entrance curve); the same page with new
      content (a search answered, data arrived) crossfades. The landing
      only fades (`entrance="fade"`): its pieces bring their own entrance.
      **Every new page wraps its content in it** (a `not-found` too).
    - **A layout that wraps its pages in an element** wraps that element
      in `FrameTransition` (as `PageFrame` does with its `<main>`). React
      runs a <ViewTransition>'s enter or exit only when no element of what
      is inserted or removed contains it: a page inside a layout's `<main>`
      cannot leave when the whole layout goes (the panel's and the
      subscription's frames, «Mis citas»), so the frame leaves and arrives
      in its place; between pages of the same frame it stays still. Name
      nothing inside an element that may leave with it expecting an exit.
    - **A step forward or back:** `StepTransition step={…}` around the
      step's title and its content (not its count or progress bar), and
      every change of step through `moveStep('forward' | 'back', change)` —
      a state, or a `pushState` (Next syncs it inside a transition): the
      shared axis, 40 px sideways (the booking, the payment, the sign-up).
      A link that walks a sequence says its way with `transitionTypes=
      {[navForward]}` or `{[navBack]}` (the agenda's days). The browser's
      own back and forward rise, as any page.
    - **One thing on two pages:** `SharedTransition` with the same
      `sharedNames.…` on both, and it travels (a search result's photo and
      name to its profile, and back). A name exists once per page.
    - **The bars hold still:** each kind has its name (`vt-site-header`,
      `vt-site-header-inverse`, `vt-landing-header`, `vt-search-header`,
      the panel's three layers — its surface, the mark that slides to the
      section on screen, the names above it); a bar only one page has
      fades. A new bar takes its own `vt-*` name in page-transitions.css.
    - **Data read in the browser:** `useSkeletonHold(pending)` beside the
      pending check (`if (query.isPending || holding)`), and the skeleton
      crossfades into the content (React waits for a running transition
      first). Whatever watches an element that mounts with the content
      follows the element's mount (a state ref, as `useInfiniteScroll`),
      never only the data. A view that scrolls to its top or focuses its
      heading does it in a layout effect (`useFocusHeading`), before the
      transition captures it.
    - **While the server answers:** a thin line along the top after
      150 ms (`NavigationProgress`, mounted once in app/providers.tsx).
    - **The big moments:** `wipeScreen({ tone, whileCovered })`, the app's
      ScreenWipe — a circle of colour from the control pressed covers the
      screen, the change happens under it (`nextNavigation(ms)` to open
      once a new page lands), and it opens through the same point. Blue
      (`primary`) to sign in or out; green (`success`) for what went well:
      an appointment booked, the sign-up finished, an invitation claimed, a
      payment reported or a plan activated. Once or twice a visit, never
      for an ordinary change, and always after the API said yes: an error
      is said where it happened, never under the colour. **Nothing the
      moment changes reaches the screen before the colour does:** the
      circle starts as a dot on the control pressed, and whatever moves
      there in its first frames reads as a flicker. The control stays busy
      until the page moves on (`loading={mutation.isPending ||
      mutation.isSuccess}` when the success always leads to the wipe); data
      the moment changes is read again inside `whileCovered` (the account
      after a sign-up, the billing after a payment); a session that arrives
      in place is held (`useSignInArrival` returns the session the page
      renders from); the sign-in buttons keep the order and the chip they
      appeared with; the account menu stays open for the colour to cover
      it. The colour is whole while it covers: its mask exists only while
      it opens, the hole's soft edge inside the hole.
    - **Less motion:** the tokens drop every distance and movement and keep
      the fades; no wipe. Safari's own swipe back runs alone (the page's
      transition steps aside, `data-native-transition`), and `<html>`'s
      smooth scroll is off while Next moves to a new page's top
      (`data-scroll-behavior`).
    Timings are tokens (`--duration-page-*`, `--duration-axis`,
    `--duration-morph`, `--duration-wipe-*`, `--ease-exit`, `--ease-enter`,
    `--ease-wipe-*`); the live demo of the ten options the owner chose from
    is in the memory notes.

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
  landing's JS stays without it) and only where it has something to say
  (2026-10-15): at once when the session hint says this browser has a
  session; otherwise the page starts signed out and Firebase loads when a
  page offers to sign in — the sign-in buttons call `prepareSignIn` as they
  appear and wait for `firebaseReady`, so the provider's window still opens
  inside the tap on Safari — or when the hint appears while the page was
  away (a sign-in in another tab). A visitor who never signed in loads none
  of it (on phones and Safari, Firebase's getAuth also opens its sign-in
  frame at start: some 130 KB more). `onIdTokenChanged`, the token never
  stored by the web (`app/lib/auth/token.ts` asks Firebase for a fresh one),
  `/identity/me` through TanStack Query keyed by uid, resolved **before**
  the first paint of any authenticated route (the segment's skeleton; never
  a flash of the wrong UI), facet guards (the facets `toAccount` derives
  from `profiles`, or from `role` and `registrationStatus` when `profiles`
  does not mark one, §5; an admin passes the specialist gate), "return to
  where you were" through a same-origin `redirect` query only — the whole
  address, its query too (the plan a link asks for, a list's filters), but
  never a search box's text nor `?origin=` (`returnPath`, 2026-10-13):
  Firebase's sign-in window receives the sign-in page's address whole (its
  `redirectUrl`), so nothing a person typed rides in it. Signing in
  opens the provider's window (`signInWithPopup`: Safari and iOS are fine
  with it; the redirect flow waits for the `/__/auth/*` proxy of §6).
  Inside Instagram's or Facebook's browser the buttons give way to the
  steps to open the link in Chrome or Safari. A cookie `redoctor-session=1`
  (nothing else in it) tells the server a session is likely, so the bar
  renders a placeholder instead of «Entrar» until Firebase answers. A
  second one, `redoctor-panel=1`, says the session is a specialist's (or an
  admin's), written once `/me` answers and forgotten with the session: the
  landing sends that browser to `/panel` on the server (§1), and the public
  profile holds its booking line until the session is known. The
  last provider used wears «Última vez» and goes first (localStorage).
- **Notifications** (`NotificationsProvider` in `app/ui/notifications`,
  inside the session; `app/hooks/use-notifications.ts`): one query keyed by
  the Firebase uid (`['notifications', 'inbox', uid]`) feeds the bell and
  the menu; the live channel puts each new notice on top of the cached
  inbox and moves the count, the writes move the inbox at once and tell
  the API after (a refusal reads it again, or puts the row back; emptying
  waits for the API). A notice names what it leaves stale
  (`app/lib/notifications/effects.ts`): the appointments (and a
  specialist's statistics), the subscription and the session for a billing
  notice, the session for a profile notice, a patient's pending reviews
  when a consultation ends — invalidated by key prefix, once per target,
  600 ms after the last notice; also for what arrived while the tab was
  hidden, found by reading the inbox again on the way back. The first inbox
  is the past and refreshes nothing. Opening a notice reads it and goes
  where its ids lead (`destination.ts`); the inbox is a menu, never a page,
  and shows no banner while open.
  Sign-out runs first what registered to run before it (`addSignOutTask`,
  four seconds at most, with the reason: the person's, the API's refusal,
  a device revoked from afar) — the push drops its device while the token
  is still valid —, then clears the Query cache, the hint, the PostHog
  identity and Sentry's user — also when Firebase ends the session by
  itself (another tab, a revoked account) or another person signs in. The
  `/me` reader
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
  `web_appointment_confirmed`, `web_search_performed`), with `origin` and
  `role` as properties. **Never** names, emails, phones, IDs, tokens,
  appointment reasons, nor what a search looked for or from where (a
  search says only its kind — a text or a specialty —, the kind of point
  and how many it found). The final event list is closed in M12 before
  building funnels.

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
  (allow Firebase Auth, PostHog, Sentry, Google Fonts, the API over HTTPS
  and over WebSocket — `wss://` of its origin, for the notifications'
  channel — and, only with the VAPID key, Cloud Messaging's registration
  origins; `'wasm-unsafe-eval'`
  so the splash's Rive runtime can compile WebAssembly, never eval — zod
  runs `jitless`, set in `instrumentation-client.ts`, so its own check for
  eval leaves no violation, and an e2e test keeps the public pages at
  zero), and in
  `next.config.ts` HSTS, `frame-ancestors 'none'`,
  `Referrer-Policy: strict-origin-when-cross-origin`, a restrictive
  `Permissions-Policy`.
- No secret ever reaches the browser: only `NEXT_PUBLIC_*` variables are
  public, and the only ones that exist are public by design (Firebase web
  config, PostHog key, Sentry DSN, store ids). Server-only variables are
  validated in `env.ts` and never imported from client code.
- Firebase web API key: restrict it in Google Cloud by HTTP referrer to
  `redoctorapp.com` and the Vercel preview domain. The search's Google
  keys (M16) are two: **Places is asked by the web's server alone**
  (`GOOGLE_PLACES_API_KEY`, never `NEXT_PUBLIC_`: the Place Autocomplete
  and Place Details web services the app calls, Venezuela only; the app's
  key serves for now, on the owner's word of 2026-10-13, to be restricted
  by IP or replaced by one of the web's own before launch), and **the map
  needs a browser key** (`NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`), a **new** key
  restricted by referrer the same way with the Maps JavaScript API — the
  app's key cannot serve: it is restricted to the APIs the app uses, and
  Google refuses it for this one (`ApiTargetBlockedMapError`, measured
  2026-10-14; the map then says «No pudimos cargar el mapa», through
  Google's `gm_authFailure`). Without the Places key the box offers no
  places; without the map key the map stays off; with the map key, and
  only then, the policy lets Google's origins in
  (`app/lib/security/csp.ts`), and the API's script carries the page's
  nonce.
- **A notice's words may name a patient** (its title and body): they go
  to the inbox, the banner and the browser's notification, never to
  analytics, Sentry or a URL; what leaves the page about a notice is its
  id. The push's device token and the push subscription are credentials
  like the ID token: the token travels to the API alone, and the browser
  drops it when the person signs out. The device id is this browser's,
  made once and never sent anywhere but the API.
- **The device's position** is asked for only on a tap («Usar mi
  ubicación»; `Permissions-Policy: geolocation=(self)`), rounded to two
  decimals — about a kilometre — before anything keeps it, and travels
  only in the search's own address and to the API as the search's point.
  What this browser remembers (the last place, the last searches) stays in
  its localStorage.
- **Firebase's sign-in window sees the page's address (accepted, owner,
  2026-10-13).** `signInWithPopup` hands the address of the page it opens
  from, whole, to the auth handler as `redirectUrl`
  (`redoctor-3acf8.firebaseapp.com/__/auth/handler`: Google, for our own
  project, over HTTPS; read in `@firebase/auth`). On `/i/{token}` the
  sign-in buttons are on the invitation's page, so the token goes with it
  (and inside `redirect` on the hop through `/sign-in` or `/sign-up`).
  Nothing of ours records it, and what a person typed never rides along
  (`returnPath`, §9). Keeping it out would mean opening the window from an
  address without the token, inside the tap (Safari blocks a window
  opened later): only if the threat model changes.
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
| `GOOGLE_PLACES_API_KEY` | all (server only) | Google Places for the search's places (M16), asked by the web's server; never `NEXT_PUBLIC_`. The app's key for now (§11). **Empty** = the box offers no places |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | all | The search's map (M16): a browser key of the web's own, restricted by referrer, with the Maps JavaScript API. **Empty** = no map |
| `NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID` | all | Optional: a Cloud map style for the search's map; without one, Google's `DEMO_MAP_ID` (Advanced Markers need one) |
| `NEXT_PUBLIC_FIREBASE_VAPID_KEY` | all | The web push of the notifications (M17): the project's public VAPID key (Firebase Console → Project settings → Cloud Messaging → Web Push certificates). Public by design. **Empty** = no push; the bell, the inbox and the live channel work all the same |
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
5. Legal texts (privacy, terms, account deletion) — the lawyer's review of
   the drafts of 2026-10-14 (Decided, «The legal pages (M10) as drafted»):
   the company's identification (`legal.entity`), the citations, the
   figures chosen as defaults and the fiscal-invoice line. The pages show
   the drafts meanwhile; the identification stays a bracketed placeholder
   until the owner fills it.
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
- **Unknown ids under a valid route answer 200 + `noindex`:** accepted
  then. Since 2026-10-14 an unknown profile is a real 404 (§4; Decided,
  2026-10-14, «The profiles' SEO and the real 404»).
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
  new `shape="soft"`. Sample data
  on that day: specialties, plans and prices (the mockup's; the doc keeps
  prices off the landing while the app links here, §6), the footer
  channels (REDOC-357), the plans' one-line descriptions (not in the
  mockup); and «Entrar», «Comenzar», «Seleccionar plan», the search and
  the chips visual until their modules existed. Since 2026-10-14 the
  search and the chips (M16), the plans and «Comenzar» (Decided,
  2026-10-14) are live; the footer channels still wait for REDOC-357.
  Two sections are deliberately smaller than the mockup
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
  (`landing.hero.search.barLabel`). Its specialty field hints «Especialidad»
  alone (2026-10-13; the hero's whole hint, 238 px, was cut at every width:
  the field is 99 px on a 360 px phone, 104 at 1024, 232 at 1280), and its
  36 px search button answers taps on the pill's full 44 px.
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

- **The payment (M13) as built (2026-10-12; split into `/panel/subscription`
  and the payment on 2026-10-13, M14, the payment at `/pay` again the same
  evening):** `/pay` (the owner's name;
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
  (2026-10-12):** cancelling and resuming, abandoning an unpaid
  subscription, the receipts' history, «Saldo a favor», «Mis cupones»
  (saving and listing) and «Datos de cobro»; no email sends anyone to the
  web for them. Changing plan and undoing a scheduled change came to the
  web on 2026-10-13 (M14), and all the rest the same day («The rest of
  the payment», below). With M13 the billing copy entered `es.json` under
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

- **The specialist's panel (M14) as built (2026-10-13, the owner's «panel
  completo»):** his old four cards — the appointments with each one's
  detail, the subscription's state, paying it, the reports — in one panel
  that a specialist lands on and stays in until signing out (§1), with the
  app's sections as its navigation: Inicio, Citas, Estadísticas,
  Suscripción (`PanelFrame`, `PanelNav`; an admin's account without the
  specialist facet has the home only). Charging on the web is allowed and
  wanted (owner, same day); only the app may not charge.
  - **Home (`/panel`):** «Hola, {name}»; the subscription's notice first,
    as the app's home puts it, then the plan with «Ver mi suscripción», or
    «¡Llega a más pacientes desde hoy!» with the plans; today's patients
    (the cancelled ones do not count) and the next appointment still
    ahead; the statistics; and «En la app» (specialties and profile, still
    bridges, and what only the app does: booking, offices, hours).
  - **Citas:** the day's agenda (`/panel/agenda[/{date}]`, email 10's «Ver
    mi agenda»): the day in words, the days before and after, «Volver a
    hoy», the tally («4 citas · 1 atendida · 1 cancelada») and the
    appointments by the hour; and the history (`/panel/appointments`, the
    app's «Más recientes»): the latest first, grouped by day, with the
    app's search box (name, document, phone or email, after a pause), its
    status chips, two dates and the office when there are two or more, all
    in the address. Every card names the patient and their document and
    opens `/a/{id}`, which shows the specialist the patient in full and
    «Volver a mi agenda»; acting on an appointment stays in the app. The
    agenda reads every page of `GET /scheduling/specialist/appointments`
    (100 a page, 10 at most), as the app does.
  - **Estadísticas (`/panel/reports`):** the app's tab and its four reports
    as five tabs — Resumen (attended of the total, estimated income in the
    currency with the most appointments, rating or the all-time one, new
    patients; how the appointments ended; the busiest hours; the top
    reasons), Citas (the four counts, their evolution, who cancelled, the
    patients, the week's hours, the offices), Ingresos (one block per
    currency, never added together), Reseñas, Motivos — each figure against
    the period of the same length before, from one `GET /reports/specialist`.
    The app's periods (this month by default; up to 366 days, never past
    today) and the office live in the address. «Descargar» is gated by the
    plan's `canExport`, as in the app: a PDF through the browser's print
    of every section, a CSV built here (semicolons and a byte-order mark,
    for Excel in Spanish). Without it the sheet invites to the plan that
    has it (§1, the owner's rule of the same day) where the app offers
    support: the cheapest plan with downloads above the current one, its
    price and «Mejorar plan»; the plans with it chosen («Ver planes») to
    someone without one; «Pagar ahora» when a receipt is owed first; a
    word when a cancelled plan is running out (`featureOffer`, the app's
    office-limit words). Drawn with boxes, no chart library; each drawing
    carries its table for screen readers.
  - **Suscripción:** «Mi suscripción» at `/panel/subscription` and the
    payment apart (the owner's split; at `/pay`, out of the app's paths,
    since the same evening, below): the payment page starts where the plan
    stands — the plans without one, the receipt owed when there is one,
    «Tu plan está al día» otherwise — and keeps that start while the
    payment changes the subscription underneath. No app lists it (§6).
  - **Changing plan (same day, the owner's «continúa con lo del cambiar de
    plan»), as the app does it, its `billing.*` words:** while the plan can
    change (the app's `canChangePlan`: active, not cancelled, no upgrade
    waiting), «Mi suscripción» offers «Cambiar de plan» (and so does «Tu
    plan está al día»): `/pay?view=plans`, the plans in
    the app's change mode — the plan in force chosen and marked «Tu plan»,
    a scheduled one «Próximo mes», «Cambiar a este plan» only for another
    plan, fading in place. A plan chosen there, or the one a missing
    feature invites to (`?plan={slug}`), opens the change: the app's
    PlanChangeSheet as a page — the API's preview (`GET
    …/change-plan/preview`), what is paid now line by line («A pagar
    ahora»: the new plan for the days left, less what the current one
    leaves unused), the price from the renewal, the coupon kept or lost
    (its loss accepted with the app's checkbox), «Cambiar y pagar» and
    «Mantener mi plan». `POST …/change-plan` goes through the write-once
    guard (a conflict that is this same change counts as done), then the
    receipt of the difference goes through the payment's two steps; the
    plan changes once that payment is approved. A downgrade is scheduled
    for the period's end («Programar el cambio»), refused before it is
    asked when the active offices exceed the new plan's (the app's check;
    only the app turns offices off), and undone from «Mi suscripción»
    («Anular el cambio de plan»: a sheet that says what stays, then
    `DELETE …/scheduled-change` through the write-once guard). Without a
    plan, `?plan=` comes chosen among the plans; a receipt owed comes
    first, as the API changes no plan with debt.
  - **Where the web differs from the app, on purpose and to confirm:** the
    panel reads appointments and never changes them; the history shows
    ten at a time, the next ten as the list's end comes into view
    (infinite scroll, the owner's call of the same day), where the app
    shows all; the
    statistics are one page of tabs where the app has a dashboard and four
    screens; the PDF is the browser's print, not a generated file; the
    heatmap shows only the hours with appointments; the change of plan is
    a page where the app has a sheet over its plans («Mantener mi plan»
    returns to «Mi suscripción»), and a downgrade the offices do not fit
    says to turn them off in the app.
  - **For the app (prompts were handed over):** map `/panel/appointments`
    and `/panel/reports` to its «Citas» and «Estadísticas», list its
    `/panel/` pages in the Android filter instead of `/panel/.*` so the
    payment page stays out on Android 14 and older, sell on no system
    (prod's `InAppPurchases` back to `none`), never link to the payment,
    and the deep-link fixes found reading its router (signed-out `/a`, a
    specialist's own `/s`, the review wall swallowing links). All in its
    v0.169.1 but the selling, still on in every flavor (§6).

- **The rest of the payment (2026-10-13, the owner's «adelante con lo que
  falta del resto del pago»), as the app's «Mi suscripción» does it, its
  `billing.*` words:**
  - **«Mi suscripción»** has what the app's screen has: after the plan
    and its notice, «Cancelación pedida» with «Reanudar mi plan» while a
    cancelled plan is still in time (the app's `canResume`); «¿Qué incluye
    tu plan?» — what the plan includes, from the catalog, each row on
    while the API's access rule (`access.hasAccess`) says so, and said in
    words, not only by its mark —, unless the plan ended; «Cambiar de
    plan», «Aplicar un
    cupón» (an active plan with no coupon discounting), «Mis cupones» and
    «Datos de cobro»; at the foot «Anular el cambio de plan»,
    «Descartar esta suscripción» (unpaid, no payment in review) and
    «Cancelar mi plan» (active, not asked yet), those two in words and in
    the error's color; then the balance — only with a balance or a
    history — and the latest three receipts, each with the way to its
    whole list. What comes and goes as the subscription moves unfolds and
    folds in place (`Collapse`).
  - **Cancelling, resuming, dropping and undoing a change** share the
    app's sheet: what changes point by point and two buttons, the way
    back first when something is lost. Each write goes through the
    write-once guard (`changeSubscription`); a conflict counts as done
    when the subscription already stands where the action leaves it.
    Cancelling keeps the plan until the period's end and charges no next
    month; resuming takes it back; dropping voids the unpaid receipt, and
    the page becomes «no plan» once the sheet has slid away.
  - **A coupon on the plan in force** (`POST …/subscription/discount`):
    the discount seen first — the monthly price it would leave —, then
    applied, which spends it and discounts from the next monthly receipt.
    One at a time: ERR_5106 counts as done when it is this coupon.
  - **«Datos de cobro»:** a sheet with the name, the document and the
    email the receipts are issued to, read only, with WhatsApp (a message
    that says nothing about the person) and the support phones to change
    them.
  - **The receipts** (`/panel/subscription/invoices`, the app's
    InvoicesScreen): the newest first, the app's status chips in the
    address (`?status=open|paid|voided|uncollectible`, the owner's call),
    20 a page, the next one coming by itself as the list's end comes into
    view (infinite scroll, the owner's call: no «Ver más»; a page that
    fails stops there with «Reintentar»). **A receipt** (`…/invoices/{id}`): number, kind, status, period,
    due and paid days; the lines and how the amount owed is reached
    (adjustments, balance applied, paid); the payments applied with their
    bolívares and rate; the payments reported with their status and an
    admin's reason; the adjustments; whom it is issued to; the API's
    notice (an internal receipt, not a fiscal document); and «Pagar
    ahora» while something is owed and no payment waits — the payment
    page with `?invoice={id}` pays that receipt, whatever else is owed,
    and goes back to it.
  - **The balance** (`/panel/subscription/balance`): how much and what it
    is for (only the next monthly receipt uses it), every movement
    signed, one about a receipt opening it, scrolled in as the receipts.
  - **«Mis cupones»** (`/panel/subscription/coupons`): a code saved for
    later (it spends nothing and reserves no use), the coupons still to
    use first, the personal ones marked «Para ti», the used and expired
    ones with their chip. `acquire.otherUnpaid` says the app's words
    again: «…descártala desde Mi suscripción…».
  - **The owner's calls (same day):** the receipts' status stays in the
    address; lists load by themselves as they end, never with «Ver más»;
    the red button of what loses something keeps the app's error-500
    (white words at 3.7:1, accepted like the brand-green chip).
  - **Where the web differs from the app, on purpose and to confirm:**
    the support channels inside «Datos de cobro» (the app opens its
    support sheet); the entries of «Mi suscripción» as separate cards (the
    app groups them in one), as on the panel's home; what the plan lacks
    in the secondary grey, legible (the app's grey-300 measures 2.3:1),
    and «Hasta 1 consultorio activo» in the singular (the app: «Hasta 1
    consultorios activos»); a receipt's address that holds no id says
    «No encontramos este recibo» on the page (a `notFound()` under the
    panel's frame answers 200, §4).
  - **For the app:** nothing. These are the web's own pages and no app
    lists them (§6, the owner's rule of the same evening): no link leaves
    the web with them. The app's «Recibos», «Recibo», «Saldo a favor» and
    «Mis cupones» would claim them only if one ever did.
- **The web's version in the landing's footer (2026-10-13, the owner's
  ask):** «Versión: 0.22.0», as the app writes its own (the catalog's
  `version`), beside the copyright, so the live deploy can be told at a
  glance. It comes from `package.json` (`app/lib/app-version.ts`, server
  only: the whole manifest never travels to the browser); every commit
  bumps it (§0).
- **The payment back at `/pay`, and the app's paths one by one
  (2026-10-13, evening; the owner, after reviewing v0.19.0 with the app's
  agent).** What is the web's alone, and above all paying, must not hang
  on exceptions inside the paths the app claims:
  - **The payment is `/pay` again**, out of `/panel/`, with the panel's
    frame and guard all the same: the `(billing)` group's layout frames
    «Mi suscripción», its pages and the payment, and stays as the person
    moves between them. «Suscripción» stays marked in the panel's
    sections on `/pay`, and `robots.ts` keeps `/pay` out again.
    `/panel/subscription/pay` answers 404, on the owner's word (§6, «A
    renamed path never dies»).
  - **The app claims only the pages it shows** (§6): `/s/*`, `/i/*`,
    `/a/*`, `/panel/subscription`, `/panel/agenda`, `/panel/agenda/*`,
    `/panel/appointments`, `/panel/reports`, `/panel/specialties`,
    `/panel/profile` and `/home/*`, in `universalLinkComponents`, the AASA
    and `assetlinks.json`'s dynamic rules — the `/panel/` lines of the
    app's Android manifest since its v0.169.1, which shows them all — with
    no `/panel/*` and no exclusion. `/panel`, the receipts, the balance and
    «Mis cupones» open in the browser even with the app. The one exception
    to the rule: `/panel/appointments` and `/panel/reports` went in before
    the build that shows them was published, which changes nothing for an
    older build (it already took them through `/panel/*`, to its home).
  - **Nothing changed in Jira, the API or the emails:** they always said
    `https://redoctorapp.com/pay`, and `webPaymentUrl` stays empty until
    CORS (REDOC-362) is in production.
- **«Mi perfil» and «Mis especialidades» on the web (2026-10-13, late
  evening; the owner's «adelante con las versiones web de mis
  especialidades y de mi perfil», editing staying in the app):** the last
  two bridges under `/panel/` became the panel's pages, read only, as the
  app shows them to their owner, its `profile.*`, `specialistProfile.*` and
  `mySpecialties.*` words:
  - **«Mi perfil» (`/panel/profile`, email 18 «Perfil no visible»):**
    first, whether patients find the profile and, if not, the first thing
    missing (`/me`'s `visibilityStatus`, read again on arrival), in the
    words of the app's «Estado de mi perfil» — in review, rejected («Ver
    motivos»), the step still to take («Activa un consultorio» when every
    office is off), the plan («Ver planes»), a payment in review («Mi
    Suscripción»); what only the app does opens it. Then the app's
    «Perfil» tab: the photo and the professional name with the verified
    mark and the specialty badges (and «En verificación», «Verificación
    rechazada» or «Nuevo en Redoctor»); the description; the offices,
    active or not, with «Estás usando N de M consultorios» and, at the
    plan's cap, the plan with more offices, its price and «Mejorar plan»
    (§1, the owner's rule); the prices and reasons per office; the hours
    per office («Lun a Jue», «30 min por cita»); the gallery; the
    experience; «Educación» and «Certificaciones». An empty section says
    what is missing in the app's words («Añade un consultorio»). «Vista
    previa» opens `/s/{id}`, which tells its owner «Así ven tu perfil tus
    pacientes»; «Compartir perfil» shares the bare link, or copies it.
  - **«Mis especialidades» (`/panel/specialties`, email 16):** every
    specialty, the rejected first, then those in review, then the
    verified, each with its branch of the catalog, its chip, institution,
    license and subspecialties and, when rejected, the reason (or the
    app's line when none was given); after a rejection, support by
    WhatsApp.
  - Both close on what stays in the app (registering, correcting, editing:
    «Abrir en la app», or the note to open it from the phone). The
    panel's home leads to them («Tu perfil»), and so does the account
    menu («Mi perfil», as the app's avatar sheet); neither is a section of
    the panel's navigation.
  - **Data:** `GET /specialists/profile` (a 404 is a profile not made
    yet: every section to fill), `GET /specialists/offices`, and per office
    `…/pricing-config` and `…/schedule` (a 404 is nothing set yet).
  - **Where the web differs from the app, on purpose and to confirm:**
    read only; the profile's state as a card at the top where the app has
    a badge in its bar and a sheet; the app's «Aún no hay reseñas
    disponibles», which it shows under the name whatever the reviews, is
    left out («Vista previa» shows the real rating); hours as «8:00 a. m.»,
    as every hour on the web; a reason without a price reads «Sin precio»
    where the app shows «—»; «1 de 1 consultorio» and «1 consultorio
    activo» in the singular; the support message names no one — no
    specialist, specialty or reason, as the app's does — since wa.me is
    outside the chat's encryption; the offices' address in white on the
    active card, where the app's green-200 on green-500 measures 1.8:1.
    The specialty badges and the active offices keep the app's green-500
    with white words (2.8:1, the owner's brand rule), while `/s/{id}`'s
    specialty pill is green-700 since M8: one of the two should change,
    his call.

### Decided (2026-10-14)

- **Booking from a profile (M15) as built (the owner's «vamos con el
  agendar desde /s», 2026-10-13):** the app's booking sheet as the web's
  own page, `/book/{specialistId}`, in `(appointments)` (the bar with the
  account), its `search.*` words:
  - **Where:** `/s/{id}`'s «Agendar cita», and each office's «Agendar en
    este consultorio» with two offices or more (`?office=`, which opens on
    the day and hour). Out of `/s/*` on purpose: the app claims that path
    and has no booking path, so a booking link would open the app on its
    «not found»; `/book/*` is the web's alone (§6) until an app shows it.
    `noindex` and `X-Robots-Tag`; an unknown profile is a real 404.
  - **Before the steps:** what the API needs — an office, and the
    specialty it requires (`specialtyId`, until REDOC-251), found on the
    server as the app finds it (the profile's most specific verified
    specialty, by name in the catalog, `bookingSpecialtyId`); without it,
    «Por ahora no es posible agendar…». Then the session, asked for right
    there (Google, Apple; the app's `search.noAuthDescription`), as on `/a`.
    A specialist's account books nothing (§1): «Agendar es para pacientes»
    with the way to the panel, and on their own profile the app's
    «Es una vista previa». A patient whose sign-up is not finished gets
    the app's «¡Un último paso para agendar tu cita!» → `/sign-up?redirect=
    /book/{id}` (the sign-up asks the personal data for booking as for
    claiming, in the booking's words: «Crea tu cuenta para agendar tu
    cita», «Para agendar tu cita solo falta completar tus datos.», «Agendar
    mi cita») and comes back.
  - **The steps,** the step in the address (`?step=`, by `pushState`, so
    the browser's back goes to the one before; what was chosen survives;
    the reason and the person never travel in the address, §11): (1) «Selecciona un
    consultorio», one chosen (skipped with a single office); (2) «Fecha y
    hora», the reschedule's calendar and hours (`SlotPicker`, shared), the
    first free day of this month or the next chosen, only the free hours;
    (3) «Paciente», the reason with its price (`GET /scheduling/offices/
    {id}/services`: per reason, its own price or the standard one) and «¿Para
    quién es la cita?» — oneself, someone already in one's care (`GET
    /scheduling/terceros`) or someone new (names, birth date, sex and, from
    9 years and a month, the document: the API's rule); (4) «Resumen de tu
    cita», each part with «Editar», the price and the app's notice that the
    consultation is paid to the specialist, and the account it is saved
    under (§1). «Agendar» sends `POST /scheduling/appointments` through the
    write-once guard: a lost answer looks for it in the patient's
    appointments of that day (`from` the day, `to` the next) before sending
    again, and a 409 that is this very booking (a second tab) counts as
    done. Then the app's «¡Todo listo!», «Ver mi cita» (`/a/{id}`, where it
    is confirmed from 24 h before) and «Ver mis citas».
  - **What the API answers is said in place:** an hour just taken
    (ERR_4002) → back to the hours with the app's «Horario no disponible»;
    a specialist who is not active (404 on the reads or the booking) → the
    app's «Este especialista no se encuentra activo por el momento»; a
    sign-up to finish (403 ERR_2010) → the sign-up, and back.
  - **Where the web differs from the app, on purpose and to confirm:** a
    page with the step in the address instead of a full-screen sheet; one
    office skips the first step; neither the hour, nor the reason (unless
    it is the only one), nor «¿Para quién es la cita?» comes chosen (the
    app chooses the first hour, the first reason and «Para mí»; the web
    chooses nothing for the person, as in M4 and M5); someone new has
    two name fields with the API's rules (the app: one «Nombre y apellido»
    split by a guess), the API's documents (no R, no 9 digits, which the
    API refuses), no preselected sex, and a line when the document is not
    needed (the app hides it silently); someone already in one's care is
    chosen as is, never edited into a duplicate; a reason without a price
    reads «A consultar» and «Precio a consultar» (the app shows nothing);
    the dates carry the year and the hours no leading zero; a slot taken
    chooses nothing (the app moves to the nearest free hour); a guest signs
    in on the page and the booking goes on (the app's invitation sheet
    does not resume it). On `/s`, «Abrir en la app» became the secondary
    button, above «Agendar cita», and on a computer nothing (its note,
    «Abre este enlace desde tu teléfono…», contradicted booking here).
  - **Open:** the success keeps the app's «Hemos notificado a {name} de tu
    cita…», while the API notifies no specialist of a patient's booking yet
    (REDOC-165/360, as read on 2026-10-13): to check with Heyscar. A
    specialist who is also a patient cannot book (the app's rule; the API
    would let them).
  - **Production** needs the API's CORS (REDOC-362), like every flow with a
    session: the e2e covers the page without a session and the 404, the
    component tests (MSW) the steps. With M15: `SlotPicker`, `SlotChoices`
    and `LoadFailure` out of the reschedule sheet; `usePersonChecks`,
    `usePriceWords` and `IdentityDocumentField` shared with the sign-up and
    «Mi perfil»; `ChoiceCards` takes a `value` (a group the page holds) and
    an option's `trailing` (a price across from its name); `BottomActions`
    a `width`; `OpenInAppButton` a `variant`.

- **The search (M16) as built (the owner's «darle vida a esa barra de
  búsqueda… al estilo de ZocDoc, Webel y Doctoralia», 2026-10-14):** the
  app's «Buscar» and the search pages patients know, as the web's own
  page `/search` in `(search)`, with the landing's box live.
  - **The box** (`app/ui/search`, the same in the hero, in the docked bar
    and on the search page): what is looked for and where, «Buscar». As
    one types, from two letters and after the app's pause (400 ms): the
    specialties of the catalog that match — found in the browser, case
    and accents aside, the letters that matched in bold — and the
    specialists whose name does (the API's `name=`, five, through
    `/api/search/suggestions`), with «Buscar «lo escrito»» as the first
    option so Enter and a tap do the same; empty, the last five searches
    of this browser and the catalog's first specialties. A specialty
    searches by its id; a text by itself; a specialist opens the profile.
    The place: «Usar mi ubicación» (the browser asks; «Ubicación actual»;
    a crosshair at the field's end asks from the first paint), «Toda
    Venezuela», or a place typed — Google's places, Venezuela only,
    through the web's server (`/api/places`, one session per
    typing-and-pick, the key never in the browser); a place typed and not
    picked is resolved on the search (Google's first), and a search right
    after a pick waits for its point. The owner's word (2026-10-14): only
    the device's position or a place of Google's, no built-in list of
    cities (a first version had one as the fallback without a key; it
    was dropped). The last place comes back on the next visit. Nothing typed and «Buscar»: the
    app's «Debes realizar una búsqueda o seleccionar una especialidad».
    The box's words are translated on the server and handed down
    (`useSearchBarWords`): the landing sends no search copy to the browser.
  - **The page:** the search in the address (`q`, `specialty`, `lat`,
    `lng` rounded, `near`, `by=device`, `radius`, `from`), parsed with
    the defaults for anything malformed; the first page read on the
    server (cached a minute for every visitor) and the rest — ten at a
    time, as the list's end comes into view — through `/api/search`; a
    first page the server could not read is read again in the browser,
    with «Reintentar». Changing the search — the box, the filters, the
    map — changes the address (`router.push` inside a transition: the
    results dim and a line moves under the header while the server
    answers). The app's filters as chips with a sheet each:
    «Disponibilidad» («Lo antes posible», or from a day) and «Distancia»
    (15, 60, 150, 300 km, «Todo el país», the default; only with a point),
    and «Restablecer». The title («N especialistas», what and where) and
    the app's order said in words («Primero quienes tienen cupo más
    pronto, y luego los más cercanos.»).
  - **The card,** as the app's: photo, name with the verified mark (the
    profile), every specialty, the rating with its count when there are
    reviews, the nearest office with how far it is (which the app never
    says) and «y N más», the lowest price («$ 45», «Desde $ 25», «A
    consultar»), and the nearest office's next days — a free one opens the
    booking on that day (`/book/{id}?office=&date=`, M15 reads `date`), a
    full one says so, «Más fechas» opens the booking's calendar; nothing
    in the next days says so too. The whole card opens the profile (the
    owner's ask, 2026-10-14): the name's link stretches over it with a
    pseudo-element, no link inside another, and the days sit above it.
  - **The map** (Google Maps, only with the key): a pin on each
    specialist's nearest office, the point searched from as a blue dot,
    the pin of the card under the pointer standing out and a pin tapped
    showing its specialist on the map with «Ver perfil»; the map moved
    offers «Buscar en esta zona» (the map's middle, as far as the map
    shows, in the app's stops). Beside the list from laptops up, behind a
    «Mapa» button as a sheet on phones. The API loads when the map mounts,
    never before, its script with the page's nonce; Advanced Markers with
    Google's `DEMO_MAP_ID` until a map id is made.
  - **Nothing matched:** the app's «Vaya, no encontramos coincidencias»,
    with «Buscar en toda Venezuela» when the search had a point. Nothing
    asked: «¿Qué especialista buscas?» with the catalog. The landing's
    chips are the catalog's own specialties, each with an icon by its
    name, and only with four of them or more (the owner's rule,
    2026-10-14 evening): with three or fewer the row shows nothing and
    keeps its space, so the hero is never cut short (until then the
    mockup's sample names stood in).
  - **Where the web differs from the app, on purpose and to confirm:**
    searching needs no account (the app's sheet asks to sign in); the
    suggestions are grouped and the letters that matched are in bold (the
    app lists them plain, specialists first); the text itself is an
    option; Enter searches (in the app it does nothing); the recent
    searches are the browser's, not the account's; the distance is shown;
    the results sort is said; the filters apply on «Aplicar» and live in
    the address (the app's reset when leaving); a search over the whole
    country when no place is chosen (the app refuses to search without a
    point); the map, which the app does not have; the rating «4,5» with
    the comma (the app: «4.5»); «Especialidades destacadas» offers eight,
    not the whole catalog.
  - **Open:** the map's browser key (his to create in Google Cloud:
    Maps JavaScript API enabled, the key restricted by referrer to
    redoctorapp.com and the preview domain; the app's key is refused for
    that API, so until then the map's column says it could not load —
    Places works with the app's key on the server); the API's search is
    accent-sensitive
    and takes 30 requests a minute from one address — to raise with
    Heyscar (REDOC: `unaccent`, a higher limit or `X-Forwarded-For`
    trusted); the landing's hint «Especialidad, enfermedad, doctor» became
    the app's «Busca por nombre o especialidad» (the API searches no
    illness); api-dev has one visible specialist, in California, so every
    search near a Venezuelan place finds nobody until there is supply.
    `@types/google.maps` entered as a dev dependency (types alone, no
    runtime): the Maps API is loaded from Google, never bundled.

- **The landing wired to what the API already has (the owner's word,
  2026-10-14, after the review of what was still static):** the plans
  and the two «Comenzar».
  - **The plans** («Elige el plan ideal») are the API's when it answers
    the landing: `GET /billing/plans` read on the server with no session
    (`app/lib/data/plans.ts`, cached five minutes), the plans on offer
    the cheapest first, each with its name, its monthly price, its
    description and what it includes, derived from its limits as the
    payment derives it (`app/lib/billing/plan-benefits.ts`, in the app's
    words); the professional plan wears «Recomendado», since the API ranks
    none; «Seleccionar plan» opens the payment with that plan chosen
    (`/pay?plan={slug}`), which asks for the session and sends a new
    account to the sign-up. **Today the API answers that GET to signed-in
    specialists only** (a 401 without a token, measured 2026-10-14; the
    OpenAPI says «Audiencia: Especialistas»): until Heyscar opens it, the
    mockup's plans stand in (`samplePlans`, their benefits derived the
    same way) and «Seleccionar plan» opens the payment's own list
    (`/pay?view=plans`); the day it answers, the real plans take their
    place with no change on the web, and `samplePlans` goes. An instance
    remembers the refusal ten minutes (the Data Cache keeps only a 200, so
    a refusal would cost the API one call per visit) and asks once, four
    seconds at most, with no retries: the landing never waits long for a
    section it can stand without. Any other failure, or no plan on offer,
    shows «Los planes no están disponibles ahora mismo» in the section.
  - **«Comenzar»** leads where each role starts: a specialist to
    `/sign-in` (a new account goes on to the sign-up, which points
    specialists to the app), a patient to `/search`, since searching needs
    no account (§1).
  - **To raise with Heyscar:** `GET /billing/plans` without a session
    (the plans are public: the landing shows them to anyone). The footer's
    channels wait for the configuration endpoint (REDOC-357), his too.
  - **The copy the web overtook (the owner's calls, 2026-10-14):** the
    roadmap's search and booking cards now say they come in the patients'
    app («Busca especialistas desde la app para pacientes», «Agenda citas
    en segundos desde la app para pacientes»), since the web has both
    since M15 and M16; the patient card of «Así de simple» keeps the
    invitation's four steps, the pilot's path.
  - **The owner's call still open:** prices on the landing while the app
    links here (the landing doc, §6). Nothing changed there, the prices
    were already on the page; «Seleccionar plan» now makes the path from
    the landing to the payment real.

- **The legal pages (M10) as drafted (the owner's «vamos con M10… que
  esto sirva como base para que el abogado lo revise», 2026-10-14):**
  `/terms`, `/privacy` and `/delete-account`, in `(account)`, public and
  indexed (the sitemap lists them), under the bar with the account. Every
  word lives in the catalog under `legal.*`: the company's identification
  once (`legal.entity`: name, RIF, address, email — **placeholders in
  brackets until the owner fills them**; the email becomes a link only
  when it is a real address), and each document as a title, its date of
  update, an introduction and named sections (`legal.<doc>.sections.<id>`,
  ordered by `app/(account)/_data/legal-sections.ts`), written as rich
  messages (`<p>`, `<ul>`, `<ol>`, `<li>`, `<b>`, and the links `<terms>`,
  `<privacy>`, `<delete>`, `<mail>`, `<support>` — the support WhatsApp
  from the environment, its message saying nothing about the person).
  - **What they say, drawn from what the web and the app do:** the terms
    cover what Redoctor is and is not (no medical service, no
    emergencies), who may use it (adults; minors as someone in one's
    care; licensed specialists), the account (Google or Apple, no
    passwords), the patients' services (free; invitations, booking,
    confirming from 24 h before, rescheduling and cancelling before the
    start; the consultation paid to the specialist, never through
    Redoctor), the specialists' services (the verification and what it is
    not; their duties: licences, truthful data, consent to contact
    patients, medical secrecy, no clinical record in Redoctor), the plans
    (USD, paid in bolívares at the BCV rate, Pago Móvil or transfer
    reported and verified, monthly periods with no automatic charge,
    grace then invisibility, upgrades prorated and downgrades at the
    period's end, cancellation at the period's end with no refund,
    coupons and balance, internal receipts vs the fiscal invoice, price
    changes with 30 days' notice), reviews (after a finished consultation,
    public with the first name and the surname's initial), prohibited
    uses, intellectual property, communications (the daily summary's
    opt-out, the newsletter only with consent, WhatsApp sent by the
    specialist), availability, liability (capped at 12 months of a
    specialist's payments), indemnity, termination, changes with 15 days'
    notice, Venezuelan law and Caracas courts, and contact. The policy
    covers who it applies to, every datum the web and the app handle
    (account, patient and dependants, appointments — the reason as health
    data —, reviews, specialists' professional, verification and billing
    data, the device's position rounded to a kilometre, technical data),
    the purposes and their bases (the consents the sign-up asks: terms,
    health and location data, newsletter), who receives what (the
    specialist of the appointment, the public profile, the providers:
    Google, Apple, hosting, email, PostHog and Sentry as configured),
    transfers abroad, retention (30 days after deletion, billing per the
    tax rules, logs 90 days), rights and how to exercise them (15 working
    days), minors, health data and medical secrecy, security, the cookies
    and local storage by name, analytics as built (no IP, no page URLs, no
    recordings), communications, changes and contact; the legal frame is
    named generically (the Constitution, the data-messages and
    cyber-crime laws, the medical-secrecy rules, the TSJ's criteria) **for
    the lawyer to confirm or replace**. The deletion page says how to ask
    (support, from the account's email, no password ever), the 30-day
    term and what goes and what stays (billing records).
  - **Linked from:** the landing's footer, the sign-in's legal line and
    the sign-up's consent (each a link; the sign-up's open apart so
    nothing typed is lost). The app's KYC consent and the store listings
    should point at `https://redoctorapp.com/terms`, `/privacy` and
    `/delete-account` (for the app's agent).
  - **Open for the lawyer and the owner:** the figures chosen as
    reasonable defaults (30 days to delete, 90 days of logs, 15 working
    days to answer, 15 and 30 days' notice, the 12-month liability cap,
    Caracas courts), the legal citations, the fiscal-invoice line, and
    the company's identification. `/account` (the account's own page with
    the deletion button) waits for REDOC-352.

- **The profiles' SEO and the real 404 (the owner's «vamos con el SEO de
  los perfiles, y con el 404 real para perfiles y rutas desconocidas»,
  2026-10-14):**
  - **Found by search engines.** The sitemap (`app/sitemap.ts`) lists every
    public profile the API lists, besides the landing and the legal pages:
    the one way a crawler reaches a profile, since `/search` is not indexed
    and no public page links to one. The API has no listing endpoint:
    `app/lib/data/public-profiles.ts` unites five searches of
    `GET /search/specialists` over the whole country, one per vowel (a, e,
    i, o, u: no name and no specialty in Spanish lacks every one of them;
    the search matches by substring — measured 2026-10-14: «Josbert
    Guedez» has no «a», and `search=a` still finds him through
    «Medicina»), 50 a page and three pages per vowel at most (150
    specialists each; beyond that the API's listing is needed), each page
    a day in the Data Cache, a search that fails leaving the others'
    profiles in. Built per request (`connection()`), never at build time:
    a build calls no API. **To ask of Heyscar:** a public listing of the
    visible specialists (ids and `updatedAt`) for the sitemap.
  - **Structured data.** Each profile carries schema.org as JSON-LD
    (`app/lib/seo`, `app/ui/seo/json-ld.tsx`): a `Physician`, or a
    `Dentist` when the first verified specialty hangs from «Odontología»,
    with the name, the portrait and the gallery, the description, the
    verified specialties (`medicalSpecialty`, the catalog's names), the
    first office as `address` and `geo` (the country only when the
    coordinates fall in Venezuela), every office as a `MedicalClinic`
    under `location` when there are two or more, and `aggregateRating`
    only with reviews. No review, no patient, no phone. A data block the
    browser never runs, so the CSP's script rule does not apply; the
    serializer escapes `<`, `>` and `&` so a person's text cannot close
    the tag.
  - **The words.** The title is «{name}, {first specialty}» (the template
    adds «· Redoctor») and the description is built from the profile
    (`_components/profile-metadata.ts`, `specialists.meta*`): «Ana Pérez:
    Medicina Interna y Cardiología. Especialista verificado. Consultorios:
    Clínica El Ávila, Centro Médico La Trinidad y 1 más. Calificación 4,5
    de 5 (2 reseñas). Agenda tu cita en línea en Redoctor.»; the generic
    sentence stays for a profile with nothing verified. Open Graph takes
    the same words. `robots.txt` disallows `/api/` too (the web's own
    endpoints, which spend Google's quota).
  - **The real 404.** `/s/{id}`'s `loading.tsx` is gone (§4): the profile
    is awaited before anything streams, so an unknown or malformed id
    answers 404 with the segment's not-found page and Next's `noindex`,
    as `/book/{id}` has since M15. The cost is the skeleton, which only a
    profile's first visit would have shown (the profile is cached five
    minutes and served stale while it refreshes). Unknown paths were 404
    already (Next's root not-found), and what still answers 200 for an
    unknown thing cannot do otherwise (§4).
  - **Open:** indexable specialty pages («cardiólogos en Caracas», as
    Doctoralia) when there is supply; a name in the profile's address
    (`/s/{id}/ana-perez`) needs the app's resolver first (`/s/*` is its).
    The owner's: Google Search Console (the domain property) and
    submitting `https://redoctorapp.com/sitemap.xml`.

- **The notifications (M17), as built (the owner's «análisis con respecto
  a las notificaciones y al web socket… sumamente importante», 2026-10-14,
  and his five answers that night: the inbox in the pilot, as a menu that
  unfolds from the bell and never a sheet, no sound on the web, the bell on
  every page with a session, the push right after):**
  - **The bell** (`app/ui/notifications`): on every bar — the landing's
    at every width, the search's from tablets up with the account, and the
    bar with the account of the invitation, the appointments, the sign-up,
    the legal pages and the panel (`SessionControls`) —, only for a
    signed-in account with a sign-up behind it. It wears the unread count
    (the app's `CountBadge`, kept while it fades out at zero) and its label
    says it («Notificaciones, 2 sin leer»). A tap unfolds **the inbox as a
    menu** (Radix Popover; the whole width on a phone): the title, how
    many unread and «Marcar todas», the notices the newest first — unread
    in bold with a blue dot and «Sin leer» for a screen reader, each a
    button that reads it and opens what it is about, with its own
    «Eliminar» — and «Vaciar notificaciones», which asks before it does.
    Rows unfold and fold through Motion. The menu's code loads with the
    first opening (prefetched when the pointer reaches the bell).
  - **The live channel** (`app/lib/notifications/socket.ts`): the API's
    Socket.IO namespace, connected while the tab is in view and resting
    while hidden (back in view, or back online, it reconnects and the inbox
    is read again if older than 15 s). A notice just created goes on top of
    the inbox, counts, shows as **the app's banner** on the page's Toaster
    (four seconds, a tap reads it and goes where it leads) unless the menu
    is open, and refreshes what it leaves stale (§9). The unread count
    moves when another device reads something.
  - **Where a notice leads** (`destination.ts`): by its ids before its
    kind, as the app's `NotificationRouteResolver`: an `appointmentId` to
    `/a/{id}`; a billing notice, for a specialist, to the page where it is
    resolved (the plans for a plan not activated or cancelled, «Mis
    cupones» for coupons and discounts, the receipts for an adjustment, the
    balance for its movements, «Mi suscripción» for the rest; nothing for
    the admins' kinds); a `PROFILE_*` notice to «Mi perfil»; anything else
    is only read.
  - **The web push** (`use-push.ts`, `app/lib/firebase/messaging.ts`,
    `public/notifications-sw.js`): only with `NEXT_PUBLIC_FIREBASE_VAPID_KEY`
    and where the browser can (Safari on iOS only as a web app added to the
    home screen). The permission is asked on a tap, never on arrival: the
    menu offers «Activa las notificaciones» with «Activar» and «Ahora no»;
    the «no» is remembered, and the offer comes back once per visit when a
    notice arrives live with the push off, saying what was just missed (the
    app's `remindIfDisabled`). Allowed, this browser is registered among
    the person's devices on each signed-in visit (`platform: WEB`, a device
    id made once and kept across sign-outs, «Chrome · macOS», the web's
    version), beats every twelve hours — `registered: false` signs the
    person out with «Tu sesión se cerró desde otro dispositivo» — and is
    dropped before the session ends (`addSignOutTask`, §9), the browser
    forgetting the token too. Our own worker, not Firebase's: it shows the
    notice as the browser's notification only while no tab is in view
    (with one, the channel shows it; the worker tells the tab in case the
    channel is down), and a tap opens the page by the notice's ids. The
    permission refused shows one line in the menu.
  - **Where the web differs from the app, on purpose and to confirm:** no
    sound nor vibration (the owner's call); the inbox as a menu, not a
    screen, and «Eliminar» as a button where the app swipes; a `PROFILE_*`
    notice leads to «Mi perfil» (the app only refreshes its session); the
    stale data keeps showing while it refreshes (§8.2) where the app
    switches to a skeleton; the permission is never asked on entry (the
    app asks after the location's); the device's heartbeat also runs when
    the tab comes back in view; «Dispositivos conectados» (the app's list
    of the person's devices) is not built: no page of the web lists them.
  - **Open:** Firebase 13 deprecates the registration token on the web in
    favour of an identity by Installation ID (`register`/`onRegistered`),
    which the backend's send API can target; the API's contract and the app
    use tokens, so the web keeps `getToken` and `deleteToken` (marked, in
    `app/lib/firebase/messaging.ts`) until Heyscar takes FIDs. To raise
    with Heyscar too: the channel accepts a connection before checking its
    token (it refuses 70 ms later; nothing is delivered meanwhile, but the
    check belongs in the handshake). The owner's: the VAPID key in
    `.env.local` and Vercel, and `NOTIFICATIONS_TEST_ENDPOINT_ENABLED` on
    api-dev to try the whole chain from `POST /notifications/test`.

### Decided (2026-10-15)

- **The deep review of 2026-10-15 (the owner's «análisis profundo… que
  todo funcione a la perfección», with his rule on images the same day).**
  Measured on a production build (phone, gzip) and read area by area; what
  it found was fixed and the flows kept:
  - **Weight.** zod had come back to the landing, `/search` and `/sign-in`
    (the search box's address parser, the account rules imported through
    the contract): the parser is plain code now, the search's and places'
    contracts load with the first answer, the rules come from
    `app/lib/auth/account.ts`. Firebase Auth no longer loads for a visitor
    without a session (§9), and the bell's popover and the account's
    dropdown (Radix) come for a signed-in person only. The landing on a
    phone went from 509 to 290 KB of JavaScript, the public profile from
    393 to 231, the legal pages from 413 to 218, the 404 from 367 to 205.
  - **Images (his rule):** §8.12; every person's photo unoptimized, the
    optimizer closed to anything but our static imports.
  - **CSP:** zod's eval check left a violation on every page that parsed;
    `jitless` ends it, and an e2e test keeps the public pages at zero.
  - **Search:** the web's search endpoints count a minute per address (a
    flood from one address no longer spends the API's 30 a minute for
    everyone); the box shows it is busy while it places a typed place with
    Google, and a second tap waits instead of searching twice.
  - **Notifications:** a read of the inbox already on its way no longer
    undoes «Marcar todas», a read or a delete (it is called off and made
    again after the write); the menu's header fades instead of vanishing,
    the focus goes to the next row or the title when what held it leaves,
    and each «Eliminar» says which notice it deletes.
  - **Session:** «Entrar» in a bar brings back the page's query too (a
    search's place and filters, a booking's office and day), never what
    was typed.
  - **Panel and lists:** the panel's home cards keep one rhythm; the
    statistics' tabs and the search's days fade on the side with more
    beyond them (the app's ScrollFadingEdges); the CSV keeps a reason
    named «=…» as text (formula injection), figures keep their sign.
  - **Open for the owner:** the public profile's blue header has no
    account and so no bell for a signed-in patient (as designed in M8);
    the docked bar's empty search moves the focus without a visible word.

### Decided (2026-10-16)

- **Page transitions (the owner's «que el cambiar de página no sea
  simplemente parpadeo», 2026-10-16).** Analysed against the web's motion
  and the app's (its push on both systems, 350 ms in and 300 back; its
  colour ScreenWipe), with a live demo of ten options; his pick, «la
  combinación con barrido»: one animation per kind of change for the
  everyday, and the colour wipe for the big moments (§8.13, the how-to).
  As built:
  - **Every page** (the 27 and the three `not-found`) wraps its content in
    `PageTransition`; the bars hold still and the panel's sections slide
    their mark to the section on screen, even between the panel's layout
    and the subscription's.
  - **Steps** go sideways: the booking's (`?step=`), the payment's (the
    plans, the change, the method, the payment), the sign-up's (the role,
    the form); the agenda's days too, by their links.
  - **A search result opens its profile** with its photo and name
    travelling to the profile's, and back.
  - **Data read in the browser** crossfades from its skeleton: the
    appointment, «Mis citas», the invitation, every panel page and the
    home's cards, «Mi suscripción», the receipts, a receipt, the balance,
    «Mis cupones», the payment and the change of plan, and the session's
    guard (the page then enters as on a navigation).
  - **The line along the top** while a page takes more than 150 ms.
  - **The wipe:** blue on signing in (the sign-in page, and in place on the
    appointment, the invitation and the booking: it opens once the API
    says who signed in) and on signing out; green on an appointment
    booked, the sign-up finished, an invitation claimed, a payment
    reported or a plan activated (with a coupon).
  - **A bug of today, fixed with it:** since Next 16, Next no longer turns
    off `<html>`'s smooth scroll on a navigation, so a page opened from a
    scrolled one appeared at that height and then glided up;
    `data-scroll-behavior="smooth"` brings the override back.
  - **Three fixes it needed:** the infinite scroll watches its list's
    foot from when it mounts (`useInfiniteScroll` follows the element, not
    only the data: a held skeleton mounts the foot one render later);
    `useFocusHeading` focuses before the view paints (a layout effect), as
    do the payment's scroll to the top; and `PageFrame`'s `<main>` carries
    its own transition (`FrameTransition`): React animates no
    <ViewTransition> that a removed element contains, so leaving the panel
    for the subscription (two layouts, each with its `<main>`) or «Mis
    citas» for another page showed the new page with no exit of the old
    one — found by watching each navigation in a real browser, and kept in
    §8.13.
  - **The flicker at the wipe's centre (the owner's report the same day:
    «un pequeño parpadeo justo en el centro de donde inicia la animación»,
    signing in with Google or Apple),** found frame by frame in a real
    browser (the provider's window faked, the animations slowed, the
    screen read at its own pixels) and fixed at its two roots. **The colour
    was never whole:** the reveal's mask sat on the overlay while it
    covered too, its soft edge outside the hole, so a hole of 0 left a
    see-through dot exactly at the centre (6 to 11 device pixels on a
    phone, Chromium and WebKit alike) where the busy button's spinner, and
    then the page changing under the colour, flickered — in every wipe.
    The mask exists only while the colour opens now, its edge inside the
    hole. **What the moment changes reached the screen first:** the
    sign-in in place swapped its buttons for a skeleton 1 ms after the
    circle started (now 474 ms later, under the colour), the button
    pressed went back to its words as its request ended (booking, claim,
    payment, sign-up), the sign-up's account read again made the page
    leave before «¡Todo listo!» (a bug of this work's first version: the
    done screen was skipped), the payment's billing read again and a plan
    activated at once changed the step around the circle, the sign-in
    buttons reordered and grew «Última vez» after an Apple sign-in, and
    the account menu shrank where the blue started. Each now waits for the
    colour (§8.13).
  - **Where the web differs from the app, on purpose and to confirm:** the
    app pushes every screen from the side; the web rises, since its page
    arrives after the server answers (a push that waits feels late), a
    computer's width makes a long slide, and Safari's swipe back already
    animates; the sideways axis is kept for steps. The wipe's green is the
    app's walkthrough's; its blue, the web's own for signing in and out.
  - **Not tried here:** Safari on a phone (View Transitions in Safari 18
    and later) and a real Firefox; the e2e and the unit tests run in
    Chromium, WebKit and jsdom.

### Improvements noted (not scheduled)

- The FAQ's closed answers are not in the HTML (Radix renders them on
  opening): search engines and Ctrl+F miss five of six. `forceMount` would
  break the closing animation as Radix measures it; worth a proper look
  when the landing's SEO is worked on.

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
