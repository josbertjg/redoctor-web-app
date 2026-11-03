// @vitest-environment node
import { describe, expect, it } from 'vitest';

import {
  isAdminBillingNotice,
  isBillingNotice,
  notificationDestination,
} from './destination';

const specialist = { patient: false, specialist: true };
const patient = { patient: true, specialist: false };

describe('notificationDestination', () => {
  it('leads to the appointment whenever the notice carries one, whatever its kind', () => {
    expect(
      notificationDestination(
        { kind: 'APPOINTMENT_CANCELLED_PATIENT', appointmentId: 'appt-1' },
        patient,
      ),
    ).toBe('/a/appt-1');
    expect(
      notificationDestination(
        { kind: 'SOMETHING_NEW_TOMORROW', appointmentId: 'appt-2' },
        specialist,
      ),
    ).toBe('/a/appt-2');
  });

  it('leads a specialist to where each billing notice is resolved', () => {
    const where = (kind: string) =>
      notificationDestination({ kind }, specialist);

    expect(where('BILLING_SUBSCRIPTION_NOT_ACTIVATED')).toBe('/pay?view=plans');
    expect(where('BILLING_CANCELED_BY_USER')).toBe('/pay?view=plans');
    expect(where('BILLING_COUPON_GIFTED')).toBe('/panel/subscription/coupons');
    expect(where('BILLING_DISCOUNT_ENDED')).toBe('/panel/subscription/coupons');
    expect(where('BILLING_ADJUSTMENT_ISSUED')).toBe(
      '/panel/subscription/invoices',
    );
    expect(where('BILLING_BALANCE_CREDITED')).toBe(
      '/panel/subscription/balance',
    );
    expect(where('BILLING_REFUND_RECORDED')).toBe(
      '/panel/subscription/balance',
    );
    expect(where('BILLING_INVOICE_DUE')).toBe('/panel/subscription');
    expect(where('BILLING_PAYMENT_APPROVED')).toBe('/panel/subscription');
  });

  it('reads the billing engine’s event, dotted, when the kind says nothing', () => {
    expect(
      notificationDestination(
        { kind: 'PAYMENT', billingEventType: 'balance.applied' },
        specialist,
      ),
    ).toBe('/panel/subscription/balance');
  });

  it('leads nowhere for the admins billing notices, nor for a patient', () => {
    expect(
      notificationDestination(
        { kind: 'BILLING_ADMIN_PAYMENT_TO_REVIEW' },
        specialist,
      ),
    ).toBeNull();
    expect(
      notificationDestination({ kind: 'BILLING_INVOICE_DUE' }, patient),
    ).toBeNull();
  });

  it('leads a specialist to «Mi perfil» for a profile notice, a patient nowhere', () => {
    expect(
      notificationDestination({ kind: 'PROFILE_PUBLISHED' }, specialist),
    ).toBe('/panel/profile');
    expect(
      notificationDestination({ kind: 'PROFILE_PUBLISHED' }, patient),
    ).toBeNull();
  });

  it('leads nowhere for a notice it cannot place', () => {
    expect(notificationDestination({ kind: 'WELCOME' }, patient)).toBeNull();
    expect(notificationDestination({}, specialist)).toBeNull();
  });
});

describe('billing notices (REDOC-363)', () => {
  it('leads each billing family where it is resolved, variants included', () => {
    const cases: [Record<string, string>, string][] = [
      [
        { kind: 'BILLING_BALANCE_CREDITED_GIFT' },
        '/panel/subscription/balance',
      ],
      [
        { kind: 'BILLING_REFUND_RECORDED_MOBILE' },
        '/panel/subscription/balance',
      ],
      [
        { kind: 'BILLING_ADJUSTMENT_ISSUED_COVERED' },
        '/panel/subscription/invoices',
      ],
      [
        { kind: 'BILLING_DISCOUNT_ENDED_BY_ADMIN' },
        '/panel/subscription/coupons',
      ],
      [{ kind: 'BILLING_COUPON_GIFTED' }, '/panel/subscription/coupons'],
      [
        { kind: 'BILLING_SUBSCRIPTION_NOT_ACTIVATED_REJECTED' },
        '/pay?view=plans',
      ],
      [{ kind: 'BILLING_CANCELED_UNPAID' }, '/pay?view=plans'],
      [{ kind: 'BILLING_PAST_DUE_NOT_VISIBLE' }, '/panel/subscription'],
      // Without a kind, the history's event says the same.
      [{ billingEventType: 'balance.credited' }, '/panel/subscription/balance'],
      [{ billingEventType: 'subscription.past_due' }, '/panel/subscription'],
    ];
    for (const [data, destination] of cases) {
      expect(notificationDestination(data, specialist)).toBe(destination);
    }
  });

  it('tells the billing notices and the admins ones apart', () => {
    expect(isBillingNotice({ kind: 'BILLING_INVOICE_DUE' })).toBe(true);
    expect(isBillingNotice({ kind: 'WELCOME' })).toBe(false);
    expect(isAdminBillingNotice({ kind: 'BILLING_ADMIN_RATE_STALE' })).toBe(
      true,
    );
    expect(isAdminBillingNotice({ kind: 'BILLING_INVOICE_DUE' })).toBe(false);
  });
});

describe('the specialist’s other notices', () => {
  it('opens the day of the daily summary, or today’s agenda', () => {
    expect(
      notificationDestination(
        { kind: 'AGENDA_DAILY_SUMMARY', date: '2026-11-03' },
        specialist,
      ),
    ).toBe('/panel/agenda/2026-11-03');
    expect(
      notificationDestination({ kind: 'AGENDA_DAILY_SUMMARY' }, specialist),
    ).toBe('/panel/agenda');
  });

  it('opens «Mis especialidades» for a specialty reviewed', () => {
    expect(
      notificationDestination({ kind: 'SPECIALTY_VERIFIED_MANY' }, specialist),
    ).toBe('/panel/specialties');
    expect(
      notificationDestination({ kind: 'SPECIALTY_REJECTED' }, patient),
    ).toBeNull();
  });
});
