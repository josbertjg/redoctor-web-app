# Phase 4 — A new appointment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** «Nueva cita» as the designer drew it (`4662:370` when, `4663:3952` who, `4664:4414` done): the specialist books a patient — registered or new — from «Citas» and from the home, with the app's rules and words.

**Architecture:** The write and the patient search join the appointment queries (`bookAsSpecialist`, `specialistPatientsQueryOptions`), parsed by new schemas in `app/lib/schemas/appointments.ts`. The dialog is the agenda's (`?new=1` in its address, like `?appointment=`): one sheet, three steps (when, who, done), the slot picking reused from `app/ui/appointments`, the person's checks from `usePersonChecks`, the invitation shared with the same step the actions use.

**Tech Stack:** Next.js 16, React 19, TanStack Query 5, react-hook-form + zod, next-intl 4, Vitest 5 + MSW 3.

**Spec:** `docs/superpowers/specs/2026-11-03-web-redesign-design.md` (Phase 4).

## Global Constraints

- The API (`dev` 56bb6fd): `POST /scheduling/specialist/appointments` `{officeId, date, startTime, specialtyId?, consultationReasonId?, notes?, patientUserId XOR patient{firstName, lastName, dateOfBirth, documentType+documentNumber (together; required from 9 years and a month), sex?, phone (always: where the link goes)}}` → 201 `{appointment, invitation | null}`; errors ERR_4002 (slot taken), ERR_5052 (no active plan, 403), ERR_3045 (reason not in the office), ERR_4010 (one's own account), ERR_2001, ERR_3020. `GET /scheduling/specialist/patients?search=` (3–120 chars; names partial, document and email exact) → `{patients: [{patientProfileId, userId, firstName, lastName, email, documentType, documentNumber, sex, dateOfBirth, phone, profileStatus, missingData[]}]}`; missing data never blocks booking.
- The app's rules (v0.177.0, `PatientsSearchCubit`): the document searches from 6 digits, the names from 3 letters, after 400 ms; an answer to an older term is dropped. Its words: `appointments.booking.*`.
- The specialty only with one branch (`bookingSpecialtyId`), the reasons with their prices (`officeServicesQueryOptions`, `toBookingReasons`), the document rule `terceroNeedsDocument`.
- Every write through the write-once guard; a lost answer looks for it in that day's agenda first.
- A plan that lacks booking (ERR_5052, or a subscription with no access) invites to the plans, never support (§1).

## Review Focus

- A slot taken while the specialist typed (ERR_4002): back to the hours with «Ese horario ya no está libre», what was typed kept → Task 3 test.
- A lost answer: one appointment, not two → Task 1 test.
- A search answer that lands after the term changed: never shown → Task 2 test.
- A patient of 9 years and a month or more with no document: refused before sending; younger, the document is not asked → Task 3 test.
- No plan: the dialog offers the plans instead of the form → Task 3 test.

---

### Task 1: The write and the search

**Files:** `app/lib/schemas/appointments.ts`, `app/lib/queries/appointments.ts` (+ tests), `tests/msw/handlers/appointments.ts`, `tests/factories/appointments.ts`

**Interfaces:**

- `specialistPatientsQueryOptions(user, term)` → `SpecialistPatient[]` (`{userId, firstName, lastName, document: {type, number} | null, sex, dateOfBirth (YYYY-MM-DD) | null, phone, missing: string[]}`), key `['specialist-patients', userId, term]`.
- `bookAsSpecialist(user, request: SpecialistBookingRequest)` → `{ appointment: AppointmentResponse; invitation: { token: string; phone: string | null } | null }`.

- [ ] Tests first: the search parses and maps; the booking posts its body (registered: `patientUserId`; new: `patient`), returns the appointment and the invitation; a lost answer finds it in that day's agenda and does not post twice.

### Task 2: The patient search on the form

**Files:** `app/(specialists)/_components/agenda/new-appointment/use-patient-search.ts` (+ test)

- `usePatientSearch(user, term, origin: 'document' | 'name')` → `{ results, searching, failed }`: below the origin's minimum (6 digits / 3 letters) nothing is asked; after 400 ms; the results of an older term never show.

### Task 3: «Nueva cita»

**Files:** `app/(specialists)/_components/agenda/new-appointment/{new-appointment-dialog,when-step,who-step,booked-step}.tsx` (+ `new-appointment-dialog.test.tsx`); `agenda-address.ts` (`?new=1`), `agenda-toolbar.tsx` («+»), `agenda-view.tsx`, `panel-week-agenda.tsx` («Agendar cita»); `specialist-actions.tsx` (export the share step).

- [ ] Tests first (component, MSW): with a plan, the office (preselected with one) and a free hour → «Continuar»; the document finds a registered patient, its card says what is missing and «Cambiar por otro paciente» undoes it; a new patient's form (names, birth date, document when 9y1m or older, sex, phone) books and ends on «¡Todo listo!» with «Compartir invitación»; a registered one ends with the registered words and no invitation; ERR_4002 goes back to the hours with the app's words; without a plan the plans are offered.

### Task 4: Docs, the look, the gate

- [ ] `panel.home.profile.description` (booking is no longer the app's alone); AGENTS.md §1 M14, §3, §13 phase 4; screenshots against the three frames; `pnpm check`; e2e on :3300 (a specialist books a new patient); commit `v0.37.0, …`.
