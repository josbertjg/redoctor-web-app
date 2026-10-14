import type { Messages } from 'next-intl';

/*
 * Server Components translate on the server. Only the namespaces that Client
 * Components read travel to the browser, so the message catalog never bloats
 * the client payload (≤ 150 KB JS on public pages, AGENTS.md §8.10).
 * Add a namespace here when a Client Component on most pages starts using
 * it; a namespace only one page's client components read travels with that
 * page alone (`pageNamespaces`, through app/ui/messages-scope.tsx).
 */
export const clientNamespaces = [
  'errors',
  'notifications',
  'retry',
  'close',
  // «Abrir en la app» (app/ui/app-bridge): every page shared with the app.
  'appBridge',
  // The session (app/ui/auth): the account in the bar, the sign-in buttons.
  'auth',
] as const satisfies readonly (keyof Messages)[];

export type ClientMessages = Pick<Messages, (typeof clientNamespaces)[number]>;

export type Namespace = keyof Messages;

/** The given namespaces of the catalog, and nothing else. */
export function pickMessages(
  messages: Messages,
  namespaces: readonly Namespace[],
): Partial<Messages> {
  return Object.fromEntries(
    namespaces.map((namespace) => [namespace, messages[namespace]]),
  );
}

export function pickClientMessages(messages: Messages): ClientMessages {
  return pickMessages(messages, clientNamespaces) as ClientMessages;
}

/*
 * What one page's client components read on top of `clientNamespaces`.
 * The sign-in buttons translate Firebase's failures (`apiErrors`); the
 * sign-up form reads its fields, their errors and the support channels.
 */
export const pageNamespaces = {
  signIn: ['apiErrors'],
  signUp: [
    'apiErrors',
    'input',
    'finishPatientSignup',
    'signUp',
    'name',
    'lastName',
    'dateOfBirth',
    'phoneNumber',
    'identityDocument',
    'sex',
    'male',
    'female',
    'continue',
    'finish',
    'patient',
    'specialist',
    'ofRedoctor',
  ],
  // The invitation (M4): the claim, its sign-in buttons and the
  // appointment's summary, all read in the browser.
  invitation: [
    'apiErrors',
    'appointments',
    'priceFormat',
    'price',
    'input',
    'finishPatientSignup',
    'dateOfBirth',
    'identityDocument',
    'sex',
    'male',
    'female',
    'continue',
    'specialists',
  ],
  // The appointment (M5): its states, its actions and their sheets (the
  // reschedule's calendar and slots), the sign-in it may need, and the
  // rating of a finished consultation that email 15 leads to (M7).
  appointment: [
    'apiErrors',
    'appointments',
    'reviews',
    'priceFormat',
    'price',
    'specialists',
    'identityDocument',
    'dateOfBirth',
    'sex',
    'male',
    'female',
    'cancel',
    'back',
    'pickADate',
    'morning',
    'afternoon',
    'evening',
    'no_slots_available',
  ],
  // The patient's appointments (M6) and the review wall before them (M7):
  // the list, the cards and the rating, all read in the browser.
  appointments: ['apiErrors', 'appointments', 'reviews'],
  // Booking from a profile (M15): its sign-in, the four steps (the
  // reschedule's calendar and hours, the reasons and their prices, the
  // person in one's care) and «¡Todo listo!».
  book: [
    'apiErrors',
    'appointments',
    'search',
    'priceFormat',
    'price',
    'pickADate',
    'morning',
    'afternoon',
    'evening',
    'no_slots_available',
    'next',
    'back',
    'edit',
    'book',
    'dateAndTime',
    'office',
    'noOptionsAvailable',
    'patient',
    'specialist',
    'name',
    'lastName',
    'dateOfBirth',
    'identityDocument',
    'sex',
    'male',
    'female',
    'input',
    'signUp',
  ],
  // The panel's home (M14): the plan and its notice, today's appointments.
  panelHome: ['apiErrors', 'billing', 'appointments', 'panel'],
  // The agenda and the history of the specialist's appointments (M14).
  agenda: ['apiErrors', 'appointments', 'panel', 'identityDocument'],
  // The statistics (M14): the filters, the four reports, the downloads
  // and, when the plan lacks them, the plan that has them.
  reports: ['apiErrors', 'reports', 'panel', 'appBridge'],
  // «Mi perfil» (M14): the profile's state, its sections as the app shows
  // them, the plan with more offices, sharing and «Abrir en la app».
  myProfile: [
    'apiErrors',
    'panel',
    'profile',
    'specialistProfile',
    'mySpecialties',
    'specialists',
    'search',
    'billing',
    'priceFormat',
    'days',
    'active',
    'inactive',
    'description',
    'experience',
    'education',
    'certifications',
    'certificationTypes',
    'readMore',
    'showLess',
  ],
  // «Mis especialidades» (M14): each specialty and its review, and support.
  mySpecialties: [
    'apiErrors',
    'panel',
    'profile',
    'mySpecialties',
    'rejectionReason',
  ],
  // The specialist's subscription (M13): where the plan stands, its notice,
  // what can be done with it, its receipts, its balance and its coupons;
  // «Datos de cobro» leads to support (`appAccess`).
  subscription: ['apiErrors', 'billing', 'appAccess'],
  // The payment (M13): the plans, the coupon sheet and the two steps of the
  // payment, all read in the browser.
  pay: ['apiErrors', 'billing', 'back', 'input'],
} as const satisfies Record<string, readonly Namespace[]>;
