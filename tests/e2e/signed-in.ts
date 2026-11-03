import { expect, test as base, type Page } from '@playwright/test';

import { FakeApi } from './fake-api';
import { FakeProviders, type Person } from './fake-provider';
import { hoursFromNow, slotAt } from '../factories/appointments';
import { buildInvitationResponse } from '../factories/invitations';

import type { InvitationPayload } from './fake-api';

/*
 * The specs where a person signs in (AGENTS.md §10): Google's and Apple's
 * windows answer as the person would (fake-provider.ts) and the API keeps
 * what the person did from page to page (fake-api.ts). Each test starts in
 * a browser that has never signed in, as someone who taps a link in
 * WhatsApp or Gmail.
 */

export const people = {
  /** A patient with an account. */
  ana: { uid: 'e2e-ana', name: 'Ana Pérez', email: 'ana.perez@gmail.com' },
  /** Signs in for the first time: the API makes the account then. */
  carmen: {
    uid: 'e2e-carmen',
    name: 'Carmen Díaz',
    email: 'carmen.diaz@gmail.com',
  },
  /** Another patient with an account. */
  luis: { uid: 'e2e-luis', name: 'Luis Rivas', email: 'luis.rivas@gmail.com' },
  /** A specialist. */
  doctor: {
    uid: 'e2e-doctor',
    name: 'Luis Gómez',
    email: 'dr.luis.gomez@gmail.com',
  },
} satisfies Record<string, Person>;

/*
 * Installed for every test of these specs, whether the test names them or
 * not: a page never reaches the real Google, Apple or API, and every page
 * is watched.
 */
export const test = base.extend<{
  providers: FakeProviders;
  api: FakeApi;
  health: string[];
}>({
  providers: [
    async ({ context, baseURL }, provide) => {
      // The landing's splash is for a person's first visit, not for tests.
      await context.addCookies([
        {
          name: 'redoctor-splash',
          value: '1',
          url: baseURL ?? 'http://localhost:3300',
        },
      ]);
      const providers = new FakeProviders(people.ana);
      await providers.install(context);
      await provide(providers);
    },
    { auto: true },
  ],
  api: [
    async ({ context }, provide) => {
      const api = new FakeApi();
      await api.install(context);
      await provide(api);
    },
    { auto: true },
  ],
  // No page of a signed-in flow breaks its CSP or throws: the test fails
  // if any did, whatever page it happened on.
  health: [
    async ({ context }, provide) => {
      const problems: string[] = [];
      await context.exposeBinding(
        'e2eCspViolation',
        (_source, report: unknown) => {
          problems.push(
            `CSP ${typeof report === 'string' ? report : JSON.stringify(report)}`,
          );
        },
      );
      await context.addInitScript(() => {
        document.addEventListener('securitypolicyviolation', (event) => {
          const report = (
            window as unknown as { e2eCspViolation?: (text: string) => void }
          ).e2eCspViolation;
          report?.(`${event.violatedDirective} ${event.blockedURI}`);
        });
      });
      context.on('weberror', (error) => {
        problems.push(`error ${error.error().message}`);
      });
      await provide(problems);
      expect(problems).toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };

/** Taps the provider's button: its window signs in whoever `providers.next` is. */
export async function signInWith(
  page: Page,
  provider: 'Google' | 'Apple' = 'Google',
): Promise<void> {
  await page
    .getByRole('button', { name: `Continuar con ${provider}` })
    .first()
    .click();
}

/** The big moment's colour has opened again (AGENTS.md §8, rule 13). */
export async function wipeOpened(page: Page): Promise<void> {
  await expect(page.locator('.screen-wipe')).toBeHidden({ timeout: 15_000 });
}

/**
 * An invitation for an appointment `hours` from now, as the specialist's
 * WhatsApp sends it: inside its confirmation window when less than 24 h.
 */
export function invitationIn(
  hours: number,
  overrides: Parameters<typeof buildInvitationResponse>[0] = {},
): InvitationPayload {
  const start = hoursFromNow(hours);
  const inWindow = hours < 24;
  return buildInvitationResponse({
    ...overrides,
    invitation: {
      expiresAt: new Date(start.getTime() - 3_600_000).toISOString(),
      ...overrides.invitation,
    },
    appointment: {
      slot: slotAt(start),
      canConfirmNow: inWindow,
      confirmationWindowOpensAt: new Date(
        start.getTime() - 24 * 3_600_000,
      ).toISOString(),
      ...overrides.appointment,
    },
  });
}
