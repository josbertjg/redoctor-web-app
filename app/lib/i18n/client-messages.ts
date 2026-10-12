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
} as const satisfies Record<string, readonly Namespace[]>;
