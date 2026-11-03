import { afterEach, describe, expect, it } from 'vitest';

import {
  forgetPaymentDraft,
  PAYMENT_DRAFT_MAX_AGE_MS,
  readPaymentDraft,
  savePaymentDraft,
  type PaymentDraft,
} from './payment-draft';

const quote = {
  id: 'quote-1',
  rate: '39.94633333',
  rateDate: '2026-11-02',
  expiresAt: '2026-11-05T12:00:00.000Z',
  lines: [
    {
      type: 'PLAN',
      description: 'Plan Profesional',
      amount: { amount: 3000, currency: 'USD' },
    },
  ],
  total: { amount: 3000, currency: 'USD' },
  balanceApplied: { amount: 0, currency: 'USD' },
  payable: { amount: 3000, currency: 'USD' },
  payableVes: { amount: 119839, currency: 'VES' },
  requiresPayment: true,
  destination: { mobilePayment: null, bankTransfer: null },
};

const draft = (overrides: Partial<PaymentDraft> = {}): PaymentDraft => ({
  userId: 'uid-1',
  kind: 'contract',
  planId: 'plan-1',
  planName: 'Profesional',
  coupon: null,
  acceptDiscountLoss: false,
  quote,
  heldQuotes: [],
  method: 'MOBILE_PAYMENT',
  step: 'pay',
  report: {
    reference: '00123456',
    bankCode: '0134',
    origin: '4141234567',
    paidOn: null,
    amountVes: null,
  },
  idempotency: { key: 'key-1', body: '{}' },
  savedAt: '2026-11-02T12:00:00.000Z',
  ...overrides,
});

const now = new Date('2026-11-03T12:00:00.000Z');

afterEach(() => {
  window.localStorage.clear();
});

describe('the payment left halfway', () => {
  it('keeps the person’s draft and gives it back', () => {
    savePaymentDraft(draft());
    expect(readPaymentDraft('uid-1', now)).toEqual(draft());
  });

  it('forgets another account’s draft instead of giving it back', () => {
    savePaymentDraft(draft());
    expect(readPaymentDraft('uid-2', now)).toBeNull();
    // Gone for its owner too: this browser no longer keeps it.
    expect(readPaymentDraft('uid-1', now)).toBeNull();
  });

  it('forgets a draft older than seven days', () => {
    savePaymentDraft(draft());
    const later = new Date(
      Date.parse('2026-11-02T12:00:00.000Z') + PAYMENT_DRAFT_MAX_AGE_MS + 1,
    );
    expect(readPaymentDraft('uid-1', later)).toBeNull();
  });

  it('forgets what it cannot read', () => {
    window.localStorage.setItem('redoctor-payment-draft', '{"userId":"uid-1"');
    expect(readPaymentDraft('uid-1', now)).toBeNull();
    window.localStorage.setItem(
      'redoctor-payment-draft',
      JSON.stringify({ ...draft(), quote: { id: 1 } }),
    );
    expect(readPaymentDraft('uid-1', now)).toBeNull();
    expect(window.localStorage.getItem('redoctor-payment-draft')).toBeNull();
  });

  it('is forgotten on asking', () => {
    savePaymentDraft(draft());
    forgetPaymentDraft();
    expect(readPaymentDraft('uid-1', now)).toBeNull();
  });
});
