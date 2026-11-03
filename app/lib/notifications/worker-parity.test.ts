// @vitest-environment node
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { notificationDestination } from './destination';

/*
 * The push's worker (public/notifications-sw.js) is plain JavaScript with
 * its own copy of the destination rule: it runs without the page's bundle.
 * Loaded here with a stand-in `self`, it must send each notice where the
 * page would, for the specialist who gets them.
 */
const source = readFileSync(
  fileURLToPath(
    new URL('../../../public/notifications-sw.js', import.meta.url),
  ),
  'utf8',
);
// eslint-disable-next-line @typescript-eslint/no-implied-eval
const load = new Function('self', `${source}\nreturn { destinationOf };`) as (
  self: unknown,
) => { destinationOf: (data: Record<string, string>) => string };
const { destinationOf } = load({ addEventListener: () => undefined });

const specialist = { patient: false, specialist: true };

describe('the push worker’s destinations', () => {
  it('match the page’s, notice by notice', () => {
    const notices: Record<string, string>[] = [
      { kind: 'APPOINTMENT_RESCHEDULED_SPECIALIST', appointmentId: 'a-1' },
      { kind: 'BILLING_PAST_DUE' },
      { kind: 'BILLING_BALANCE_CREDITED_GIFT' },
      { kind: 'BILLING_REFUND_RECORDED_MOBILE' },
      { kind: 'BILLING_ADJUSTMENT_ISSUED_COVERED' },
      { kind: 'BILLING_DISCOUNT_ENDED_BY_ADMIN' },
      { kind: 'BILLING_CANCELED_UNPAID' },
      { kind: 'BILLING_SUBSCRIPTION_NOT_ACTIVATED_REJECTED' },
      { kind: 'PAYMENT', billingEventType: 'balance.applied' },
      { kind: 'AGENDA_DAILY_SUMMARY', date: '2026-11-03' },
      { kind: 'SPECIALTY_VERIFIED_MANY' },
      { kind: 'PROFILE_UNPUBLISHED' },
    ];
    for (const data of notices) {
      expect(destinationOf(data)).toBe(
        notificationDestination(data, specialist),
      );
    }
  });

  it('opens the home for what it cannot place', () => {
    expect(destinationOf({ kind: 'WELCOME' })).toBe('/');
    expect(destinationOf({ kind: 'BILLING_ADMIN_RATE_STALE' })).toBe('/');
  });
});
