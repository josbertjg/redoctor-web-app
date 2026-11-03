# The designer's new web screens — design

Date: 2026-11-03. Owner: Josbert. Source: Figma «REDOCTOR APP», page «🌐 Landing
page» (`4424:341`), 17 frames named «ENTRAR», desktop only (1280 × 832), all on
the blue primary. Facts checked in the API (`../redoctor-api`, `dev` `56bb6fd`)
and the app (`redoctor-mobile-app` v0.177.0), read only.

## Intent

The designer redrew the web's way in (sign-in, sign-up) and the specialist's
panel (its home, the appointments as a calendar, creating an appointment, an
appointment's detail with its actions). The owner wants them applied in design
**and** logic, with the web's usual bar: modular, reusable, coherent, mobile
first, accessible, every word through i18n.

**The design is a reference, not a contract (owner, 2026-11-03):** what it
draws that the API or the app does not do is left out or replaced by what they
do; sample data is sample data.

## Decisions

The owner's (2026-11-03):

1. The blue screens are the reference. The login with a white left panel and
   the door (`4606:20`) is **not** used.
2. A specialist **signs up on the web** (this reverses AGENTS.md §1 M3,
   «patients only»). The form asks the usual data, as the app's: names, date
   of birth, ID document, sex, phone and the three consents.
3. **Finishing a specialist's sign-up** (specialty, licence number, university:
   `POST /specialists/complete-registration`) **stays in the app**. The web
   creates the account and hands over to the app.
4. The specialist's panel **acts on appointments** (this reverses §1 «Explicitly
   out of the pilot: acting on appointments from the specialist's panel»):
   create, reschedule, cancel, finish the consultation, mark a no-show.
5. Four phases, each committed apart (not pushed): (1) access and sign-up,
   (2) the panel and its home, (3) the appointments with their actions,
   (4) a new appointment.

Mine (the owner can overturn any):

- **No SMS code.** The API has `PHONE_VERIFICATION_ENABLED=false` and
  `KYC_ENABLED=false`, and the app runs `lowCost: true` in every flavor: the
  code screens (`4613:3375`, `4613:3973`) are not built. If the API ever puts
  an account in `PENDING_PHONE_VERIFICATION`, the web says to finish in the
  app (as it does for any open specialist sign-up).
- **Apple stays** next to Google on «Crea tu cuenta» (the design shows Google
  only): the same accounts as the app (§1).
- **«Iniciar cita» becomes «Finalizar consulta»** (the API has no «start»;
  `POST …/complete`), with «No asistió» (`noShow: true`), offered as the app
  offers them: on the appointment's day or up to 24 h after it ends, never on
  a closed appointment.
- **«Mensajes» is left out** of the sidebar (no messaging exists in the API or
  the app). **«Suscripción» stays** (the web sells, §1).
- **«¡Todo listo!» of a new appointment** uses the app's words for the
  specialist (`appointments.booking.success*`), not the patient's copy the
  frame reuses, and offers to share the invitation when the patient has no
  account.
- **Patients without a photo** show their initials (the frames use one
  illustrated woman for everybody).
- **Phones are ours** (no phone frames): see each phase.
- **Panel pages with no new design** (statistics, subscription, receipts,
  balance, coupons, «Mi perfil», «Mis especialidades», `/pay`) keep their inner
  design inside the new frame, on a white surface, until the designer draws
  them.

## Constraints

- AGENTS.md is the contract: tokens only (every colour of the frames is in
  `tokens.css`: blue-50/100/200/300/400/500, green-50/500, warning-50/300,
  error-50/500, white-200/300/500, grey-500/700/800), no raw px, motion through
  `app/ui/motion`, i18n keys mirroring the app's (`auth.*`,
  `profile.activation.*`, `profile.status.*`, `appointments.detail.*`,
  `appointments.booking.*`), `PageTransition`/`StepTransition`, the wipes for
  the big moments, skeletons with final dimensions, never a disabled control.
- Every write that must not land twice goes through the write-once guard.
- The app's paths (§6) do not change; `/panel/agenda[/{date}]` keeps
  answering email 10.
- Rate limit 100/min per IP: no polling; the live channel (M17) already
  invalidates appointments on `data:changed`.
- Radii of the frames map to tokens as on the landing: 30 → `2xl`, 20 → `xl`,
  15 → `lg`, 10 → `md`.

## Phase 1 — Access and sign-up

Frames: `4606:1992` (sign in), `4612:2215`/`4613:3672` (who are you),
`4612:2815`/`4613:3783` (create your account as…), `4612:3028`/`4613:3886`
(the form).

- **The scene** (shared by `/sign-in` and `/sign-up`, an `(auth)` layout): the
  blue primary to the edges, the white wordmark top left (to the landing), the
  session controls in white when someone is signed in, the illustrations as
  decoration (`aria-hidden`; the door bottom left, the plant and the lamp
  bottom right) from `lg` up, and the white card centred (≈ 28 rem, `2xl`
  radius, the icon in a blue-50 circle, the title at 30 px, the line in
  grey-800). On phones the card fills the width with the 16 px gutter.
- **`/sign-in`:** the card as drawn (login icon, «Inicia sesión de manera
  rápida y segura», the line, Google and Apple, the legal line) plus
  «¿Aún no tienes una cuenta? Regístrate» → `/sign-up`, keeping `redirect`.
  Its logic does not change.
- **`/sign-up`, now open to strangers**, its step in the address (`?as=patient`
  or `?as=specialist`, by `pushState`, so the browser's back works):
  1. «¿Quién eres?» with the two cards (their avatars from the frames). Skipped
     when the flow is a patient's (`redirect` to `/i/…` or `/book/…`).
  2. «Crea tu cuenta como paciente | especialista»: the illustration, «Regístrate
     de manera rápida y segura», Google and Apple, «¿Ya tienes una cuenta?
     Inicia sesión», and the back arrow to step 1. Skipped when already signed
     in.
  3. After signing in, by what `/me` says: a brand-new account fills the form
     of the role chosen; an account already signed up goes where signing in
     leads (`destinationAfterSignIn`), as if it had used `/sign-in`.
  4. The form. Patient: as today (names and consents; the personal data too
     when claiming or booking). Specialist: names, date of birth (18+),
     document (checked against other accounts first, as the patient's), sex,
     phone (+58 mobile), the three consents → `POST /identity/register` with
     `role: SPECIALIST`, through the write-once guard; then a fresh token and
     `/me`.
  5. Done. Patient: as today. Specialist: «¡Tu cuenta está creada!» and «Termina
     tu registro en la app» (`AppAccess`, the store's QR or support), and «Ir a
     mi panel». The green wipe covers the change, as for a patient.
- An account whose specialist sign-up is open (any status before
  `WAITING_ADMIN_REVIEW`) keeps getting «Termina tu registro en la app».
- `RequireSession` keeps sending an account with no sign-up to `/sign-up` from
  every other page; `/sign-up` no longer sends strangers to `/sign-in`.
- The landing's «Comenzar» of the specialists' card goes to
  `/sign-up?as=specialist`.

## Phase 2 — The panel and its home

Frame: `4644:2329`.

- **The frame** (`PanelFrame`, every page under `/panel` and `/pay`): the blue
  primary to the edges. From `lg` up, the white sidebar (`xl` radius, the
  wordmark, the sections Inicio, Citas, Estadísticas, Suscripción, the current
  one in blue and bold, the mark sliding between them as today's) and, top
  right, the profile's state chip («Perfil activo», «En revisión», «Registro
  incompleto», «Perfil inactivo», «Acción requerida», the app's
  `profile.status.*`, leading to «Mi perfil»), the bell and the account. Below
  `lg`: a bar with the white wordmark, the chip (icon only on phones), the
  bell and the account, and the sections as a bottom tab bar (white, safe area
  aware).
- **Page titles** on the blue: white, 60 px from `lg` (smaller on phones). Pages
  with no new design render their content on a white `xl` surface.
- **Home:** «Hola,» (blue-200) and the name (white, 60 px). Then, two columns
  from `lg`:
  - **The profile's activation** (the app's `ProfileActivation`, ported as a
    pure function with its tests): «URGENTE» / «EN REVISIÓN», «Tu cuenta está
    al N %», the bar (25 % floor, nine milestones), «Falta un paso: …» or
    «Faltan N pasos: …», and the step's action (the app for what only the app
    does; `/pay` for the plan). Visible profile: «Tu perfil está activo».
  - **The plan:** the green «¡Llega a más pacientes desde hoy!» card with its
    illustration and «Ver planes» when there is no plan; the subscription's
    notice when there is one (as today); the plan in force otherwise.
  - **«Agenda»** with «N pacientes hoy» and «Ver todas» (→ Citas): the week's
    days with each day's count (today marked), and the chosen day's
    appointments as cards (time, patient, office) opening the appointment.
  - **«Esta semana»:** appointments per day this week as bars (today green),
    each bar labelled and read by a table for screen readers.
  - Below: the daily summary email switch and the links to «Mi perfil» and
    «Mis especialidades» (as today).

## Phase 3 — The appointments and their actions

Frames: `4647:2160` (week), `4669:2956` (day), `4669:2206` (an appointment).

- **«Citas»** at `/panel/agenda[/{date}]`, its view in the address
  (`?view=day|week`): without one, a date in the path or a phone means the
  day, otherwise the week. The bar: «Hoy», «Mañana», the status (Todas,
  Pendientes, Confirmadas, Finalizadas, No asistió, Canceladas), the filter
  (the office, with two or more), the day/week switch from `lg`, «+» (phase
  4), and the way to the history (`/panel/appointments`, kept, restyled).
  - **Week:** a white card with the days as columns, the hours as rows (the
    week's earliest to latest appointment, at least 8:00–18:00, scrolling
    inside), each appointment a block by its start and length in its status'
    colours (the app's: pending warning, confirmed green, finished blue,
    no-show grey, cancelled red; bar 300, fill 50), overlapping ones side by
    side, the previous and next weeks.
  - **Day:** «Agenda de hoy» (or the day's name) with its count, the list as
    cards (time, the status bar, patient, reason, office, chip); beside it
    from `lg` the month calendar (the day chosen, days with appointments
    marked) and «Próxima cita». On phones the week's days run across the top.
- **An appointment** (`?appointment={id}` on the agenda, a dialog on desktop
  and a sheet on phones; `/a/{id}` stays the full page and shows the same):
  the status band, the patient (initials or photo, name, age, sex, document,
  the reason as a chip), the details (day, office, hours, reason, notes), the
  reschedule history, and the actions, decided once as the app's `offerFor`:
  - «Finalizar consulta» and «No asistió»: the appointment's day or up to
    24 h after it ends, not closed (a sheet with the app's warning each).
  - «Reprogramar» (the office's month and free hours, `SlotPicker`) and
    «Cancelar» (a sheet, an optional reason): while it has not ended.
  - «Compartir invitación» while nobody claimed it (`patientUserId` null, not
    closed): WhatsApp to the invited phone with the link, or copy it.
  - Each write through the write-once guard; the answer replaces the
    appointment in the caches; the app's titles as toasts; ERR_4002 / 409s
    said in place.

## Phase 4 — A new appointment

Frames: `4662:370` (when), `4663:3952` (who), `4664:4414` (done).

- «+» on «Citas» (and «Agendar cita» on the home's agenda) opens «Nueva cita»:
  a wide dialog on desktop, a full sheet on phones, two steps and the end,
  sideways between them.
  1. **When:** the office (preselected with one), the month with its free days
     and the day's free hours by «Mañana», «Tarde», «Noche» (`SlotPicker`).
  2. **Who:** the document searches the specialist's patients as it is typed
     (`GET /scheduling/specialist/patients`, three characters at least; the
     names search too). A match becomes the patient's card («Paciente
     registrado», what is missing, «Cambiar por otro paciente»); otherwise the
     form registers a new one: names, date of birth, document (required from
     9 years and a month), sex, phone (where the invitation goes; a minor's
     representative's). The reason with its price (the office's services),
     when the office has any. «Agendar cita».
  3. **«¡Todo listo!»** with the app's words for a registered or an invited
     patient; «Compartir invitación» for an invited one; «Ver citas» shows the
     new appointment's day.
- `POST /scheduling/specialist/appointments` through the write-once guard (a
  lost answer looks for it in that day's agenda first); ERR_4002 goes back to
  the hours with «Ese horario ya no está libre»; the specialty as the web's
  booking sends it (only with one branch).

## Settled while reading this as its builder (mine)

- Weeks start on Sunday, as the frames' week and month («Domingo 31 … Sábado
  6», «D L M M J V S», «Dom … Sáb»).
- The status filter starts at «Todas» (the frame's «Pendientes» shows the
  control, not a default).
- The home's «Agenda» runs from today through the next six days (the frame's
  strip starts near today and scrolls); «Esta semana» is Sunday to Saturday.
- The appointment's dialog opens wherever the panel lists appointments (the
  home and «Citas»), by `?appointment={id}` on that page.
- The activation card reads what the app reads: `/me`, the subscription, and
  the professional profile with its offices, schedules and prices (the same
  queries as «Mi perfil», shared through the cache), its tasks behind a
  skeleton while they arrive, as the app's `isResolvingSetup`.

## Left to the builder

Component boundaries and names, query keys, the exact phone layouts, the
skeletons, animations within §8, the split of i18n keys between the app's and
the web's own, test coverage per AGENTS.md §10, and AGENTS.md / README updates
per phase (§1 rules reversed, §3 layout, §13 «Decided (2026-11-03)»).
