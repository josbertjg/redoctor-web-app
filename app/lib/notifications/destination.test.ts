// @vitest-environment node
import { describe, expect, it } from 'vitest';

import {
  billingType,
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

  it('reads the billing engine kind from billingEventType too', () => {
    expect(
      notificationDestination(
        { kind: 'PAYMENT', billingEventType: 'BILLING_BALANCE_APPLIED' },
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

describe('billingType', () => {
  it('prefers a billing kind, then billingEventType, then the kind', () => {
    expect(billingType({ kind: 'BILLING_INVOICE_DUE' })).toBe(
      'BILLING_INVOICE_DUE',
    );
    expect(
      billingType({ kind: 'PAYMENT', billingEventType: 'BILLING_PAID' }),
    ).toBe('BILLING_PAID');
    expect(billingType({ kind: 'WELCOME' })).toBe('WELCOME');
    expect(billingType({})).toBe('');
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
