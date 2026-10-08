import type { Messages } from 'next-intl';

/*
 * Server Components translate on the server. Only the namespaces that Client
 * Components read travel to the browser, so the message catalog never bloats
 * the client payload (≤ 150 KB JS on public pages, AGENTS.md §8.10).
 * Add a namespace here when a Client Component starts using it.
 */
export const clientNamespaces = [
  'errors',
  'notifications',
  'retry',
  'close',
  // «Abrir en la app» (app/ui/app-bridge): every page shared with the app.
  'appBridge',
] as const satisfies readonly (keyof Messages)[];

export type ClientMessages = Pick<Messages, (typeof clientNamespaces)[number]>;

export function pickClientMessages(messages: Messages): ClientMessages {
  return Object.fromEntries(
    clientNamespaces.map((namespace) => [namespace, messages[namespace]]),
  ) as ClientMessages;
}
