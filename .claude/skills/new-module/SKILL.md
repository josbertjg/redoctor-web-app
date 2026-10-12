---
name: new-module
description: Scaffold a module of Redoctor Web — a route group in app/ with its first route, _components, loading, error, metadata, i18n keys and an e2e stub — following AGENTS.md §3.
---

# New module

A module is one route group `app/(module)/` named after the module of AGENTS.md §1
(`(marketing)`, `(auth)`, `(invitations)`, `(appointments)`, `(specialists)`,
`(account)`, `(billing)`, `(bridges)`). Create it only when its module starts.

## Steps

1. Confirm the module name and its first route with the owner. The URL segments
   are fixed by `app/lib/routes.ts` and, for the paths shared with the app,
   by `app/lib/deep-links.ts`. Never invent a segment.
2. Create the folders:
   - `app/(module)/<segment>/page.tsx` — thin: reads `params`/`searchParams`,
     calls `app/lib/data/*` (server) or renders a client component that uses
     `app/lib/queries/*`, and composes components. No business logic.
   - `app/(module)/<segment>/loading.tsx` — a skeleton with the final
     dimensions, built from `Skeleton` in `app/ui`.
   - `app/(module)/<segment>/error.tsx` — `'use client'`, receives
     `{ error, retry }`, renders `ErrorState` from `app/ui` with a retry.
   - `app/(module)/_components/` — module-only components, kebab-case files.
   - Segments that need a session wrap a `layout.tsx` in `<RequireSession>`.
3. Metadata: `generateMetadata` (or `metadata`) with title and `robots`.
   Private pages (`/i`, `/a`, `/appointments`, `/account`, payment) are
   `noindex, nofollow` with a generic Open Graph preview.
4. i18n: add the module's keys to `app/lib/i18n/messages/es.json` under the
   module's namespace, mirroring the app's `assets/translations/es.json` keys
   when they exist. No string literal reaches the user.
5. Routes: add the path builder to `app/lib/routes.ts` if it is new.
6. Lint boundaries: the group must be listed in `modules` of
   `eslint.config.mjs` (it already is for the eight modules of §1).
7. Tests: colocated unit tests next to what they test; an e2e stub in
   `tests/e2e/<module>.spec.ts` that opens the route on the mobile profiles.
8. Run `pnpm check` and summarize in Spanish what was created and verified.

## Rules that get broken

- Nothing outside the group imports from `app/(module)/`.
- Server first: `'use client'` only at the smallest leaf that needs it.
- Everything that enters or leaves animates 200–300 ms; tokens only; copy
  through i18n; touch targets ≥ 44 px; axe in the tests of new pages.
