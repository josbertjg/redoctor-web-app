# Phase 3 — The appointments and their actions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** «Citas» as the designer drew it (`4647:2160` week, `4669:2956` day) and «Ver cita» (`4669:2206`) with the actions the app gives a specialist: finish the consultation, mark a no-show, reschedule, cancel, share the invitation.

**Architecture:** The specialist's writes join the appointment writes (`change()` gains who acts: the specialist's endpoints under `/scheduling/specialist/appointments/:id/*`), and what is offered is decided once (`specialistOffer`, the app's `offerFor`). The actions are one shared piece (`app/ui/appointments/specialist-actions.tsx`) used by `/a/{id}` and by the panel's dialog; the slot picking moves to `app/ui/appointments/` so it can be shared. «Citas» is rewritten as a day view and a week view, both read from the address.

**Tech Stack:** Next.js 16, React 19, TanStack Query 5, next-intl 4, Radix Dialog (`Sheet`), Vitest 5 + MSW 3.

**Spec:** `docs/superpowers/specs/2026-11-03-web-redesign-design.md` (Phase 3).

## Global Constraints

- The app's rules (v0.177.0): `AppointmentDetailActions.offerFor` — nothing on a closed appointment (cancelled, completed, no-show); close-out (finish, no-show) on the appointment's day or within 24 h after it ends; reschedule and cancel while it has not ended; the specialist confirms nothing. Its confirmations: `appointments.detail.completeWarning`, `noShowWarning`, `cancelWarningSpecialist` (who, day, hour; no reason asked), and its results' titles and descriptions (`completedTitle/Description`, `noShowTitle/Description`, `cancelledTitle` + `cancelledDescriptionSpecialist`, `rescheduledTitle` + `rescheduledDescriptionSpecialist`).
- The status colours as the app's (`appointment_status_ui.dart`): pending warning, confirmed green, finished blue, rescheduled orange, no-show grey, cancelled red; accent 300 (cancelled 400), fill 50, text 700.
- Every write through the write-once guard; the answer replaces the appointment in the caches and the agenda's lists are read again.
- Weeks run Monday to Sunday (phase 2's ruling); the status filter starts at «Todas»; the address carries the view, the filters and the open appointment.
- The app's words where it has them (`appointments.status.*`, `appointments.filters.*`, `appointments.hub.*`, `appointments.detail.*`); the web's own under `panel.agenda.*`.

## Review Focus

- An appointment that ended yesterday and nobody closed: still offers «Finalizar consulta» and «No asistió» within 24 h, and nothing else → Task 2 test «closes out up to a day after it ends».
- A double tap on «Finalizar consulta», or an answer lost: one write, the appointment as the API left it → Task 2 test on the guard and the 409.
- An hour just taken when rescheduling (ERR_4002): said in the sheet, the person stays to pick another → Task 3 test.
- A deep link `/panel/agenda/{date}?appointment={id}` (or a stale id): the dialog opens, or says the appointment is not found, the agenda stays → Task 5 test.
- The week with two appointments at the same hour: side by side, never on top of each other → Task 5 test on the layout.

---

### Task 1: The slot picking, shared

**Files:**

- Move (`git mv`): `app/(appointments)/_components/{slot-picker,month-calendar,slot-choices,load-failure}.tsx` → `app/ui/appointments/`
- Modify: their importers (`reschedule-sheet.tsx`, `booking/slot-step.tsx`, any test)

- [ ] **Step 1:** Move and rewrite imports.
- [ ] **Step 2: Run** `pnpm typecheck` and `pnpm vitest run "app/(appointments)" app/ui/appointments` — PASS (a refactor: the existing tests are the gate).

### Task 2: The specialist's writes and what is offered

**Files:**

- Modify: `app/lib/queries/appointments.ts`, `app/lib/schemas/appointments.ts` (+ tests), `tests/msw/handlers/panel.ts`

**Interfaces:**

- `completeAppointment(user, appointmentId, { noShow: boolean }): Promise<AppointmentResponse>` (landed: `COMPLETED` or `NO_SHOW` as asked)
- `cancelAsSpecialist(user, appointmentId)`, `rescheduleAsSpecialist(user, appointmentId, slot)` (same `landed` as the patient's)
- `appointmentInvitationQueryOptions(user, appointmentId)` → `{ phone: string | null; url: string | null }` (`GET …/specialist/appointments/:id/invitation`)
- `specialistOffer(appointment: AppointmentSummary, now: Date): { closeOut: boolean; upcoming: boolean; shareInvitation: boolean }`

- [ ] **Step 1: Write the failing tests**: the writes post to the specialist's paths with their bodies (`{ noShow: true }`, `{}`, the slot) and return the appointment; a 409 that already landed counts as done; `specialistOffer`: today pending → closeOut and upcoming; ended 3 h ago → closeOut only; ended 30 h ago → nothing; completed → nothing; tomorrow → upcoming only; unclaimed (`patientId` null) and open → shareInvitation.
- [ ] **Step 2: Run** — FAIL. **Step 3: Implement.** **Step 4: Run** — PASS.

### Task 3: The specialist's actions

**Files:**

- Create: `app/ui/appointments/specialist-actions.tsx` (+ test)
- Move and generalize: `reschedule-sheet.tsx` → `app/ui/appointments/` with a `reschedule` function and its words by who acts

**Interfaces:**

- `SpecialistActions({ appointment: AppointmentSummary; user: SessionUser; now: Date; onChanged: (appointment: AppointmentResponse) => void })`: the buttons the offer gives (the frame's: «Finalizar consulta» primary full width; then «No asistió» white, «Reprogramar» orange-50, «Cancelar» error-500), «Compartir invitación» when unclaimed; each confirmation in a `Sheet` with the app's words; the reschedule in the shared sheet; results as toasts.

- [ ] **Step 1: Write the failing tests**: offers by state; finishing asks, then posts and reports the new appointment (`onChanged`) and the toast «Consulta finalizada»; «No asistió» likewise; cancelling names the patient, day and hour; an hour taken (ERR_4002) on rescheduling is said in the sheet; sharing the invitation opens WhatsApp to the invited phone with the link.
- [ ] **Step 2–4:** RED → implement → GREEN.

### Task 4: `/a/{id}` for the specialist

**Files:** `app/(appointments)/_components/appointment-view.tsx`, `appointment-flow.test.tsx`

- [ ] **Step 1: Write the failing test**: a specialist opening their patient's pending appointment of today sees «Finalizar consulta», «No asistió», «Reprogramar», «Cancelar» (no «Abrir en la app» card); finishing updates the page.
- [ ] **Step 2–4:** RED → replace the read-only card with `SpecialistActions` (the caches updated with the answer) → GREEN.

### Task 5: «Citas»

**Files:**

- Create: `app/(specialists)/_components/agenda/{agenda-view,agenda-toolbar,agenda-week,agenda-day-list,agenda-month,agenda-next,appointment-dialog}.tsx`, `agenda/{agenda-address,week-layout}.ts` (+ tests)
- Modify: `app/(specialists)/panel/agenda/page.tsx`, `[date]/page.tsx` (no surface), `panel-skeleton.tsx`, `panel-home.tsx` (the week's appointment opens the dialog), `app/ui/appointments/month-calendar.tsx` (optional `marked` days and past months, default unchanged)
- Remove: `agenda-day.tsx` and what only it used

**Interfaces:**

- `agendaAddress(pathDate: string | null, search: URLSearchParams, wide: boolean, today: string): { date: string; view: 'day' | 'week'; status: AppointmentStatus | null; officeId: string | null; appointmentId: string | null }` and `agendaHref(state): string`.
- `weekLayout(appointments, days): { hours: { from: number; to: number }; blocks: { appointment; day: string; top: number; height: number; column: number; columns: number }[] }` (minutes from `from`; overlapping ones split the column).
- `AppointmentDialog()` — reads `?appointment=`, a `Sheet` (wide) with the frame's «Ver cita»: the status band, the patient (initials, name, age, sex, document, the reason as a chip), the details (day, office, hours, reason, notes) and `SpecialistActions`; closing removes the parameter.

- [ ] **Step 1: Write the failing tests**: `agendaAddress` (a date in the path or a phone → day; `?view=week`; malformed parameters ignored); `weekLayout` (hours from 8 to 18 at least; two at 9:00 → two columns); `agenda-view.test.tsx` — the week view draws each appointment in its day (desktop), the day view lists them with their chip, «Hoy»/«Mañana» move the date, the status filter keeps the matching ones, an appointment opens the dialog with its actions, a stale `?appointment=` says it was not found.
- [ ] **Step 2–4:** RED → implement → GREEN.

### Task 6: Docs, the look, the gate

- [ ] AGENTS.md (§1: the panel acts on appointments; §3 layout; §13 phase 3), README if it says the panel reads only.
- [ ] Screenshots desktop and phone against the three frames; fixes.
- [ ] `pnpm check`; e2e (`session-links` specialist links: the agenda and `/a` as a specialist) on :3300.
- [ ] Commit `v0.36.0, …`.
