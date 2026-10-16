// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createStaleScheduler,
  staleQueryKeys,
  staleTargets,
  STALE_DEBOUNCE_MS,
} from './effects';
import { appointmentKeys } from '../queries/appointments';
import { billingKeys } from '../queries/billing';
import { identityKeys } from '../queries/identity-keys';
import { reportKeys } from '../queries/reports';
import { reviewKeys } from '../queries/reviews';
import { specialistKeys } from '../queries/specialists';

const specialist = { patient: false, specialist: true };
const patient = { patient: true, specialist: false };

describe('staleTargets', () => {
  it('leaves the appointments stale for any notice about one, and the statistics for a specialist', () => {
    expect(staleTargets({ appointmentId: 'appt-1' }, patient)).toEqual([
      'appointments',
    ]);
    expect(
      staleTargets({ kind: 'APPOINTMENT_RESCHEDULED' }, specialist),
    ).toEqual(['appointments', 'statistics']);
  });

  it('wakes the pending reviews of a patient when a consultation ends, never the specialist', () => {
    expect(
      staleTargets(
        { kind: 'APPOINTMENT_COMPLETED', appointmentId: 'appt-1' },
        patient,
      ),
    ).toEqual(['appointments', 'pendingReviews']);
    expect(
      staleTargets(
        { kind: 'APPOINTMENT_COMPLETED', appointmentId: 'appt-1' },
        specialist,
      ),
    ).toEqual(['appointments', 'statistics']);
  });

  it('leaves the subscription and the session stale for a billing notice, not for the admins', () => {
    expect(
      staleTargets({ kind: 'BILLING_PAYMENT_APPROVED' }, specialist),
    ).toEqual(['subscription', 'session']);
    expect(
      staleTargets(
        { kind: 'PAYMENT', billingEventType: 'BILLING_INVOICE_DUE' },
        specialist,
      ),
    ).toEqual(['subscription', 'session']);
    expect(
      staleTargets({ kind: 'BILLING_ADMIN_PAYMENT_TO_REVIEW' }, specialist),
    ).toEqual([]);
  });

  it('leaves the session stale for a profile notice, and nothing for one it cannot place', () => {
    expect(staleTargets({ kind: 'PROFILE_PUBLISHED' }, specialist)).toEqual([
      'session',
    ]);
    expect(staleTargets({ kind: 'WELCOME' }, patient)).toEqual([]);
  });
});

describe('staleQueryKeys', () => {
  const userId = 'uid-1';
  const prefixesOf = (target: Parameters<typeof staleQueryKeys>[0]) =>
    staleQueryKeys(target, userId);

  it('name the appointments as the query modules key them', () => {
    const keys = prefixesOf('appointments');
    expect(keys).toContainEqual(appointmentKeys.list(userId));
    expect(keys).toContainEqual(
      appointmentKeys.specialistList(userId, {}).slice(0, 2),
    );
    expect(keys).toContainEqual(
      appointmentKeys.detail(userId, 'appt-1').slice(0, 2),
    );
  });

  it('name the statistics, the subscription, the session and the pending reviews alike', () => {
    expect(prefixesOf('statistics')).toContainEqual(
      reportKeys
        .specialist(userId, { from: '2026-10-01', to: '2026-10-31' })
        .slice(0, 3),
    );
    const subscription = prefixesOf('subscription');
    expect(subscription).toContainEqual(billingKeys.subscription(userId));
    expect(subscription).toContainEqual(billingKeys.payables(userId));
    expect(subscription).toContainEqual(billingKeys.invoices(userId));
    expect(subscription).toContainEqual(billingKeys.balance(userId));
    expect(subscription).toContainEqual(billingKeys.savedCoupons(userId));
    const session = prefixesOf('session');
    expect(session).toContainEqual(identityKeys.me(userId));
    expect(session).toContainEqual(specialistKeys.myProfile(userId));
    expect(prefixesOf('pendingReviews')).toContainEqual(
      reviewKeys.pending(userId),
    );
  });
});

describe('createStaleScheduler', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('runs one refresh per target once the notices stop coming', () => {
    const run = vi.fn();
    const scheduler = createStaleScheduler(run);

    scheduler.schedule('appointments');
    scheduler.schedule('appointments');
    scheduler.schedule('subscription');
    vi.advanceTimersByTime(STALE_DEBOUNCE_MS - 1);
    expect(run).not.toHaveBeenCalled();

    scheduler.schedule('appointments');
    vi.advanceTimersByTime(1);
    // The subscription waited its full margin; the appointments were asked again.
    expect(run).toHaveBeenCalledTimes(1);
    expect(run).toHaveBeenCalledWith('subscription');

    vi.advanceTimersByTime(STALE_DEBOUNCE_MS);
    expect(run).toHaveBeenCalledTimes(2);
    expect(run).toHaveBeenLastCalledWith('appointments');
  });

  it('forgets everything pending when cancelled', () => {
    const run = vi.fn();
    const scheduler = createStaleScheduler(run, 100);

    scheduler.schedule('session');
    scheduler.cancelAll();
    vi.advanceTimersByTime(1000);

    expect(run).not.toHaveBeenCalled();
  });
});
