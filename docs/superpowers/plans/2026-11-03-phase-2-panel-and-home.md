# Phase 2 — The panel and its home Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The specialist's panel on the designer's blue frame (white sidebar, the profile's state chip, the bell and the account at the top right) and its home as drawn (`4644:2329`), with the app's logic behind each card.

**Architecture:** `PanelFrame` becomes the blue scene for every page under `/panel` and `/pay`: a white sidebar from `lg` (the sections, vertical), the phone's section tabs kept under the bar, one bar whose controls sit at the top right. Pages drawn by the designer (the home now, «Citas» in phase 3) paint on the blue; the rest sit on a white `PanelSurface`. The home ports the app's `ProfileActivation` (a pure function in `app/lib/profile/`) and its home rules (notice → activation → plan → the week's appointments).

**Tech Stack:** Next.js 16, React 19, TanStack Query 5, next-intl 4, Vitest 5 + MSW 3 + jest-axe.

**Spec:** `docs/superpowers/specs/2026-11-03-web-redesign-design.md` (Phase 2).

## Global Constraints

- Tokens only (AGENTS.md §7): the scene `bg-primary`; the sidebar and cards `bg-pure-white rounded-xl shadow-md`; the greeting «Hola,» `text-title-xxl font-medium text-blue-200`, the name `text-title-xxxl font-semibold text-pure-white` (smaller below `lg`); section titles on blue `text-subtitle-m font-semibold text-pure-white` with their line in `text-blue-100`; the chip by tone (active: `bg-green-50 text-green-700`, eye icon).
- The app's rules, as read in `redoctor-mobile-app` v0.177.0: the home's order and conditions (`home_view.dart`), `ProfileActivation` (`profile_activation.dart`), `PublicationReadiness`, `PlanEligibility.canContractPlan`, the home's `AppointmentsCard` (the current week Monday to Sunday, open appointments only, the chosen day's first open one, «Ver todas» opens that day).
- Its words: `profile.activation.*`, `profile.status.*`, `home.*` (`myAppointments`, `patientsOnDay`, `dayPhrase`, `seeAll`, `noAppointmentsThisDay`, `choosePlanCard.*`) mirrored into `es.json`.
- «Mensajes» is not in the sidebar; «Suscripción» is.
- Nothing appears or disappears abruptly; skeletons with final dimensions; never a disabled control.

## Review Focus

- A specialist with no plan and no verified specialty: never offered «Ver planes» (the app's `canContractPlan`) → Task 3 test «offers no plan before a verified specialty».
- A billing notice (a receipt owed): the notice first and no activation card (the app's rule) → Task 3 test «puts the notice first and hides the activation».
- An admin's account (no specialist facet): no sidebar sections, no chip, the home's admin note → Task 2 test «an admin's frame has no sections».
- Pages without a new design keep working inside the frame (a payment, a receipt): their content on the white surface, readable → Task 2 test on `PanelSurface` and the visual check.
- A profile already visible: «Perfil activo», no activation card → Task 1 and Task 3 tests.

---

### Task 1: The activation model

**Files:**

- Create: `app/lib/profile/activation.ts`, `app/lib/profile/activation.test.ts`

**Interfaces:**

- Produces:
  - `type ActivationStep = 'identity' | 'credentials' | 'office' | 'schedules' | 'pricing' | 'subscription'`
  - `type ActivationTone = 'active' | 'underReview' | 'pendingVerification' | 'inactive' | 'actionNeeded'`
  - `type PublicationReadiness = { hasActiveOffice: boolean | null; hasSchedules: boolean | null; hasPricing: boolean | null }`
  - `readinessOf(input: { hasOffices: boolean; offices: readonly { isActive: boolean; hasSchedule: boolean | null; hasPricing: boolean | null }[] | null }): PublicationReadiness` (the app's `PublicationReadiness.fromUser`)
  - `activationTone(account: Pick<Account, 'registration' | 'visibility'>): ActivationTone` (the app's `_resolveTone`, KYC aside: the web reads no KYC status)
  - `profileActivation(input: { account: Pick<Account, 'registration' | 'visibility'>; verifiedSpecialty: boolean | null; readiness: PublicationReadiness; hasActiveSubscription: boolean | null }): ProfileActivation` with `ProfileActivation = { tone; currentStep: ActivationStep | null; steps: Record<ActivationStep, 'done' | 'current' | 'pending'>; progressPercent: number; pendingStepCount: number; isVisible: boolean }`

- [ ] **Step 1: Write the failing tests**:
  - «a visible profile is active and whole»: visibility `visible`, registration `completed` → tone `active`, `currentStep` null, `progressPercent` 100, `pendingStepCount` 0.
  - «a fresh account starts past the floor»: registration `pendingCompleteSpecialist`, visibility `profileIncomplete`, nothing else known → tone `pendingVerification`, `identity` done, `currentStep` `credentials`, `progressPercent` 50 (three of the nine milestones: past the phone, the KYC and its data; `round((0.25 + 0.75 × 3 / 9) × 100)`).
  - «only the step the API names stays undone»: visibility `noSchedules`, registration `completed`, readiness all true, subscription true → `schedules` current, `office`/`pricing`/`subscription` done.
  - «a payment in review is a review»: visibility `verifyingSubscriptionPayment` → tone `underReview`, current `subscription`.
  - «rejected specialties need action»: `specialtiesRejected` → tone `actionNeeded`.
  - `readinessOf`: no offices and `hasOffices` false → all false; offices unknown and `hasOffices` true → all null; one active office with a schedule → `hasSchedules` true even if another is unknown; every active office known without one → false.
- [ ] **Step 2: Run** `pnpm vitest run app/lib/profile` — FAIL (module missing).
- [ ] **Step 3: Implement** by porting the Dart file's ranks, `_blockedStep`, `resolve(step, byApi, byProfile) = step !== blocked && (byApi || byProfile)`, the nine milestones and the 0.25 floor.
- [ ] **Step 4: Run** — PASS.

### Task 2: The frame

**Files:**

- Modify: `app/ui/layout/panel-frame.tsx`, `app/ui/layout/panel-nav.tsx` (+ test), `app/ui/auth/require-session.tsx` (a `stateClassName` for its own states)
- Create: `app/ui/layout/panel-bar.tsx`, `app/ui/layout/panel-surface.tsx`, `app/ui/specialists/profile-state-chip.tsx` (+ tests)
- Modify: `app/(billing)/layout.tsx` (its pages on the surface), `app/(specialists)/panel/{reports,appointments,profile,specialties}/page.tsx` (on the surface), `app/(specialists)/panel/agenda/**` (on the surface until phase 3)
- Modify: `app/ui/motion/page-transitions.css` if the sidebar needs its own names

**Interfaces:**

- `PanelNav({ orientation: 'vertical' | 'horizontal' })` — vertical: the sidebar's list (icon 16, label 14, the current one `text-primary font-bold` on a `bg-blue-50` mark that slides, `vt-panel-nav-pill`), horizontal: today's tabs (phones).
- `PanelSurface({ children, className })` — `rounded-xl bg-pure-white p-5 shadow-md sm:p-6`.
- `ProfileStateChip()` — the account's `activationTone` as the app's badge (`profile.status.*`), a link to «Mi perfil»; nothing for an account without the specialist facet.
- `RequireSession` gains `stateClassName?: string` applied to its wrong-area and account-error states.

- [ ] **Step 1: Write the failing tests**: `profile-state-chip.test.tsx` — «Perfil activo» for a visible profile, «En revisión» for `specialtiesPending`, «Registro incompleto» for an open sign-up, a link to `/panel/profile`, nothing for an admin; `panel-nav.test.tsx` — the vertical list names the four sections and marks the current one; «an admin's frame has no sections» kept.
- [ ] **Step 2: Run** — FAIL.
- [ ] **Step 3: Implement** the frame: `bg-primary` to the edges; from `lg` the sticky sidebar (`w-62.5`, `rounded-xl`, the brand wordmark, `PanelNav vertical`) beside the column; the bar (`PanelBar`): on phones the white wordmark left and the controls right, then `PanelNav horizontal`; from `lg` the controls alone at the column's top right (chip, bell, account; `SessionControls tone="inverse"`); `main` (`FrameTransition`) with the page.
- [ ] **Step 4: Run** the tests — PASS; `pnpm typecheck`.

### Task 3: The home

**Files:**

- Create: `app/(specialists)/_components/panel-activation-card.tsx`, `panel-week-agenda.tsx`, `panel-week-chart.tsx`, `use-profile-activation.ts`, `week.ts` (the current week's days, Monday to Sunday, in Caracas) and their tests
- Modify: `app/(specialists)/_components/panel-greeting.tsx`, `panel-plan-card.tsx`, `specialist-home-skeleton.tsx`, `panel-home.test.tsx`; `app/(specialists)/panel/page.tsx`
- Create: `public/illustrations/panel/plans.svg` (Figma `4644:2529`)
- Modify: `app/lib/i18n/messages/es.json`, `app/lib/i18n/client-messages.ts` (`panelHome`)

**Interfaces:**

- `useProfileActivation(user): { activation: ProfileActivation | null; resolving: boolean }` — `/me`, the subscription (`hasAccess`), `myProfileQueryOptions` (a verified specialty), `myOfficesQueryOptions` and per active office `officeScheduleQueryOptions` / per office `officePricingQueryOptions` (the same cache as «Mi perfil»).
- `currentWeek(today: string): string[]` (seven `YYYY-MM-DD`, Monday first).

- [ ] **Step 1: Write the failing tests** (`panel-home.test.tsx`, MSW):
  - «greets the specialist on the blue»: `h1` «Hola, Dr. Luis Gómez».
  - «shows how far the profile is from the search»: a profile in `noSchedules` → «URGENTE», «Tu cuenta está al N %», «Falta un paso: configura tus horarios de atención.», a link to `/panel/profile`.
  - «puts the notice first and hides the activation»: an unpaid receipt → the notice, no «Tu cuenta está al».
  - «offers no plan before a verified specialty»: no subscription, specialties under review → no «Ver planes».
  - «offers the plans once a specialty is verified»: no subscription, a verified specialty, registration completed → «¡Llega a más pacientes desde hoy!» and «Ver planes» → `/pay`.
  - «shows the week's open appointments with access»: an active plan, appointments this week → seven days with their counts, today chosen, its first open appointment («Ver todas» → `/panel/agenda/{today}`); choosing another day shows its own.
  - «draws the week's appointments per day»: the chart's table names each day and its count.
  - `currentWeek('2026-11-04')` → `2026-11-02` … `2026-11-08`.
- [ ] **Step 2: Run** — FAIL.
- [ ] **Step 3: Implement** the cards in the frame's two columns (`lg:grid-cols-2`): row one the notice or the activation, and the plan; row two «Agenda» and «Esta semana» (titles on the blue), only with access; then the daily summary switch and «Tu perfil» (today's). The activation card is a link to «Mi perfil» (the app's sheet is the profile's status there); under review it says the app's «Estamos verificando tu cuenta.» and what can be set meanwhile.
- [ ] **Step 4: Run** — PASS.

### Task 4: Copy, docs, the look, the gate

- [ ] **Step 1:** AGENTS.md (§3 layout: the frame, `app/lib/profile`, `app/ui/specialists/profile-state-chip`; §13 «Decided (2026-11-03)» phase 2), README if it names the panel's layout.
- [ ] **Step 2:** Screenshots on desktop and phone against `4644:2329` (scratch spec over the e2e fixtures as a specialist), fix what differs; the panel's other pages checked on the surface (statistics, «Mi suscripción», `/pay`).
- [ ] **Step 3:** `pnpm check`; the panel e2e (`session-links` specialist links) on :3300.
- [ ] **Step 4:** Commit `v0.35.0, …`.
