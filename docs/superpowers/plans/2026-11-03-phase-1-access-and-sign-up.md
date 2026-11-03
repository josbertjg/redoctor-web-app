# Phase 1 — Access and sign-up Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/sign-in` and `/sign-up` on the designer's blue scene, and a sign-up that starts with «¿Quién eres?», lets a stranger create the account in place, and signs up specialists on the web.

**Architecture:** An `(auth)` layout draws the scene (blue, white bar, decorations); both pages render a shared `AuthCard`. The sign-up's step lives in the address (`?as=patient|specialist`, by `pushState`) and in `planSignUp`, which now also plans for a stranger. Specialists register with one `POST /identity/register` (`role: SPECIALIST`), then are handed to the app.

**Tech Stack:** Next.js 16 App Router, React 19, TanStack Query 5, react-hook-form + zod 4, next-intl 4, Vitest 5 + MSW 3 + jest-axe, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-03-web-redesign-design.md` (Phase 1).

## Global Constraints

- Tokens only (AGENTS.md §7): the scene is `bg-primary`; the card `rounded-2xl` (30), `shadow-md`, `bg-pure-white`; the icon circle `size-15` on `bg-blue-50` with the icon `text-primary`; titles `text-subtitle-l font-bold`; card text `text-grey-800`.
- Never a disabled control; the wait inside the button (`loading`) and a guard in the handler (§8.3).
- Every user-facing string through i18n; keys mirror the app's where the app has them (`auth.alreadyHaveAccount`, `auth.signupQuickAndSecure1/2`, root `signup`, `login`).
- Decorations are `aria-hidden`, SVG files under `public/illustrations/auth/`, never through the image optimizer (§8.12).
- No SMS step; Apple stays next to Google; the specialist card keeps `auth.iWantToConnectWithPatients` (the frame's «historias clínicas» promises records Redoctor does not keep: legal terms, M10).
- The step changes go through `moveStep` (`StepTransition`), the end under the green wipe, an in-place sign-in under the blue one (`useSignInArrival`).

## Review Focus

- A stranger who opens an old `/sign-up?redirect=/i/{token}` link: lands on «Crea tu cuenta como paciente» with the buttons, never on a role choice and never bounced to `/sign-in` → Task 5 test «a stranger from an invitation creates a patient account in place».
- Someone with an account who taps «Regístrate» and signs in: goes where signing in leads, never to a form → Task 2 test «a registered account is done whatever the role».
- The browser's back button after choosing a role: returns to «¿Quién eres?» → Task 5 test «the role lives in the address».
- A specialist whose document belongs to another account: told under the field, nothing written → Task 5 test in `specialist-sign-up-form.test.tsx`.
- An account in `PENDING_PHONE_VERIFICATION` (if the API ever turns SMS on): the app, never a dead end → Task 2 test «an open specialist sign-up finishes in the app».

---

### Task 1: The specialist's registration contract

**Files:**

- Modify: `app/lib/schemas/identity.ts` (next to `patientRegistrationBodySchema`)
- Modify: `app/lib/queries/identity.ts`
- Modify: `tests/msw/handlers/identity.ts`
- Modify: `tests/factories/identity.ts`
- Create: `app/lib/queries/identity.test.ts`

**Interfaces:**

- Produces: `specialistRegistrationBodySchema`, `type SpecialistRegistrationBody`, `type RegistrationBody = PatientRegistrationBody | SpecialistRegistrationBody`; `registerAccount(user: TokenHolder, body: RegistrationBody): Promise<Account>` (replaces `registerPatient`, same write-once guard and 409 handling); `takenIdentityField(error: unknown): 'document' | 'phone' | null` and `refreshIdToken(user: TokenHolder): Promise<void>` (moved out of `patient-sign-up-form.tsx`, same behavior); factory `buildPendingSpecialistMeResponse()`.

- [ ] **Step 1: Write the failing tests** in `app/lib/queries/identity.test.ts`:
  - `registers a specialist with the API's body`: `registerAccount(user, specialistBody)` resolves an `Account` with `registration: 'pendingCompleteSpecialist'` and `specialist.exists === true`; the MSW handler received `role: 'SPECIALIST'` with `phone`, `dateOfBirth`, `sex`, `documentType`, `documentNumber`.
  - `counts a registration already done as done`: the handler answers 409 and `/me` is registered → resolves that account.
  - `names the field another account has`: `takenIdentityField` → `'document'` for a 409 `ERR_2011`, `'phone'` for a 409 `ERR_1005` with `details.phone`, `null` for a 500.
- [ ] **Step 2: Run** `pnpm vitest run app/lib/queries/identity.test.ts` — expect FAIL (`registerAccount` not exported).
- [ ] **Step 3: Implement.** `specialistRegistrationBodySchema = z.strictObject({ role: z.literal('SPECIALIST'), firstName, lastName (1–100), phone: z.string().min(1), dateOfBirth: YYYY-MM-DD, sex: z.enum(sexes), documentType: z.enum(documentTypes), documentNumber: /^\d{6,8}$/, acceptedTerms: z.literal(true), acceptedSensitiveData: z.literal(true), acceptedNewsletter: z.boolean() })` (the API's `RegisterSpecialistSchema`). The MSW handler parses either schema; SPECIALIST answers `buildPendingSpecialistMeResponse()` (`role: 'SPECIALIST'`, `registrationStatus: 'PENDING_COMPLETE_SPECIALIST'`, `profiles.specialist` with the status the API derives for it — check `deriveRegistrationStatus` in the API, read only). Update the one caller (`patient-sign-up-form.tsx`).
- [ ] **Step 4: Run** the new test and `pnpm vitest run "app/(auth)"` — expect PASS.

### Task 2: The sign-up's plan, for strangers and roles

**Files:**

- Modify: `app/lib/auth/sign-up.ts`
- Modify: `app/lib/routes.ts`
- Modify/Create: `app/lib/auth/sign-up.test.ts`, `app/lib/routes.test.ts` (whichever exists)

**Interfaces:**

- Produces: `type SignUpRole = 'patient' | 'specialist'` (moves here from `role-choice.tsx`); `signUpRoleOf(value: string | null | undefined): SignUpRole | null`; `planSignUp(account: Account | null, redirect: string | null | undefined, role: SignUpRole | null): SignUpPlan` with the plan
  `{ step: 'choose-role' } | { step: 'create'; role: SignUpRole; canGoBack: boolean } | { step: 'patient'; register: boolean; personalData: boolean } | { step: 'specialist' } | { step: 'specialist-in-app' } | { step: 'done' }`;
  `routes.signUp(redirect?: string, as?: SignUpRole)` → `/sign-up`, `/sign-up?as=…`, `/sign-up?redirect=…` or `/sign-up?as=…&redirect=…`.

- [ ] **Step 1: Write the failing tests**:
  - stranger: no role → `choose-role`; `role: 'specialist'` → `{ step: 'create', role: 'specialist', canGoBack: true }`; `redirect: '/i/tok'` (any role) → `{ step: 'create', role: 'patient', canGoBack: false }`; `redirect: '/book/x'` likewise.
  - brand-new account: no role → `choose-role`; `patient` → `{ step: 'patient', register: true, personalData: false }`; `specialist` → `{ step: 'specialist' }`; `redirect: '/i/tok'` → `{ step: 'patient', register: true, personalData: true }`.
  - «a registered account is done whatever the role»: a complete patient with `role: 'specialist'` → `done`.
  - «an open specialist sign-up finishes in the app»: specialist facet `PENDING_PHONE_VERIFICATION` / `PENDING_SPECIALTIES` → `specialist-in-app`; `WAITING_ADMIN_REVIEW` → `done`.
  - routes: `routes.signUp(undefined, 'specialist') === '/sign-up?as=specialist'`; `routes.signUp('/i/t', 'patient') === '/sign-up?as=patient&redirect=%2Fi%2Ft'`.
- [ ] **Step 2: Run** `pnpm vitest run app/lib/auth app/lib/routes` — expect FAIL.
- [ ] **Step 3: Implement** in the order above (purpose beats role; `needsSignUp` before the facets; then `specialistMustFinishInApp`, then `mustFinishPatientSignup` for a purpose).
- [ ] **Step 4: Run** — expect PASS; `pnpm typecheck` passes with the callers updated (`sign-up-flow.tsx`).

### Task 3: The scene and the card

**Files:**

- Create: `public/illustrations/auth/{door,plant,lamp,role-patient,role-specialist,create-patient,create-specialist}.svg` (from the Figma exports `4606:2091`, `4606:2171`, `4606:2176`, `4613:3218`, `4613:3234`, `4613:4056`, `4612:2976`; `viewBox` kept, fixed `width`/`height` attributes removed)
- Create: `app/(auth)/layout.tsx`, `app/(auth)/_components/auth-scene.tsx`, `app/(auth)/_components/auth-card.tsx`, `app/(auth)/_components/auth-card.test.tsx`
- Modify: `app/ui/auth/session-controls.tsx`, `app/ui/auth/session-button.tsx`, `app/ui/notifications/notifications-bell.tsx`, `app/ui/notifications/bell-popover.tsx`
- Modify: `app/ui/motion/page-transitions.css` only if the inverse bar's name needs a rule (it has `vt-site-header-inverse`)

**Interfaces:**

- Produces: `AuthCard({ icon: IconComponent; title: ReactNode; description?: ReactNode; illustration?: ReactNode; onBack?: () => void; footer?: ReactNode; headingLevel?: 1 | 2; className?: string; children?: ReactNode })` — a `<section aria-labelledby>` with the back arrow (`aria-label` `signUp.back`) when `onBack` is set; `SessionControls` gains `tone?: 'default' | 'inverse'` and `hideSignIn?: boolean` (nothing while signed out).
- Scene: `SiteHeader tone="inverse"` with `SessionControls tone="inverse" hideSignIn`; the decorations `hidden lg:block`, absolute, `pointer-events-none`: the door bottom left (≈ 33 rem wide, overflowing the left edge as the frame), the plant and the lamp bottom right; the page's `<main>` above them (`relative z-10`), the card centred, `px-gutter py-10`.

- [ ] **Step 1: Write the failing test** `auth-card.test.tsx`: renders the title as `h1` and labels the section with it; `onBack` renders a button named «Volver» that calls it; no back button without it; `axe` passes.
- [ ] **Step 2: Run** `pnpm vitest run "app/(auth)/_components/auth-card.test.tsx"` — FAIL.
- [ ] **Step 3: Implement** the card, the scene, the layout, the inverse tone (bell `text-white-50 hover:bg-white-50/15`, focus `ring-white-50/70`), and the SVG files.
- [ ] **Step 4: Run** the test — PASS.

### Task 4: The sign-in page

**Files:**

- Modify: `app/(auth)/sign-in/page.tsx` (no `SiteHeader`: the layout has it)
- Modify: `app/(auth)/_components/sign-in-card.tsx`
- Create: `app/(auth)/_components/sign-in-card.test.tsx`
- Modify: `app/lib/i18n/messages/es.json`, `app/lib/i18n/client-messages.ts` (`pageNamespaces.signIn` gains `signup`)

**Interfaces:**

- Consumes: `AuthCard` (Task 3), `routes.signUp` (Task 2).
- Copy: `auth.noAccountYet` «¿Aún no tienes una cuenta?», root `signup` «Regístrate» (the app's).

- [ ] **Step 1: Write the failing test**: a signed-out card shows «Inicia sesión de manera rápida y segura», both provider buttons, and a link «Regístrate» to `/sign-up?redirect=%2Fa%2F1` when `redirect="/a/1"` (and to `/sign-up` without one); axe passes.
- [ ] **Step 2: Run** — FAIL.
- [ ] **Step 3: Implement** with `AuthCard` (icon `login`); keep the card's logic (skeleton while checking, the blue wipe, `AccountErrorState`).
- [ ] **Step 4: Run** — PASS.

### Task 5: The sign-up flow

**Files:**

- Modify: `app/(auth)/sign-up/page.tsx` (no `SiteHeader`; no `joinApp`)
- Modify: `app/(auth)/_components/sign-up-flow.tsx`, `role-choice.tsx`, `sign-up-done.tsx`, `patient-sign-up-form.tsx`, `sign-up-skeleton.tsx`
- Create: `app/(auth)/_components/create-account-step.tsx`, `specialist-sign-up-form.tsx`, `specialist-sign-up-form.test.tsx`, `sign-up-consents.tsx`
- Modify: `app/(auth)/_components/sign-up-flow.test.tsx`
- Modify: `app/ui/app-bridge/app-access.tsx` (the `join` variant goes if nothing else uses it; a `created` variant: «¡Tu cuenta está creada!» and why the app comes next)
- Modify: `app/lib/i18n/messages/es.json`, `app/lib/i18n/client-messages.ts` (`pageNamespaces.signUp` gains `signup`, `login`, `next`)

**Interfaces:**

- Consumes: `planSignUp`, `signUpRoleOf`, `routes.signUp` (Task 2); `AuthCard` (Task 3); `registerAccount`, `takenIdentityField`, `refreshIdToken` (Task 1); `useSignInArrival` (`app/ui/auth`).
- `SignUpFlow({ redirect: string | null; finishApp: ReactNode; createdApp: ReactNode })` reads `as` with `useSearchParams()`; the role changes by `moveStep(dir, () => history.pushState(null, '', routes.signUp(redirect ?? undefined, role)))`.
- `CreateAccountStep({ role: SignUpRole; redirect: string | null; onBack?: () => void; onSignedIn: (user, provider) => void })`.
- `SpecialistSignUpForm({ user: SessionUser; onDone: () => void })`.
- `SignUpConsents({ terms, sensitiveData, newsletter: UseFormRegisterReturn; errors: { terms?: string; sensitiveData?: string } })`.
- Copy (web's own, under `signUp`): `createTitle.patient` «Crea tu cuenta como paciente», `createTitle.specialist` «Crea tu cuenta como especialista», `createDescription.patient` «Completa tu perfil y comienza a agendar citas.», `createDescription.specialist` «Completa tu perfil profesional y empieza a recibir y organizar tus citas.»; app's: `auth.signupQuickAndSecure1/2`, `auth.alreadyHaveAccount`, `login`.

- [ ] **Step 1: Write the failing tests** (`sign-up-flow.test.tsx`, with the session mocked as today; signed out = `status: 'signed-out'`):
  - «a stranger chooses who they are, then creates the account in place»: «¿Quién eres?» with «Paciente» and «Especialista»; choosing «Especialista» pushes `/sign-up?as=specialist` and shows «Crea tu cuenta como especialista», «Continuar con Google», «Continuar con Apple» and the link «Inicia sesión» to `/sign-in`.
  - «the role lives in the address»: with `?as=patient` the create step shows; «Volver» pushes `/sign-up`.
  - «a stranger from an invitation creates a patient account in place»: `redirect="/i/tok"` shows «Crea tu cuenta como paciente» with no «Volver» and never calls `router.replace`.
  - «a brand-new specialist fills the form and is handed to the app»: `?as=specialist`, new account → the form; filled and sent → `POST /identity/register` with `role: 'SPECIALIST'`; under the green wipe → the `createdApp` content.
  - Kept: the invitation, booking, private-email, open-specialist, «¡Todo listo!» and «moves on» cases.
  - `specialist-sign-up-form.test.tsx`: asks names, date of birth, document, sex, phone and the consents (axe); refuses a minor and a non-Venezuelan mobile; stops before writing when the document is taken (`takenDocumentNumber`); sends the API's body with clean names, `+58…` phone and digits-only document.
- [ ] **Step 2: Run** `pnpm vitest run "app/(auth)"` — FAIL.
- [ ] **Step 3: Implement** the steps as the plan says, each card an `AuthCard`: role choice (icon `emoticon`, the two avatars from `role-*.svg`), create step (icon `person`/`stethoscope`, the illustration, the two-line «Regístrate de manera / rápida y segura», `SignInButtons`, footer «¿Ya tienes una cuenta? Inicia sesión»), the patient form card (icon `person`), the specialist form card (icon `stethoscope`, «Volver» to the roles), the specialist form (the app's order: names, date of birth, document, sex, phone, consents; «Continuar»; document checked first; one `registerAccount`; fresh token), done screens under the green wipe.
- [ ] **Step 4: Run** — PASS.

### Task 6: The landing's link, the e2e, the docs, the gate

**Files:**

- Modify: `app/(marketing)/_components/how-it-works.tsx` (specialists' «Comenzar» → `routes.signUp(undefined, 'specialist')`)
- Modify: `tests/e2e/auth.spec.ts` (the stranger test: stays on `/sign-up`, «Crea tu cuenta como paciente», Google's button), `tests/e2e/session-links.spec.ts` (the other-browser test signs in on `/sign-up` itself)
- Modify: `AGENTS.md` (§1 M3 and the rules, §3 `(auth)` and `public/illustrations/auth`, §13 «Decided (2026-11-03)»), `README.md` if it says patients only
- Modify: `package.json` (`0.33.0` → `0.34.0`)

- [ ] **Step 1:** Update the landing link and both e2e tests.
- [ ] **Step 2:** Look at the pages in a real browser (scratch Playwright script on a dev server off :3000) against the frames `4606:1992`, `4612:2215`, `4612:2815`, `4613:3886`, phone and desktop; fix what differs.
- [ ] **Step 3: Run** `pnpm check` — expect exit 0; then the two touched e2e specs on :3300 against a production build.
- [ ] **Step 4: Commit** `v0.34.0, …` (one line, as AGENTS.md §0).
