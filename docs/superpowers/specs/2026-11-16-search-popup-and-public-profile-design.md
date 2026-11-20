# The search's popup and the public profile, from Figma (2026-11-16)

The owner's word (2026-11-16): apply the Figma screens he marked with the
comments «Barra de busqueda: implementar» (frames `4698:3379`, `4701:4179`)
and «Perfil publico del especialista: implementar» (`4757:1002`,
`4757:2672`, `4757:4027`), all on the page «🌐 Landing page», 1440 px wide.
On the profile, «toma en cuenta los botones y las acciones de cada botón»;
the booking panel sits on the right; «Agendar» opens a modal with the rest
of the booking; the panel lacks an «Agendar» button once everything is
chosen: add it. Efficient, readable, modular, coherent, and an elegant,
modern, intuitive UI.

## 1. The search box's popup (what appears on tapping a field)

From the frames, measured in the nodes:

- **The page dims:** a black layer at 52 % over the whole page, the bar
  included; the hero's search and the specialist behind it stay bright. A
  tap on the layer leaves the search. In the docked bar and on `/search`
  the layer stays under the bar (the bar is the search's surface there).
- **The list:** a white card 16 px under the pill (15 in Figma), radius
  `md` (10), shadow `sm` (Figma's is Material's elevation 1, not a token),
  12 px padding; it starts at the pill's left edge and reaches the
  divider for «¿Qué?», and from the divider to the pill's right edge for
  «¿Dónde?».
- **The rows:** a 16 px icon, the words at 14 px, a second line at 12 px in
  the secondary grey (a specialist's specialty); the option in hand on
  `blue-50` with radius `sm` (5 in Figma). Specialists wear the `person`
  icon in `blue-300`, places the `location_on` pin in the primary blue,
  one line: «Barquisimeto, Lara, Venezuela». The letters that matched are
  the primary blue (no bold). Compact rows with a mouse; 44 px on touch
  screens (AGENTS.md §8.5).
- **No group titles on screen** (the frames show none): the icon tells a
  specialty, a specialist, a recent search or a place apart; the groups
  keep their names for screen readers.
- **Kept from before, on purpose:** «Buscar «lo escrito»» as the first
  option; the empty box's recent searches and featured specialties; the
  place's «Usar mi ubicación» and «Toda Venezuela»; the hints «Busca por
  nombre o especialidad» and «Ciudad o dirección» (the frames say
  «Especialidad, enfermedad, doctor» and «Ciudad»: the API searches no
  illness, decided 2026-10-14); the hero's pill shape (the owner's call of
  2026-10-08; the frames draw radius 15).

## 2. The public profile `/s/{id}`

Layout at 1440: the landing's white bar; under it two columns in the
landing's width (79rem): the profile (766 px) and the booking (471 px),
25 px apart, white cards of radius `xl` (20) on the blue primary with the
landing's swirl. From laptops (`lg`) up; on phones and tablets one column
and the booking in the modal.

- **The header card:** the photo (178 px circle), the name (30 px bold)
  with the verified mark, the first verified specialty as the green pill
  («y N más» after it), the first office as a link («Clínica Razetti y 1
  más») that opens the offices sheet (each office's address, «Cómo
  llegar», its prices; «Agendar en este consultorio» chooses it in the
  booking), the stars with the average and the count. At the top right
  the heart. Then «Agendar cita» (primary) and «Compartir» (white, the
  share sheet or the clipboard, as «Mi perfil»), a hairline, and the
  three tabs.
- **The tabs** («Descripción», «Opiniones», «Sobre este especialista»)
  take the page to their section, and the one in view is marked (blue-50,
  primary words, the corner rounding by position); they stay at the top of
  the screen while the content scrolls (sticky).
- **The content card:** «Descripción» (16 px, grey-800), «Opiniones» (the
  60 px average with its stars, the bars of each star in the primary blue
  on blue-50 with their share, «N opiniones», each review with its stars,
  words, day and author; streamed as before), «Sobre este especialista»
  (the gallery as a row of photos 137 px tall that scrolls, the
  experience, «Educación» — each verified specialty with its college —
  and «Certificaciones» as a list).
- **The heart** keeps the specialist among the patient's favourites
  (`/patients/favorites`, the API's): pressed or not, at once, the API told
  after; a visitor is asked to sign in; a specialist sees none.
- **A specialist never books** (AGENTS.md §1): on their own profile the
  panel says «Así ven tu perfil tus pacientes»; on another's, that booking
  is for patients.
- **Kept:** the real 404, the metadata and JSON-LD, the reviews streamed
  under their own Suspense, «Abrir en la app» on phones, the shared
  transition of the photo and the name from the search.

## 3. Booking: the panel and the modal

- **The panel** (laptops up, sticky beside the profile): «Agendar cita»,
  then «Selecciona un consultorio» (cards: the chosen one green-500 with
  white words), «Selecciona una fecha» (the month: days with hours in
  black, without in grey on a grey circle, the chosen one green-500), a
  hairline, «Selecciona un horario» (Mañana / Tarde / Noche as a
  segmented choice, the hours as chips: free green-50, taken grey,
  chosen green-500) and «Agendar» (not in Figma: the owner's addition),
  never disabled: without an hour it says to choose one.
- **Public data, no session:** the days from
  `GET /search/specialists/{id}/availability?fromDate=` (each office's
  next 12 days with hours; read again from the day after the last until
  the month is covered) and the hours from
  `GET /search/offices/{id}/slots?date=` (every hour with `available`:
  the booked and the past ones taken). A visitor sees the real agenda
  before signing in.
- **The modal** (the `Sheet`: a centred dialog on a computer, a bottom
  sheet on a phone) holds the rest, as steps with the sheet's way back:
  the day and hour (when they are not chosen yet: from the header's
  «Agendar cita», or on a phone), the patient — the session asked for
  right there, a sign-up to finish sent away and brought back with the
  choice kept in the address —, the summary with «Agendar», and «¡Todo
  listo!» under the green wipe. «Agendar» in the panel opens it at the
  patient; «Agendar cita» at the first step not done.
- **One booking, two places:** the steps of `/book/{id}` (M15) move to
  `app/ui/booking` (a second module needs them) and the booking's write
  becomes one hook; `/book/{id}` keeps working as it is (the search's
  cards lead there).

## 4. Differences from Figma, on purpose

- Weeks start on Monday (the web's and the app's; the frame starts on
  Sunday). Stars `warning-500` (decided 2026-10-08; Figma's `#F9BF24`).
- The offices link in a blue that passes AA (Figma's blue-100 on white
  reads 2:1); secondary words in grey-600 (Figma's grey-500 is under AA).
- Radii and shadows to the nearest token (5 → `sm`, Material's elevation
  1 → `sm`).

## 5. Phases

1. The search's popup and the dimmed page.
2. The profile's page: bar, layout, header card, tabs, content, offices
   sheet, share.
3. The booking: public availability, the panel, the steps in
   `app/ui/booking`, the modal.
4. The heart (favourites).
5. Tests, AGENTS.md, the gate, e2e on both phones, a visual pass against
   the frames.
